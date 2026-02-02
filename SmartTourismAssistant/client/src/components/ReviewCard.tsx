import { ShieldCheck, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ReviewCardProps {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  blockchainHash: string;
  verified: boolean;
}

export default function ReviewCard({
  id,
  reviewerName,
  rating,
  comment,
  blockchainHash,
  verified,
}: ReviewCardProps) {
  const initials = reviewerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card data-testid={`card-review-${id}`}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start gap-4">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h4 className="font-semibold" data-testid={`text-reviewer-${id}`}>
                {reviewerName}
              </h4>
              {verified && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid={`badge-verified-${id}`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="mb-3 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted"
                  }`}
                  data-testid={`star-${id}-${i}`}
                />
              ))}
            </div>
            <p className="mb-4 text-sm" data-testid={`text-comment-${id}`}>
              {comment}
            </p>
            <div className="rounded bg-muted p-2">
              <p className="mb-1 text-xs text-muted-foreground">Blockchain Hash:</p>
              <code className="text-xs font-mono" data-testid={`text-hash-${id}`}>
                {blockchainHash}
              </code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
