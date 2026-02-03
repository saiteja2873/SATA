import { type Express } from "express";
import { createServer, type Server } from "http";
import locationRoutes from "./currLocation";
import eventRoutes from "./events";
import reviewRoute from "./reviews";
export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", locationRoutes);
  app.use("/api", eventRoutes);
  app.use("/api", reviewRoute);
  

  const httpServer = createServer(app);
  return httpServer;
}
