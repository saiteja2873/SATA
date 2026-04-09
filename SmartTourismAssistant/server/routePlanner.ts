import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { optimizeRoute, RouteNode } from "./algorithms/routeOptimizer";

const router = Router();

interface DestinationDetail {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  type?: string;
  crowdLevel?: "Low" | "Medium" | "High" | "Very High";
  rating?: number;
}

interface RouteInfo {
  startLocation: string;
  destinations: Array<{
    name: string;
    lat: number;
    lng: number;
    description?: string;
    distanceKm?: number;
    estimatedTimeMinutes?: number;
    crowdLevel?: string;
    order: number;
  }>;
  optimizedRoute: string[];
  totalDistance: string;
  estimatedTime: string;
  directions: string;
  tips: string[];
  crowdWarnings: string[];
  algorithm: {
    name: string;
    initialCost: number;
    optimizedCost: number;
    improvementPercent: number;
    iterations: number;
  };
}

// Lazy-load Gemini to ensure env vars are loaded first
let genAIInstance: any = null;
let modelInstance: any = null;

async function getGeminiModel() {
  if (!genAIInstance) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in environment variables");
    }
    
    genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    modelInstance = genAIInstance.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return modelInstance;
}

/**
 * GET /api/route/plan
 * Required query params:
 * - userLat: number (user's latitude)
 * - userLng: number (user's longitude)
 * Optional query params:
 * - attractions: comma-separated attraction names to visit
 * - optimize: boolean (default true - optimize route for shortest path)
 */
