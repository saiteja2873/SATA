import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MapPin } from "lucide-react";
import RecommendationCard from "@/components/RecommendationCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Recommendations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Get user's current location
  const getCurrentLocation = () => {
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
          alert("Could not get your location. Please enable location services.");
        }
      );
    } else {
      setLocationLoading(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

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
        throw new Error("Failed to fetch recommendations");
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
        <h1 className="text-4xl font-bold mb-2">Discover Places</h1>
        <p className="text-muted-foreground">
          AI-powered recommendations with real-time crowd levels
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

            {/* Location Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting location...
                  </>
                ) : userLocation ? (
                  <>
                    <MapPin className="h-4 w-4 mr-2 fill-current" />
                    Location enabled
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Enable location for distance
                  </>
                )}
              </Button>
              {userLocation && (
                <span className="text-sm text-muted-foreground">
                  Showing places within 50 km
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Failed to fetch recommendations. Please try again.
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
                <RecommendationCard key={place.id} place={place} />
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
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Start Your Discovery</h3>
            <p className="text-muted-foreground">
              Enter a search query above to get personalized place recommendations
              <br />
              with real-time crowd level predictions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
