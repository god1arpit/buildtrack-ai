import Wage from "../models/Wage.js";
import Worker from "../models/Worker.js";
import { calculateWorkerWage, recalculateProjectWages } from "../utils/wageCalculator.js";

export const getProjectWages = async (req, res, next) => {
  try {
    const { projectId, month } = req.query;
    const currentMonth = month || new Date().toISOString().substring(0, 7);

    let filter = { month: currentMonth };
    if (projectId) filter.projectId = projectId;

    // Recalculate to make sure latest attendance and payments are reflected
    if (projectId) {
      await recalculateProjectWages(projectId, currentMonth);
    }

    const wages = await Wage.find(filter)
      .populate("workerId", "workerId name phone skill dailyWage overtimeRate")
      .populate("projectId", "name location")
      .sort({ "workerId.name": 1 });

    const totalWageSum = wages.reduce((sum, w) => sum + (w.totalWage || 0), 0);
    const totalPaidSum = wages.reduce((sum, w) => sum + (w.paidAmount || 0), 0);
    const totalPendingSum = wages.reduce((sum, w) => sum + (w.pendingAmount || 0), 0);

    res.json({
      month: currentMonth,
      totalWageSum,
      totalPaidSum,
      totalPendingSum,
      wages,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerWage = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { month, projectId } = req.query;
    const currentMonth = month || new Date().toISOString().substring(0, 7);

    let worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    const targetProjectId = projectId || worker.projectId;
    if (!targetProjectId) {
      return res.status(400).json({ message: "Worker is not assigned to a project" });
    }

    const wage = await calculateWorkerWage(workerId, targetProjectId, currentMonth);
    const populatedWage = await Wage.findById(wage._id)
      .populate("workerId", "workerId name phone skill dailyWage overtimeRate")
      .populate("projectId", "name location");

    res.json(populatedWage);
  } catch (error) {
    next(error);
  }
};

export const recalculateWages = async (req, res, next) => {
  try {
    const { projectId, month } = req.body;
    const currentMonth = month || new Date().toISOString().substring(0, 7);

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    const results = await recalculateProjectWages(projectId, currentMonth);
    res.json({ message: "Wages recalculated successfully", count: results.length });
  } catch (error) {
    next(error);
  }
};

export const updateWageAdjustment = async (req, res, next) => {
  try {
    const { wageId } = req.params;
    const { bonus, deductions } = req.body;

    const wage = await Wage.findById(wageId);
    if (!wage) {
      return res.status(404).json({ message: "Wage record not found" });
    }

    if (bonus !== undefined) wage.bonus = Number(bonus);
    if (deductions !== undefined) wage.deductions = Number(deductions);

    wage.totalWage = Math.round(wage.basicWage + wage.overtimeAmount + wage.bonus - wage.deductions);
    wage.pendingAmount = Math.max(0, wage.totalWage - wage.paidAmount);

    if (wage.pendingAmount === 0 && wage.totalWage > 0) {
      wage.status = "paid";
    } else if (wage.paidAmount > 0 && wage.pendingAmount > 0) {
      wage.status = "partially_paid";
    } else {
      wage.status = "pending";
    }

    await wage.save();
    res.json(wage);
  } catch (error) {
    next(error);
  }
};
