import LocationFinder from "@/components/LocationFinder";

export default function Location() {
  return (
    <div className="space-y-8 px-6 py-8">
      <div>
        <h1 className="mb-2 text-4xl font-bold">Location Services</h1>
        <p className="text-muted-foreground">
          Find detailed information about any location on Earth using coordinates
        </p>
      </div>

      <LocationFinder />
    </div>
  );
}
