import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "buildtrack_super_secure_jwt_secret_key_2026",
    { expiresIn: "30d" }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, skill } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: role || "builder",
      skill: role === "labour" ? (skill || "Helper") : "",
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      skill: user.skill || "",
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPhone = email?.trim();

    let user = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });

    // If demo email used (builder@buildtrack.com etc.) and not in DB, fallback to first user with matching role
    if (!user && cleanEmail?.includes("@buildtrack.com")) {
      const targetRole = cleanEmail.startsWith("supervisor") ? "supervisor" : cleanEmail.startsWith("labour") ? "labour" : "builder";
      user = await User.findOne({ role: targetRole });
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        assignedProjects: user.assignedProjects || [],
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email/phone or password" });
    }
  } catch (error) {
    next(error);
  }
};

export const demoLogin = async (req, res, next) => {
  try {
    const { role = "builder" } = req.body;
    let user = await User.findOne({ role });
    if (!user) {
      user = await User.create({
        name: role === "builder" ? "Arpit Sachdeva (Builder)" : role === "supervisor" ? "Ramesh Munshi (Supervisor)" : "Arpit Worker",
        email: `${role}@buildtrack.com`,
        phone: "+918572092552",
        password: "password123",
        role,
        skill: role === "labour" ? "Mason" : "",
      });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      assignedProjects: user.assignedProjects || [],
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password").populate("assignedProjects");
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateMyProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file || !req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Please choose an image file for your profile photo." });
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
      profileImage: `/uploads/${req.file.filename}`,
    });
    if (!user) return res.status(404).json({ message: "Account not found." });
    res.json({ profileImage: user.profileImage });
  } catch (error) {
    next(error);
  }
};

export const getSupervisors = async (req, res, next) => {
  try {
    const supervisors = await User.find({ role: "supervisor" }).select("-password");
    res.json(supervisors);
  } catch (error) {
    next(error);
  }
};
