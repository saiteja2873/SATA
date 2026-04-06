import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MapPin, Sparkles, Star, Users, DollarSign, Clock, TrendingUp, Calendar, Navigation, Tag, X, BarChart3, Route } from "lucide-react";
import RecommendationCard from "@/components/RecommendationCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export default function Recommendations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [, navigate] = useLocation();

  // Auto-request location on mount
  useEffect(() => {
    if (!userLocation && !locationLoading) {
      setLocationLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setLocationLoading(false);
          },
          (error) => {
            console.error("Error getting location:", error);
            setLocationLoading(false);
          }
        );
      } else {
        setLocationLoading(false);
      }
    }
  }, []);

  // Fetch quick suggestions
  const { data: suggestionsData } = useQuery({
    queryKey: ["recommendation-suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/recommendations/suggest");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Fetch recommendations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendations", activeQuery, userLocation],
    queryFn: async () => {
      if (!activeQuery) return null;

      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: activeQuery,
          userLocation,
          limit: 10,
          maxDistance: 50,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch recommendations");
      }

      return response.json();
    },
    enabled: !!activeQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">Discover Places</h1>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Powered
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Get personalized recommendations powered by Gemini AI with crowd level insights
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search for Places</CardTitle>
          <CardDescription>
            Describe what you're looking for (e.g., "historical monuments", "nature parks", "museums")
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="What kind of places are you interested in?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Quick Suggestion Chips */}
            {suggestionsData?.suggestions && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestionsData.suggestions.map((s: { label: string; query: string }) => (
                    <Badge
                      key={s.label}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        setSearchQuery(s.query);
                        setActiveQuery(s.query);
                      }}
                    >
                      {s.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Location Status */}
            <div className="flex items-center gap-2">
              {locationLoading ? (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 px-3 py-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">Getting your location...</span>
                </div>
              ) : userLocation ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-1.5">
                  <MapPin className="h-4 w-4 text-green-600 fill-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Location enabled — showing nearby places with distances
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950 px-3 py-1.5">
                  <MapPin className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Location unavailable — results won't include distance info
                  </span>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">{(error as Error)?.message || "Failed to fetch recommendations"}</p>
              <p className="text-sm">
                Make sure the Gemini API key is configured in the server's .env file.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {data.totalResults > 0
                ? `Found ${data.totalResults} recommendations`
                : "No results found"}
            </h2>
          </div>

          {data.recommendations && data.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.recommendations.map((place: any) => (
                <RecommendationCard
                  key={place.id}
                  place={place}
                  onClick={() => setSelectedPlace(place)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No matching places found. Try a different search query.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial State */}
      {!activeQuery && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">AI-Powered Discovery</h3>
            <p className="text-muted-foreground">
              Enter a search query or pick a suggestion above to get
              <br />
              personalized place recommendations powered by Gemini AI.
            </p>
          </CardContent>
        </Card>
      )}
      {/* Place Detail Dialog */}
      <Dialog open={!!selectedPlace} onOpenChange={(open) => !open && setSelectedPlace(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPlace && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedPlace.name}</DialogTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {selectedPlace.location?.address || `${selectedPlace.location?.city}, ${selectedPlace.location?.state || ""} ${selectedPlace.location?.country}`}
                  </span>
                </div>
              </DialogHeader>

              {/* Image */}
              <img
                src={selectedPlace.images?.[0] || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80"}
                alt={selectedPlace.name}
                className="w-full h-64 object-cover rounded-lg bg-muted"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80";
                  }
                }}
              />

              {/* Why Recommended */}
              {selectedPlace.whyRecommended && (
                <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">Why we recommend this</p>
                      <p className="text-sm text-primary/80">{selectedPlace.whyRecommended}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="text-sm leading-relaxed">{selectedPlace.description}</p>

              <Separator />

              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Crowd Level */}
                {selectedPlace.crowdLevel && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Crowd Level</p>
                      <p className="font-semibold">{selectedPlace.crowdLevel}</p>
                    </div>
                  </div>
                )}

                {/* Ratings */}
                {selectedPlace.ratings && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <p className="font-semibold">{selectedPlace.ratings.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">({selectedPlace.reviews?.toLocaleString() || 0} reviews)</span></p>
                    </div>
                  </div>
                )}

                {/* Entry Fee */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Entry Fee</p>
                    <p className="font-semibold">
                      {selectedPlace.isEntryFree ? "Free" : selectedPlace.entryFee ? `₹${selectedPlace.entryFee}` : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Popularity */}
                {selectedPlace.popularityScore && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Popularity</p>
                      <p className="font-semibold">{selectedPlace.popularityScore}/10</p>
                    </div>
                  </div>
                )}

                {/* Distance */}
                {selectedPlace.distance != null && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Navigation className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="font-semibold">{selectedPlace.distance.toFixed(1)} km</p>
                    </div>
                  </div>
                )}

                {/* Relevance */}
                {selectedPlace.relevanceScore && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Match</p>
                      <p className="font-semibold">{Math.round(selectedPlace.relevanceScore * 100)}%</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-3">
                {selectedPlace.openingHours && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Hours:</span>
                    <span>{selectedPlace.openingHours}</span>
                  </div>
                )}
                {selectedPlace.bestTimeToVisit && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Best time:</span>
                    <span>{typeof selectedPlace.bestTimeToVisit === "string" ? selectedPlace.bestTimeToVisit : selectedPlace.bestTimeToVisit.season || selectedPlace.bestTimeToVisit.months?.join(", ") || ""}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{selectedPlace.type}</span>
                </div>
              </div>

              {/* Tags */}
              {selectedPlace.tags && selectedPlace.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPlace.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Coordinates / Map Link */}
              {selectedPlace.location?.coordinates && (
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.location.coordinates[1]},${selectedPlace.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <MapPin className="h-4 w-4" />
                    View on Google Maps
                  </a>
                </div>
              )}

              <Separator />

              {/* Crowd Forecast Button */}
              <Button
                className="w-full"
                onClick={() => {
                  const params = new URLSearchParams({
                    attraction: selectedPlace.name,
                    ...(selectedPlace.location?.coordinates && {
                      lat: String(selectedPlace.location.coordinates[1]),
                      lng: String(selectedPlace.location.coordinates[0]),
                    }),
                  });
                  setSelectedPlace(null);
                  navigate(`/forecast?${params.toString()}`);
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Get Crowd Forecast for {selectedPlace.name}
              </Button>

              {/* Optimized Route Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Navigate to Route Planner page with the selected place as a destination
                  setSelectedPlace(null);
                  navigate(`/routes?attraction=${encodeURIComponent(selectedPlace.name)}`);
                }}
              >
                <Route className="h-4 w-4 mr-2" />
                Get Optimized Route
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
