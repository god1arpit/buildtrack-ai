import Project from "../models/Project.js";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Expense from "../models/Expense.js";
import Wage from "../models/Wage.js";
import WorkUpdate from "../models/WorkUpdate.js";

export const getProjects = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === "supervisor") {
      query = { supervisorIds: req.user._id };
    } else if (req.user.role === "builder") {
      // Builders see all their projects or all system projects
      query = { $or: [{ builderId: req.user._id }, { builderId: { $exists: true } }] };
    }

    const projects = await Project.find(query)
      .populate("builderId", "name email phone")
      .populate("supervisorIds", "name email phone")
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("builderId", "name email phone")
      .populate("supervisorIds", "name email phone");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const {
      name,
      description,
      location,
      client,
      supervisorIds,
      startDate,
      expectedEndDate,
      budget,
      milestones,
    } = req.body;

    const defaultMilestones = milestones && milestones.length > 0 ? milestones : [
      { name: "Foundation", progress: 0, status: "pending", weight: 1 },
      { name: "Structure", progress: 0, status: "pending", weight: 1 },
      { name: "Brickwork", progress: 0, status: "pending", weight: 1 },
      { name: "Plaster", progress: 0, status: "pending", weight: 1 },
      { name: "Electrical", progress: 0, status: "pending", weight: 1 },
      { name: "Painting", progress: 0, status: "pending", weight: 1 },
    ];

    const project = await Project.create({
      name,
      description,
      location,
      client,
      builderId: req.user._id,
      supervisorIds: supervisorIds || [],
      startDate: startDate || new Date(),
      expectedEndDate,
      budget: budget || 0,
      milestones: defaultMilestones,
      overallProgress: 0,
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Calculate overall progress if milestones are updated
    if (req.body.milestones && Array.isArray(req.body.milestones) && req.body.milestones.length > 0) {
      const sum = req.body.milestones.reduce((acc, m) => acc + (Number(m.progress) || 0), 0);
      req.body.overallProgress = Math.round(sum / req.body.milestones.length);
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("builderId", "name email phone")
      .populate("supervisorIds", "name email phone");

    res.json(updatedProject);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getProjectDashboardStats = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const todayStr = new Date().toISOString().split("T")[0];

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const totalWorkers = await Worker.countDocuments({
      $or: [
        { projectId },
        { projectId: null },
        { projectId: { $exists: false } },
      ],
      status: "active",
    });

    const todayAttendance = await Attendance.find({
      projectId,
      date: todayStr,
    }).populate("workerId", "name skill dailyWage");

    const presentCount = todayAttendance.filter(
      (a) => a.status === "present" || a.status === "half-day"
    ).length;

    let todayWages = 0;
    todayAttendance.forEach((att) => {
      const dailyRate = att.workerId?.dailyWage || 0;
      if (att.status === "present") todayWages += dailyRate;
      else if (att.status === "half-day") todayWages += dailyRate / 2;
      todayWages += (att.overtimeHours || 0) * 100;
    });

    const expenses = await Expense.find({ projectId });
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    const wages = await Wage.find({ projectId });
    const totalPendingWages = wages.reduce((acc, w) => acc + w.pendingAmount, 0);
    const totalPaidWages = wages.reduce((acc, w) => acc + w.paidAmount, 0);

    const latestUpdate = await WorkUpdate.findOne({ projectId })
      .sort({ date: -1 })
      .populate("supervisorId", "name");

    res.json({
      project,
      totalWorkers,
      presentToday: presentCount,
      todayWages,
      totalExpenses,
      totalPendingWages,
      totalPaidWages,
      latestUpdate,
    });
  } catch (error) {
    next(error);
  }
};
