import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, DollarSign, Clock, TrendingUp, Sparkles, Calendar } from "lucide-react";
import RatingBadge from "@/components/RatingBadge";

interface RecommendationCardProps {
  place: {
    id: string;
    name: string;
    description: string;
    type: string;
    location: {
      address: string;
      city: string;
      state?: string;
      country: string;
      coordinates?: [number, number] | null;
    };
    ratings?: number;
    reviews?: number;
    entryFee?: number;
    isEntryFree?: boolean;
    openingHours?: string;
    bestTimeToVisit?: string | { season?: string; months?: string[]; days?: string[] };
    popularityScore?: number;
    tags?: string[];
    images?: string[];
    imageSearchQuery?: string;
    crowdLevel?: string | null;
    distance?: number | null;
    relevanceScore?: number;
    whyRecommended?: string;
  };
  onClick?: () => void;
}

const getCrowdLevelColor = (level: string | null | undefined) => {
  if (!level) return "gray";
  
  switch (level.toLowerCase()) {
    case "low":
      return "green";
    case "medium":
      return "yellow";
    case "high":
      return "orange";
    case "very high":
      return "red";
    default:
      return "gray";
  }
};

const getCrowdLevelBadgeVariant = (level: string | null | undefined) => {
  if (!level) return "secondary";
  
  switch (level.toLowerCase()) {
    case "low":
      return "default";
    case "medium":
      return "secondary";
    case "high":
      return "destructive";
    case "very high":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function RecommendationCard({ place, onClick }: RecommendationCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2 min-h-[3.5rem]">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[2.75rem]">{place.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{place.location.city}, {place.location.country}</span>
            </CardDescription>
          </div>
          
          {place.relevanceScore && (
            <Badge variant="outline" className="ml-2 shrink-0 text-xs">
              {Math.round(place.relevanceScore * 100)}% match
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1 pt-0">
        {/* Place Image */}
        <div className="w-full h-44 rounded-md overflow-hidden bg-muted">
          <img
            src={place.images?.[0] || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80"}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80";
              }
            }}
          />
        </div>

        {/* Why Recommended — fixed height */}
        <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg min-h-[4.5rem]">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-primary/80 line-clamp-3">
              {place.whyRecommended || "Recommended based on your search query."}
            </p>
          </div>
        </div>

        {/* Description — fixed height */}
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {place.description}
        </p>

        {/* Crowd Level */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Crowd Level:</span>
            </div>
            <Badge 
              variant={getCrowdLevelBadgeVariant(place.crowdLevel)}
              className="text-sm font-semibold"
            >
              {(place.crowdLevel || "N/A").toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* User Reviews Rating */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User Reviews</span>
            <RatingBadge placeName={place.name} showCount={true} />
          </div>
        </div>

        {/* Stats Grid — always 4 cells */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              {place.distance != null ? `${place.distance.toFixed(1)} km away` : "—"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
            <span className="truncate">
              {place.ratings ? `${place.ratings.toFixed(1)} (${(place.reviews || 0).toLocaleString()})` : "—"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              {place.isEntryFree ? "Free Entry" : place.entryFee ? `₹${place.entryFee}` : "N/A"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              {place.popularityScore ? `Popularity: ${place.popularityScore}/10` : "—"}
            </span>
          </div>
        </div>

        {/* Hours & Best Time — always rendered */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{place.openingHours || "Hours not available"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              Best time: {typeof place.bestTimeToVisit === "string" ? place.bestTimeToVisit : (place.bestTimeToVisit?.season || place.bestTimeToVisit?.months?.join(", ") || "Not specified")}
            </span>
          </div>
        </div>

        {/* Tags — pushed to bottom */}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {place.tags && place.tags.length > 0
            ? place.tags.slice(0, 4).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))
            : <Badge variant="outline" className="text-xs">{place.type}</Badge>
          }
        </div>
      </CardContent>
    </Card>
  );
}
