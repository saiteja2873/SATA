import { Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import heroImage from "@assets/generated_images/Hero_beach_destination_panorama_c0b7d71f.png";

export default function HeroSection() {
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  const handleSearch = () => {
    console.log("Search triggered for:", { destination, date });
  };

  return (
    <div className="relative h-[85vh] w-full overflow-hidden rounded-xl">
      <img
        src={heroImage}
        alt="Beautiful tropical destination"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
      
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 font-accent text-5xl font-bold text-white md:text-6xl">
          Plan Your Smart Journey
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
          AI-powered travel insights with crowd forecasting, optimized routes, and cultural recommendations
        </p>
        
        <div className="mb-6 flex w-full max-w-3xl flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Where do you want to go?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-12 pl-10 backdrop-blur-sm bg-white/90 dark:bg-black/50"
              data-testid="input-destination"
            />
          </div>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 pl-10 backdrop-blur-sm bg-white/90 dark:bg-black/50"
              data-testid="input-date"
            />
          </div>
          <Button
            size="lg"
            onClick={handleSearch}
            className="h-12 px-8"
            data-testid="button-search"
          >
            Get Forecast
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="lg"
          className="backdrop-blur-sm bg-white/20 border-white/30 text-white hover:bg-white/30"
          data-testid="button-cta"
        >
          Explore AI Recommendations
        </Button>
      </div>
    </div>
  );
}
