import Project from "../models/Project.js";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Wage from "../models/Wage.js";
import Expense from "../models/Expense.js";
import WorkUpdate from "../models/WorkUpdate.js";

export const getGlobalBuilderSummary = async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = todayStr.substring(0, 7);

    // 1. Projects
    const projects = await Project.find().sort({ updatedAt: -1 });
    const activeProjectsCount = projects.filter((p) => p.status === "active" || !p.status).length;

    // Calculate average progress
    const overallProgress = projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + (Number(p.overallProgress) || 0), 0) / projects.length)
      : 0;

    // 2. Total active workers
    const totalWorkers = await Worker.countDocuments();

    // 3. Today's attendance
    const todayAttendance = await Attendance.find({ date: todayStr }).populate("workerId", "dailyWage overtimeRate");
    const presentCount = todayAttendance.filter((a) => a.status === "present" || a.status === "half-day").length;

    let todayWages = 0;
    todayAttendance.forEach((att) => {
      const rate = Number(att.workerId?.dailyWage) || 0;
      if (att.status === "present") todayWages += rate;
      else if (att.status === "half-day") todayWages += rate / 2;
      todayWages += (Number(att.overtimeHours) || 0) * (Number(att.workerId?.overtimeRate) || 0);
    });

    // 4. Pending Wages across all projects
    const allWages = await Wage.find({ month: currentMonth });
    const pendingWagesSum = allWages.reduce((sum, w) => sum + (w.pendingAmount || 0), 0);
    const totalPaidWagesSum = allWages.reduce((sum, w) => sum + (w.paidAmount || 0), 0);

    // 5. Total Expenses
    const allExpenses = await Expense.find();
    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 6. Project summary list for Builder Cards
    const projectSummaries = await Promise.all(
      projects.map(async (project) => {
        const pWorkers = await Worker.find({
          $or: [
            { projectId: project._id },
            { projectId: null },
            { projectId: { $exists: false } },
          ],
          status: "active",
        });
        const pTodayAtt = await Attendance.find({ projectId: project._id, date: todayStr }).populate("workerId", "dailyWage overtimeRate");
        const pPresent = pTodayAtt.filter((a) => a.status === "present" || a.status === "half-day").length;
        
        let pTodayWage = 0;
        pTodayAtt.forEach((a) => {
          const rate = Number(a.workerId?.dailyWage) || 0;
          if (a.status === "present") pTodayWage += rate;
          else if (a.status === "half-day") pTodayWage += rate / 2;
          pTodayWage += (Number(a.overtimeHours) || 0) * (Number(a.workerId?.overtimeRate) || 0);
        });

        const pWages = await Wage.find({ projectId: project._id, month: currentMonth });
        const pPendingWage = pWages.reduce((sum, w) => sum + (w.pendingAmount || 0), 0);

        return {
          _id: project._id,
          name: project.name,
          location: project.location,
          client: project.client,
          overallProgress: project.overallProgress,
          status: project.status || "active",
          totalWorkers: pWorkers.length,
          presentToday: pPresent,
          todayWage: pTodayWage,
          pendingWage: pPendingWage,
          milestones: project.milestones,
        };
      })
    );

    res.json({
      activeProjectsCount,
      totalProjectsCount: projects.length,
      totalWorkers,
      todayAttendance: `${presentCount}/${totalWorkers}`,
      presentCount,
      todayWages,
      pendingWages: pendingWagesSum,
      totalPaidWages: totalPaidWagesSum,
      totalExpenses,
      overallProgress,
      projects: projectSummaries,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceReport = async (req, res, next) => {
  try {
    const { projectId, month } = req.query;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    let workerFilter = {};
    if (projectId) workerFilter.projectId = projectId;

    const workers = await Worker.find(workerFilter).populate("projectId", "name");

    const reportData = await Promise.all(
      workers.map(async (worker) => {
        const records = await Attendance.find({
          workerId: worker._id,
          date: { $regex: `^${targetMonth}` },
        });

        const presentDays = records.filter((r) => r.status === "present").length;
        const halfDays = records.filter((r) => r.status === "half-day").length;
        const absentDays = records.filter((r) => r.status === "absent" || r.status === "leave").length;
        const totalOvertime = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

        const totalEarned = presentDays * worker.dailyWage + halfDays * (worker.dailyWage / 2) + totalOvertime * worker.overtimeRate;

        return {
          workerId: worker.workerId,
          name: worker.name,
          phone: worker.phone,
          skill: worker.skill,
          projectName: worker.projectId?.name || "General / Floating",
          dailyWage: worker.dailyWage,
          presentDays,
          halfDays,
          absentDays,
          effectiveDays: presentDays + halfDays * 0.5,
          totalOvertime,
          totalEarned: Math.round(totalEarned),
        };
      })
    );

    res.json({
      month: targetMonth,
      totalWorkers: workers.length,
      report: reportData,
    });
  } catch (error) {
    next(error);
  }
};

export const getWageReport = async (req, res, next) => {
  try {
    const { projectId, month } = req.query;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    let filter = { month: targetMonth };
    if (projectId) filter.projectId = projectId;

    const wages = await Wage.find(filter)
      .populate("workerId", "workerId name phone skill")
      .populate("projectId", "name location")
      .sort({ "workerId.name": 1 });

    const totalEarned = wages.reduce((sum, w) => sum + (w.totalWage || 0), 0);
    const totalPaid = wages.reduce((sum, w) => sum + (w.paidAmount || 0), 0);
    const totalPending = wages.reduce((sum, w) => sum + (w.pendingAmount || 0), 0);

    res.json({
      month: targetMonth,
      totalEarned,
      totalPaid,
      totalPending,
      records: wages,
    });
  } catch (error) {
    next(error);
  }
};
