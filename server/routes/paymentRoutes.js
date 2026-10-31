import express from "express";
import { createPayment, getPayments } from "../controllers/paymentController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .post(protect, authorize("builder"), createPayment)
  .get(protect, getPayments);

export default router;
