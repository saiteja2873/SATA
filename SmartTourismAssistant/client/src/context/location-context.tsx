import { createContext, useContext, useState } from "react";

type Location = {
  lat: number;
  lng: number;
  placeName?: string;
};

const LocationContext = createContext<any>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<Location | null>(null);
  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
