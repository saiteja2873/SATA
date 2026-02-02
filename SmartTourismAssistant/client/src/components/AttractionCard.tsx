import { MapPin, Users } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AttractionCardProps {
  id: string;
  name: string;
  location: string;
  image: string;
  crowdLevel: "low" | "moderate" | "high";
  visitorCount: number;
}

const crowdColors = {
  low: "bg-green-500",
  moderate: "bg-yellow-500",
  high: "bg-red-500",
};

const crowdLabels = {
  low: "Low Crowd",
  moderate: "Moderate",
  high: "Crowded",
};

export default function AttractionCard({
  id,
  name,
  location,
  image,
  crowdLevel,
  visitorCount,
}: AttractionCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-attraction-${id}`}>
      <div className="relative h-48 w-full">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
      <CardContent className="p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-semibold" data-testid={`text-name-${id}`}>
            {name}
          </h3>
          <Badge
            className={`${crowdColors[crowdLevel]} text-white`}
            data-testid={`badge-crowd-${id}`}
          >
            {crowdLabels[crowdLevel]}
          </Badge>
        </div>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span data-testid={`text-location-${id}`}>{location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          <span data-testid={`text-visitors-${id}`}>
            ~{visitorCount.toLocaleString()} visitors today
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button
          variant="outline"
          className="w-full"
          data-testid={`button-forecast-${id}`}
          onClick={() => console.log(`View forecast for ${name}`)}
        >
          View Forecast
        </Button>
      </CardFooter>
    </Card>
  );
}
