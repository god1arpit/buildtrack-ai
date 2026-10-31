import Notification from "../models/Notification.js";

export const getNotifications = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const notifications = await Notification.find({
      $or: [
        { userId: req.user._id },
        { targetRole: userRole },
        { targetRole: "all" },
      ],
    })
      .populate("projectId", "name location")
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.read).length;

    res.json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    await Notification.updateMany(
      {
        $or: [
          { userId: req.user._id },
          { targetRole: userRole },
          { targetRole: "all" },
        ],
        read: false,
      },
      { read: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
