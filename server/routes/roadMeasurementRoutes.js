import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { createRoadMeasurement, listRoadMeasurements } from "../controllers/roadMeasurementController.js";

const router = express.Router();

router.get("/", protect, authorize("builder", "supervisor", "admin"), listRoadMeasurements);
router.post("/", protect, authorize("supervisor"), createRoadMeasurement);

export default router;
