import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface LocationData {
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    country: string;
    state?: string;
    city?: string;
  };
}

export default function LocationFinder() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const geocodeMutation = useMutation({
    mutationFn: async (coords: { lat: number; lon: number }) => {
      const res = await apiRequest("POST", "/api/geocode/reverse", coords);
      return res.json() as Promise<LocationData>;
    },
    onSuccess: (data) => {
      setLocationData(data);
    },
    onError: (error) => {
      console.error("Geocoding failed:", error);
      setLocationData(null);
    },
  });

  const handleGeocode = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      alert("Please enter valid latitude and longitude");
      return;
    }

    geocodeMutation.mutate({ lat, lon });
  };

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <MapPin className="h-6 w-6" />
          Location Finder
        </h2>

        <form onSubmit={handleGeocode} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Latitude
              </label>
              <Input
                type="number"
                step="0.0001"
                placeholder="e.g., 48.8584"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Longitude
              </label>
              <Input
                type="number"
                step="0.0001"
                placeholder="e.g., 2.2945"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={geocodeMutation.isPending}
              className="flex-1"
            >
              {geocodeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding Location...
                </>
              ) : (
                "Find Location"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGetCurrentLocation}
            >
              Use My Location
            </Button>
          </div>
        </form>
      </Card>

      {locationData && (
        <Card className="p-6">
          <h3 className="mb-4 text-xl font-semibold">Location Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Full Address</p>
              <p className="font-medium">{locationData.display_name}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{locationData.address.city || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">State/Region</p>
                <p className="font-medium">{locationData.address.state || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="font-medium">{locationData.address.country}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">Coordinates</p>
              <p className="font-mono text-sm">
                {locationData.lat}, {locationData.lon}
              </p>
            </div>
          </div>
        </Card>
      )}

      {geocodeMutation.isError && (
        <Card className="border-red-200 bg-red-50 p-6">
          <p className="text-red-800">
            Failed to find location. Please try again.
          </p>
        </Card>
      )}
    </div>
  );
}
