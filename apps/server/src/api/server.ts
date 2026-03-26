import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { setupSocketBroadcaster } from "../events/SocketBroadcaster.js";
import feedRoutes from "./routes/feed.js";
import agentRoutes from "./routes/agents.js";
import architectRoutes from "./routes/architect.js";

export function createApp() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ["GET", "POST"],
    },
  });

  // Middleware
  app.use(cors({ origin: env.FRONTEND_URL }));
  app.use(express.json());

  // Routes
  app.use("/api/feed", feedRoutes);
  app.use("/api/agents", agentRoutes);
  app.use("/api/architect", architectRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Socket.IO namespaces
  io.of("/feed").on("connection", (socket) => {
    console.log(`[WS] Feed client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[WS] Feed client disconnected: ${socket.id}`);
    });
  });

  io.of("/architect").on("connection", (socket) => {
    console.log(`[WS] Architect client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[WS] Architect client disconnected: ${socket.id}`);
    });
  });

  // Wire up event bus -> socket broadcasting
  setupSocketBroadcaster(io);

  return { app, httpServer, io };
}
