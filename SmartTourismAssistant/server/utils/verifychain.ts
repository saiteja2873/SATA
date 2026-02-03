import crypto from "crypto";

export function verifyChain(reviews: any[]) {
  for (let i = 1; i < reviews.length; i++) {
    const previous = reviews[i - 1];
    const current = reviews[i];

    const payload = JSON.stringify({
      name: current.name,
      rating: current.rating,
      review: current.review,
      createdAt: new Date(current.createdAt).toISOString(),
    });

    const expectedHash = crypto
      .createHash("sha256")
      .update(previous.blockchainHash + payload)
      .digest("hex");

    if (expectedHash !== current.blockchainHash) {
      return false;
    }
  }
  return true;
}
