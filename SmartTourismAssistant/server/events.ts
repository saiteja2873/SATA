import { Router, Request, Response } from "express";

const router = Router();

// GET /api/events
router.get("/events", async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius_km = "150", size = "5" } = req.query;

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

    // attempt sequence: 30d with rank -> 90d with rank -> 90d without rank -> no upper bound without rank
    const attempts: Array<{ label: string; startLte?: string; includeLocalRank?: boolean }> = [
      { label: "30d+rank", startLte, includeLocalRank: true },
      { label: "90d+rank", startLte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), includeLocalRank: true },
      { label: "90d-no-rank", startLte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), includeLocalRank: false },
      { label: "none-no-rank", includeLocalRank: false },
    ];

    let data: any = null;
    let results: any[] = [];

    for (const attempt of attempts) {
      const params = buildParams({ startLte: attempt.startLte, includeLocalRank: attempt.includeLocalRank });
      const url = `https://api.predicthq.com/v1/events/?${params.toString()}`;
      console.log(`PredictHQ query (${attempt.label}): ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PREDICTHQ_API_KEY!}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("PredictHQ error:", text);
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
      return res.json([]);
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
      };
    });

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

export default router;
