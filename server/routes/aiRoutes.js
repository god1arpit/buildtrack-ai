import express from "express";
import { generateSummary, getInsights } from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/daily-summary", protect, generateSummary);
router.get("/insights/:projectId", protect, getInsights);

export default router;
