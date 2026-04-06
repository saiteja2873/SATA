import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// Lazy-load Gemini
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

// GET /api/events
router.get("/events", async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius_km = "300", size = "5" } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: "lat and lng are required",
      });
    }

    // compute a 30-day window from now
    const now = new Date();
    const startGte = now.toISOString();
    const startLte = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // helper to build params with optional upper bound and optional local_rank
    const buildParams = (opts: { startLte?: string; includeLocalRank?: boolean } = {}) => {
      const p = new URLSearchParams({
        within: `${radius_km}km@${lat},${lng}`,
        limit: String(size),
        sort: "start",
        country: "IN",
        category: "festivals,community,performing-arts,concerts",
        "start.gte": startGte,
      });
      // include local_rank filter by default, allow disabling
      if (opts.includeLocalRank !== false) {
        p.set("local_rank.gte", "40");
      }
      if (opts.startLte) p.set("start.lte", opts.startLte);
      return p;
    };

    // attempt sequence: 30d no-rank -> 90d no-rank -> unlimited no-rank (expanded to 300km radius)
    const attempts: Array<{ label: string; startLte?: string; includeLocalRank?: boolean }> = [
      { label: "30d-no-rank", startLte, includeLocalRank: false },
      { label: "90d-no-rank", startLte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), includeLocalRank: false },
      { label: "none-no-rank", includeLocalRank: false },
    ];

    let data: any = null;
    let results: any[] = [];

    // Verify API key is set
    if (!process.env.PREDICTHQ_API_KEY) {
      console.error("PREDICTHQ_API_KEY is not set in environment variables");
      return res.status(500).json({ error: "PredictHQ API key not configured" });
    }

    const apiKey = process.env.PREDICTHQ_API_KEY;
    console.log(`Using PredictHQ API key: ${apiKey.substring(0, 10)}...`);

    for (const attempt of attempts) {
      const params = buildParams({ startLte: attempt.startLte, includeLocalRank: attempt.includeLocalRank });
      const url = `https://api.predicthq.com/v1/events/?${params.toString()}`;
      console.log(`PredictHQ query (${attempt.label}): ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      });

      const status = response.status;
      console.log(`PredictHQ response status: ${status}`);

      if (!response.ok) {
        const text = await response.text();
        console.error(`PredictHQ error (${status}):`, text);
        if (status === 401) {
          console.error("❌ UNAUTHORIZED: Your PredictHQ API key is invalid or expired. Check your .env file.");
        }
        // Continue to next attempt instead of failing hard
        continue;
      }

      data = await response.json();
      results = Array.isArray(data?.results) ? data.results : [];

      console.log(`PredictHQ attempt ${attempt.label}: count=${data?.count ?? results.length} results=${results.length}`);
      if (results.length === 0 && data) {
        // helpful debug when no results
        console.info("PredictHQ returned empty results object:", JSON.stringify({ count: data.count, overflow: data.overflow }));
      }

      if (results.length > 0) break; // got some results, stop retrying
    }

    if (!Array.isArray(results) || results.length === 0) {
      // PredictHQ returned nothing — fall back to Gemini AI-generated events
      console.log("📭 PredictHQ empty — using Gemini AI fallback for events");
      try {
        const aiEvents = await generateAIEvents(
          Number(lat),
          Number(lng),
          Number(radius_km),
          Number(size)
        );
        return res.json(aiEvents);
      } catch (aiErr) {
        console.error("Gemini AI events fallback failed:", aiErr);
        return res.json([]);
      }
    }

    const events = results.map((e: any) => {
      // -------------------------
      // SAFE LOCATION PARSING
      // PredictHQ location = [lng, lat]
      // -------------------------
      let elat: number | null = null;
      let elng: number | null = null;

      if (Array.isArray(e.location) && e.location.length === 2) {
        const [lngVal, latVal] = e.location;
        if (
          typeof latVal === "number" &&
          typeof lngVal === "number" &&
          latVal >= -90 &&
          latVal <= 90 &&
          lngVal >= -180 &&
          lngVal <= 180
        ) {
          elat = latVal;
          elng = lngVal;
        }
      }

      // -------------------------
      // SAFE ENTITY & PLACE EXTRACTION
      // -------------------------
      let venue: string | null = null;
      if (Array.isArray(e.entities) && e.entities.length > 0) {
        venue = e.entities[0]?.name ?? null;
      }

      // fallback to place hierarchies (e.g., city/locality)
      let placeHierarchyNames: string[] = [];
      if (Array.isArray(e.place_hierarchies) && e.place_hierarchies.length > 0) {
        placeHierarchyNames = e.place_hierarchies
          .map((p: any) => (p && typeof p.name === "string" ? p.name : null))
          .filter(Boolean as any);
        if (!venue && placeHierarchyNames.length > 0) {
          // use the most specific place name (last in hierarchy)
          venue = placeHierarchyNames[placeHierarchyNames.length - 1] ?? null;
        }
      }

      // additional fallbacks
      if (!venue && typeof e.human_location === "string") {
        venue = e.human_location;
      }
      if (!venue && e.geo && typeof e.geo === "object") {
        // try common geo fields
        venue = e.geo.locality ?? e.geo.name ?? e.geo.formatted_address ?? venue;
      }

      const place_text = placeHierarchyNames.join(", ") || null;

      return {
        id: e.id,
        name: e.title,
        description: typeof e.description === "string" ? e.description : null,
        date: e.start,
        start_local: e.start_local ?? null,
        end_local: e.end_local ?? null,
        timezone: e.timezone ?? null,
        category: e.category ?? null,
        rank: typeof e.rank === "number" ? e.rank : null,
        local_rank: typeof e.local_rank === "number" ? e.local_rank : null,
        phq_attendance: typeof e.phq_attendance === "number" ? e.phq_attendance : null,
        duration: typeof e.duration === "number" ? e.duration : null,
        predicted_event_spend: e.predicted_event_spend ?? null,
        phq_labels: Array.isArray(e.phq_labels)
          ? e.phq_labels.map((lbl: any) => (typeof lbl === "string" ? lbl : lbl?.label ?? String(lbl)))
          : [],
        venue,
        place_hierarchy: placeHierarchyNames,
        place_text,
        lat: elat,
        lng: elng,
        image: "", // Will be filled later
      };
    });

    // Generate images for all events (async)
    await Promise.all(
      events.map(async (ev, idx) => {
        try {
          ev.image = await generateEventImage(
            ev.name,
            ev.category ?? "event",
            ev.description
          );
        } catch (err) {
          console.error("Error generating image for event:", ev.name, err);
          ev.image = getDefaultEventImage(ev.category ?? "event");
        }
      })
    );

    // enrich events without venue using reverse geocoding where lat/lng is available
    await Promise.all(
      events.map(async (ev) => {
        if (!ev.venue && typeof ev.lat === "number" && typeof ev.lng === "number") {
          try {
            const qp = new URLSearchParams({
              format: "json",
              lat: String(ev.lat),
              lon: String(ev.lng),
              addressdetails: "1",
            });
            const gres = await fetch(`https://nominatim.openstreetmap.org/reverse?${qp.toString()}`, {
              headers: { "User-Agent": "SmartTourismAssistant/1.0" },
            });
            if (gres.ok) {
              const gdata = await gres.json();
              const addr = gdata?.address ?? {};
              const fallback = addr.town || addr.city || addr.suburb || addr.village || addr.hamlet || addr.county || addr.state_district || addr.state || addr.country;
              if (fallback) {
                ev.venue = fallback;
                ev.place_text = ev.place_text ? `${ev.place_text}, ${fallback}` : fallback;
              }
            }
          } catch (err) {
            console.warn("Reverse geocode failed for event", ev.id, err);
          }
        }
      })
    );

    console.log(`Events returned: ${events.length} (venues enriched where available)`);
    res.json(events);
  } catch (error) {
    console.error("PredictHQ API failed:", error);
    res.status(500).json({
      error: "Failed to fetch events",
    });
  }
});

