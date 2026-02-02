import RouteMap from '../RouteMap';

export default function RouteMapExample() {
  return (
    <div className="h-96 w-full">
      <RouteMap stops={["Eiffel Tower", "Louvre Museum", "Notre Dame"]} />
    </div>
  );
}
