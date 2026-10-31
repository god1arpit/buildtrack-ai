import express from "express";
import {
  getWorkers,
  getWorkerById,
  lookupWorker,
  createWorker,
  updateWorker,
  deleteWorker,
  updateVerificationStatus,
  getVerificationStats,
  getMyWorker,
  submitMyVerification,
  updateMyPhoto,
} from "../controllers/workerController.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Specific routes before :id param routes
router.get("/verification/stats", protect, getVerificationStats);
router.get("/lookup/:query", protect, lookupWorker);
router.route("/me")
  .get(protect, authorize("labour"), getMyWorker)
  .post(protect, authorize("labour"), submitMyVerification);
router.post("/me/photo", protect, authorize("labour"), upload.single("photo"), updateMyPhoto);

router.route("/")
  .get(protect, getWorkers)
  .post(protect, authorize("builder", "supervisor", "labour"), createWorker);

router.route("/:id")
  .get(protect, getWorkerById)
  .put(protect, authorize("builder", "supervisor", "labour"), updateWorker)
  .delete(protect, authorize("builder"), deleteWorker);

router.put("/:id/verify-status", protect, authorize("builder", "supervisor", "labour"), updateVerificationStatus);

export default router;
