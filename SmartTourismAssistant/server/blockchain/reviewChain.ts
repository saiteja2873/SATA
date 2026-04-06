import crypto from "crypto";

/**
 * Simple simulated blockchain for storing tamper-proof reviews.
 * 
 * Each block contains:
 * - index: position in the chain
 * - timestamp: when the block was created
 * - data: the review payload
 * - previousHash: hash of the previous block (ensures chain integrity)
 * - hash: SHA-256 hash of this block's contents
 * - nonce: proof-of-work nonce (simplified mining)
 * 
 * This is a local simulation suitable for a prototype/demo.
 * In production, this would be replaced by an Ethereum smart contract.
 */

export interface ReviewData {
  reviewerName: string;
  rating: number;
  comment: string;
  attraction?: string;
  timestamp: string;
}

export interface Block {
  index: number;
  timestamp: string;
  data: ReviewData;
  previousHash: string;
  hash: string;
  nonce: number;
}

function calculateHash(
  index: number,
  timestamp: string,
  data: ReviewData,
  previousHash: string,
  nonce: number
): string {
  const payload = `${index}${timestamp}${JSON.stringify(data)}${previousHash}${nonce}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Simple proof-of-work: find a nonce such that the hash starts with "00".
 * Difficulty is kept low for a prototype.
 */
function mineBlock(
  index: number,
  timestamp: string,
  data: ReviewData,
  previousHash: string,
  difficulty: number = 2
): { hash: string; nonce: number } {
  const prefix = "0".repeat(difficulty);
  let nonce = 0;
  let hash = "";

  do {
    nonce++;
    hash = calculateHash(index, timestamp, data, previousHash, nonce);
  } while (!hash.startsWith(prefix));

  return { hash, nonce };
}

export class ReviewBlockchain {
  private chain: Block[];

  constructor() {
    this.chain = [];
    // Create the genesis block
    this.chain.push(this.createGenesisBlock());
  }

  private createGenesisBlock(): Block {
    const timestamp = "2024-01-01T00:00:00.000Z"; // fixed timestamp for deterministic genesis
    const data: ReviewData = {
      reviewerName: "System",
      rating: 0,
      comment: "Genesis Block - SATA Review Chain Initialized",
      timestamp,
    };
    const hash = calculateHash(0, timestamp, data, "0", 0);

    return {
      index: 0,
      timestamp,
      data,
      previousHash: "0",
      hash,
      nonce: 0,
    };
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  addReview(review: ReviewData): Block {
    const previousBlock = this.getLatestBlock();
    const index = previousBlock.index + 1;
    const timestamp = new Date().toISOString();
    const previousHash = previousBlock.hash;

    // Mine the block (proof-of-work)
    const { hash, nonce } = mineBlock(index, timestamp, review, previousHash);

    const newBlock: Block = {
      index,
      timestamp,
      data: review,
      previousHash,
      hash,
      nonce,
    };

    this.chain.push(newBlock);
    return newBlock;
  }

  /**
   * Validate the entire chain — check that each block's previousHash
   * matches the prior block's hash, and each block's hash is correct.
   */
  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // Verify link
      if (current.previousHash !== previous.hash) {
        return false;
      }

      // Verify hash integrity
      const recalculated = calculateHash(
        current.index,
        current.timestamp,
        current.data,
        current.previousHash,
        current.nonce
      );
      if (current.hash !== recalculated) {
        return false;
      }
    }
    return true;
  }

  /** Get all review blocks (excluding genesis) */
  getReviews(): Block[] {
    return this.chain.slice(1); // skip genesis block
  }

  /** Get chain statistics */
  getStats(): { totalReviews: number; verifiedReviews: number; averageRating: number; chainValid: boolean } {
    const reviews = this.getReviews();
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((reviews.reduce((sum, b) => sum + b.data.rating, 0) / totalReviews) * 10) / 10
      : 0;

    return {
      totalReviews,
      verifiedReviews: totalReviews, // all on-chain reviews are verified
      averageRating,
      chainValid: this.isChainValid(),
    };
  }

  /** Get the full chain (for debugging / transparency) */
  getFullChain(): Block[] {
    return [...this.chain];
  }

  /** Load existing blocks (e.g., from MongoDB persistence) */
  loadChain(blocks: Block[]): void {
    if (blocks.length > 0) {
      this.chain = blocks;
    }
  }
}

// Singleton instance
export const reviewChain = new ReviewBlockchain();
