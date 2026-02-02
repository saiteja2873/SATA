import { useState } from "react";
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
import { Cloud, Sun, CloudRain } from "lucide-react";

export default function Forecast() {
  const [selectedAttraction, setSelectedAttraction] = useState("eiffel");
  const [selectedDate, setSelectedDate] = useState("");

  const mockChartData = [
    { day: "Mon", visitors: 12000 },
    { day: "Tue", visitors: 9500 },
    { day: "Wed", visitors: 11200 },
    { day: "Thu", visitors: 8800 },
    { day: "Fri", visitors: 14500 },
    { day: "Sat", visitors: 18200 },
    { day: "Sun", visitors: 16800 },
  ];

  const handleForecast = () => {
    console.log("Generate forecast for:", { selectedAttraction, selectedDate });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">Crowd Forecast</h1>
        <p className="text-muted-foreground">
          AI-powered visitor predictions for popular attractions
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
                  <SelectItem value="eiffel">Eiffel Tower</SelectItem>
                  <SelectItem value="machu">Machu Picchu</SelectItem>
                  <SelectItem value="taj">Taj Mahal</SelectItem>
                  <SelectItem value="santorini">Santorini</SelectItem>
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
              >
                Generate Forecast
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current Crowd Level</CardTitle>
          </CardHeader>
          <CardContent>
            <ForecastGauge level={62} label="Eiffel Tower" />
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Visitors</span>
                <span className="font-semibold" data-testid="text-visitors">12,500</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Peak Time</span>
                <span className="font-semibold" data-testid="text-peak-time">2:00 PM - 4:00 PM</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>7-Day Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <CrowdChart data={mockChartData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weather Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Sun className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="font-semibold">Today</p>
                <p className="text-sm text-muted-foreground">Sunny, 24°C</p>
              </div>
              <Badge variant="secondary" className="ml-auto">Optimal</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Cloud className="h-8 w-8 text-gray-500" />
              <div>
                <p className="font-semibold">Tomorrow</p>
                <p className="text-sm text-muted-foreground">Cloudy, 21°C</p>
              </div>
              <Badge variant="secondary" className="ml-auto">Good</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CloudRain className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-semibold">Wednesday</p>
                <p className="text-sm text-muted-foreground">Rainy, 18°C</p>
              </div>
              <Badge className="ml-auto bg-yellow-500 text-white">Alert</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