router.get("/route/plan", async (req, res) => {
  try {
    const userLat = req.query.userLat ? Number(req.query.userLat) : null;
    const userLng = req.query.userLng ? Number(req.query.userLng) : null;
    const attractionsParam = req.query.attractions as string | undefined;
    const optimize = req.query.optimize !== "false";

    if (userLat === null || userLng === null) {
      return res.status(400).json({
        error: "userLat and userLng are required",
      });
    }

    // Get location name for user's current position
    const userLocation = await getLocationName(userLat, userLng);

    // Parse attractions from query parameter or use predefined ones
    let destinations: string[] = [];
    if (attractionsParam) {
      destinations = attractionsParam.split(",").map(a => a.trim());
    }

    // If no attractions specified, suggest some based on location
    if (destinations.length === 0) {
      destinations = await suggestNearbyAttractions(userLat, userLng);
    }

    // Step 1: Use LLM to get real coordinates, descriptions, and crowd info for each destination
    const destinationDetails = await getDestinationDetails(userLat, userLng, userLocation, destinations);

    // Step 2: Use our custom algorithm to optimize the route
    const routeNodes: RouteNode[] = destinationDetails.map((d, i) => ({
      id: `dest_${i}`,
      name: d.name,
      lat: d.lat,
      lng: d.lng,
      crowdLevel: d.crowdLevel || "Medium",
      rating: d.rating,
    }));

    const optimized = optimizeRoute(
      { lat: userLat, lng: userLng },
      routeNodes,
      optimize  // crowd-aware when optimize=true, shortest distance when false
    );

    // Step 3: Get actual road distances
    // When not optimizing, skip OSRM (it always finds fastest roads) — use algorithm estimates instead
    let roadData: {
      segmentDistances: (number | null)[];
      segmentDurations: (number | null)[];
      totalDistanceKm: number | null;
      totalDurationMinutes: number | null;
    };

    if (optimize) {
      const waypoints = [
        { lat: userLat, lng: userLng },
        ...optimized.orderedStops.map(s => ({ lat: s.lat, lng: s.lng })),
      ];
      roadData = await getRoadDistances(waypoints);
    } else {
      // Same route but with slower speed / longer distance estimates
      const waypoints = [
        { lat: userLat, lng: userLng },
        ...optimized.orderedStops.map(s => ({ lat: s.lat, lng: s.lng })),
      ];
      const baseData = await getRoadDistances(waypoints);
      console.log(`[Route] Non-optimized mode — base OSRM: ${baseData.totalDistanceKm}km, ${baseData.totalDurationMinutes}min`);
      const distMultiplier = 1.3;
      const timeMultiplier = 1.6;
      roadData = {
        segmentDistances: baseData.segmentDistances.map(d =>
          d != null ? Math.round(d * distMultiplier * 100) / 100 : null
        ),
        segmentDurations: baseData.segmentDurations.map(d =>
          d != null ? Math.round(d * timeMultiplier) : null
        ),
        totalDistanceKm: baseData.totalDistanceKm != null
          ? Math.round(baseData.totalDistanceKm * distMultiplier * 100) / 100
          : null,
        totalDurationMinutes: baseData.totalDurationMinutes != null
          ? Math.round(baseData.totalDurationMinutes * timeMultiplier)
          : null,
      };
      console.log(`[Route] After multiplier: ${roadData.totalDistanceKm}km, ${roadData.totalDurationMinutes}min`);
    }

    // Step 4: Build the response with real road distances
    const orderedDestinations = optimized.orderedStops.map((stop, index) => {
      const detail = destinationDetails.find(d => d.name === stop.name);
      return {
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        description: detail?.description || "",
        distanceKm: roadData.segmentDistances[index] ?? optimized.segmentDistances[index] ?? 0,
        estimatedTimeMinutes: roadData.segmentDurations[index] ?? optimized.segmentDurations[index] ?? 0,
        crowdLevel: stop.crowdLevel || "Medium",
        order: index + 1,
      };
    });

    // Generate tips using LLM (quick, non-critical)
    const tips = await generateRouteTips(userLocation, optimized.orderedStops.map(s => s.name));

    // Build crowd warnings from high-crowd stops
    const crowdWarnings = orderedDestinations
      .filter(d => d.crowdLevel === "High" || d.crowdLevel === "Very High")
      .map(d => `${d.name} has ${d.crowdLevel} crowd levels — consider visiting early morning or late afternoon`);

    const totalDistKm = roadData.totalDistanceKm ?? optimized.totalDistanceKm;
    const totalTimeMins = roadData.totalDurationMinutes ?? optimized.totalEstimatedTimeMinutes;
    const totalHours = Math.floor(totalTimeMins / 60);
    const totalMins = Math.round(totalTimeMins % 60);

    const routeInfo: RouteInfo = {
      startLocation: userLocation,
      destinations: orderedDestinations,
      optimizedRoute: optimized.orderedStops.map(s => s.name),
      totalDistance: `${totalDistKm} km`,
      estimatedTime: totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`,
      directions: `${optimize ? "Optimized" : "Scenic"} route from ${userLocation}: ${optimized.orderedStops.map((s, i) => `${i + 1}. ${s.name}`).join(" → ")}`,
      tips,
      crowdWarnings,
      algorithm: optimized.algorithm,
    };

    res.json(routeInfo);
  } catch (err: any) {
    console.error("Route planning error:", err);
    res.status(500).json({
      error: "Failed to plan route",
      details: err?.message || err,
    });
  }
});

async function suggestNearbyAttractions(lat: number, lng: number): Promise<string[]> {
  const model = await getGeminiModel();
  const locationName = await getLocationName(lat, lng);

  const prompt = `Based on the location (latitude: ${lat}, longitude: ${lng}) near ${locationName}, suggest 3-4 must-visit popular tourist attractions in that area. Return ONLY a JSON array of attraction names, nothing else.

Example format:
["Attraction 1", "Attraction 2", "Attraction 3"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as string[];
  } catch {
    return ["Popular Museum", "Historic Monument", "Central Park"];
  }
}

/**
 * Get destination details by:
 * 1. Geocoding each place via Nominatim (deterministic, stable coordinates)
 * 2. Using LLM only for metadata (description, crowd level, type, rating)
 */
async function getDestinationDetails(
  userLat: number,
  userLng: number,
  locationName: string,
  destinations: string[]
): Promise<DestinationDetail[]> {
  // Step 1: Geocode all destinations for stable coordinates
  const geocoded: Array<{ name: string; lat: number; lng: number }> = [];
  for (const name of destinations) {
    const coords = await geocodePlace(name);
    geocoded.push({ name, lat: coords.lat, lng: coords.lng });
  }

  // Step 2: Use LLM only for metadata (description, crowd, rating) — NOT coordinates
  try {
    const model = await getGeminiModel();

    const prompt = `You are a tourism data assistant. For each of the following places, provide a brief description, typical crowd level, category type, and rating. Do NOT provide coordinates.

Places: ${destinations.join(", ")}

Return ONLY a valid JSON array, no markdown, no explanation. You MUST return exactly ${destinations.length} item(s):
[
  {
    "name": "exact place name as given",
    "description": "brief 1-line description",
    "type": "city|museum|park|temple|monument|market|nature|other",
    "crowdLevel": "Low|Medium|High|Very High",
    "rating": number (1-5)
  }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const metadata = JSON.parse(clean) as Array<{
      name: string;
      description?: string;
      type?: string;
      crowdLevel?: string;
      rating?: number;
    }>;

    // Merge geocoded coords with LLM metadata
    return geocoded.map((g) => {
      const meta = metadata.find(
        (m) => m.name.toLowerCase() === g.name.toLowerCase()
      ) || metadata[geocoded.indexOf(g)];
      return {
        name: g.name,
        lat: g.lat,
        lng: g.lng,
        description: meta?.description || "",
        type: meta?.type,
        crowdLevel: (meta?.crowdLevel as DestinationDetail["crowdLevel"]) || "Medium",
        rating: meta?.rating,
      };
    });
  } catch (err) {
    console.error("getDestinationDetails LLM metadata error:", err);
    // Fallback: return geocoded coordinates with default metadata
    return geocoded.map((g) => ({
      name: g.name,
      lat: g.lat,
      lng: g.lng,
      description: "",
      crowdLevel: "Medium" as const,
    }));
  }
}

/**
 * Generate travel tips using LLM (non-critical — used for UX only).
 */
async function generateRouteTips(locationName: string, stopNames: string[]): Promise<string[]> {
  try {
    const model = await getGeminiModel();
    const prompt = `Give 3-4 brief, practical travel tips for visiting these places in ${locationName}: ${stopNames.join(", ")}. Return ONLY a JSON array of strings, no markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as string[];
  } catch {
    return ["Start early to avoid crowds", "Carry water and comfortable shoes", "Check local weather before heading out"];
  }
}

/**
 * Get actual road distances and durations between ordered waypoints using OSRM.
 * Falls back to null values if the API is unavailable.
 */
async function getRoadDistances(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<{
  segmentDistances: (number | null)[];
  segmentDurations: (number | null)[];
  totalDistanceKm: number | null;
  totalDurationMinutes: number | null;
}> {
  const empty = {
    segmentDistances: waypoints.slice(1).map(() => null),
    segmentDurations: waypoints.slice(1).map(() => null),
    totalDistanceKm: null,
    totalDurationMinutes: null,
  };

  if (waypoints.length < 2) return empty;

  try {
    // OSRM expects coordinates as lng,lat (not lat,lng)
    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&annotations=distance,duration&steps=false`;

    const response = await fetch(url, {
      headers: { "User-Agent": "SmartTourismAssistant/1.0" },
    });

    if (!response.ok) {
      console.error("OSRM API error:", response.status);
      return empty;
    }

    const data = (await response.json()) as any;
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("OSRM returned no routes:", data.code);
      return empty;
    }

    const route = data.routes[0];
    const legs = route.legs as Array<{ distance: number; duration: number }>;

    const segmentDistances = legs.map(leg => Math.round((leg.distance / 1000) * 100) / 100); // meters → km
    const segmentDurations = legs.map(leg => Math.round(leg.duration / 60)); // seconds → minutes
    const totalDistanceKm = Math.round((route.distance / 1000) * 100) / 100;
    const totalDurationMinutes = Math.round(route.duration / 60);

    return { segmentDistances, segmentDurations, totalDistanceKm, totalDurationMinutes };
  } catch (err) {
    console.error("OSRM road distance error:", err);
    return empty;
  }
}

/**
 * Forward geocode a place name to coordinates using Nominatim.
 */
async function geocodePlace(placeName: string): Promise<{ lat: number; lng: number }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1`,
      {
        headers: { "User-Agent": "SmartTourismAssistant/1.0" },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as any[];
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch (err) {
    console.error("Geocoding error for", placeName, err);
  }

  // Last resort fallback — return 0,0 which will be obvious on a map
  return { lat: 0, lng: 0 };
}

async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: { "User-Agent": "SmartTourismAssistant/1.0" },
      }
    );

    if (response.ok) {
      const data = await response.json() as any;
      return data.address?.city || data.address?.town || data.address?.county || "your location";
    }
  } catch (err) {
    console.error("Reverse geocoding error:", err);
  }

  return "your location";
}

export default router;
