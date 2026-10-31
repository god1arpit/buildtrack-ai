import express from "express";
import {
  getGlobalBuilderSummary,
  getAttendanceReport,
  getWageReport,
} from "../controllers/reportController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/summary", protect, getGlobalBuilderSummary);
router.get("/attendance", protect, getAttendanceReport);
router.get("/wages", protect, getWageReport);

export default router;
