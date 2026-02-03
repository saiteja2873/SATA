import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { LocationProvider } from "./context/location-context";

createRoot(document.getElementById("root")!).render(<LocationProvider>
    <App />
  </LocationProvider>);
