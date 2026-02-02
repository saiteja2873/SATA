import HeroSection from "@/components/HeroSection";
import AttractionCard from "@/components/AttractionCard";
import StatCard from "@/components/StatCard";
import { Users, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import eiffelImage from "@assets/generated_images/Eiffel_Tower_attraction_photo_976726da.png";
import machuImage from "@assets/generated_images/Machu_Picchu_attraction_photo_668a9cd9.png";
import tajImage from "@assets/generated_images/Taj_Mahal_attraction_photo_6e604541.png";
import santoriniImage from "@assets/generated_images/Santorini_Greece_attraction_2db60e3b.png";

export default function Home() {
  const attractions = [
    {
      id: "eiffel",
      name: "Eiffel Tower",
      location: "Paris, France",
      image: eiffelImage,
      crowdLevel: "moderate" as const,
      visitorCount: 12500,
    },
    {
      id: "machu",
      name: "Machu Picchu",
      location: "Cusco, Peru",
      image: machuImage,
      crowdLevel: "low" as const,
      visitorCount: 3200,
    },
    {
      id: "taj",
      name: "Taj Mahal",
      location: "Agra, India",
      image: tajImage,
      crowdLevel: "high" as const,
      visitorCount: 18900,
    },
    {
      id: "santorini",
      name: "Santorini",
      location: "Greece",
      image: santoriniImage,
      crowdLevel: "moderate" as const,
      visitorCount: 8700,
    },
  ];

  return (
    <div className="space-y-12">
      <HeroSection />

      <div className="px-6">
        <h2 className="mb-6 text-3xl font-bold">Today's Overview</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Attractions"
            value="247"
            icon={Users}
            trend="+12% from last month"
            testId="stat-total-attractions"
          />
          <StatCard
            title="Avg Crowd Level"
            value="62%"
            icon={TrendingUp}
            trend="Moderate activity"
            testId="stat-avg-crowd"
          />
          <StatCard
            title="Weather Alerts"
            value="3"
            icon={AlertTriangle}
            trend="2 locations affected"
            testId="stat-weather-alerts"
          />
          <StatCard
            title="AI Recommendations"
            value="18"
            icon={Sparkles}
            trend="Based on your interests"
            testId="stat-recommendations"
          />
        </div>
      </div>

      <div className="px-6">
        <h2 className="mb-6 text-3xl font-bold">Popular Attractions</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {attractions.map((attraction) => (
            <AttractionCard key={attraction.id} {...attraction} />
          ))}
        </div>
      </div>
    </div>
  );
}
