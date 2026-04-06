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
      routeNodes
    );

    // Step 3: Build the response with algorithm metadata
    const orderedDestinations = optimized.orderedStops.map((stop, index) => {
      const detail = destinationDetails.find(d => d.name === stop.name);
      return {
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        description: detail?.description || "",
        distanceKm: optimized.segmentDistances[index] || 0,
        estimatedTimeMinutes: optimized.segmentDurations[index] || 0,
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

    const totalHours = Math.floor(optimized.totalEstimatedTimeMinutes / 60);
    const totalMins = optimized.totalEstimatedTimeMinutes % 60;

    const routeInfo: RouteInfo = {
      startLocation: userLocation,
      destinations: orderedDestinations,
      optimizedRoute: optimized.orderedStops.map(s => s.name),
      totalDistance: `${optimized.totalDistanceKm} km`,
      estimatedTime: totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`,
      directions: `Optimized route from ${userLocation}: ${optimized.orderedStops.map((s, i) => `${i + 1}. ${s.name}`).join(" → ")}`,
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
 * Use LLM to get real-world coordinates, descriptions, and crowd info
 * for each destination name. The LLM is used for data retrieval only —
 * route optimization is handled by our custom algorithm.
 */
async function getDestinationDetails(
  userLat: number,
  userLng: number,
  locationName: string,
  destinations: string[]
): Promise<DestinationDetail[]> {
  const model = await getGeminiModel();

  const prompt = `You are a tourism data assistant. For each of the following attractions near ${locationName} (coordinates: ${userLat}, ${userLng}), provide factual details.

Attractions: ${destinations.join(", ")}

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "name": "exact attraction name",
    "lat": number (realistic latitude),
    "lng": number (realistic longitude),
    "description": "brief 1-line description",
    "type": "museum|park|temple|monument|market|nature|other",
    "crowdLevel": "Low|Medium|High|Very High",
    "rating": number (1-5)
  }
]

Important:
- Use real, accurate coordinates for each attraction
- Crowd level should reflect typical conditions
- Keep coordinates within reasonable radius of (${userLat}, ${userLng})`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as DestinationDetail[];
  } catch {
    // Fallback: return destinations with approximate coordinates
    return destinations.map((name, i) => ({
      name,
      lat: userLat + (Math.random() - 0.5) * 0.05,
      lng: userLng + (Math.random() - 0.5) * 0.05,
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
