import WorkUpdate from "../models/WorkUpdate.js";
import Project from "../models/Project.js";
import Attendance from "../models/Attendance.js";
import Worker from "../models/Worker.js";
import Notification from "../models/Notification.js";
import { generateDailyAISummary } from "../utils/aiSummarizer.js";

export const submitWorkUpdate = async (req, res, next) => {
  try {
    const {
      projectId,
      date,
      description,
      progressPercentage,
      completedTasks,
      issues,
      materialsReceived,
      tomorrowPlan,
    } = req.body;

    if (!projectId || !date || !description) {
      return res.status(400).json({ message: "projectId, date, and description are required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Get attendance stats for today
    const attendances = await Attendance.find({ projectId, date });
    const workersPresent = attendances.filter(
      (a) => a.status === "present" || a.status === "half-day"
    ).length;
    const overtimeWorkersCount = attendances.filter((a) => (a.overtimeHours || 0) > 0).length;
    const totalWorkers = await Worker.countDocuments({ projectId, status: "active" });

    // Parse completed tasks if string
    let parsedTasks = completedTasks;
    if (typeof completedTasks === "string") {
      parsedTasks = completedTasks.split("\n").map((t) => t.trim()).filter(Boolean);
    }

    // Generate AI Daily Summary
    const aiSummary = generateDailyAISummary({
      projectName: project.name,
      date,
      workersPresent,
      totalWorkers: totalWorkers || attendances.length,
      completedTasks: parsedTasks || [],
      description,
      issues,
      materialsReceived,
      tomorrowPlan,
      overtimeWorkersCount,
    });

    const workUpdate = await WorkUpdate.findOneAndUpdate(
      { projectId, date },
      {
        projectId,
        supervisorId: req.user._id,
        date,
        description,
        progressPercentage: Number(progressPercentage) || project.overallProgress,
        completedTasks: parsedTasks || [],
        issues: issues || "",
        materialsReceived: materialsReceived || "",
        tomorrowPlan: tomorrowPlan || "",
        workersPresentCount: workersPresent,
        aiSummary,
        status: "submitted",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update project progress if valid
    if (progressPercentage !== undefined && Number(progressPercentage) >= 0) {
      project.overallProgress = Math.min(100, Math.max(0, Number(progressPercentage)));
      await project.save();
    }

    // Notify builder
    await Notification.create({
      projectId,
      title: `Daily Report Submitted - ${project.name}`,
      message: `Supervisor submitted daily update for ${date}. Progress: ${project.overallProgress}%. Present: ${workersPresent} workers.`,
      type: "report_submitted",
      targetRole: "builder",
    });

    res.status(201).json({
      message: "Daily work update saved successfully",
      workUpdate,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkUpdates = async (req, res, next) => {
  try {
    const { projectId, startDate, endDate, limit } = req.query;
    let filter = {};

    if (projectId) filter.projectId = projectId;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const updates = await WorkUpdate.find(filter)
      .populate("projectId", "name location")
      .populate("supervisorId", "name email phone")
      .sort({ date: -1 })
      .limit(Number(limit) || 30);

    res.json(updates);
  } catch (error) {
    next(error);
  }
};

export const getWorkUpdateByDate = async (req, res, next) => {
  try {
    const { projectId, date } = req.query;
    if (!projectId || !date) {
      return res.status(400).json({ message: "projectId and date are required" });
    }

    const update = await WorkUpdate.findOne({ projectId, date })
      .populate("projectId", "name location")
      .populate("supervisorId", "name");

    res.json(update);
  } catch (error) {
    next(error);
  }
};
