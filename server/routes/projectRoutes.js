import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectDashboardStats,
} from "../controllers/projectController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(protect, getProjects)
  .post(protect, authorize("builder"), createProject);

router.route("/:id")
  .get(protect, getProjectById)
  .put(protect, authorize("builder", "supervisor"), updateProject)
  .delete(protect, authorize("builder"), deleteProject);

router.get("/:id/stats", protect, getProjectDashboardStats);

export default router;
