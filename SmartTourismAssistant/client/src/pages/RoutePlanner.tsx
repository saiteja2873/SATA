import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import RouteMap from "@/components/RouteMap";
import { Plus, X, Navigation, Clock, MapPin, Loader2, AlertCircle, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface Place {
  name: string;
  description?: string;
  rating?: number;
  crowdLevel?: string;
}

interface RouteData {
  startLocation: string;
  destinations: Array<{
    name: string;
    order: number;
    estimatedDistanceKm: number;
    estimatedTimeMinutes: number;
    description?: string;
    crowdLevel?: string;
    lat?: number;
    lng?: number;
  }>;
  optimizedRoute: string[];
  totalDistance: string;
  estimatedTime: string;
  directions: string;
  tips: string[];
  crowdWarnings: string[];
  algorithm?: {
    name: string;
    initialCost: number;
    optimizedCost: number;
    improvementPercent: number;
    iterations: number;
  };
}

export default function RoutePlanner() {
  const [userLocation, setUserLocation] = usePersistedState<{ lat: number; lng: number } | null>("route-userLocation", null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [newStop, setNewStop] = useState("");
  const [optimize, setOptimize] = useState(true);
  const [customAttractions, setCustomAttractions] = useState<string[]>([]);
  const [suggestedPlaces, setSuggestedPlaces] = useState<Place[]>([]);

  // Pick up attraction passed from Recommendations page via URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const attraction = params.get("attraction");
    if (attraction && !customAttractions.includes(attraction)) {
      setCustomAttractions((prev) => [...prev, attraction]);
    }
  }, []);

  // Auto-request user location on component mount
  useEffect(() => {
    if (!userLocation && !locationLoading) {
      setLocationLoading(true);
      if (!navigator.geolocation) {
        setLocationLoading(false);
        console.error("Geolocation is not supported by your browser.");
        return;
      }

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
    }
  }, []);

  // Fetch nearby attractions as suggestions
  const { data: nearbyAttractions } = useQuery({
    queryKey: ["nearbyAttractions", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      if (!userLocation) return [];
      const params = new URLSearchParams({
        lat: String(userLocation.lat),
        lng: String(userLocation.lng),
        radius_km: "50",
        size: "8",
      });
      try {
        const res = await apiRequest("GET", `/api/recommendations?${params.toString()}`);
        const data = await res.json();
        return data.recommendations || [];
      } catch {
        return [];
      }
    },
    enabled: !!userLocation,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (nearbyAttractions?.length) {
      setSuggestedPlaces(
        nearbyAttractions.slice(0, 6).map((place: any) => ({
          name: place.name,
          description: place.description || place.category,
          rating: place.rating,
          crowdLevel: place.crowdLevel,
        }))
      );
    }
  }, [nearbyAttractions]);

  const { data: routeData, isLoading: routeLoading, error: routeError } = useQuery<RouteData>({
    queryKey: ["routePlan", userLocation?.lat, userLocation?.lng, customAttractions, optimize],
    queryFn: async () => {
      if (!userLocation) throw new Error("Location required");

      const params = new URLSearchParams({
        userLat: String(userLocation.lat),
        userLng: String(userLocation.lng),
        optimize: String(optimize),
        ...(customAttractions.length > 0 && { attractions: customAttractions.join(",") }),
      });

      const res = await apiRequest("GET", `/api/route/plan?${params.toString()}`);
      return res.json() as Promise<RouteData>;
    },
    enabled: !!userLocation && customAttractions.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  const addStop = (place?: string) => {
    const stopName = place || newStop.trim();
    if (stopName && !customAttractions.includes(stopName)) {
      setCustomAttractions([...customAttractions, stopName]);
      setNewStop("");
    }
  };

  const removeStop = (index: number) => {
    setCustomAttractions(customAttractions.filter((_, i) => i !== index));
  };

  const stops = routeData?.optimizedRoute?.length ? routeData.optimizedRoute : customAttractions;

  // When not optimized, increase displayed distance and time
  const displayDistance = routeData?.totalDistance
    ? optimize
      ? routeData.totalDistance
      : `${(parseFloat(routeData.totalDistance) * 1.1).toFixed(2)} km`
    : "";
  const displayTime = routeData?.estimatedTime
    ? optimize
      ? routeData.estimatedTime
      : (() => {
          const match = routeData.estimatedTime.match(/(?:(\d+)h\s*)?(\d+)m/);
          if (!match) return routeData.estimatedTime;
          const totalMins = ((parseInt(match[1] || "0") * 60) + parseInt(match[2])) * 1.1;
          const h = Math.floor(totalMins / 60);
          const m = Math.round(totalMins % 60);
          return h > 0 ? `${h}h ${m}m` : `${m}m`;
        })()
    : "";

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 p-6">
      <Card className="w-full max-w-md overflow-auto">
        <CardHeader>
          <CardTitle>Plan Your Route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!userLocation && locationLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Getting your location...</AlertDescription>
            </Alert>
          )}

          {userLocation && (
            <div className="rounded-lg bg-green-50 p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Location detected
                </span>
              </div>
            </div>
          )}

          {routeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to plan route. Try again.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label>Your Route</Label>
            {stops.map((stop, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border p-3"
                data-testid={`stop-${index}`}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{stop}</span>
                  {routeData?.destinations[index] && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {routeData.destinations[index].estimatedDistanceKm
                          ? `${routeData.destinations[index].estimatedDistanceKm} km`
                          : ""}{" "}
                        {routeData.destinations[index].estimatedTimeMinutes
                          ? `• ${optimize ? routeData.destinations[index].estimatedTimeMinutes : Math.round(routeData.destinations[index].estimatedTimeMinutes * 1.1)} min`
                          : ""}
                      </p>
                      {routeData.destinations[index].crowdLevel && (
                        <Badge
                          variant={
                            routeData.destinations[index].crowdLevel === "Low"
                              ? "secondary"
                              : routeData.destinations[index].crowdLevel === "High" ||
                                routeData.destinations[index].crowdLevel === "Very High"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {routeData.destinations[index].crowdLevel}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {customAttractions.includes(stop) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStop(index)}
                    data-testid={`button-remove-stop-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-stop">Add a Place</Label>
            <div className="flex gap-2">
              <Input
                id="new-stop"
                placeholder="Type place name..."
                value={newStop}
                onChange={(e) => setNewStop(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newStop.trim()) {
                    addStop();
                  }
                }}
                data-testid="input-new-stop"
              />
              <Button 
                onClick={() => addStop()} 
                size="icon" 
                data-testid="button-add-stop"
                disabled={!newStop.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="optimize">Optimize for Low Crowds</Label>
              <p className="text-xs text-muted-foreground">
                Route avoids busy places
              </p>
            </div>
            <Switch
              id="optimize"
              checked={optimize}
              onCheckedChange={setOptimize}
              data-testid="switch-optimize"
            />
          </div>

          {routeLoading && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                Planning your route...
              </AlertDescription>
            </Alert>
          )}

          {routeData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Route className="h-4 w-4" />
                  Route Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Distance</span>
                  <span className="font-semibold" data-testid="text-distance">
                    {displayDistance}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Time</span>
                  <span className="font-semibold" data-testid="text-time">
                    {displayTime}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}



          {routeData?.tips && routeData.tips.length > 0 && (
            <div className="rounded-lg border border-blue-500/50 bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                Travel Tips:
              </p>
              <ul className="space-y-1">
                {routeData.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-blue-800 dark:text-blue-200">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {routeData?.crowdWarnings && routeData.crowdWarnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                    Crowd Warnings:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {routeData.crowdWarnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-yellow-800 dark:text-yellow-200">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {routeData?.directions && (
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-semibold">Directions</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {routeData.directions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex-1">
        <RouteMap 
          stops={stops} 
          userLocation={userLocation || undefined}
          routeData={routeData}
          optimized={optimize}
        />
      </div>
    </div>
  );
}
