import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔍 Optional debug (remove later)
console.log(
  "Gemini key loaded at import time:",
  process.env.GEMINI_API_KEY ? "YES" : "NO"
);

let genAI: InstanceType<typeof GoogleGenerativeAI>;
let model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>;

// Initialize Gemini only when needed (lazy initialization)
function getModel() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in environment variables");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash" // ✅ SAFE MODEL
    });
  }
  return model;
}

const PROMPT = `
You are a data extraction system.

Rules:
- Output ONLY valid JSON
- No explanations
- Do NOT guess missing values
- Use null for unknowns

Schema:
{
  "Ratings": number | null,
  "Distance": number | null,
  "Distance_km": number | null,
  "EntryFeeFlag": 0 | 1 | null,
  "PopularityScore": number | null,
  "Temperature": number | null,
  "Rainfall": number | null,
  "Humidity": number | null,
  "HotelOccupancyRate": number | null,
  "TrafficIndex": number | null,
  "SocialMediaMentions": number | null,
  "HolidayImpact": 0 | 1 | null,
  "PlaceType": string | null,
  "BestWeatherConditions": string | null,
  "BestDay": string | null,
  "BestMonth": string | null,
  "BestSeason": string | null
}
`;

export async function extractFeaturesFromQuery(query: string) {
  const model = getModel();
  const result = await model.generateContent([PROMPT, query]);
  const text = result.response.text();

  // Gemini sometimes wraps JSON in ```json
  const clean = text.replace(/```json|```/g, "").trim();

  return JSON.parse(clean);
}
