import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

interface NearbyAttraction {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  distanceKm?: number;
  description?: string;
  type?: string;
  rating?: number;
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
 * GET /api/attractions
 * Required query params:
 * - lat: number (latitude)
 * - lng: number (longitude)
 * Optional query params:
 * - limit: number (default 8)
 * - maxDistance: number in km (default 50)
 */
router.get("/attractions", async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : null;
    const lng = req.query.lng ? Number(req.query.lng) : null;
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const maxDistance = req.query.maxDistance ? Number(req.query.maxDistance) : 50;

    if (lat === null || lng === null) {
      return res.status(400).json({ 
        error: "latitude and longitude are required" 
      });
    }

    // Get attractions using Gemini based on the location
    const attractions = await getAttractionsFromLLM(lat, lng, limit, maxDistance);

    res.json({ attractions });
  } catch (err: any) {
    console.error("Attractions route error:", err);
    res.status(500).json({
      error: "Failed to fetch attractions",
      details: err?.message || err,
    });
  }
});

async function getAttractionsFromLLM(lat: number, lng: number, limit: number, maxDistance: number): Promise<NearbyAttraction[]> {
  const model = await getGeminiModel();
  
  // Reverse geocode to get city/country name
  const locationName = await getLocationName(lat, lng);
  
  const prompt = `You are a tourism assistant. Based on the coordinates (latitude: ${lat}, longitude: ${lng}) near ${locationName}, suggest ${limit} popular tourist attractions.

For each attraction, provide:
1. Actual, real attractions in that area
2. Realistic coordinates (within ${maxDistance}km of the given location)
3. A brief description
4. Type of attraction (museum, park, monument, temple, market, etc.)
5. Estimated rating (1-5)

Output ONLY a valid JSON array with no other text. Each object must have this structure:
[
  {
    "id": "string (unique identifier)",
    "name": "string",
    "lat": number,
    "lng": number,
    "distanceKm": number,
    "description": "string (brief description)",
    "type": "string",
    "rating": number (1-5),
    "city": "string",
    "state": "string",
    "country": "string"
  }
]

Important: Output ONLY the JSON array, no markdown code blocks or explanations.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Clean up the response (remove markdown code blocks if present)
  const clean = text.replace(/```json|```/g, "").trim();
  
  try {
    const attractions = JSON.parse(clean) as NearbyAttraction[];
    
    // Validate and filter attractions
    const filtered = attractions
      .filter(attr => 
        attr.name && typeof attr.lat === 'number' && typeof attr.lng === 'number' &&
        (attr.distanceKm ?? Infinity) <= maxDistance
      )
      .slice(0, limit)
      .map(attr => ({
        id: attr.id || attr.name.toLowerCase().replace(/\s+/g, '-'),
        name: attr.name,
        lat: attr.lat,
        lng: attr.lng,
        city: attr.city,
        state: attr.state,
        country: attr.country,
        distanceKm: attr.distanceKm ? parseFloat(attr.distanceKm.toFixed(2)) : undefined,
        description: attr.description,
        type: attr.type,
        rating: attr.rating,
      }));

    return filtered;
  } catch (parseErr) {
    console.error("Failed to parse attractions response:", clean);
    // Return empty array if parsing fails
    return [];
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
      return data.address?.city || data.address?.town || data.address?.county || "this location";
    }
  } catch (err) {
    console.error("Reverse geocoding error:", err);
  }
  
  return "this location";
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default router;
