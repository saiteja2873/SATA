import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import RouteMap from "@/components/RouteMap";
import { Plus, X, Navigation, Clock, MapPin, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface RouteData {
  startLocation: string;
  destinations: Array<{
    name: string;
    order: number;
    estimatedDistanceKm: number;
    estimatedTimeMinutes: number;
    description?: string;
  }>;
  optimizedRoute: string[];
  totalDistance: string;
  estimatedTime: string;
  directions: string;
  tips: string[];
  crowdWarnings: string[];
}

export default function RoutePlanner() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [newStop, setNewStop] = useState("");
  const [optimize, setOptimize] = useState(true);
  const [customAttractions, setCustomAttractions] = useState<string[]>([]);

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

  const { data: routeData, isLoading: routeLoading, error: routeError, refetch } = useQuery<RouteData>({
    queryKey: ["routePlan", userLocation, customAttractions, optimize],
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
    enabled: !!userLocation,
  });

  const addStop = () => {
    if (newStop.trim()) {
      setCustomAttractions([...customAttractions, newStop]);
      setNewStop("");
    }
  };

  const removeStop = (index: number) => {
    setCustomAttractions(customAttractions.filter((_, i) => i !== index));
  };

  const stops = routeData?.optimizedRoute || customAttractions;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 p-6">
      <Card className="w-full max-w-md overflow-auto">
        <CardHeader>
          <CardTitle>Route Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                <MapPin className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{stop}</span>
                  {routeData?.destinations[index] && (
                    <p className="text-xs text-muted-foreground">
                      {routeData.destinations[index].estimatedDistanceKm} km •{" "}
                      {routeData.destinations[index].estimatedTimeMinutes} min
                    </p>
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
            <Label htmlFor="new-stop">Add Custom Destination</Label>
            <div className="flex gap-2">
              <Input
                id="new-stop"
                placeholder="Enter location..."
                value={newStop}
                onChange={(e) => setNewStop(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStop()}
                data-testid="input-new-stop"
              />
              <Button onClick={addStop} size="icon" data-testid="button-add-stop">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="optimize">Optimize Route</Label>
              <p className="text-xs text-muted-foreground">
                Minimize travel time and distance
              </p>
            </div>
            <Switch
              id="optimize"
              checked={optimize}
              onCheckedChange={setOptimize}
              data-testid="switch-optimize"
            />
          </div>

          <Button
            onClick={() => refetch()}
            className="w-full"
            size="lg"
            data-testid="button-generate-route"
            disabled={routeLoading}
          >
            {routeLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Planning Route...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Generate Optimal Route
              </>
            )}
          </Button>

          {routeData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Route Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Distance</span>
                  <span className="font-semibold" data-testid="text-distance">
                    {routeData.totalDistance}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Time</span>
                  <span className="font-semibold" data-testid="text-time">
                    {routeData.estimatedTime}
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
        />
      </div>
    </div>
  );
}
