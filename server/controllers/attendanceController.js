import Attendance from "../models/Attendance.js";
import Worker from "../models/Worker.js";
import { calculateWorkerWage } from "../utils/wageCalculator.js";
import Notification from "../models/Notification.js";

export const markAttendance = async (req, res, next) => {
  try {
    const { projectId, date, records } = req.body;
    // records is an array of { workerId, status, checkIn, checkOut, totalHours, overtimeHours, notes }

    if (!projectId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "projectId, date, and records array are required" });
    }

    const monthStr = date.substring(0, 7); // "YYYY-MM"
    const savedRecords = [];
    let absentCount = 0;

    for (const record of records) {
      if (!record.workerId) continue;

      if (record.status === "absent") absentCount++;

      const updated = await Attendance.findOneAndUpdate(
        { workerId: record.workerId, projectId, date },
        {
          workerId: record.workerId,
          projectId,
          date,
          status: record.status || "present",
          checkIn: record.checkIn || "08:30 AM",
          checkOut: record.checkOut || "05:30 PM",
          totalHours: record.totalHours || (record.status === "half-day" ? 4 : record.status === "present" ? 8 : 0),
          overtimeHours: Number(record.overtimeHours) || 0,
          notes: record.notes || "",
          markedBy: req.user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      savedRecords.push(updated);

      // Auto recalculate worker wage for this month
      try {
        await calculateWorkerWage(record.workerId, projectId, monthStr);
      } catch (e) {
        console.error(`Wage sync error for worker ${record.workerId}:`, e.message);
      }
    }

    // If more than 3 workers absent, create notification
    if (absentCount >= 3) {
      await Notification.create({
        projectId,
        title: `Absentee Alert (${date})`,
        message: `🔔 ${absentCount} workers are marked absent today at the site.`,
        type: "absentee",
        targetRole: "builder",
      });
    }

    res.json({
      message: `Successfully recorded attendance for ${savedRecords.length} workers on ${date}`,
      savedRecords,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceByDate = async (req, res, next) => {
  try {
    const { projectId, date } = req.query;

    if (!projectId || !date) {
      return res.status(400).json({ message: "projectId and date are required" });
    }

    // Include active workers assigned to this site plus workers not assigned to
    // any site yet. They still need an attendance record for the selected site.
    const workers = await Worker.find({
      $or: [
        { projectId },
        { projectId: null },
        { projectId: { $exists: false } },
      ],
      status: "active",
    }).sort({ name: 1 });

    // Get existing attendance records for this date
    const existingAttendance = await Attendance.find({
      projectId,
      date,
    });

    const attendanceMap = {};
    existingAttendance.forEach((att) => {
      attendanceMap[att.workerId.toString()] = att;
    });

    // Merge workers with attendance
    const list = workers.map((worker) => {
      const att = attendanceMap[worker._id.toString()];
      return {
        worker,
        attendance: att || {
          status: "present",
          checkIn: "08:30 AM",
          checkOut: "05:30 PM",
          totalHours: 8,
          overtimeHours: 0,
          notes: "",
          isMarked: false,
        },
      };
    });

    res.json({
      date,
      projectId,
      totalWorkers: workers.length,
      records: list,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceHistory = async (req, res, next) => {
  try {
    const { projectId, month, startDate, endDate, workerId } = req.query;
    let filter = {};

    if (projectId) filter.projectId = projectId;
    if (workerId) filter.workerId = workerId;

    if (month) {
      filter.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(filter)
      .populate("workerId", "name workerId skill dailyWage")
      .populate("projectId", "name location")
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    next(error);
  }
};

export const getWorkerAttendance = async (req, res, next) => {
  try {
    const workerId = req.params.workerId;
    const { month } = req.query;

    let filter = { workerId };
    if (month) {
      filter.date = { $regex: `^${month}` };
    }

    const records = await Attendance.find(filter)
      .populate("projectId", "name location")
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    next(error);
  }
};
