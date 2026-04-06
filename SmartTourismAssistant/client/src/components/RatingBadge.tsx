import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface RatingBadgeProps {
  placeName: string;
  showCount?: boolean;
}

interface ReviewStats {
  totalReviews: number;
  avgRating: number;
}

export default function RatingBadge({ placeName, showCount = true }: RatingBadgeProps) {
  const { data: stats } = useQuery<{ reviews: Array<{ rating: number }> }>({
    queryKey: ["placeRating", placeName],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reviews?attraction=${encodeURIComponent(placeName)}`);
      return res.json();
    },
  });

  const reviews = stats?.reviews || [];
  if (reviews.length === 0) return null;

  const avgRating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
    >
      <Star className="h-3 w-3 fill-current" />
      {avgRating}
      {showCount && <span className="text-xs opacity-75">({reviews.length})</span>}
    </Badge>
  );
}
