import { Router } from "express";

const router = Router();

// Will be populated once Architect is built (Phase 4)
router.get("/commits", (_req, res) => {
  res.json({ commits: [], message: "Architect not yet active" });
});

router.get("/status", (_req, res) => {
  res.json({ phase: "idle", message: "Architect not yet active" });
});

export default router;
