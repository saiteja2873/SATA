import { type Express } from "express";
import { createServer, type Server } from "http";
import locationRoutes from "./currLocation";
import eventRoutes from "./events";
import crowdRoutes from "./crowd";
import recommendationsRoutes from "./recommendations";
import attractionsRoutes from "./attractions";
import routePlannerRoutes from "./routePlanner";


export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", locationRoutes);
  app.use("/api", eventRoutes);
  app.use("/api", crowdRoutes);
  app.use("/api", recommendationsRoutes);
  app.use("/api", attractionsRoutes);
  app.use("/api", routePlannerRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
