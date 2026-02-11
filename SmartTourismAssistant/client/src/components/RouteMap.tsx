'use client';

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L, { LatLngExpression, DivIcon } from "leaflet";
import { Card } from "@/components/ui/card";
import "leaflet/dist/leaflet.css";

interface Stop {
  name: string;
  lat?: number;
  lng?: number;
}

interface RouteMapProps {
  stops: string[] | Stop[];
  userLocation?: { lat: number; lng: number };
  routeData?: {
    startLocation?: string;
    destinations?: Array<{ name: string; lat?: number; lng?: number; description?: string }>;
  };
}

// Custom icons
const createMarkerIcon = (color: string): DivIcon => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        font-weight: bold;
        color: white;
        font-size: 12px;
      ">
      </div>
    `,
    iconSize: [30, 30],
    className: "custom-marker",
  });
};

const startIcon = createMarkerIcon("#3b82f6"); // blue
const stopIcon = createMarkerIcon("#ef4444"); // red
const userIcon = createMarkerIcon("#10b981"); // green

export default function RouteMap({ stops, userLocation, routeData }: RouteMapProps) {
  const mapRef = useRef(null);

  // Convert stops to Stop objects if they're strings
  const convertedStops: Stop[] = stops.map((stop) => {
    if (typeof stop === "string") {
      // Try to find corresponding destination data
      const destData = routeData?.destinations?.find((d) => d.name === stop);
      return {
        name: stop,
        lat: destData?.lat,
        lng: destData?.lng,
      };
    }
    return stop;
  });

  // Calculate bounds for all points
  const allPoints = [
    ...(userLocation ? [userLocation] : []),
    ...convertedStops.filter((stop) => stop.lat && stop.lng).map((stop) => ({ lat: stop.lat!, lng: stop.lng! })),
  ];

  const defaultCenter: LatLngExpression = userLocation ? [userLocation.lat, userLocation.lng] : [40, 0];

  // Get route polyline coordinates
  const routeCoordinates: LatLngExpression[] = convertedStops
    .filter((stop) => stop.lat && stop.lng)
    .map((stop) => [stop.lat!, stop.lng!]);

  return (
    <Card className="h-full w-full overflow-hidden">
      <MapContainer
        center={defaultCenter as LatLngExpression}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Draw route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.7, dashArray: "5, 5" }}
            positions={routeCoordinates as LatLngExpression[]}
          />
        )}

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng] as LatLngExpression} icon={userIcon}>
            <Popup>
              <div className="text-sm font-semibold">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Route stop markers */}
        {convertedStops.map((stop, index) => (
          stop.lat && stop.lng ? (
            <Marker
              key={index}
              position={[stop.lat, stop.lng] as LatLngExpression}
              icon={index === 0 ? startIcon : stopIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{index + 1}. {stop.name}</div>
                  {routeData?.destinations?.[index]?.description && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {routeData.destinations[index].description}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </Card>
  );
}
