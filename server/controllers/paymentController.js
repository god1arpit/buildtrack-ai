import Payment from "../models/Payment.js";
import Wage from "../models/Wage.js";
import Worker from "../models/Worker.js";
import Notification from "../models/Notification.js";
import { calculateWorkerWage } from "../utils/wageCalculator.js";

export const createPayment = async (req, res, next) => {
  try {
    const {
      workerId,
      projectId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      notes,
      month,
    } = req.body;

    if (!workerId || !projectId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "workerId, projectId, and valid amount are required" });
    }

    const payment = await Payment.create({
      workerId,
      projectId,
      amount: Number(amount),
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || "Cash",
      reference: reference || "",
      notes: notes || "",
      paidBy: req.user._id,
    });

    // Recalculate wage for the month
    const targetMonth = month || new Date(payment.paymentDate).toISOString().substring(0, 7);
    const updatedWage = await calculateWorkerWage(workerId, projectId, targetMonth);

    // Create notification
    const worker = await Worker.findById(workerId);
    await Notification.create({
      projectId,
      title: "Wage Payment Processed",
      message: `₹${Number(amount).toLocaleString("en-IN")} paid to ${worker?.name || "worker"} via ${paymentMethod}.`,
      type: "pending_wages",
      targetRole: "builder",
    });

    res.status(201).json({
      message: "Payment recorded successfully",
      payment,
      updatedWage,
    });
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const { projectId, workerId, startDate, endDate } = req.query;
    let filter = {};

    if (projectId) filter.projectId = projectId;
    if (workerId) filter.workerId = workerId;
    if (startDate && endDate) {
      filter.paymentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const payments = await Payment.find(filter)
      .populate("workerId", "name workerId skill")
      .populate("projectId", "name location")
      .populate("paidBy", "name")
      .sort({ paymentDate: -1 });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      totalPaid,
      payments,
    });
  } catch (error) {
    next(error);
  }
};
