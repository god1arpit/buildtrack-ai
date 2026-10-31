import SitePhoto from "../models/SitePhoto.js";

export const uploadPhoto = async (req, res, next) => {
  try {
    const { projectId, category, description, date } = req.body;
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!projectId || !imageUrl) {
      return res.status(400).json({ message: "projectId and photo/image are required" });
    }

    const photo = await SitePhoto.create({
      projectId,
      uploadedBy: req.user._id,
      imageUrl,
      category: category || "progress",
      description: description || "",
      date: date || new Date().toISOString().split("T")[0],
    });

    const populated = await SitePhoto.findById(photo._id)
      .populate("uploadedBy", "name")
      .populate("projectId", "name");

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

export const getPhotos = async (req, res, next) => {
  try {
    const { projectId, category, date, startDate, endDate } = req.query;
    let filter = {};

    if (projectId) filter.projectId = projectId;
    if (category && category !== "all") filter.category = category;
    if (date) filter.date = date;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const photos = await SitePhoto.find(filter)
      .populate("uploadedBy", "name")
      .populate("projectId", "name")
      .sort({ createdAt: -1 });

    res.json(photos);
  } catch (error) {
    next(error);
  }
};

export const deletePhoto = async (req, res, next) => {
  try {
    const photo = await SitePhoto.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    await SitePhoto.findByIdAndDelete(req.params.id);
    res.json({ message: "Photo deleted successfully" });
  } catch (error) {
    next(error);
  }
};
