import { useState } from "react";
import { Calendar, MapPin, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  id: string;
  name: string;
  date: string;
  city?: string;
  image?: string;
  tags?: string[];
  aiRecommended?: boolean;
  description?: string | null;
  onOpen?: (id: string) => void;
}

export default function EventCard({
  id,
  name,
  date,
  city = "",
  image = "/placeholder.jpg",
  tags = [],
  aiRecommended = false,
  description = null,
  onOpen,
}: EventCardProps) {
  const [imageError, setImageError] = useState(false);
  const handleOpen = () => onOpen?.(id);

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-rose-500",
  ];
  
  // Use a consistent color based on event name
  const colorIndex = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <Card
      className="overflow-hidden hover-elevate cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleOpen();
      }}
      data-testid={`card-event-${id}`}
    >
      <div className={`relative h-40 w-full overflow-hidden ${bgColor}`}>
        {!imageError && image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800">
            <ImageIcon className="h-12 w-12 text-slate-500 opacity-50" />
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h3 className="flex-1 text-lg font-semibold" data-testid={`text-event-name-${id}`}>
            {name}
          </h3>
          {aiRecommended && (
            <Badge className="bg-primary text-primary-foreground" data-testid={`badge-ai-${id}`}>
              AI
            </Badge>
          )}
        </div>
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span data-testid={`text-date-${id}`}>{date}</span>
        </div>
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span data-testid={`text-city-${id}`}>{city}</span>
        </div>

        {description && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-3" data-testid={`desc-${id}`}>
            {description}
          </p>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-tag-${id}-${index}`}>
              {tag}
            </Badge>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full"
          data-testid={`button-learn-more-${id}`}
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
        >
          Learn More
        </Button>
      </CardContent>
    </Card>
  );
}
