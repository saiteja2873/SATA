import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReviewCard from "@/components/ReviewCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Star, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface ReviewItem {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  attraction: string | null;
  blockchainHash: string;
  previousHash: string;
  nonce: number;
  blockIndex: number;
  timestamp: string;
  verified: boolean;
}

interface ReviewStats {
  totalReviews: number;
  verifiedReviews: number;
  averageRating: number;
  chainValid: boolean;
}

export default function Reviews() {
  const queryClient = useQueryClient();
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [attraction, setAttraction] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch reviews from blockchain API
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<{ reviews: ReviewItem[] }>({
    queryKey: ["reviews"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reviews");
      return res.json();
    },
  });

  // Fetch blockchain stats
  const { data: stats } = useQuery<ReviewStats>({
    queryKey: ["reviewStats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reviews/stats");
      return res.json();
    },
  });

  // Fetch chain verification
  const { data: verification } = useQuery<{ valid: boolean; totalBlocks: number }>({
    queryKey: ["reviewVerify"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reviews/verify");
      return res.json();
    },
  });

  // Submit review mutation
  const submitMutation = useMutation({
    mutationFn: async (review: { reviewerName: string; rating: number; comment: string; attraction?: string }) => {
      const res = await apiRequest("POST", "/api/reviews", review);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviewStats"] });
      queryClient.invalidateQueries({ queryKey: ["reviewVerify"] });
      setComment("");
      setAttraction("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    },
  });

  const handleSubmit = () => {
    if (!reviewerName.trim() || !comment.trim()) return;
    submitMutation.mutate({
      reviewerName: reviewerName.trim(),
      rating: Number(rating),
      comment: comment.trim(),
      ...(attraction.trim() && { attraction: attraction.trim() }),
    });
  };

  const reviews = reviewsData?.reviews || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">Blockchain Reviews</h1>
        <p className="text-muted-foreground">
          Verified, tamper-proof reviews stored on a simulated blockchain
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
                Your review will be mined into a block and stored on the blockchain
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reviewerName">Your Name</Label>
                  <Input
                    id="reviewerName"
                    placeholder="Enter your name..."
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    data-testid="input-reviewer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attraction">Attraction (optional)</Label>
                  <Input
                    id="attraction"
                    placeholder="e.g., Taj Mahal"
                    value={attraction}
                    onChange={(e) => setAttraction(e.target.value)}
                    data-testid="input-attraction"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger id="rating" data-testid="select-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((val) => (
                      <SelectItem key={val} value={String(val)}>
                        <div className="flex items-center gap-2">
                          <span>{val} Star{val !== 1 ? "s" : ""}</span>
                          <div className="flex">
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

              {submitSuccess && (
                <Alert className="border-green-500/50 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Review mined and added to blockchain successfully!
                  </AlertDescription>
                </Alert>
              )}

              {submitMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Failed to submit review. Try again.</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full"
                data-testid="button-submit-review"
                disabled={submitMutation.isPending || !reviewerName.trim() || !comment.trim()}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mining Block...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Recent Reviews</h2>
            {reviewsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!reviewsLoading && reviews.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No reviews yet. Be the first to submit a blockchain-verified review!
                </CardContent>
              </Card>
            )}
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
                <p className="text-3xl font-bold" data-testid="text-total-reviews">
                  {stats?.totalReviews ?? 0}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Verified Reviews</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-verified-reviews">
                  {stats?.verifiedReviews ?? 0}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold" data-testid="text-avg-rating">
                    {stats?.averageRating ?? "—"}
                  </p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(stats?.averageRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Chain Integrity</p>
                <div className="flex items-center gap-2">
                  {verification?.valid ? (
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Invalid
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {verification?.totalBlocks ?? 0} blocks
                  </span>
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
                  <p className="font-medium">SHA-256 Hashing</p>
                  <p className="text-sm text-muted-foreground">
                    Each block is cryptographically linked to the previous one
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Proof of Work</p>
                  <p className="text-sm text-muted-foreground">
                    Blocks are mined with a nonce satisfying difficulty target
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Transparent</p>
                  <p className="text-sm text-muted-foreground">
                    Full chain verification available via /api/reviews/verify
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
