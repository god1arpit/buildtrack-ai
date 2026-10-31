import express from "express";
import { register, login, demoLogin, getMe, getSupervisors, updateMyProfilePhoto } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/demo", demoLogin);
router.get("/me", protect, getMe);
router.post("/me/photo", protect, upload.single("photo"), updateMyProfilePhoto);
router.get("/supervisors", protect, authorize("builder"), getSupervisors);

export default router;
