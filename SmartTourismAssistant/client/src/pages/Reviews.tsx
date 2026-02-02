import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";

export default function Reviews() {
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  const reviews = [
    {
      id: "1",
      reviewerName: "Sarah Johnson",
      rating: 5,
      comment: "Amazing experience! The crowd forecast was spot-on and helped us plan our visit perfectly. Highly recommend using this platform for trip planning.",
      blockchainHash: "0x7a3f9c2e1d8b6f4a5c9e2d1b8f6a3c9e2d1b8f6a",
      verified: true,
    },
    {
      id: "2",
      reviewerName: "Michael Chen",
      rating: 4,
      comment: "Very useful tool for avoiding crowds. The route optimization feature saved us hours of walking. Great AI recommendations too!",
      blockchainHash: "0x9d2f7e5a4b8c1f3d6e9a2c5b8f1d4e7a3c6b9f2e",
      verified: true,
    },
    {
      id: "3",
      reviewerName: "Emma Rodriguez",
      rating: 5,
      comment: "The cultural event recommendations were fantastic! Discovered local festivals we wouldn't have found otherwise. Blockchain verification gives me confidence in reviews.",
      blockchainHash: "0x3c8f1d6e9a2b5f4c7e1a8d3b6f9c2e5a1d4b7f8e",
      verified: true,
    },
  ];

  const handleSubmit = () => {
    console.log("Submit review:", { rating, comment });
    setComment("");
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">Blockchain Reviews</h1>
        <p className="text-muted-foreground">
          Verified, tamper-proof reviews stored on the blockchain
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>Write a Review</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Your review will be verified and stored on the blockchain
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger id="rating" data-testid="select-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">
                      <div className="flex items-center gap-2">
                        <span>5 Stars</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Review</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  data-testid="input-review-comment"
                />
              </div>
              <Button
                onClick={handleSubmit}
                className="w-full"
                data-testid="button-submit-review"
              >
                Submit Review
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Recent Reviews</h2>
            {reviews.map((review) => (
              <ReviewCard key={review.id} {...review} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-3xl font-bold" data-testid="text-total-reviews">1,247</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Verified Reviews</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-verified-reviews">1,247</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold" data-testid="text-avg-rating">4.8</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < 5 ? "fill-yellow-400 text-yellow-400" : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Blockchain?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Tamper-Proof</p>
                  <p className="text-sm text-muted-foreground">
                    Reviews cannot be altered or deleted
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Verified Authors</p>
                  <p className="text-sm text-muted-foreground">
                    All reviewers are authenticated
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Transparent</p>
                  <p className="text-sm text-muted-foreground">
                    Full transaction history available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
