import { Card } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

interface RouteMapProps {
  stops: string[];
}

export default function RouteMap({ stops }: RouteMapProps) {
  return (
    <Card className="h-full w-full overflow-hidden">
      <div className="relative flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-8 p-12">
          <Navigation className="h-16 w-16 text-primary" />
          <div className="text-center">
            <h3 className="mb-2 text-xl font-semibold">Interactive Route Map</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Optimized route with {stops.length} stops
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {stops.map((stop, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-card px-3 py-2"
                  data-testid={`route-stop-${index}`}
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{stop}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
