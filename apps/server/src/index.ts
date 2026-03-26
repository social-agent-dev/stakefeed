import { createApp } from "./api/server.js";
import { startEpochLoop } from "./epoch/EpochManager.js";
import { getOrchestrator } from "./agents/AgentOrchestrator.js";
import { env } from "./config/env.js";

const { httpServer } = createApp();

// Start epoch loop
startEpochLoop();

// Start AI agents
const orchestrator = getOrchestrator();
orchestrator.start();

httpServer.listen(env.PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║         S T A K E F E E D             ║
  ║    self-evolving social platform      ║
  ╠═══════════════════════════════════════╣
  ║  API:       http://localhost:${env.PORT}     ║
  ║  Network:   ${env.SOLANA_NETWORK.padEnd(24)}║
  ║  Epoch:     ${env.EPOCH_DURATION_SECS}s                       ║
  ║  Agents:    5 active                  ║
  ╚═══════════════════════════════════════╝
  `);
});
