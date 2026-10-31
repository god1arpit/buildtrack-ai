import express from "express";
import { createExpense, getExpenses, deleteExpense } from "../controllers/expenseController.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.route("/")
  .get(protect, getExpenses)
  .post(protect, authorize("builder", "supervisor"), upload.single("receipt"), createExpense);

router.delete("/:id", protect, authorize("builder", "supervisor"), deleteExpense);

export default router;
