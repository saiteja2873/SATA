import { useState, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "@/context/location-context";

interface LocationInfo {
  display_name: string;
  address: {
    city?: string;
    country?: string;
  };
}

export default function LocationDisplay() {
  // 🔹 Global location context (used by Reviews page)
  const { setLocation } = useLocation();

  // 🔹 Local UI state
  const [location, setLocationState] = useState<LocationInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 🔹 Reverse geocoding mutation
  const geocodeMutation = useMutation({
    mutationFn: async (coords: { lat: number; lon: number }) => {
      const res = await apiRequest("POST", "/api/geocode/reverse", coords);
      return res.json() as Promise<LocationInfo>;
    },
    onSuccess: (data, variables) => {
      // ✅ Store location globally (for geo-based reviews)
      setLocation({
        lat: variables.lat,
        lng: variables.lon,
        placeName: data.address.city || data.address.country,
      });

      // ✅ Keep UI state
      setLocationState(data);
      setIsInitialLoad(false);
    },
    onError: () => {
      setIsInitialLoad(false);
    },
  });

  // 🔹 Request location ONCE when app loads
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          geocodeMutation.mutate({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location access denied:", error);
          setIsInitialLoad(false);
        }
      );
    } else {
      setIsInitialLoad(false);
    }
  }, []);

  // 🔹 Retry location access
  const handleRetryLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          geocodeMutation.mutate({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location access denied:", error);
        }
      );
    }
  };

  // 🔹 Text shown in header
  const getDisplayText = () => {
    if (geocodeMutation.isPending || isInitialLoad) {
      return "Detecting...";
    }
    if (location) {
      return (
        location.address.city ||
        location.address.country ||
        "Location found"
      );
    }
    return "Location access denied";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {geocodeMutation.isPending || isInitialLoad ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <span className="text-sm">{getDisplayText()}</span>
        </Button>
      </PopoverTrigger>

      {location && (
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Your Location</p>
              <p className="font-semibold text-sm">
                {location.display_name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <p className="text-xs text-muted-foreground">City</p>
                <p className="text-sm font-medium">
                  {location.address.city || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm font-medium">
                  {location.address.country || "N/A"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setLocation(null);       // clear global
                setLocationState(null); // clear UI
                setIsOpen(false);
              }}
            >
              Clear Location
            </Button>
          </div>
        </PopoverContent>
      )}

      
      {!location && !isInitialLoad && (
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <p className="text-sm">
              Location access was denied or unavailable.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleRetryLocation}
            >
              Try Again
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
