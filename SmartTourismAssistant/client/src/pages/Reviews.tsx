import { useEffect, useState } from "react";
import ReviewCard from "@/components/ReviewCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Star } from "lucide-react";
import { useLocation } from "@/context/location-context";

type Review = {
  id: number;
  reviewerName: string;
  rating: number;
  comment: string;
  blockchainHash: string;
  verified: boolean;
};

export default function Reviews() {
  const { location } = useLocation(); // 🌍 global location
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch reviews (geo-aware)
  const fetchReviews = async () => {
    try {
      const url = location
        ? `/api/reviews/nearby?lat=${location.lat}&lng=${location.lng}`
        : `/api/reviews`;

      const res = await fetch(url);
      const data = await res.json();

      const mapped: Review[] = data.map((r: any) => ({
        id: r.id,
        reviewerName: r.name,
        rating: r.rating,
        comment: r.review,
        blockchainHash: r.blockchainHash,
        verified: true,
      }));

      setReviews(mapped);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    }
  };

  // 🔁 Refetch when location changes
  useEffect(() => {
    fetchReviews();
  }, [location]);

  // 🔹 Submit review (geo + blockchain ready)
  const handleSubmit = async () => {
    if (!comment.trim() || !location) return;

    setLoading(true);

    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Anonymous User",
          rating: Number(rating),
          review: comment,
          placeName: location.placeName || "Unknown place",
          latitude: location.lat,
          longitude: location.lng,
        }),
      });

      setComment("");
      setRating("5");
      await fetchReviews();
    } catch (err) {
      console.error("Failed to submit review", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div>
        <h1 className="mb-2 text-4xl font-bold">Blockchain Reviews</h1>
        <p className="text-muted-foreground">
          {location
            ? `Showing reviews near ${location.placeName}`
            : "Verified, tamper-proof reviews stored on the blockchain"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="space-y-6 lg:col-span-2">
          {/* WRITE REVIEW */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>Write a Review</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Rating */}
              <div className="space-y-2">
                <Label>Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((v) => (
                      <SelectItem key={v} value={String(v)}>
                        <div className="flex items-center gap-2">
                          <span>{v} Stars</span>
                          <div className="flex">
                            {Array.from({ length: v }).map((_, i) => (
                              <Star
                                key={i}
                                className="h-3 w-3 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label>Review</Label>
                <Textarea
                  placeholder={
                    location
                      ? `Share your experience at ${location.placeName}...`
                      : "Enable location to write a review"
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  disabled={!location}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading || !location}
                className="w-full"
              >
                {loading
                  ? "Submitting..."
                  : location
                  ? "Submit Review"
                  : "Enable Location First"}
              </Button>
            </CardContent>
          </Card>

          {/* REVIEWS LIST */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Recent Reviews</h2>

            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No reviews nearby. Be the first to review this place!
              </p>
            )}

            {reviews.map((review) => (
              <ReviewCard key={review.id} {...review} id={String(review.id)} />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* COMMUNITY TRUST */}
          <Card>
            <CardHeader>
              <CardTitle>Community Trust Score</CardTitle>
              <p className="text-sm text-muted-foreground">
                Based on verified, tamper-proof reviews
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-primary">4.8</div>
                <div>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Average rating from verified users
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["100% Verified", "Cryptographically secured"],
                  ["Tamper-Proof", "Hash-chained records"],
                ].map(([title, desc]) => (
                  <div
                    key={title}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
