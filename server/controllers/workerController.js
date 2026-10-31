import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Wage from "../models/Wage.js";
import Payment from "../models/Payment.js";
import Notification from "../models/Notification.js";

// Helper to generate globally unique Labour ID
export const generateUniqueLabourId = async () => {
  let unique = false;
  let newId = "";
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    newId = `BT-LBR-${randomNum}`;
    const existing = await Worker.findOne({ workerId: newId });
    if (!existing) unique = true;
  }
  return newId;
};

export const getWorkers = async (req, res, next) => {
  try {
    const { projectId, skill, status, verificationStatus, search } = req.query;
    let filter = {};

    if (projectId && projectId !== "all") filter.projectId = projectId;
    if (skill && skill !== "all") filter.skill = skill;
    if (status && status !== "all") filter.status = status;
    if (verificationStatus && verificationStatus !== "all") filter.verificationStatus = verificationStatus;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { workerId: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { aadharNumber: { $regex: search, $options: "i" } },
        { govIdNumber: { $regex: search, $options: "i" } },
      ];
    }

    const workers = await Worker.find(filter)
      .populate("projectId", "name location")
      .sort({ createdAt: -1 });

    res.json(workers);
  } catch (error) {
    next(error);
  }
};

export const getWorkerById = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id).populate(
      "projectId",
      "name location overallProgress"
    );

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // Get attendance stats
    const attendances = await Attendance.find({ workerId: worker._id }).sort({ date: -1 }).limit(30);
    const totalPresent = await Attendance.countDocuments({ workerId: worker._id, status: "present" });
    const totalHalfDay = await Attendance.countDocuments({ workerId: worker._id, status: "half-day" });
    const totalAbsent = await Attendance.countDocuments({ workerId: worker._id, status: "absent" });

    // Get wage summaries
    const wages = await Wage.find({ workerId: worker._id }).sort({ month: -1 });
    const totalEarned = wages.reduce((sum, w) => sum + (w.totalWage || 0), 0);
    const totalPaid = wages.reduce((sum, w) => sum + (w.paidAmount || 0), 0);
    const totalPending = wages.reduce((sum, w) => sum + (w.pendingAmount || 0), 0);

    // Get recent payments
    const payments = await Payment.find({ workerId: worker._id }).sort({ paymentDate: -1 }).limit(10);

    res.json({
      worker,
      stats: {
        totalPresent,
        totalHalfDay,
        totalAbsent,
        totalWorkingDays: totalPresent + totalHalfDay * 0.5,
        totalEarned,
        totalPaid,
        totalPending,
      },
      recentAttendance: attendances,
      wages,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// Search / Lookup worker by Phone or Unique Labour ID (BT-LBR-XXXXX)
export const lookupWorker = async (req, res, next) => {
  try {
    const query = req.params.query.trim();
    if (!query) {
      return res.status(400).json({ message: "Lookup query required" });
    }

    const worker = await Worker.findOne({
      $or: [
        { workerId: { $regex: `^${query}$`, $options: "i" } },
        { phone: { $regex: query.replace(/[^0-9]/g, "") } },
        { aadharNumber: { $regex: query.replace(/[^0-9]/g, "") } },
      ],
    }).populate("projectId", "name location");

    if (!worker) {
      return res.status(404).json({ message: "No labour record found with this Mobile or Unique ID" });
    }

    res.json(worker);
  } catch (error) {
    next(error);
  }
};

// A labour account can only view or submit its own verification profile.
const findWorkerForUser = async (user) => {
  let worker = await Worker.findOne({ userId: user._id });
  if (worker) return worker;

  const userPhone = String(user.phone || "").replace(/\D/g, "");
  if (!userPhone) return null;

  const workers = await Worker.find({});
  worker = workers.find((candidate) =>
    String(candidate.phone || "").replace(/\D/g, "") === userPhone
  );
  if (worker) {
    return await Worker.findByIdAndUpdate(worker._id, { userId: user._id });
  }
  return null;
};

export const getMyWorker = async (req, res, next) => {
  try {
    const worker = await findWorkerForUser(req.user);
    if (!worker) {
      return res.status(404).json({ message: "No labour profile is linked to this account yet." });
    }
    res.json(worker);
  } catch (error) {
    next(error);
  }
};

export const updateMyPhoto = async (req, res, next) => {
  try {
    if (!req.file || !req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Please choose an image file for your profile photo." });
    }
    const worker = await findWorkerForUser(req.user);
    if (!worker) {
      return res.status(404).json({ message: "Submit your verification details before adding a profile photo." });
    }
    const updated = await Worker.findByIdAndUpdate(worker._id, {
      photo: `/uploads/${req.file.filename}`,
      userId: req.user._id,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const submitMyVerification = async (req, res, next) => {
  try {
    const { name, phone, dob, aadharNumber, govIdType, govIdNumber } = req.body;
    const cleanPhone = String(phone || req.user.phone || "").replace(/[^0-9+]/g, "");
    const cleanAadhaar = String(aadharNumber || "").replace(/\D/g, "");

    if (!name?.trim() || cleanPhone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ message: "Name and a valid mobile number are required." });
    }
    if (cleanAadhaar && cleanAadhaar.length !== 12) {
      return res.status(400).json({ message: "Aadhaar number must contain 12 digits." });
    }

    const existing = await findWorkerForUser(req.user);
    const updates = {
      userId: req.user._id,
      name: name.trim(),
      phone: cleanPhone,
      dob: dob || "",
      aadharNumber: cleanAadhaar,
      govIdType: govIdType || "eshram",
      govIdNumber: String(govIdNumber || "").trim(),
      verificationStatus: "pending",
      aadharVerified: false,
      govIdVerified: false,
      verificationNotes: "Details submitted by worker and awaiting builder review.",
    };

    const worker = existing
      ? await Worker.findByIdAndUpdate(existing._id, updates)
      : await Worker.create({
          ...updates,
          workerId: await generateUniqueLabourId(),
          photo: req.user.profileImage || "",
          skill: req.user.skill || "Helper",
          dailyWage: 600,
          overtimeRate: 80,
          projectId: null,
          status: "active",
          enrolledByRole: "labour",
          enrolledByName: req.user.name,
          fieldInspected: false,
        });

    res.status(existing ? 200 : 201).json(worker);
  } catch (error) {
    next(error);
  }
};

export const createWorker = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      dob,
      photo,
      aadharNumber,
      aadharDoc,
      govIdType,
      govIdNumber,
      govIdDoc,
      fieldInspected,
      skill,
      dailyWage,
      overtimeRate,
      projectId,
      joiningDate,
      emergencyContact,
      address,
      status,
      verificationStatus,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Labour Full Name and Mobile Number are required" });
    }

    // Generate standardized unique labour ID (BT-LBR-XXXXX) if not provided
    let workerId = req.body.workerId;
    if (!workerId || workerId.startsWith("W-")) {
      workerId = await generateUniqueLabourId();
    }

    // Format clean numbers
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const cleanAadhaar = aadharNumber ? aadharNumber.replace(/[^0-9]/g, "") : "";

    // Determine verification status
    // If builder directly adds with full docs, default to verified, otherwise pending verification
    const isBuilder = req.user?.role === "builder";
    const initialStatus = verificationStatus || (isBuilder && cleanAadhaar.length === 12 ? "verified" : "pending");

    const worker = await Worker.create({
      workerId,
      name: name.trim(),
      phone: cleanPhone,
      dob: dob || "",
      photo: photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80",
      aadharNumber: cleanAadhaar,
      aadharDoc: aadharDoc || "",
      aadharVerified: initialStatus === "verified",
      govIdType: govIdType || "eshram",
      govIdNumber: govIdNumber ? govIdNumber.trim() : "",
      govIdDoc: govIdDoc || "",
      govIdVerified: initialStatus === "verified",
      fieldInspected: Boolean(fieldInspected),
      fieldInspectedBy: fieldInspected ? req.user?.name || "Site Munshi" : "",
      verificationStatus: initialStatus,
      verifiedBy: initialStatus === "verified" ? req.user?.name || "Builder Admin" : "",
      verifiedAt: initialStatus === "verified" ? new Date() : null,
      verificationNotes: "",
      skill: skill || "Helper",
      dailyWage: Number(dailyWage) || 600,
      overtimeRate: Number(overtimeRate) || 80,
      projectId: projectId || null,
      joiningDate: joiningDate || new Date(),
      emergencyContact: emergencyContact || "",
      address: address || "",
      status: status || "active",
      enrolledByRole: req.user?.role || "self",
      enrolledByName: req.user?.name || "System",
      createdAt: new Date(),
    });

    // Notify builder if enrolled by munshi or self
    if (req.user?.role === "supervisor") {
      await Notification.create({
        userId: null,
        targetRole: "builder",
        type: "verification",
        title: "New Labour Enrolment Awaiting Approval",
        message: `${worker.name} (${worker.skill}) was enrolled by ${req.user.name} with Unique ID ${worker.workerId}. Aadhaar: ${cleanAadhaar ? 'Submitted' : 'Pending'}.`,
        projectId: worker.projectId,
        read: false,
        createdAt: new Date(),
      });
    }

    res.status(201).json(worker);
  } catch (error) {
    next(error);
  }
};

// Verification status update (Approve, Reject, or Field Inspect)
export const updateVerificationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, notes, reason } = req.body; // action: 'approve' | 'reject' | 'field_inspect'

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    let updates;
    if (action === "approve") {
      updates = {
        verificationStatus: "verified",
        aadharVerified: Boolean(worker.aadharNumber),
        govIdVerified: Boolean(worker.govIdNumber),
        verifiedBy: req.user?.name || "Builder Compliance Officer",
        verifiedAt: new Date(),
        verificationNotes: notes || "Documents verified and approved.",
      };
    } else if (action === "reject") {
      updates = {
        verificationStatus: "rejected",
        verificationNotes: reason || notes || "Verification rejected due to incomplete or unclear documentation.",
      };
    } else if (action === "field_inspect") {
      updates = {
        fieldInspected: true,
        fieldInspectedBy: req.user?.name || "Site Munshi",
        fieldInspectedAt: new Date(),
        verificationNotes: notes || "Physically inspected at site entry gate.",
      };
    } else {
      return res.status(400).json({ message: "Invalid action. Use 'approve', 'reject', or 'field_inspect'." });
    }

    // ModelWrapper queries return detached document copies; use an explicit update
    // so the status change is written back to the embedded store.
    const updatedWorker = await Worker.findByIdAndUpdate(id, updates);

    // Create notification
    await Notification.create({
      userId: updatedWorker.userId || null,
      targetRole: "all",
      type: "verification",
      title: `Labour Verification ${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Updated"}`,
      message: `${updatedWorker.name} (${updatedWorker.workerId}) verification was ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "updated"} by ${req.user?.name}.`,
      projectId: updatedWorker.projectId,
      read: false,
      createdAt: new Date(),
    });

    res.json({
      message: `Worker verification status updated to ${updatedWorker.verificationStatus}`,
      worker: updatedWorker,
    });
  } catch (error) {
    next(error);
  }
};

