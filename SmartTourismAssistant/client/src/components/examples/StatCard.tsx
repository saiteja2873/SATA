import StatCard from '../StatCard';
import { Users } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="max-w-sm">
      <StatCard
        title="Total Attractions"
        value="247"
        icon={Users}
        trend="+12% from last month"
        testId="stat-attractions"
      />
    </div>
  );
}
