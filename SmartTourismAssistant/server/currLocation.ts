import { Router, Request, Response } from "express";

const router = Router();

router.post("/geocode/reverse", async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const queryParams = new URLSearchParams({
      format: "json",
      lat: lat.toString(),
      lon: lon.toString(),
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${queryParams}`,
      {
        headers: { "User-Agent": "SmartTourismAssistant/1.0" },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: unknown) {
    console.error("Geocode error:", error);
    res.status(500).json({ error: "Geocode failed" });
  }
});

export default router;
