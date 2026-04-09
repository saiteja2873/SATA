'use client';

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L, { LatLngExpression, LatLngBounds, DivIcon } from "leaflet";
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
  optimized?: boolean;
  routeData?: {
    startLocation?: string;
    destinations?: Array<{ name: string; lat?: number; lng?: number; description?: string; crowdLevel?: string; distanceKm?: number }>;
  };
}

// Custom icons
const createMarkerIcon = (color: string, label?: string): DivIcon => {
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
        ${label || ""}
      </div>
    `,
    iconSize: [30, 30],
    className: "custom-marker",
  });
};

const userIcon = createMarkerIcon("#10b981"); // green

/**
 * Fetch actual road route geometry from OSRM (free, no API key).
 * Fetches each leg separately to handle long-distance routes that may
 * fail when sent as a single multi-waypoint request.
 */
async function fetchOSRMRoute(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<LatLngExpression[]> {
  if (waypoints.length < 2) return [];

  const allCoords: LatLngExpression[] = [];

  // Fetch each leg independently
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      if (!data.routes || data.routes.length === 0) continue;

      const geojsonCoords: [number, number][] = data.routes[0].geometry.coordinates;
      const legCoords = geojsonCoords.map(([lng, lat]) => [lat, lng] as LatLngExpression);

      // Skip the first point of subsequent legs to avoid duplicates
      if (allCoords.length > 0 && legCoords.length > 0) {
        allCoords.push(...legCoords.slice(1));
      } else {
        allCoords.push(...legCoords);
      }
    } catch {
      // If a leg fails, add a straight line for that segment
      allCoords.push([from.lat, from.lng] as LatLngExpression);
      allCoords.push([to.lat, to.lng] as LatLngExpression);
    }
  }

  return allCoords;
}

/** Auto-fit the map viewport to show all points */
function FitBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }

    const bounds = new LatLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [map, points]);

  return null;
}

export default function RouteMap({ stops, userLocation, routeData, optimized = true }: RouteMapProps) {
  const mapRef = useRef(null);
  const [roadRoute, setRoadRoute] = useState<LatLngExpression[]>([]);

  // Convert stops to Stop objects if they're strings
  const convertedStops: Stop[] = stops.map((stop) => {
    if (typeof stop === "string") {
      const destData = routeData?.destinations?.find((d) => d.name === stop);
      return {
        name: stop,
        lat: destData?.lat,
        lng: destData?.lng,
      };
    }
    return stop;
  });

  // All points with valid coords
  const allPoints = [
    ...(userLocation ? [userLocation] : []),
    ...convertedStops.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat!, lng: s.lng! })),
  ];

  const defaultCenter: LatLngExpression = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [20, 78]; // Default to India center

  // Build waypoints for OSRM: user location → stops in order
  const waypoints = [
    ...(userLocation ? [{ lat: userLocation.lat, lng: userLocation.lng }] : []),
    ...convertedStops.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat!, lng: s.lng! })),
  ];

  // Fetch real road route whenever waypoints change
  useEffect(() => {
    if (waypoints.length < 2) {
      setRoadRoute([]);
      return;
    }

    let cancelled = false;
    fetchOSRMRoute(waypoints).then((coords) => {
      if (!cancelled) setRoadRoute(coords);
    });
    return () => { cancelled = true; };
  }, [JSON.stringify(waypoints)]);

  // Fallback straight-line if OSRM fails
  const routeLine: LatLngExpression[] =
    roadRoute.length > 0
      ? roadRoute
      : waypoints.map((p) => [p.lat, p.lng] as LatLngExpression);

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

        <FitBounds points={allPoints} />

        {/* Draw actual road route */}
        {routeLine.length > 1 && (
          <Polyline
            pathOptions={{
              color: optimized ? "#3b82f6" : "#f59e0b",
              weight: 5,
              opacity: 0.8,
            }}
            positions={routeLine}
          />
        )}

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng] as LatLngExpression} icon={userIcon}>
            <Popup>
              <div className="text-sm font-semibold">📍 Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Route stop markers with numbered icons */}
        {convertedStops.map((stop, index) =>
          stop.lat && stop.lng ? (
            <Marker
              key={index}
              position={[stop.lat, stop.lng] as LatLngExpression}
              icon={createMarkerIcon(index === 0 ? "#3b82f6" : "#ef4444", String(index + 1))}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{index + 1}. {stop.name}</div>
                  {routeData?.destinations?.[index]?.description && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {routeData.destinations[index].description}
                    </div>
                  )}
                  {routeData?.destinations?.[index]?.distanceKm && (
                    <div className="mt-1 text-xs">
                      📍 {routeData.destinations[index].distanceKm} km from previous
                    </div>
                  )}
                  {routeData?.destinations?.[index]?.crowdLevel && (
                    <div className="mt-1 text-xs">
                      👥 Crowd: {routeData.destinations[index].crowdLevel}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </Card>
  );
}
