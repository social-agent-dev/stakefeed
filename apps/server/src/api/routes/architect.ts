import { Router } from "express";
import { getArchitectStatus, runArchitectCycle } from "../../architect/ArchitectAgent.js";

const router = Router();

router.get("/commits", (_req, res) => {
  const { commits } = getArchitectStatus();
  res.json({ commits });
});

router.get("/status", (_req, res) => {
  const status = getArchitectStatus();
  res.json(status);
});

router.post("/trigger", (_req, res) => {
  // Manually trigger an architect cycle
  runArchitectCycle().catch((err) =>
    console.error("[ARCHITECT] Manual trigger failed:", err)
  );
  res.json({ message: "Architect cycle triggered" });
});

export default router;
