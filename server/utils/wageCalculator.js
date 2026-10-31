import Attendance from "../models/Attendance.js";
import Worker from "../models/Worker.js";
import Payment from "../models/Payment.js";
import Wage from "../models/Wage.js";

/**
 * Calculate or recalculate wage for a specific worker and month (YYYY-MM)
 */
export const calculateWorkerWage = async (workerId, projectId, month) => {
  const worker = await Worker.findById(workerId);
  if (!worker) {
    throw new Error("Worker not found");
  }

  // Find all attendance records for this worker in the specified month
  const startDateStr = `${month}-01`;
  const endDateStr = `${month}-31`;

  const attendances = await Attendance.find({
    workerId,
    projectId,
    date: { $gte: startDateStr, $lte: endDateStr },
  });

  let workingDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let overtimeHours = 0;

  attendances.forEach((att) => {
    if (att.status === "present") {
      workingDays += 1;
    } else if (att.status === "half-day") {
      halfDays += 1;
    } else if (att.status === "absent" || att.status === "leave") {
      absentDays += 1;
    }
    overtimeHours += Number(att.overtimeHours) || 0;
  });

  const dailyWageRate = worker.dailyWage || 0;
  const overtimeRate = worker.overtimeRate || 0;

  const basicWage = workingDays * dailyWageRate + halfDays * (dailyWageRate / 2);
  const overtimeAmount = overtimeHours * overtimeRate;

  // Find existing wage doc if any to retain bonuses or deductions
  let wage = await Wage.findOne({ workerId, projectId, month });
  const deductions = wage?.deductions || 0;
  const bonus = wage?.bonus || 0;

  const totalWage = Math.round(basicWage + overtimeAmount + bonus - deductions);

  // Get total payments made for this worker & project in this month
  const allPayments = await Payment.find({
    workerId,
    projectId,
  });

  // Filter payments in this month
  const payments = allPayments.filter((p) => {
    const pDate = new Date(p.paymentDate).toISOString().substring(0, 7);
    return pDate === month;
  });

  const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingAmount = Math.max(0, totalWage - paidAmount);

  let status = "pending";
  if (pendingAmount === 0 && totalWage > 0) {
    status = "paid";
  } else if (paidAmount > 0 && pendingAmount > 0) {
    status = "partially_paid";
  }

  if (!wage) {
    wage = await Wage.create({
      workerId,
      projectId,
      month,
      workingDays,
      halfDays,
      absentDays,
      overtimeHours,
      dailyWageRate,
      overtimeRate,
      basicWage,
      overtimeAmount,
      bonus,
      deductions,
      totalWage,
      paidAmount,
      pendingAmount,
      status,
    });
  } else {
    wage = await Wage.findByIdAndUpdate(
      wage._id,
      {
        workingDays,
        halfDays,
        absentDays,
        overtimeHours,
        dailyWageRate,
        overtimeRate,
        basicWage,
        overtimeAmount,
        totalWage,
        paidAmount,
        pendingAmount,
        status,
      },
      { new: true }
    );
  }

  return wage;
};

/**
 * Recalculate wages for all workers in a project for a given month
 */
export const recalculateProjectWages = async (projectId, month) => {
  const workers = await Worker.find({
    $or: [{ projectId }, { status: "active" }],
  });

  const results = [];
  for (const worker of workers) {
    try {
      const wage = await calculateWorkerWage(worker._id, projectId, month);
      results.push(wage);
    } catch (e) {
      console.error(`Error calculating wage for worker ${worker.name}:`, e.message);
    }
  }
  return results;
};
