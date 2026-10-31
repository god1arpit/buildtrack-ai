import Project from "../models/Project.js";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Expense from "../models/Expense.js";
import Wage from "../models/Wage.js";
import WorkUpdate from "../models/WorkUpdate.js";
import { generateDailyAISummary, generateProjectInsights } from "../utils/aiSummarizer.js";

export const generateSummary = async (req, res, next) => {
  try {
    const { projectId, date } = req.body;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const attendances = await Attendance.find({ projectId, date: targetDate });
    const workersPresent = attendances.filter((a) => a.status === "present" || a.status === "half-day").length;
    const overtimeWorkersCount = attendances.filter((a) => (a.overtimeHours || 0) > 0).length;
    const totalWorkers = await Worker.countDocuments({ projectId, status: "active" });

    const update = await WorkUpdate.findOne({ projectId, date: targetDate });

    const summary = generateDailyAISummary({
      projectName: project.name,
      date: targetDate,
      workersPresent,
      totalWorkers: totalWorkers || attendances.length,
      completedTasks: update?.completedTasks || [],
      description: update?.description || "Work continued across designated zones.",
      issues: update?.issues || "",
      materialsReceived: update?.materialsReceived || "",
      tomorrowPlan: update?.tomorrowPlan || "",
      overtimeWorkersCount,
    });

    res.json({
      projectName: project.name,
      date: targetDate,
      summary,
      stats: {
        workersPresent,
        totalWorkers: totalWorkers || attendances.length,
        progressPercentage: update?.progressPercentage || project.overallProgress,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInsights = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    const totalWorkers = await Worker.countDocuments({ projectId, status: "active" });
    const wages = await Wage.find({ projectId, month: currentMonth });
    const totalPendingWages = wages.reduce((sum, w) => sum + (w.pendingAmount || 0), 0);

    const attendances = await Attendance.find({
      projectId,
      date: { $regex: `^${currentMonth}` },
    });

    const presentCount = attendances.filter((a) => a.status === "present" || a.status === "half-day").length;
    const averageAttendanceRate = attendances.length > 0
      ? Math.round((presentCount / attendances.length) * 100)
      : 85;

    const insights = generateProjectInsights(project, {
      totalWorkers,
      totalPendingWages,
      averageAttendanceRate,
    });

    res.json({
      project: {
        name: project.name,
        location: project.location,
        overallProgress: project.overallProgress,
      },
      insights,
    });
  } catch (error) {
    next(error);
  }
};
