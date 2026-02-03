import crypto from "crypto";

export function generateChainedHash(
  previousHash: string,
  data: {
    name: string;
    rating: number;
    review: string;
    placeName: string;
    latitude: number;
    longitude: number;
    createdAt: Date;
  }
) {
  const payload = JSON.stringify({
    name: data.name,
    rating: data.rating,
    review: data.review,
    placeName: data.placeName,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.createdAt.toISOString(),
  });

  return crypto
    .createHash("sha256")
    .update(previousHash + payload)
    .digest("hex");
}
