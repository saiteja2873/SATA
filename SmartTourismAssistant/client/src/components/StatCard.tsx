import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  testId?: string;
}

export default function StatCard({ title, value, icon: Icon, trend, testId }: StatCardProps) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="mt-2 text-3xl font-bold" data-testid={`${testId}-value`}>
              {value}
            </h3>
            {trend && (
              <p className="mt-2 text-xs text-muted-foreground" data-testid={`${testId}-trend`}>
                {trend}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
