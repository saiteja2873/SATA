import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import RouteMap from "@/components/RouteMap";
import { Plus, X, Navigation, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RoutePlanner() {
  const [stops, setStops] = useState(["Eiffel Tower", "Louvre Museum", "Notre Dame"]);
  const [newStop, setNewStop] = useState("");
  const [optimize, setOptimize] = useState(true);

  const addStop = () => {
    if (newStop.trim()) {
      setStops([...stops, newStop]);
      setNewStop("");
      console.log("Added stop:", newStop);
    }
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
    console.log("Removed stop at index:", index);
  };

  const generateRoute = () => {
    console.log("Generate route with stops:", stops, "Optimize:", optimize);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 p-6">
      <Card className="w-full max-w-md overflow-auto">
        <CardHeader>
          <CardTitle>Route Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Destinations</Label>
            {stops.map((stop, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border p-3"
                data-testid={`stop-${index}`}
              >
                <MapPin className="h-4 w-4 text-primary" />
                <span className="flex-1 text-sm font-medium">{stop}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStop(index)}
                  data-testid={`button-remove-stop-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-stop">Add Destination</Label>
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
            onClick={generateRoute}
            className="w-full"
            size="lg"
            data-testid="button-generate-route"
          >
            <Navigation className="mr-2 h-4 w-4" />
            Generate Optimal Route
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Distance</span>
                <span className="font-semibold" data-testid="text-distance">8.4 km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Time</span>
                <span className="font-semibold" data-testid="text-time">2h 15m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Traffic Status</span>
                <Badge variant="secondary" data-testid="badge-traffic">Moderate</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weather</span>
                <Badge className="bg-green-500 text-white" data-testid="badge-weather">Clear</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Avoid Louvre between 2-4 PM (High crowd)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1">
        <RouteMap stops={stops} />
      </div>
    </div>
  );
}