// Generate event image URL using SERP API
async function generateEventImage(eventName: string, category: string, description: string | null): Promise<string> {
  try {
    // First try to get images from SERP API
    if (process.env.SERP_API_KEY) {
      const searchQuery = `${eventName} ${category}`;
      
      try {
        const serpUrl = new URL("https://serpapi.com/search");
        serpUrl.searchParams.append("q", searchQuery);
        serpUrl.searchParams.append("api_key", process.env.SERP_API_KEY);
        serpUrl.searchParams.append("tbm", "isch"); // Image search
        serpUrl.searchParams.append("num", "10");

        const serpResponse = await fetch(serpUrl.toString());
        
        if (serpResponse.ok) {
          const serpData = await serpResponse.json();
          
          // Extract image URLs from SERP results
          const images = serpData.images_results || [];
          
          if (images.length > 0) {
            // Return first valid image URL
            for (const img of images) {
              if (img.original) {
                console.log(`SERP image found for "${eventName}": ${img.original.substring(0, 80)}...`);
                return img.original;
              }
            }
          }
        }
      } catch (serpErr) {
        console.warn("SERP API call failed, falling back to category-based images:", serpErr);
      }
    }
    
    // Fallback: use category-based images if SERP API fails or is not configured
    return getDefaultEventImage(category);
  } catch (err) {
    console.error("Error generating event image:", err);
    return getDefaultEventImage(category);
  }
}

