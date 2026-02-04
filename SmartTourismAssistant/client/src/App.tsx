import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LocationDisplay from "@/components/LocationDisplay";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Forecast from "@/pages/Forecast";
import RoutePlanner from "@/pages/RoutePlanner";
import Reviews from "@/pages/Reviews";
import Events from "@/pages/Events";
import Recommendations from "@/pages/Recommendations";
// import Location from "@/pages/Location";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/forecast" component={Forecast} />
      <Route path="/routes" component={RoutePlanner} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/events" component={Events} />
      <Route path="/recommendations" component={Recommendations} />
      {/* <Route path="/location" component={Location} /> */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-1 flex-col">
              <header className="flex items-center justify-between gap-2 border-b p-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-2">
                  <LocationDisplay />
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
