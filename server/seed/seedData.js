import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Wage from "../models/Wage.js";
import Payment from "../models/Payment.js";
import WorkUpdate from "../models/WorkUpdate.js";
import SitePhoto from "../models/SitePhoto.js";
import Expense from "../models/Expense.js";
import Notification from "../models/Notification.js";
import { calculateWorkerWage } from "../utils/wageCalculator.js";

dotenv.config();

export const seedDatabase = async () => {
  try {
    console.log("[Seed] Connecting to database...");
    await connectDB();

    console.log("[Seed] Clearing old collections...");
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Worker.deleteMany({}),
      Attendance.deleteMany({}),
      Wage.deleteMany({}),
      Payment.deleteMany({}),
      WorkUpdate.deleteMany({}),
      SitePhoto.deleteMany({}),
      Expense.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log("[Seed] Creating Users...");
    const builder = await User.create({
      name: "Arpit Sachdeva (Builder)",
      email: "builder@buildtrack.com",
      phone: "+91 9876543210",
      password: "password123",
      role: "builder",
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    });

    const supervisor1 = await User.create({
      name: "Ramesh Munshi (Supervisor)",
      email: "supervisor@buildtrack.com",
      phone: "+91 9812345678",
      password: "password123",
      role: "supervisor",
      profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    });

    const supervisor2 = await User.create({
      name: "Suresh Munshi (Site Incharge)",
      email: "suresh.munshi@buildtrack.com",
      phone: "+91 9823456789",
      password: "password123",
      role: "supervisor",
      profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    });

    const labourUser = await User.create({
      name: "Ramesh Kumar (Mason)",
      email: "ramesh.mason@buildtrack.com",
      phone: "+91 9834567890",
      password: "password123",
      role: "labour",
      profileImage: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80",
    });

    console.log("[Seed] Creating Projects...");
    const pSharma = await Project.create({
      name: "Sharma Residence",
      description: "3-Storey Luxury Residential Bungalow with Basement",
      location: "Sector 18, Chandigarh",
      client: "Mr. R. K. Sharma",
      builderId: builder._id,
      supervisorIds: [supervisor1._id],
      startDate: new Date("2026-08-01"),
      expectedEndDate: new Date("2027-01-30"),
      overallProgress: 72,
      budget: 4500000,
      status: "active",
      milestones: [
        { name: "Foundation & Basement", progress: 100, status: "completed", weight: 1.5 },
        { name: "RCC Structure & Slabs", progress: 100, status: "completed", weight: 2.0 },
        { name: "Brickwork & Masonry", progress: 80, status: "in_progress", weight: 1.5 },
        { name: "Internal & External Plaster", progress: 40, status: "in_progress", weight: 1.0 },
        { name: "Electrical & Plumbing Piping", progress: 20, status: "in_progress", weight: 1.0 },
        { name: "Flooring & Painting", progress: 0, status: "pending", weight: 1.0 },
      ],
    });

    const pVerma = await Project.create({
      name: "Verma Villa",
      description: "Contemporary 4BHK Duplex with Terrace Garden",
      location: "Phase 7, Mohali",
      client: "Mrs. Anita Verma",
      builderId: builder._id,
      supervisorIds: [supervisor1._id],
      startDate: new Date("2026-07-15"),
      expectedEndDate: new Date("2026-12-20"),
      overallProgress: 81,
      budget: 6500000,
      status: "active",
      milestones: [
        { name: "Foundation & Columns", progress: 100, status: "completed", weight: 1.5 },
        { name: "Super Structure", progress: 100, status: "completed", weight: 2.0 },
        { name: "Brickwork", progress: 100, status: "completed", weight: 1.5 },
        { name: "Plaster & POP", progress: 90, status: "in_progress", weight: 1.0 },
        { name: "Electrical Concealed Wiring", progress: 70, status: "in_progress", weight: 1.0 },
        { name: "Painting & Polish", progress: 25, status: "in_progress", weight: 1.0 },
      ],
    });

    const pGupta = await Project.create({
      name: "Gupta House",
      description: "Modern Single-Storey Extension & Renovation",
      location: "Sector 4, Panchkula",
      client: "Mr. Sunil Gupta",
      builderId: builder._id,
      supervisorIds: [supervisor2._id],
      startDate: new Date("2026-08-20"),
      expectedEndDate: new Date("2027-02-15"),
      overallProgress: 48,
      budget: 3800000,
      status: "active",
      milestones: [
        { name: "Demolition & Foundation", progress: 100, status: "completed", weight: 1.5 },
        { name: "Ground Floor Structure", progress: 85, status: "in_progress", weight: 2.0 },
        { name: "Brickwork", progress: 60, status: "in_progress", weight: 1.5 },
        { name: "Plaster", progress: 0, status: "pending", weight: 1.0 },
        { name: "Electrical", progress: 0, status: "pending", weight: 1.0 },
        { name: "Painting", progress: 0, status: "pending", weight: 1.0 },
      ],
    });

    const pSingh = await Project.create({
      name: "Singh Residence",
      description: "Commercial + Residential Mix-use Building",
      location: "VIP Road, Zirakpur",
      client: "Col. H. S. Singh",
      builderId: builder._id,
      supervisorIds: [supervisor2._id],
      startDate: new Date("2026-09-01"),
      expectedEndDate: new Date("2027-04-10"),
      overallProgress: 35,
      budget: 5200000,
      status: "active",
      milestones: [
        { name: "Excavation & Footing", progress: 100, status: "completed", weight: 1.5 },
        { name: "Stilt & First Floor Structure", progress: 70, status: "in_progress", weight: 2.0 },
        { name: "Brickwork", progress: 20, status: "in_progress", weight: 1.5 },
        { name: "Plaster", progress: 0, status: "pending", weight: 1.0 },
        { name: "Electrical", progress: 0, status: "pending", weight: 1.0 },
        { name: "Painting", progress: 0, status: "pending", weight: 1.0 },
      ],
    });

    // Update supervisors' assigned projects
    await User.findByIdAndUpdate(supervisor1._id, {
      assignedProjects: [pSharma._id, pVerma._id],
    });
    await User.findByIdAndUpdate(supervisor2._id, {
      assignedProjects: [pGupta._id, pSingh._id],
    });

    console.log("[Seed] Creating Workers with Aadhaar & e-Shram Verification Profiles...");
    const rawWorkers = [
      // Sharma Residence Workers
      {
        workerId: "BT-LBR-1001",
        name: "Ramesh Kumar",
        phone: "+91 9834567890",
        dob: "1988-06-15",
        photo: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "542389127645",
        aadharVerified: true,
        aadharDoc: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80",
        govIdType: "eshram",
        govIdNumber: "100984726152",
        govIdVerified: true,
        govIdDoc: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-05"),
        verificationNotes: "Physical Aadhaar card & e-Shram UAN verified on site. Biometric clear.",
        fieldInspected: true,
        fieldInspectedBy: "Ramesh Munshi",
        skill: "Mason",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: pSharma._id,
        userId: labourUser._id,
        address: "Village Raipur, Post Kalka, Dist. Panchkula",
        emergencyContact: "+91 9834567899 (Wife)",
      },
      {
        workerId: "BT-LBR-1002",
        name: "Suresh Pal",
        phone: "+91 9845678901",
        dob: "1992-03-22",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "671294810293",
        aadharVerified: true,
        aadharDoc: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80",
        govIdType: "company_id",
        govIdNumber: "LNT-CONTR-9941",
        govIdVerified: true,
        govIdDoc: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-06"),
        verificationNotes: "L&T Contractor ID verified.",
        fieldInspected: true,
        fieldInspectedBy: "Ramesh Munshi",
        skill: "Carpenter",
        dailyWage: 850,
        overtimeRate: 110,
        projectId: pSharma._id,
        address: "Ward No 4, Manimajra",
        emergencyContact: "+91 9845678999",
      },
      {
        workerId: "BT-LBR-1003",
        name: "Mahesh Sharma",
        phone: "+91 9856789012",
        dob: "1990-11-05",
        photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "782390124567",
        aadharVerified: false,
        aadharDoc: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80",
        govIdType: "eshram",
        govIdNumber: "109823419082",
        govIdVerified: false,
        verificationStatus: "pending",
        verificationNotes: "Enrolled by Munshi at site gate. Pending Builder compliance sign-off.",
        fieldInspected: true,
        fieldInspectedBy: "Ramesh Munshi",
        skill: "Bar Bender",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: pSharma._id,
        address: "Balongi, Mohali",
        emergencyContact: "+91 9856789999",
      },
      {
        workerId: "BT-LBR-1004",
        name: "Amit Kumar",
        phone: "+91 9867890123",
        dob: "1997-09-18",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "451278902345",
        aadharVerified: false,
        govIdType: "eshram",
        govIdNumber: "234901827364",
        govIdVerified: false,
        verificationStatus: "pending",
        verificationNotes: "Photo and e-Shram card uploaded. Aadhaar copy is slightly blurry.",
        fieldInspected: true,
        fieldInspectedBy: "Ramesh Munshi",
        skill: "Helper",
        dailyWage: 550,
        overtimeRate: 70,
        projectId: pSharma._id,
        address: "Dadu Majra, Chandigarh",
        emergencyContact: "+91 9867899999",
      },
      {
        workerId: "BT-LBR-1005",
        name: "Rajesh Verma",
        phone: "+91 9878901234",
        dob: "1985-02-10",
        photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "901234567890",
        aadharVerified: true,
        govIdType: "eshram",
        govIdNumber: "109847261599",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-10"),
        skill: "Tiles Mason",
        dailyWage: 900,
        overtimeRate: 120,
        projectId: pSharma._id,
        address: "Dera Bassi",
        emergencyContact: "+91 9878909999",
      },
      {
        workerId: "BT-LBR-1006",
        name: "Manoj Yadav",
        phone: "+91 9889012345",
        dob: "1994-08-30",
        photo: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "345678901234",
        aadharVerified: true,
        govIdType: "company_id",
        govIdNumber: "TATA-ELEC-4421",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-10"),
        skill: "Electrician",
        dailyWage: 850,
        overtimeRate: 110,
        projectId: pSharma._id,
        address: "Zirakpur",
        emergencyContact: "+91 9889019999",
      },
      {
        workerId: "BT-LBR-1007",
        name: "Vikram Jit",
        phone: "+91 9890123456",
        dob: "1989-12-01",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "890123456789",
        aadharVerified: false,
        govIdType: "eshram",
        govIdNumber: "998877665544",
        govIdVerified: false,
        verificationStatus: "rejected",
        verificationNotes: "Aadhaar name does not match Munshi enrolment entry. Please re-upload original card.",
        fieldInspected: true,
        fieldInspectedBy: "Ramesh Munshi",
        skill: "Plumber",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: pSharma._id,
        address: "Kharar, Mohali",
        emergencyContact: "+91 9890129999",
      },
      {
        workerId: "BT-LBR-1008",
        name: "Sonu Lal",
        phone: "+91 9801234567",
        dob: "1995-07-14",
        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "234567890123",
        aadharVerified: true,
        govIdType: "eshram",
        govIdNumber: "554433221100",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-12"),
        skill: "Painter",
        dailyWage: 750,
        overtimeRate: 90,
        projectId: pSharma._id,
        address: "Nayagaon",
        emergencyContact: "+91 9801239999",
      },
      {
        workerId: "BT-LBR-1009",
        name: "Rohit Helper",
        phone: "+91 9811122233",
        dob: "1998-04-25",
        photo: "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "678901234567",
        aadharVerified: false,
        govIdType: "eshram",
        govIdNumber: "112233445566",
        govIdVerified: false,
        verificationStatus: "pending",
        verificationNotes: "Awaiting Aadhaar OTP / physical document scan.",
        fieldInspected: false,
        skill: "Helper",
        dailyWage: 550,
        overtimeRate: 70,
        projectId: pSharma._id,
        address: "Sector 25, Chandigarh",
        emergencyContact: "+91 9811129999",
      },
      {
        workerId: "BT-LBR-1010",
        name: "Deepak Kumar",
        phone: "+91 9822233344",
        dob: "1991-10-10",
        photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "789012345678",
        aadharVerified: true,
        govIdType: "company_id",
        govIdNumber: "SHAP-CIVIL-1082",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-15"),
        skill: "Mason",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: pSharma._id,
        address: "Panchkula Sector 19",
        emergencyContact: "+91 9822239999",
      },
      // Verma Villa Workers
      {
        workerId: "BT-LBR-1011",
        name: "Kuldeep Singh",
        phone: "+91 9833344455",
        dob: "1987-01-20",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "890123456701",
        aadharVerified: true,
        govIdType: "eshram",
        govIdNumber: "776655443322",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-16"),
        skill: "Mason",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: pVerma._id,
        address: "Phase 3B2, Mohali",
        emergencyContact: "+91 9833349999",
      },
      {
        workerId: "BT-LBR-1012",
        name: "Harish Chandra",
        phone: "+91 9844455566",
        dob: "1993-05-18",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "901234567012",
        aadharVerified: false,
        govIdType: "eshram",
        govIdNumber: "887766554433",
        govIdVerified: false,
        verificationStatus: "pending",
        fieldInspected: true,
        fieldInspectedBy: "Ramesh Munshi",
        skill: "Carpenter",
        dailyWage: 850,
        overtimeRate: 110,
        projectId: pVerma._id,
        address: "Kurali",
        emergencyContact: "+91 9844459999",
      },
      {
        workerId: "BT-LBR-1013",
        name: "Sunil Paswan",
        phone: "+91 9855566677",
        dob: "1996-08-12",
        photo: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "012345678901",
        aadharVerified: true,
        govIdType: "eshram",
        govIdNumber: "998877112233",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-18"),
        skill: "Painter",
        dailyWage: 750,
        overtimeRate: 90,
        projectId: pVerma._id,
        address: "Lalru",
        emergencyContact: "+91 9855569999",
      },
      // Gupta House Workers
      {
        workerId: "BT-LBR-1014",
        name: "Jagdish Prasad",
        phone: "+91 9866677788",
        dob: "1986-07-07",
        photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "123456789012",
        aadharVerified: true,
        govIdType: "company_id",
        govIdNumber: "GUPTA-CIVIL-092",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-08-20"),
        skill: "Mason",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: pGupta._id,
        address: "Pinjore",
        emergencyContact: "+91 9866679999",
      },
      {
        workerId: "BT-LBR-1015",
        name: "Dharmendra Helper",
        phone: "+91 9877788899",
        dob: "1999-03-03",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "234567890124",
        aadharVerified: false,
        govIdType: "eshram",
        govIdNumber: "334455667788",
        govIdVerified: false,
        verificationStatus: "pending",
        fieldInspected: true,
        fieldInspectedBy: "Suresh Munshi",
        skill: "Helper",
        dailyWage: 550,
        overtimeRate: 70,
        projectId: pGupta._id,
        address: "Surajpur",
        emergencyContact: "+91 9877789999",
      },
      // Singh Residence Workers
      {
        workerId: "BT-LBR-1016",
        name: "Pawan Kumar",
        phone: "+91 9888899900",
        dob: "1992-12-14",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "345678901235",
        aadharVerified: true,
        govIdType: "eshram",
        govIdNumber: "445566778899",
        govIdVerified: true,
        verificationStatus: "verified",
        verifiedBy: "Arpit Sachdeva (Builder)",
        verifiedAt: new Date("2026-09-02"),
        skill: "Bar Bender",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: pSingh._id,
        address: "Dhakoli, Zirakpur",
        emergencyContact: "+91 9888899999",
      },
      {
        workerId: "BT-LBR-1017",
        name: "Mukesh Kumar",
        phone: "+91 9899900011",
        dob: "1997-06-20",
        photo: "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "456789012346",
        aadharVerified: false,
        govIdType: "eshram",
        govIdNumber: "556677889900",
        govIdVerified: false,
        verificationStatus: "pending",
        fieldInspected: true,
        fieldInspectedBy: "Suresh Munshi",
        skill: "Helper",
        dailyWage: 550,
        overtimeRate: 70,
        projectId: pSingh._id,
        address: "Baltana",
        emergencyContact: "+91 9899909999",
      },
    ];

    const workers = await Worker.insertMany(rawWorkers);
    console.log(`[Seed] Created ${workers.length} workers.`);

    console.log("[Seed] Creating Attendance Records...");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStr = todayStr.substring(0, 7);

    // Generate past 15 days attendance for all workers
    const attendanceRecords = [];
    for (let i = 0; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split("T")[0];

      workers.forEach((w, idx) => {
        // Pseudo-realistic attendance pattern
        let status = "present";
        let overtime = 0;
        let hours = 8;

        if ((idx + i) % 7 === 0) {
          status = "absent";
          hours = 0;
        } else if ((idx + i) % 11 === 0) {
          status = "half-day";
          hours = 4;
        } else if ((idx + i) % 5 === 0) {
          overtime = 1.5;
        }

        attendanceRecords.push({
          workerId: w._id,
          projectId: w.projectId,
          date: dStr,
          checkIn: status !== "absent" ? "08:30 AM" : "-",
          checkOut: status !== "absent" ? (overtime > 0 ? "07:00 PM" : "05:30 PM") : "-",
          totalHours: hours,
          status,
          overtimeHours: overtime,
          notes: overtime > 0 ? "Extended slab curing & brickwork shift" : "",
          markedBy: supervisor1._id,
        });
      });
    }

    await Attendance.insertMany(attendanceRecords);
    console.log(`[Seed] Created ${attendanceRecords.length} attendance records.`);

    console.log("[Seed] Calculating Wages & Creating Payments...");
    for (const w of workers) {
      await calculateWorkerWage(w._id, w.projectId, monthStr);
      // Create partial payments for some workers
      if (w.workerId === "W-1001" || w.workerId === "W-1002" || w.workerId === "W-1003") {
        await Payment.create({
          workerId: w._id,
          projectId: w.projectId,
          amount: 6000,
          paymentDate: new Date(),
          paymentMethod: "UPI",
          reference: "UPI/2026/8947291",
          notes: "Fortnight advance wage payment",
          paidBy: builder._id,
        });
        // Recalculate after payment
        await calculateWorkerWage(w._id, w.projectId, monthStr);
      }
    }

    console.log("[Seed] Creating Daily Work Updates...");
    await WorkUpdate.create([
      {
        projectId: pSharma._id,
        supervisorId: supervisor1._id,
        date: todayStr,
        description: "Ground floor and first floor brick masonry progressed as planned. 12 mason and helper pairs active.",
        progressPercentage: 72,
        completedTasks: [
          "Completed north wall brickwork up to lintel beam level",
          "Water curing of previous day RCC columns",
          "Sanitary pipeline shaft cutting initiated",
        ],
        issues: "Cement stock is running low. Require 50 bags by tomorrow morning to avoid delay.",
        materialsReceived: "1 truck red bricks (4,000 units) unloaded and inspected.",
        tomorrowPlan: "Start first floor bedroom partitions and lintel shuttering.",
        workersPresentCount: 9,
        aiSummary: "9 workers attended on-site today (90% turnout). Key milestones completed: North wall brick masonry, RCC column water curing, sanitary pipeline shafting. Material received: 4,000 red bricks. ⚠️ Alert: Cement inventory is critically low (50 bags urgently required). Next day agenda: First-floor partition masonry and lintel beam shuttering.",
        status: "submitted",
      },
      {
        projectId: pVerma._id,
        supervisorId: supervisor1._id,
        date: todayStr,
        description: "Internal plastering in master bedroom and living hall completed with smooth sponge finish.",
        progressPercentage: 81,
        completedTasks: [
          "Master bedroom 12mm internal plaster complete",
          "Living room electrical switch box mounting",
        ],
        issues: "Minor water pressure issue resolved by installing booster pump.",
        materialsReceived: "POP bags (20 units) and paint primer buckets (4 units) received.",
        tomorrowPlan: "Begin kitchen tile layout and POP punning on bedroom ceiling.",
        workersPresentCount: 3,
        aiSummary: "3 workers active today. Internal plastering completed on master bedroom and living hall. Electrical switch boxes fixed. Material received: 20 POP bags, 4 primer buckets. Tomorrow: Kitchen tile setting and ceiling POP punning.",
        status: "submitted",
      },
      {
        projectId: pGupta._id,
        supervisorId: supervisor2._id,
        date: todayStr,
        description: "Ground floor column casting and brickwork up to 4 feet completed.",
        progressPercentage: 48,
        completedTasks: ["Column shuttering and concrete pouring", "Water ponding on foundation footing"],
        issues: "",
        materialsReceived: "2 tons TMT 550D Steel bars received and stacked.",
        tomorrowPlan: "Continue brickwork on east boundary wall.",
        workersPresentCount: 2,
        aiSummary: "2 workers present. Column casting and concrete pouring completed. Steel inventory replenished with 2 tons TMT 550D.",
        status: "submitted",
      },
    ]);

    console.log("[Seed] Creating Site Photos...");
    await SitePhoto.insertMany([
      {
        projectId: pSharma._id,
        uploadedBy: supervisor1._id,
        imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80",
        category: "progress",
        description: "North wall brick masonry completed up to lintel beam level.",
        date: todayStr,
      },
      {
        projectId: pSharma._id,
        uploadedBy: supervisor1._id,
        imageUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=80",
        category: "material",
        description: "Fresh delivery of 4,000 standard red bricks stacked at site entrance.",
        date: todayStr,
      },
      {
        projectId: pSharma._id,
        uploadedBy: supervisor1._id,
        imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80",
        category: "issue",
        description: "Cement shed inventory down to last 8 bags. Replenishment required.",
        date: todayStr,
      },
      {
        projectId: pVerma._id,
        uploadedBy: supervisor1._id,
        imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80",
        category: "progress",
        description: "Master bedroom internal wall plaster sponge finishing complete.",
        date: todayStr,
      },
      {
        projectId: pGupta._id,
        uploadedBy: supervisor2._id,
        imageUrl: "https://images.unsplash.com/photo-1574360851983-64ac10f774ec?w=800&auto=format&fit=crop&q=80",
        category: "general",
        description: "Site overview showing scaffolding and ground floor framing.",
        date: todayStr,
      },
    ]);

    console.log("[Seed] Creating Site Expenses...");
    await Expense.insertMany([
      {
        projectId: pSharma._id,
        category: "cement",
        amount: 15000,
        description: "40 Bags Ultratech PPC Cement for masonry & plaster",
        date: todayStr,
        vendor: "Gupta Building Materials",
        addedBy: supervisor1._id,
      },
      {
        projectId: pSharma._id,
        category: "steel",
        amount: 45000,
        description: "1.2 MT Tata Tiscon 550D TMT Rebar (12mm & 16mm)",
        date: todayStr,
        vendor: "Apex Steel Traders",
        addedBy: builder._id,
      },
      {
        projectId: pSharma._id,
        category: "bricks",
        amount: 28000,
        description: "4,000 Class-1 Kiln Red Bricks with unloading",
        date: todayStr,
        vendor: "Bharat Brick Kiln",
        addedBy: supervisor1._id,
      },
      {
        projectId: pSharma._id,
        category: "transport",
        amount: 4500,
        description: "Tractor trolley logistics & debris carting",
        date: todayStr,
        vendor: "Local Transport",
        addedBy: supervisor1._id,
      },
      {
        projectId: pVerma._id,
        category: "sand",
        amount: 12500,
        description: "1 Dumper Coarse River Sand for plastering",
        date: todayStr,
        vendor: "Ghaggar Sand Supplies",
        addedBy: supervisor1._id,
      },
      {
        projectId: pVerma._id,
        category: "equipment",
        amount: 7500,
        description: "Concrete mixer and vibrator machine monthly rental",
        date: todayStr,
        vendor: "Chandigarh Equipment Rentals",
        addedBy: builder._id,
      },
    ]);

    console.log("[Seed] Creating Notifications...");
    await Notification.insertMany([
      {
        title: "Daily Report Submitted",
        message: "🔔 Ramesh Munshi submitted today's work report for Sharma Residence (72% complete).",
        type: "report_submitted",
        targetRole: "builder",
        projectId: pSharma._id,
        read: false,
      },
      {
        title: "Absentee Alert",
        message: "⚠️ 2 workers are absent today at Sharma Residence.",
        type: "absentee",
        targetRole: "builder",
        projectId: pSharma._id,
        read: false,
      },
      {
        title: "Pending Wage Reminder",
        message: "💰 Fortnight wage payment due for 10 workers at Sharma Residence.",
        type: "pending_wages",
        targetRole: "builder",
        projectId: pSharma._id,
        read: false,
      },
      {
        title: "Material Shortage Alert",
        message: "⚠️ Cement stock low at Sharma Residence - only 8 bags remaining.",
        type: "delay_alert",
        targetRole: "builder",
        projectId: pSharma._id,
        read: false,
      },
    ]);

    console.log("==========================================");
    console.log("✅ BuildTrack Database Seeded Successfully!");
    console.log("==========================================");
    console.log("Builder Login:    builder@buildtrack.com / password123");
    console.log("Supervisor Login: supervisor@buildtrack.com / password123");
    console.log("Labour Login:     ramesh.mason@buildtrack.com / password123");
    console.log("==========================================");
  } catch (error) {
    console.error("❌ Seed Error:", error);
  }
};

// If run directly from CLI
if (process.argv[1]?.includes("seedData.js")) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}
