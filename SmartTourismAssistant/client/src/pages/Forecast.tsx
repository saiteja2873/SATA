import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ForecastGauge from "@/components/ForecastGauge";
import CrowdChart from "@/components/CrowdChart";
import { Badge } from "@/components/ui/badge";
import { Cloud, Sun, CloudRain, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface ForecastData {
  currentCrowdLevel: number;
  crowdCategory: string;
  estimatedVisitors: number;
  peakTime: string;
  bestVisitTime: string;
  confidence: number;
  factors: string[];
  weeklyForecast: Array<{
    day: string;
    date: string;
    crowdLevel: number;
    visitors: number;
    category: string;
    weather: string;
    temperature: number;
    recommendation: string;
  }>;
  weatherImpact: {
    overall: string;
    description: string;
  };
  recommendations: string[];
  insights: string;
}

const ATTRACTIONS = [
  { id: "charminar", name: "Charminar", lat: 17.3616, lng: 78.4747 },
  { id: "golconda", name: "Golconda Fort", lat: 17.3833, lng: 78.4011 },
  { id: "ramoji", name: "Ramoji Film City", lat: 17.2543, lng: 78.6808 },
  { id: "hussain-sagar", name: "Hussain Sagar Lake", lat: 17.4239, lng: 78.4738 },
  { id: "qutub-shahi", name: "Qutub Shahi Tombs", lat: 17.3937, lng: 78.3899 },
];

export default function Forecast() {
  const [selectedAttraction, setSelectedAttraction] = useState(ATTRACTIONS[0].id);
  const [selectedDate, setSelectedDate] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);

  // Set default date to today
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  const attraction = ATTRACTIONS.find(a => a.id === selectedAttraction);

  const { data: forecastData, isLoading, error, refetch } = useQuery<ForecastData>({
    queryKey: ["crowdForecast", selectedAttraction, selectedDate],
    queryFn: async () => {
      if (!attraction) throw new Error("Invalid attraction");
      
      const params = new URLSearchParams({
        attraction: attraction.name,
        lat: String(attraction.lat),
        lng: String(attraction.lng),
        ...(selectedDate && { date: selectedDate }),
      });

      const res = await apiRequest("GET", `/api/crowd/forecast?${params.toString()}`);
      return res.json() as Promise<ForecastData>;
    },
    enabled: shouldFetch && !!attraction && !!selectedDate,
  });

  const handleForecast = () => {
    setShouldFetch(true);
    refetch();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">Crowd Forecast</h1>
        <p className="text-muted-foreground">
          Visitor predictions for popular attractions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Attraction & Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="attraction">Attraction</Label>
              <Select
                value={selectedAttraction}
                onValueChange={setSelectedAttraction}
              >
                <SelectTrigger id="attraction" data-testid="select-attraction">
                  <SelectValue placeholder="Select attraction" />
                </SelectTrigger>
                <SelectContent>
                  {ATTRACTIONS.map(attr => (
                    <SelectItem key={attr.id} value={attr.id}>
                      {attr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                data-testid="input-forecast-date"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleForecast}
                className="w-full"
                data-testid="button-generate-forecast"
                disabled={isLoading || !selectedDate}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Forecast"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to generate forecast. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {forecastData && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Current Crowd Level</CardTitle>
              </CardHeader>
              <CardContent>
                <ForecastGauge 
                  level={forecastData.currentCrowdLevel} 
                  label={attraction?.name || "Attraction"} 
                />
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Visitors</span>
                    <span className="font-semibold" data-testid="text-visitors">
                      {forecastData.estimatedVisitors.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Peak Time</span>
                    <span className="font-semibold" data-testid="text-peak-time">
                      {forecastData.peakTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Best Visit Time</span>
                    <span className="font-semibold text-green-600">
                      {forecastData.bestVisitTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <Badge variant="secondary">{forecastData.confidence}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>7-Day Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <CrowdChart data={forecastData.weeklyForecast} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weather Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forecastData.weeklyForecast.slice(0, 3).map((day, idx) => {
                    const WeatherIcon = 
                      day.weather === "Sunny" ? Sun : 
                      day.weather === "Rainy" ? CloudRain : 
                      Cloud;
                    
                    const badgeVariant = 
                      day.recommendation.includes("Good") ? "secondary" : 
                      day.recommendation.includes("Best") ? "default" : 
                      "destructive";

                    return (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border p-4">
                        <WeatherIcon className={`h-8 w-8 ${
                          day.weather === "Sunny" ? "text-yellow-500" : 
                          day.weather === "Rainy" ? "text-blue-500" : 
                          "text-gray-500"
                        }`} />
                        <div>
                          <p className="font-semibold">{day.day}</p>
                          <p className="text-sm text-muted-foreground">
                            {day.weather}, {day.temperature}°C
                          </p>
                        </div>
                        <Badge variant={badgeVariant} className="ml-auto">
                          {day.category}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium">Overall Impact: {forecastData.weatherImpact.overall}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {forecastData.weatherImpact.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Factors & Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Factors Affecting Crowds:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {forecastData.factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Recommendations:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {forecastData.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {forecastData.insights}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
