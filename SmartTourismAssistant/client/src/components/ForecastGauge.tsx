interface ForecastGaugeProps {
  level: number;
  label?: string;
}

export default function ForecastGauge({ level, label = "Crowd Level" }: ForecastGaugeProps) {
  const percentage = Math.min(Math.max(level, 0), 100);
  
  const getColor = () => {
    if (percentage < 33) return "bg-green-500";
    if (percentage < 66) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatus = () => {
    if (percentage < 33) return "Low";
    if (percentage < 66) return "Moderate";
    return "High";
  };

  return (
    <div className="w-full" data-testid="gauge-forecast">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold" data-testid="text-status">
          {getStatus()}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
          data-testid="gauge-bar"
        />
      </div>
      <div className="mt-1 text-right text-xs text-muted-foreground" data-testid="text-percentage">
        {percentage}%
      </div>
    </div>
  );
}
