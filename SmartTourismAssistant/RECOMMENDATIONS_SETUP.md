# Smart Tourism Assistant - Recommendations Setup Guide

## Overview
This implementation integrates:
- **MongoDB**: Stores complete place information
- **Qdrant**: Vector database for semantic search using embeddings
- **Gemini AI**: Generates embeddings and extracts features for crowd prediction
- **ML Service**: Predicts crowd levels for each place

## Architecture Flow

```
User Query → Gemini Embeddings → Qdrant Search → MongoDB Places → Crowd Prediction → Results
```

## Prerequisites

### 1. Install MongoDB
```bash
# Windows: Download from https://www.mongodb.com/try/download/community
# Or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Install Qdrant
```bash
# Using Docker (Recommended):
docker run -d -p 6333:6333 qdrant/qdrant

# Or download from: https://qdrant.tech/documentation/quick-start/
```

### 3. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Gemini API key
GEMINI_API_KEY=your_actual_key_here
```

## Setup Steps

### 1. Install Dependencies (Already Done)
```bash
npm install mongodb @qdrant/js-client-rest
```

### 2. Start MongoDB and Qdrant
```bash
# Make sure both services are running
# MongoDB: localhost:27017
# Qdrant: localhost:6333
```

### 3. Seed Sample Places
```bash
# Run the seeder script to add sample places to MongoDB and Qdrant
npx tsx server/scripts/seedPlaces.ts
```

This will:
- Create 5 sample places (Taj Mahal, Gateway of India, Red Fort, India Gate, Qutub Minar)
- Store them in MongoDB
- Generate embeddings using Gemini
- Store embeddings in Qdrant for semantic search

### 4. Start Your Application
```bash
# Start the backend server
npm run dev

# In another terminal, make sure ML service is running
cd ml_service
uvicorn api.app:app --reload
```

## API Endpoints

### POST /api/recommendations
Get place recommendations with crowd levels.

**Request:**
```json
{
  "query": "historical monuments with beautiful architecture",
  "userLocation": {
    "lat": 28.6139,
    "lng": 77.2090
  },
  "limit": 10,
  "maxDistance": 50
}
```

**Response:**
```json
{
  "query": "historical monuments with beautiful architecture",
  "totalResults": 3,
  "recommendations": [
    {
      "id": "...",
      "name": "Red Fort",
      "description": "A historic fort...",
      "type": "fort",
      "location": {
        "address": "...",
        "city": "Delhi",
        "coordinates": [77.2410, 28.6562]
      },
      "ratings": 4.6,
      "crowdLevel": "medium",
      "distance": 5.2,
      "relevanceScore": 0.892
    }
  ]
}
```

## Frontend Usage

1. Navigate to `/recommendations` in your app
2. Enter a search query (e.g., "museums", "parks", "historical places")
3. Optionally enable location to filter by distance
4. View results with crowd levels displayed prominently

## Adding More Places

### Option 1: Use the Seeder Script
Edit `server/scripts/seedPlaces.ts` and add more places to the `samplePlaces` array.

### Option 2: Create an API Endpoint
```typescript
// POST /api/places/add
router.post("/places/add", async (req, res) => {
  const place = req.body;
  
  // Insert into MongoDB
  const result = await placesCollection.insertOne(place);
  const placeId = result.insertedId.toString();
  
  // Add to Qdrant
  await addPlaceEmbedding(
    placeId,
    place.name,
    place.description,
    place
  );
  
  res.json({ success: true, placeId });
});
```

## How Semantic Search Works

1. **User Query**: "historical monuments"
2. **Gemini Embedding**: Converts query to vector [768 dimensions]
3. **Qdrant Search**: Finds similar place vectors using cosine similarity
4. **MongoDB Fetch**: Gets full place details for matching IDs
5. **Crowd Prediction**: Calls ML service for each place
6. **Results**: Sorted by relevance score

## Customization

### Adjust Search Parameters
- **limit**: Number of results (default: 10)
- **maxDistance**: Max distance in km (default: 50)
- **minScore**: Minimum similarity score (default: 0.7)

### Modify Crowd Level Display
Edit `client/src/components/RecommendationCard.tsx` to customize how crowd levels are shown.

### Change Embedding Model
Edit `server/services/qdrantService.ts` to use a different embedding model.

## Troubleshooting

### MongoDB Connection Error
- Check if MongoDB is running: `mongosh`
- Verify MONGODB_URI in .env

### Qdrant Connection Error
- Check if Qdrant is running: visit `http://localhost:6333/dashboard`
- Verify QDRANT_URL in .env

### No Search Results
- Ensure places are seeded: run `npx tsx server/scripts/seedPlaces.ts`
- Check Qdrant collection: visit dashboard to see if vectors exist

### Crowd Prediction Fails
- Ensure ML service is running on port 8000
- Check ML service logs for errors

## Next Steps

1. Add more places to your database
2. Implement user preferences for better recommendations
3. Add filters (by type, price, ratings)
4. Cache crowd predictions for better performance
5. Add real-time updates using WebSockets
