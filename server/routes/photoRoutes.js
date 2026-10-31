import express from "express";
import { uploadPhoto, getPhotos, deletePhoto } from "../controllers/photoController.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.route("/")
  .get(protect, getPhotos)
  .post(protect, authorize("builder", "supervisor"), upload.single("image"), uploadPhoto);

router.delete("/:id", protect, authorize("builder", "supervisor"), deletePhoto);

export default router;
