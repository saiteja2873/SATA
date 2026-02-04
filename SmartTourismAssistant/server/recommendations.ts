import { Router } from "express";
import { getPlacesCollection } from "./db/mongodb";
import { searchSimilarPlaces } from "./services/qdrantService";
import fetch from "node-fetch";
import { extractFeaturesFromQuery } from "./llm/extractFeatures";

const router = Router();

/**
 * POST /api/recommendations
 * Get place recommendations based on semantic search and show crowd levels
 * 
 * Body:
 * - query: string (user's search query, e.g., "historical monuments near me")
 * - userLocation: { lat: number, lng: number } (optional)
 * - limit: number (optional, default 10)
 * - maxDistance: number (optional, in km, default 50)
 */
router.post("/recommendations", async (req, res) => {
  try {
    const { query, userLocation, limit = 10, maxDistance = 50 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    // 1️⃣ Semantic search in Qdrant for similar places
    console.log("🔍 Searching for similar places:", query);
    const similarPlaces = await searchSimilarPlaces(query, limit * 2); // Get more results to filter

    if (!similarPlaces || similarPlaces.length === 0) {
      return res.json({
        query,
        recommendations: [],
        message: "No matching places found. Try a different search query."
      });
    }

    // 2️⃣ Get place IDs from search results
    const placeIds = similarPlaces.map(p => p.id.toString());

    // 3️⃣ Fetch full place details from MongoDB
    const placesCollection = await getPlacesCollection();
    const places = await placesCollection
      .find({ _id: { $in: placeIds } })
      .toArray();

    // 4️⃣ Filter by distance if user location is provided
    let filteredPlaces = places;
    if (userLocation?.lat && userLocation?.lng) {
      filteredPlaces = places.filter(place => {
        if (!place.location?.coordinates) return false;
        
        const [lng, lat] = place.location.coordinates;
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          lat,
          lng
        );
        
        return distance <= maxDistance;
      });
    }

    // 5️⃣ Get crowd level predictions for each place
    console.log("📊 Fetching crowd levels for places...");
    const recommendations = await Promise.all(
      filteredPlaces.slice(0, limit).map(async (place) => {
        try {
          // Extract features for crowd prediction
          const placeQuery = `${place.name} in ${place.city}. Type: ${place.type}. ${place.description}`;
          const features = await extractFeaturesFromQuery(placeQuery);

          // Get crowd prediction from ML service
          const mlRes = await fetch("http://localhost:8000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(features),
          });

          let crowdLevel: string | null = null;
          let crowdPrediction: any = null;

          if (mlRes.ok) {
            crowdPrediction = await mlRes.json() as any;
            crowdLevel = crowdPrediction.predicted_crowd_level || null;
          }

          // Calculate distance if user location provided
          let distance = null;
          if (userLocation?.lat && userLocation?.lng && place.location?.coordinates) {
            const [lng, lat] = place.location.coordinates;
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              lat,
              lng
            );
          }

          // Get similarity score from Qdrant results
          const similarPlace = similarPlaces.find(p => p.id.toString() === place._id?.toString());
          const relevanceScore = similarPlace?.score || 0;

          return {
            id: place._id,
            name: place.name,
            description: place.description,
            type: place.type,
            location: {
              address: place.address,
              city: place.city,
              state: place.state,
              country: place.country,
              coordinates: place.location?.coordinates || null,
            },
            ratings: place.ratings,
            reviews: place.reviews,
            entryFee: place.entryFee,
            isEntryFree: place.isEntryFree,
            openingHours: place.openingHours,
            bestTimeToVisit: place.bestTimeToVisit,
            popularityScore: place.popularityScore,
            tags: place.tags,
            images: place.images,
            amenities: place.amenities,
            
            // Computed fields
            crowdLevel,
            crowdPrediction,
            distance: distance ? parseFloat(distance.toFixed(2)) : null,
            relevanceScore: parseFloat(relevanceScore.toFixed(3)),
          };
        } catch (err) {
          console.error(`Error processing place ${place.name}:`, err);
          // Return place without crowd prediction if it fails
          return {
            id: place._id,
            name: place.name,
            description: place.description,
            type: place.type,
            location: {
              address: place.address,
              city: place.city,
              state: place.state,
              country: place.country,
              coordinates: place.location?.coordinates || null,
            },
            ratings: place.ratings,
            reviews: place.reviews,
            crowdLevel: "unknown",
            error: "Could not fetch crowd prediction",
          };
        }
      })
    );

    // 6️⃣ Sort by relevance score
    recommendations.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    res.json({
      query,
      totalResults: recommendations.length,
      recommendations,
    });

  } catch (err: any) {
    console.error("Recommendations route error:", err);
    res.status(500).json({
      error: "Failed to get recommendations",
      details: err?.message || err,
    });
  }
});

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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
