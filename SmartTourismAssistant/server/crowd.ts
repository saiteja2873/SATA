import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractFeaturesFromQuery } from "./llm/extractFeatures";

const router = Router();

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

// GET /api/crowd/forecast - Get AI-powered crowd forecast for an attraction
router.get("/crowd/forecast", async (req, res) => {
  try {
    const { attraction, lat, lng, date } = req.query;

    if (!attraction) {
      return res.status(400).json({ error: "attraction parameter is required" });
    }

    const targetDate = date ? new Date(date as string) : new Date();
    const location = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;

    // Generate AI-powered crowd forecast
    const forecast = await generateCrowdForecast(attraction as string, targetDate, location);

    res.json(forecast);
  } catch (err: any) {
    console.error("Crowd forecast error:", err);
    res.status(500).json({
      error: "Failed to generate crowd forecast",
      details: err?.message || err
    });
  }
});

// POST /api/crowd - Original endpoint for query-based prediction
router.post("/crowd", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    // Use Gemini to extract features and predict
    const features = await extractFeaturesFromQuery(query);
    
    // Use Gemini to generate crowd prediction
    const prediction = await generateSimpleCrowdPrediction(query, features);

    res.json({
      query,
      features,
      prediction
    });

  } catch (err: any) {
    console.error("Crowd route error:", err);
    res.status(500).json({
      error: "Crowd prediction failed",
      details: err?.message || err
    });
  }
});

async function generateCrowdForecast(
  attraction: string,
  targetDate: Date,
  location: { lat: number; lng: number } | null
) {
  const model = await getGeminiModel();
  const now = new Date();
  const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  const month = targetDate.toLocaleDateString('en-US', { month: 'long' });
  
  // Fetch nearby events if location is provided
  let eventsContext = "";
  if (location) {
    try {
      const eventsRes = await fetch(
        `http://localhost:5000/api/events?lat=${location.lat}&lng=${location.lng}&radius_km=50&size=5`
      );
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        if (events.length > 0) {
          eventsContext = `\n\nNearby events:\n${events.map((e: any) => 
            `- ${e.name} on ${new Date(e.date).toLocaleDateString()} at ${e.venue || 'location'}`
          ).join('\n')}`;
        }
      }
    } catch (err) {
      console.warn("Could not fetch events for context:", err);
    }
  }

  const prompt = `
You are an expert tourism and crowd forecasting AI. Generate a detailed 7-day crowd forecast for the following attraction.

Attraction: ${attraction}
Target Date: ${targetDate.toLocaleDateString()}
Day of Week: ${dayOfWeek}
Month: ${month}${eventsContext}

Provide a comprehensive forecast analysis in the following JSON format:
{
  "currentCrowdLevel": <number 0-100>,
  "crowdCategory": "Low" | "Medium" | "High" | "Very High",
  "estimatedVisitors": <number>,
  "peakTime": "HH:MM AM/PM - HH:MM AM/PM",
  "bestVisitTime": "HH:MM AM/PM - HH:MM AM/PM",
  "confidence": <number 0-100>,
  "factors": [
    "factor 1 affecting crowd levels",
    "factor 2", 
    "factor 3"
  ],
  "weeklyForecast": [
    {
      "day": "Mon",
      "date": "YYYY-MM-DD",
      "crowdLevel": <number 0-100>,
      "visitors": <number>,
      "category": "Low" | "Medium" | "High",
      "weather": "Sunny" | "Cloudy" | "Rainy" | "Partly Cloudy",
      "temperature": <number in celsius>,
      "recommendation": "Good time to visit" | "Expect crowds" | "Best avoided"
    },
    // ... 7 days total starting from today
  ],
  "weatherImpact": {
    "overall": "Positive" | "Neutral" | "Negative",
    "description": "Brief description of how weather affects crowds"
  },
  "recommendations": [
    "Specific recommendation 1",
    "recommendation 2",
    "recommendation 3"
  ],
  "insights": "A brief paragraph with key insights about visiting this attraction"
}

Consider:
- Day of week (weekends are busier)
- Season and weather patterns
- School holidays and public holidays
- Time of day variations
- Local events and festivals
- Tourist season patterns
- Historical crowd data for similar attractions

Provide realistic estimates based on typical tourism patterns. Output ONLY valid JSON, no explanations.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();
  
  return JSON.parse(clean);
}

async function generateSimpleCrowdPrediction(query: string, features: any) {
  const model = await getGeminiModel();
  const prompt = `
You are a crowd level prediction AI. Based on the following query and extracted features, predict the crowd level.

Query: ${query}
Features: ${JSON.stringify(features, null, 2)}

Provide a prediction in JSON format:
{
  "crowdLevel": <number 0-100>,
  "category": "Low" | "Medium" | "High" | "Very High",
  "confidence": <number 0-100>,
  "reasoning": "Brief explanation of the prediction",
  "estimatedVisitors": <number>,
  "peakTime": "HH:MM AM/PM - HH:MM AM/PM"
}

Output ONLY valid JSON, no explanations.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const clean = text.replace(/```json|```/g, "").trim();
  
  return JSON.parse(clean);
}

export default router;
