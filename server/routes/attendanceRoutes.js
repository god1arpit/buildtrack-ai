import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getAttendanceHistory,
  getWorkerAttendance,
} from "../controllers/attendanceController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.post("/mark", protect, authorize("builder", "supervisor"), markAttendance);
router.get("/by-date", protect, getAttendanceByDate);
router.get("/history", protect, getAttendanceHistory);
router.get("/worker/:workerId", protect, getWorkerAttendance);

export default router;
