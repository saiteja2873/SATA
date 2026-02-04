import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, DollarSign, Clock, TrendingUp } from "lucide-react";

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
    };
    ratings?: number;
    reviews?: number;
    entryFee?: number;
    isEntryFree?: boolean;
    openingHours?: string;
    popularityScore?: number;
    tags?: string[];
    images?: string[];
    crowdLevel?: string | null;
    distance?: number | null;
    relevanceScore?: number;
  };
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

export default function RecommendationCard({ place }: RecommendationCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl">{place.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {place.location.city}, {place.location.country}
            </CardDescription>
          </div>
          
          {place.relevanceScore && (
            <Badge variant="outline" className="ml-2">
              {Math.round(place.relevanceScore * 100)}% match
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image */}
        {place.images && place.images.length > 0 && (
          <img
            src={place.images[0]}
            alt={place.name}
            className="w-full h-48 object-cover rounded-md"
          />
        )}

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {place.description}
        </p>

        {/* Crowd Level - Prominent Display */}
        {place.crowdLevel && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Current Crowd Level:</span>
              </div>
              <Badge 
                variant={getCrowdLevelBadgeVariant(place.crowdLevel)}
                className="text-sm font-semibold"
              >
                {place.crowdLevel.toUpperCase()}
              </Badge>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Distance */}
          {place.distance !== null && place.distance !== undefined && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{place.distance.toFixed(1)} km away</span>
            </div>
          )}

          {/* Ratings */}
          {place.ratings && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>{place.ratings.toFixed(1)} ({place.reviews || 0} reviews)</span>
            </div>
          )}

          {/* Entry Fee */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>
              {place.isEntryFree 
                ? "Free Entry" 
                : place.entryFee 
                  ? `₹${place.entryFee}` 
                  : "N/A"}
            </span>
          </div>

          {/* Popularity */}
          {place.popularityScore && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>Popularity: {place.popularityScore}/10</span>
            </div>
          )}
        </div>

        {/* Opening Hours */}
        {place.openingHours && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{place.openingHours}</span>
          </div>
        )}

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {place.tags.slice(0, 5).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Type Badge */}
        <div>
          <Badge variant="outline">{place.type}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
