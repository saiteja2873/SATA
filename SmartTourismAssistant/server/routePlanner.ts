import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

interface RouteInfo {
  startLocation: string;
  destinations: Array<{
    name: string;
    lat: number;
    lng: number;
    description?: string;
    distanceKm?: number;
  }>;
  optimizedRoute: string[];
  totalDistance: string;
  estimatedTime: string;
  directions: string;
  tips: string[];
  crowdWarnings: string[];
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

    // Generate optimal route using LLM
    const routeInfo = await generateOptimalRoute(
      userLocation,
      userLat,
      userLng,
      destinations,
      optimize
    );

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

async function generateOptimalRoute(
  startLocation: string,
  userLat: number,
  userLng: number,
  destinations: string[],
  optimize: boolean
): Promise<RouteInfo> {
  const model = await getGeminiModel();

  const prompt = `You are a travel route planner. Create an optimal route starting from "${startLocation}" (coordinates: ${userLat}, ${userLng}) visiting these attractions: ${destinations.join(", ")}.

${optimize ? "Optimize the route to minimize travel time and distance." : "Create a cultural/scenic route prioritizing experience over efficiency."}

Provide detailed response in JSON format with NO markdown code blocks:
{
  "startLocation": "string",
  "destinations": [
    {
      "name": "string",
      "order": number,
      "lat": number (latitude coordinate),
      "lng": number (longitude coordinate),
      "estimatedDistanceKm": number,
      "estimatedTimeMinutes": number,
      "description": "brief description of the attraction"
    }
  ],
  "optimizedRoute": ["ordered list of attraction names"],
  "totalDistance": "string with unit (e.g., '8.4 km')",
  "estimatedTime": "string (e.g., '2h 15m')",
  "directions": "detailed turn-by-turn directions or general route description",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "crowdWarnings": ["warning 1 if applicable", "warning 2 if applicable"],
  "bestTimeToVisit": "string recommendation for when to start this route"
}

Important:
- Include realistic map coordinates (lat/lng) for each attraction relative to the starting location
- Keep coordinates within a reasonable radius of the starting point
- Use realistic distances based on the coordinates
- Provide practical travel tips
- Note any crowd patterns or busy times
- Output ONLY valid JSON, no explanations`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const parsedRoute = JSON.parse(clean);

    return {
      startLocation,
      destinations: parsedRoute.destinations || [],
      optimizedRoute: parsedRoute.optimizedRoute || destinations,
      totalDistance: parsedRoute.totalDistance || "N/A",
      estimatedTime: parsedRoute.estimatedTime || "N/A",
      directions: parsedRoute.directions || "Follow the suggested route in order",
      tips: parsedRoute.tips || [],
      crowdWarnings: parsedRoute.crowdWarnings || [],
    };
  } catch (parseErr) {
    console.error("Failed to parse route response:", clean);
    return {
      startLocation,
      destinations: [],
      optimizedRoute: destinations,
      totalDistance: "N/A",
      estimatedTime: "N/A",
      directions: "Unable to generate detailed route. Please try again.",
      tips: ["Check traffic conditions before starting"],
      crowdWarnings: [],
    };
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
