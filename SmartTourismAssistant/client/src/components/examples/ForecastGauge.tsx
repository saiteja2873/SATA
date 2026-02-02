import ForecastGauge from '../ForecastGauge';

export default function ForecastGaugeExample() {
  return (
    <div className="max-w-md space-y-6 p-6">
      <ForecastGauge level={25} label="Eiffel Tower" />
      <ForecastGauge level={55} label="Louvre Museum" />
      <ForecastGauge level={85} label="Notre Dame" />
    </div>
  );
}
