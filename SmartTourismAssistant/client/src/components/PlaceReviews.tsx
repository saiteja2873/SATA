import { useQuery } from "@tanstack/react-query";
import ReviewCard from "./ReviewCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface PlaceReviewsProps {
  placeName: string;
  placeType?: "attraction" | "event"; // for context
}

interface ReviewItem {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  attraction: string | null;
  blockchainHash: string;
  verified: boolean;
}

export default function PlaceReviews({ placeName, placeType = "attraction" }: PlaceReviewsProps) {
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch reviews for this specific place
  const { data: reviewsData, isLoading, refetch } = useQuery<{ reviews: ReviewItem[] }>({
    queryKey: ["placeReviews", placeName],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reviews?attraction=${encodeURIComponent(placeName)}`);
      return res.json();
    },
  });

  const reviews = reviewsData?.reviews || [];
  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const handleSubmitReview = async () => {
    if (!reviewerName.trim() || !comment.trim()) return;

    try {
      const res = await apiRequest("POST", "/api/reviews", {
        reviewerName: reviewerName.trim(),
        rating: Number(rating),
        comment: comment.trim(),
        attraction: placeName,
      });

      if (res.ok) {
        setComment("");
        setReviewerName("");
        setRating("5");
        setShowForm(false);
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        refetch(); // Refresh reviews list
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {reviews.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{avgRating}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(avgRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Write Review Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Share Your Experience</CardTitle>
          <p className="text-sm text-muted-foreground">
            Help others by sharing your thoughts about {placeName}
          </p>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
              Write a Review
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rev-name">Your Name</Label>
                <Input
                  id="rev-name"
                  placeholder="Enter your name..."
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-rating">Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger id="rev-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((val) => (
                      <SelectItem key={val} value={String(val)}>
                        <div className="flex items-center gap-2">
                          <span>{val} Star{val !== 1 ? "s" : ""}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: val }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-comment">Review</Label>
                <Textarea
                  id="rev-comment"
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>

              {submitSuccess && (
                <Alert className="border-green-500/50 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Review added successfully! It's now on the blockchain.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReview}
                  className="flex-1"
                  disabled={!reviewerName.trim() || !comment.trim()}
                >
                  Submit Review
                </Button>
                <Button
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Reviews</h3>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && reviews.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {placeName} hasn't received any reviews yet. Be the first to share your experience!
            </CardContent>
          </Card>
        )}
        {reviews.map((review) => (
          <ReviewCard key={review.id} {...review} />
        ))}
      </div>
    </div>
  );
}
