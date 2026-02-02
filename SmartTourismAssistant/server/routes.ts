import { type Express } from "express";
import { createServer, type Server } from "http";
import locationRoutes from "./currLocation";
import eventRoutes from "./events";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", locationRoutes);
  app.use("/api", eventRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
