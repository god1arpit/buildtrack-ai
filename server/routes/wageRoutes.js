import express from "express";
import {
  getProjectWages,
  getWorkerWage,
  recalculateWages,
  updateWageAdjustment,
} from "../controllers/wageController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/project", protect, getProjectWages);
router.get("/worker/:workerId", protect, getWorkerWage);
router.post("/recalculate", protect, authorize("builder"), recalculateWages);
router.put("/:wageId/adjust", protect, authorize("builder"), updateWageAdjustment);

export default router;
