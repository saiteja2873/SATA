import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";

const router = Router();

// Lazy-init Gemini model
let genAI: InstanceType<typeof GoogleGenerativeAI> | null = null;
let model: ReturnType<InstanceType<typeof GoogleGenerativeAI>["getGenerativeModel"]> | null = null;

function getGeminiModel() {
  if (!model) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in environment variables");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return model;
}

const RECOMMENDATION_PROMPT = `You are a smart tourism recommendation assistant. Based on the user's query, generate a list of real tourist place recommendations.

RULES:
- Return ONLY valid JSON array, no markdown, no explanation
- Each item must follow the exact schema below
- Recommend real, well-known places that match the query
- Include a mix of popular and hidden gems
- Provide accurate details (ratings, coordinates, fees, etc.)
- If user provides location context, prioritize nearby places
- crowdLevel should be one of: "Low", "Medium", "High", "Very High"
- relevanceScore should be between 0.7 and 1.0

Schema for each item:
{
  "id": "unique-string-id",
  "name": "Place Name",
  "description": "2-3 sentence description of the place",
  "type": "monument | museum | park | temple | beach | lake | fort | palace | garden | wildlife | adventure | market | religious | historical | nature",
  "location": {
    "address": "Full address",
    "city": "City name",
    "state": "State/Province",
    "country": "Country",
    "coordinates": [longitude, latitude]
  },
  "ratings": 4.5,
  "reviews": 1200,
  "entryFee": 50,
  "isEntryFree": false,
  "openingHours": "9:00 AM - 5:00 PM",
  "bestTimeToVisit": "October to March",
  "popularityScore": 8.5,
  "tags": ["tag1", "tag2", "tag3"],
  "imageSearchQuery": "search query for finding an image of this place",
  "crowdLevel": "Medium",
  "whyRecommended": "Brief reason why this matches the user's query",
  "relevanceScore": 0.92
}`;

/**
 * POST /api/recommendations
 * Get LLM-powered place recommendations using Gemini
 */
router.post("/recommendations", async (req, res) => {
  try {
    const { query, userLocation, limit = 8 } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "query is required" });
    }

    // Sanitize limit
    const safeLimit = Math.min(Math.max(1, Number(limit) || 8), 15);

    console.log("🤖 Generating Gemini recommendations for:", query);

    const gemini = getGeminiModel();

    // Build a contextual prompt
    let userPrompt = `User query: "${query.trim()}"\nNumber of recommendations: ${safeLimit}`;
    if (userLocation?.lat && userLocation?.lng) {
      userPrompt += `\nUser's current location: latitude ${userLocation.lat}, longitude ${userLocation.lng}. Prioritize places near this location and include distance estimates.`;
    }

    const result = await gemini.generateContent([RECOMMENDATION_PROMPT, userPrompt]);
    const text = result.response.text();

    // Clean up Gemini response (may wrap in ```json)
    const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
    
    let recommendations: any[];
    try {
      recommendations = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON array from the response
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        recommendations = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse Gemini response as JSON");
      }
    }

    if (!Array.isArray(recommendations)) {
      throw new Error("Gemini response is not an array");
    }

    // Compute distance + fetch images from SerpAPI
    const enriched = await Promise.all(
      recommendations.map(async (place, idx) => {
        let distance: number | null = null;
        if (
          userLocation?.lat &&
          userLocation?.lng &&
          place.location?.coordinates?.length === 2
        ) {
          const [lng, lat] = place.location.coordinates;
          distance = parseFloat(
            calculateDistance(userLocation.lat, userLocation.lng, lat, lng).toFixed(2)
          );
        }

        // Fetch image via SerpAPI
        const searchQuery = place.imageSearchQuery || `${place.name} ${place.location?.city || ""} tourist place`;
        const imageUrl = await fetchPlaceImage(searchQuery);

        return {
          ...place,
          id: place.id || `gemini-${idx}`,
          distance,
          images: [imageUrl || getDefaultPlaceImage(place.type)],
          source: "gemini",
        };
      })
    );

    console.log(`✅ Generated ${enriched.length} recommendations`);

    res.json({
      query: query.trim(),
      totalResults: enriched.length,
      recommendations: enriched,
    });
  } catch (err: any) {
    console.error("Recommendations route error:", err);

    if (err?.message?.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: "Gemini API key is not configured",
        message: "Please set GEMINI_API_KEY in your .env file",
      });
    }

    res.status(500).json({
      error: "Failed to get recommendations",
      message: err?.message || "Unknown error",
    });
  }
});

/**
 * GET /api/recommendations/suggest
 * Get quick category suggestions (no LLM call needed)
 */
router.get("/recommendations/suggest", (_req, res) => {
  res.json({
    suggestions: [
      { label: "Historical Monuments", query: "historical monuments and heritage sites in India" },
      { label: "Nature & Parks", query: "nature parks, gardens, and scenic spots" },
      { label: "Temples & Spiritual", query: "famous temples and spiritual places in India" },
      { label: "Beaches", query: "best beaches to visit in India" },
      { label: "Hill Stations", query: "hill stations and mountain retreats" },
      { label: "Museums", query: "interesting museums and art galleries" },
      { label: "Forts & Palaces", query: "historic forts and palaces" },
      { label: "Adventure", query: "adventure activities and trekking spots" },
      { label: "Wildlife", query: "wildlife sanctuaries and national parks" },
      { label: "Family Friendly", query: "family-friendly tourist places with kids activities" },
    ],
  });
});

/**
 * Fetch a place image from SerpAPI Google Images
 */
async function fetchPlaceImage(searchQuery: string): Promise<string | null> {
  if (!process.env.SERP_API_KEY) {
    return null;
  }

  try {
    const serpUrl = new URL("https://serpapi.com/search");
    serpUrl.searchParams.append("q", searchQuery);
    serpUrl.searchParams.append("api_key", process.env.SERP_API_KEY);
    serpUrl.searchParams.append("tbm", "isch");
    serpUrl.searchParams.append("num", "3");

    const response = await fetch(serpUrl.toString());
    if (!response.ok) {
      console.warn(`SerpAPI returned ${response.status} for "${searchQuery}"`);
      return null;
    }

    const data = await response.json() as any;
    const images = data.images_results || [];

    // Return the first valid original image URL
    for (const img of images) {
      if (img.original && typeof img.original === "string") {
        return img.original;
      }
    }

    return null;
  } catch (err) {
    console.warn("SerpAPI image fetch failed for:", searchQuery, err);
    return null;
  }
}

/**
 * Default placeholder images by place type (high-quality Unsplash photos)
 */
function getDefaultPlaceImage(type: string): string {
  const typeStr = (type || "").toLowerCase();

  const defaults: Record<string, string> = {
    temple:    "https://images.unsplash.com/photo-1564804955013-e02e718d4548?w=600&q=80",
    religious: "https://images.unsplash.com/photo-1564804955013-e02e718d4548?w=600&q=80",
    monument:  "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80",
    historical:"https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80",
    fort:      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80",
    palace:    "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600&q=80",
    museum:    "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&q=80",
    park:      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80",
    garden:    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80",
    nature:    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80",
    beach:     "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
    lake:      "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=600&q=80",
    wildlife:  "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=600&q=80",
    adventure: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80",
    market:    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80",
  };

  // Check if any key is found in the type string (handles "temple | religious | historical")
  for (const [key, url] of Object.entries(defaults)) {
    if (typeStr.includes(key)) return url;
  }

  // Generic tourism fallback
  return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80";
}

/**
 * Haversine formula: distance between two coordinates in km
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
