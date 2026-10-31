import express from "express";
import {
  submitWorkUpdate,
  getWorkUpdates,
  getWorkUpdateByDate,
} from "../controllers/workUpdateController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .post(protect, authorize("builder", "supervisor"), submitWorkUpdate)
  .get(protect, getWorkUpdates);

router.get("/by-date", protect, getWorkUpdateByDate);

export default router;
