import type { Server } from "socket.io";
import { eventBus } from "./EventBus.js";

export function setupSocketBroadcaster(io: Server) {
  // Feed events
  eventBus.on("epoch:start", (data) => {
    io.of("/feed").emit("epoch:start", data);
  });

  eventBus.on("epoch:tick", (data) => {
    io.of("/feed").emit("epoch:tick", data);
  });

  eventBus.on("epoch:resolved", (data) => {
    io.of("/feed").emit("epoch:resolved", data);
  });

  eventBus.on("post:created", (data) => {
    io.of("/feed").emit("post:created", data);
  });

  eventBus.on("stake:placed", (data) => {
    io.of("/feed").emit("stake:placed", data);
  });

  eventBus.on("agent:action", (data) => {
    io.of("/feed").emit("agent:action", data);
  });

  eventBus.on("agent:updated", (data) => {
    io.of("/feed").emit("agent:updated", data);
  });

  // Architect events
  eventBus.on("architect:phase", (data) => {
    io.of("/architect").emit("architect:phase", data);
  });

  eventBus.on("architect:output", (data) => {
    io.of("/architect").emit("architect:output", data);
  });

  eventBus.on("architect:commit", (data) => {
    io.of("/architect").emit("architect:commit", data);
  });

  eventBus.on("architect:idle", (data) => {
    io.of("/architect").emit("architect:idle", data);
  });
}