/**
 * Gemini AI fallback: generate plausible upcoming events near the user's location
 */
async function generateAIEvents(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number
): Promise<any[]> {
  const model = await getGeminiModel();

  const now = new Date();
  const prompt = `You are an expert on local events and festivals in India.
Generate ${Math.min(limit, 8)} realistic upcoming events/festivals that would typically occur near latitude ${lat}, longitude ${lng} (within ${radiusKm}km) in the coming weeks.

Today's date: ${now.toISOString().split("T")[0]}

RULES:
- Return ONLY a valid JSON array, no markdown, no explanation
- Use real festival/event names that actually happen in this region
- Dates should be in the near future (next 1-3 months)
- Include a mix of categories: festivals, community, performing-arts, concerts

Each item schema:
{
  "id": "ai-evt-<index>",
  "name": "Event Name",
  "description": "2-3 sentence description",
  "date": "ISO date string",
  "start_local": "ISO date string",
  "end_local": "ISO date string or null",
  "timezone": "Asia/Kolkata",
  "category": "festivals" | "community" | "performing-arts" | "concerts",
  "rank": <number 40-90>,
  "local_rank": <number 40-90>,
  "phq_attendance": <number>,
  "duration": <seconds>,
  "predicted_event_spend": null,
  "phq_labels": ["label1", "label2"],
  "venue": "Venue or City name",
  "place_hierarchy": [],
  "place_text": "City, State",
  "lat": <latitude>,
  "lng": <longitude>,
  "image": "",
  "source": "ai"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Robust JSON parsing
  let cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
  let events: any[];
  try {
    events = JSON.parse(cleaned);
  } catch {
    cleaned = cleaned.replace(/\/\/[^\n]*/g, "");
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
    const match = cleaned.match(/\[[\s\S]*\]/);
    events = match ? JSON.parse(match[0]) : [];
  }

  if (!Array.isArray(events)) events = [];

  // Fetch images for AI events via SERP
  await Promise.all(
    events.map(async (ev: any) => {
      try {
        ev.image = await generateEventImage(
          ev.name,
          ev.category ?? "event",
          ev.description
        );
      } catch {
        ev.image = getDefaultEventImage(ev.category ?? "event");
      }
    })
  );

  console.log(`✅ Gemini generated ${events.length} AI events`);
  return events;
}

// Fallback image generation based on category
function getDefaultEventImage(category: string): string {
  const categoryMap: { [key: string]: string } = {
    "festivals": "https://images.pexels.com/photos/1597318/pexels-photo-1597318.jpeg?auto=compress&cs=tinysrgb&w=600",
    "community": "https://images.pexels.com/photos/1321725/pexels-photo-1321725.jpeg?auto=compress&cs=tinysrgb&w=600",
    "performing-arts": "https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=600",
    "concerts": "https://images.pexels.com/photos/1813220/pexels-photo-1813220.jpeg?auto=compress&cs=tinysrgb&w=600",
    "conferences": "https://images.pexels.com/photos/2258536/pexels-photo-2258536.jpeg?auto=compress&cs=tinysrgb&w=600",
    "sports": "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=600",
    "expos": "https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=600",
  };
  
  return categoryMap[category] || "https://images.pexels.com/photos/1697912/pexels-photo-1697912.jpeg?auto=compress&cs=tinysrgb&w=600";
}

export default router;
