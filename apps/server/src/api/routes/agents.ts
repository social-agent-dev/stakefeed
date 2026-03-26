import { Router } from "express";
import { getOrchestrator } from "../../agents/AgentOrchestrator.js";

const router = Router();

router.get("/", (_req, res) => {
  const orchestrator = getOrchestrator();
  res.json({ agents: orchestrator.getAgents() });
});

router.get("/:name", (req, res) => {
  const orchestrator = getOrchestrator();
  const agent = orchestrator.getAgent(req.params.name);
  if (!agent) {
    res.status(404).json({ error: `Agent ${req.params.name} not found` });
    return;
  }
  res.json({ agent });
});

export default router;
