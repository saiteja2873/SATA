import { Router } from "express";
import { reviewChain, ReviewBlockchain, type ReviewData, type Block } from "./blockchain/reviewChain";
import { connectToMongoDB } from "./db/mongodb";

const router = Router();

let chainLoaded = false;

/**
 * Ensure the blockchain is loaded from MongoDB before handling requests.
 * Called lazily on first request to avoid race conditions with env loading.
 */
async function ensureChainLoaded() {
  if (chainLoaded) return;
  chainLoaded = true;
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("review_chain");
    const blocks = await collection.find({}).sort({ index: 1 }).toArray();
    if (blocks.length > 0) {
      // Properly reconstruct Block objects from MongoDB documents
      const cleanBlocks: Block[] = blocks.map(({ _id, ...doc }: any) => ({
        index: doc.index,
        timestamp: doc.timestamp,
        data: {
          reviewerName: doc.data.reviewerName,
          rating: doc.data.rating,
          comment: doc.data.comment,
          attraction: doc.data.attraction,
          timestamp: doc.data.timestamp,
        },
        previousHash: doc.previousHash,
        hash: doc.hash,
        nonce: doc.nonce,
      } as Block));

      // Ensure genesis block (index 0) is present
      const hasGenesis = cleanBlocks.some(b => b.index === 0);
      if (!hasGenesis) {
        // Genesis was deleted — prepend the deterministic genesis block
        const genesis = reviewChain.getFullChain()[0];
        cleanBlocks.unshift(genesis);
        // Re-persist genesis to MongoDB
        await collection.insertOne(genesis);
        console.log("⚠️ Genesis block was missing — re-inserted into MongoDB");
      }

      reviewChain.loadChain(cleanBlocks);

      // Validate chain after loading; if invalid, reset to clean state
      if (!reviewChain.isChainValid()) {
        console.warn("⚠️ Loaded chain is invalid — resetting to clean state");
        await collection.deleteMany({});
        const freshChain = new ReviewBlockchain();
        const freshGenesis = freshChain.getFullChain()[0];
        reviewChain.loadChain([freshGenesis]);
        await collection.insertOne(freshGenesis);
        console.log("✅ Chain reset with fresh genesis block");
      } else {
        console.log(`✅ Loaded ${blocks.length} review blocks from MongoDB (chain valid)`);
      }
    } else {
      // First time — persist the genesis block
      const genesis = reviewChain.getFullChain()[0];
      if (genesis) {
        await collection.insertOne(genesis);
        console.log("✅ Genesis block persisted to MongoDB");
      }
    }
  } catch (err) {
    console.error("Failed to load review chain from DB:", err);
  }
}

/**
 * POST /api/reviews
 * Submit a new review — mines a block and persists to MongoDB.
 * Body: { reviewerName: string, rating: number, comment: string, attraction?: string }
 */
router.post("/reviews", async (req, res) => {
  try {
    await ensureChainLoaded();
    const { reviewerName, rating, comment, attraction } = req.body;

    // Validation
    if (!reviewerName || typeof reviewerName !== "string" || reviewerName.trim().length === 0) {
      return res.status(400).json({ error: "reviewerName is required" });
    }
    if (rating === undefined || typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be a number between 1 and 5" });
    }
    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return res.status(400).json({ error: "comment is required" });
    }

    const reviewData: ReviewData = {
      reviewerName: reviewerName.trim(),
      rating,
      comment: comment.trim(),
      attraction: attraction?.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    // Mine and add block to the chain
    const newBlock = reviewChain.addReview(reviewData);

    // Persist the new block to MongoDB
    try {
      const db = await connectToMongoDB();
      const collection = db.collection("review_chain");
      // Store block with explicit field structure for clean retrieval
      await collection.insertOne({
        index: newBlock.index,
        timestamp: newBlock.timestamp,
        data: newBlock.data,
        previousHash: newBlock.previousHash,
        hash: newBlock.hash,
        nonce: newBlock.nonce,
      });
    } catch (dbErr) {
      console.error("Failed to persist block to MongoDB:", dbErr);
      // Block is still in-memory, just not persisted
    }

    res.status(201).json({
      message: "Review added to blockchain",
      block: {
        index: newBlock.index,
        hash: newBlock.hash,
        previousHash: newBlock.previousHash,
        nonce: newBlock.nonce,
        timestamp: newBlock.timestamp,
        data: newBlock.data,
      },
    });
  } catch (err: any) {
    console.error("Review submission error:", err);
    res.status(500).json({
      error: "Failed to submit review",
      details: err?.message || err,
    });
  }
});

/**
 * GET /api/reviews
 * Fetch all reviews from the blockchain.
 * Query params: attraction (optional) — filter by attraction name
 */
router.get("/reviews", async (_req, res) => {
  try {
    await ensureChainLoaded();
    const attraction = _req.query.attraction as string | undefined;

    let reviews = reviewChain.getReviews().map((block) => ({
      id: String(block.index),
      reviewerName: block.data.reviewerName,
      rating: block.data.rating,
      comment: block.data.comment,
      attraction: block.data.attraction || null,
      blockchainHash: block.hash,
      previousHash: block.previousHash,
      nonce: block.nonce,
      blockIndex: block.index,
      timestamp: block.timestamp,
      verified: true, // all on-chain reviews are verified
    }));

    if (attraction) {
      reviews = reviews.filter(
        (r) => r.attraction?.toLowerCase() === attraction.toLowerCase()
      );
    }

    // Return newest first
    reviews.reverse();

    res.json({ reviews });
  } catch (err: any) {
    console.error("Fetch reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/**
 * GET /api/reviews/stats
 * Get blockchain statistics — total reviews, average rating, chain validity.
 */
router.get("/reviews/stats", async (_req, res) => {
  try {
    await ensureChainLoaded();
    const stats = reviewChain.getStats();
    res.json(stats);
  } catch (err: any) {
    console.error("Review stats error:", err);
    res.status(500).json({ error: "Failed to get review stats" });
  }
});

/**
 * GET /api/reviews/verify
 * Verify the integrity of the entire blockchain.
 */
router.get("/reviews/verify", async (_req, res) => {
  try {
    await ensureChainLoaded();
    const isValid = reviewChain.isChainValid();
    const chain = reviewChain.getFullChain();
    res.json({
      valid: isValid,
      totalBlocks: chain.length,
      latestBlock: chain[chain.length - 1]?.hash || null,
    });
  } catch (err: any) {
    console.error("Chain verify error:", err);
    res.status(500).json({ error: "Failed to verify chain" });
  }
});

export default router;
