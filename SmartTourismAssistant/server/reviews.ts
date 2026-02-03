import { Router } from "express";
import { db } from "./db";
import { reviews } from "./db/schema";
import { generateChainedHash } from "./utils/hash";
import { distanceKm } from "./utils/geo";
const router = Router();
import { desc } from "drizzle-orm";

router.get("/reviews/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ message: "Invalid coordinates" });
  }

  const allReviews = await db.select().from(reviews);

  const nearby = allReviews.filter((r) => {
    const d = distanceKm(lat, lng, r.latitude, r.longitude);
    return d <= 10; // 10km radius
  });

  res.json(nearby);
});

router.post("/reviews", async (req, res): Promise<void> => {
  const {
    name,
    rating,
    review,
    placeName,
    latitude,
    longitude,
  } = req.body;

  const ratingNumber = Number(rating);

  // ✅ Validation
  if (
    !name ||
    !review ||
    !placeName ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    Number.isNaN(ratingNumber)
  ) {
    res.status(400).json({ message: "Missing or invalid fields" });
    return;
  }

  if (ratingNumber < 1 || ratingNumber > 5) {
    res.status(400).json({ message: "Rating must be between 1 and 5" });
    return;
  }

  // 🔗 1️⃣ Get previous hash (LAST review globally)
  const lastReview = await db
    .select({ blockchainHash: reviews.blockchainHash })
    .from(reviews)
    .orderBy(desc(reviews.id))
    .limit(1);

  const previousHash =
    lastReview.length > 0
      ? lastReview[0].blockchainHash
      : "GENESIS_BLOCK";

  const createdAt = new Date();

  // 🔗 2️⃣ Generate BLOCKCHAIN HASH (correct way)
  const blockchainHash = generateChainedHash(previousHash, {
    name,
    rating: ratingNumber,
    review,
    placeName,
    latitude,
    longitude,
    createdAt,
  });

  // 🔗 3️⃣ Insert review (IMMUTABLE RECORD)
  const [newReview] = await db
    .insert(reviews)
    .values({
      name,
      rating: ratingNumber,
      review,
      placeName,
      latitude,
      longitude,
      previousHash,
      blockchainHash,
      createdAt,
    })
    .returning();

  res.status(201).json({
    ...newReview,
    verified: true,
  });
});


export default router;
