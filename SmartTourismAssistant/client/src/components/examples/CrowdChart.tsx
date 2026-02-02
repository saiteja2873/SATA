import CrowdChart from '../CrowdChart';

export default function CrowdChartExample() {
  const mockData = [
    { day: "Mon", visitors: 12000 },
    { day: "Tue", visitors: 9500 },
    { day: "Wed", visitors: 11200 },
    { day: "Thu", visitors: 8800 },
    { day: "Fri", visitors: 14500 },
    { day: "Sat", visitors: 18200 },
    { day: "Sun", visitors: 16800 },
  ];

  return (
    <div className="h-80 w-full p-6">
      <CrowdChart data={mockData} />
    </div>
  );
}
