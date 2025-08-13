import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleBookableProxy } from "./routes/booqable";
import { handleCalendarProxy } from "./routes/calendar-proxy";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Booqable API proxy to avoid CORS issues
  app.use("/api/booqable", (req, res) => {
    req.params.endpoint = req.path.substring(1); // Remove leading slash
    handleBookableProxy(req, res);
  });

  // Calendar proxy for .ics files
  app.get("/api/proxy-calendar", handleCalendarProxy);

  return app;
}
