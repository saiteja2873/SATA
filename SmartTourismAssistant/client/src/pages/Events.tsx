import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import EventCard from "@/components/EventCard";
import PlaceReviews from "@/components/PlaceReviews";
import RatingBadge from "@/components/RatingBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertTriangle, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface Event {
  id?: string;
  name: string;
  date: string;
  category?: string;
  venue?: string;
  place_text?: string;
  lat?: number;
  lng?: number;
  description?: string | null;
  start_local?: string | null;
  end_local?: string | null;
  timezone?: string | null;
  phq_attendance?: number | null;
  predicted_event_spend?: number | null;
  phq_labels?: string[];
}

export default function Events() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location from sessionStorage
  useEffect(() => {
    // Try to get location from geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      );
    }
  }, []);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events based on user location
  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["events", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      if (!userLocation) return [];

      const res = await apiRequest(
        "GET",
        `/api/events?lat=${userLocation.lat}&lng=${userLocation.lng}&radius_km=150&size=10`
      );
      return res.json() as Promise<Event[]>;
    },
    enabled: !!userLocation,
  });

  return (
    <div className="space-y-8 px-6 py-8">
      <div>
        <h1 className="mb-2 flex items-center gap-2 text-4xl font-bold">
          <Sparkles className="h-8 w-8" />
          Cultural Events
        </h1>
        <p className="text-muted-foreground">
          Discover exciting events happening in your region
        </p>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load events. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {!userLocation && !isLoading && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please enable location access to see events in your region.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="space-y-3 pt-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : events.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No events found in your region at this time.
            </p>
          </div>
        ) : (
          events.map((event, idx) => (
            <EventCard
              key={event.id ?? String(idx)}
              id={event.id ?? String(idx)}
              name={event.name}
              date={event.date}
              city={event.venue ?? event.place_text ?? ""}
              image={(event as any).image ?? "/placeholder.jpg"}
              tags={(event.phq_labels ?? [event.category ?? "event"]).map((t) =>
                typeof t === "string" ? t : (t as any)?.label ?? String(t)
              )}
              description={event.description ?? null}
              onOpen={() => setSelectedEvent(event)}
            />
          ))
        )}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogTitle className="flex items-center justify-between">
            <span>{selectedEvent?.name}</span>
            <RatingBadge placeName={selectedEvent?.name || ""} showCount={true} />
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-6">
              <div>
                <p className="text-foreground">{selectedEvent?.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">When</h4>
                  <div className="text-sm">{selectedEvent ? new Date(selectedEvent.date).toLocaleString() : ""}</div>
                  {selectedEvent?.start_local && <div className="text-sm">{selectedEvent.start_local} — {selectedEvent.end_local}</div>}
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Details</h4>
                  <div className="text-sm">Category: {selectedEvent?.category}</div>
                  <div className="text-sm">Attendance (pred): {selectedEvent?.phq_attendance ?? "—"}</div>
                  <div className="text-sm">Predicted spend: {selectedEvent?.predicted_event_spend ?? "—"}</div>
                  <div className="text-sm">Venue: {selectedEvent?.venue ?? selectedEvent?.place_text ?? "—"}</div>
                  {selectedEvent?.lat && selectedEvent?.lng && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedEvent.lat},${selectedEvent.lng}`}
                      >
                        View on map
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* User Reviews Section */}
              {selectedEvent?.name && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Community Reviews</h3>
                  <PlaceReviews 
                    placeName={selectedEvent.name} 
                    placeType="event"
                  />
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

    </div>
  );
}