// Verification statistics for Builder and Munshi dashboards
export const getVerificationStats = async (req, res, next) => {
  try {
    const totalWorkers = await Worker.countDocuments();
    const verifiedCount = await Worker.countDocuments({ verificationStatus: "verified" });
    const pendingCount = await Worker.countDocuments({ verificationStatus: "pending" });
    const rejectedCount = await Worker.countDocuments({ verificationStatus: "rejected" });
    const fieldInspectedCount = await Worker.countDocuments({ fieldInspected: true });

    // Recent 10 verification records
    const recentVerifications = await Worker.find({})
      .populate("projectId", "name location")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalWorkers,
      verifiedCount,
      pendingCount,
      rejectedCount,
      fieldInspectedCount,
      verifiedPercentage: totalWorkers > 0 ? Math.round((verifiedCount / totalWorkers) * 100) : 0,
      recentVerifications,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const cleanBody = { ...req.body };
    if (cleanBody.phone) cleanBody.phone = cleanBody.phone.replace(/[^0-9+]/g, "");
    if (cleanBody.aadharNumber) cleanBody.aadharNumber = cleanBody.aadharNumber.replace(/[^0-9]/g, "");

    const worker = await Worker.findByIdAndUpdate(req.params.id, cleanBody, {
      new: true,
      runValidators: true,
    }).populate("projectId", "name location");

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.json(worker);
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    await Worker.findByIdAndDelete(req.params.id);
    res.json({ message: "Worker removed successfully" });
  } catch (error) {
    next(error);
  }
};
