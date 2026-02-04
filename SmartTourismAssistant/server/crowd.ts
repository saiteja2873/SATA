import { Router } from "express";
import fetch from "node-fetch";
import { extractFeaturesFromQuery } from "./llm/extractFeatures";

const router = Router();

router.post("/crowd", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    // 1️⃣ Gemini → structured features
    const features = await extractFeaturesFromQuery(query);

    // 2️⃣ Call ML service
    const mlRes = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features)
    });

    if (!mlRes.ok) {
      throw new Error("ML service failed");
    }

    const prediction = await mlRes.json();

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

export default router;
