import Project from "../models/Project.js";
import RoadMeasurement from "../models/RoadMeasurement.js";

const MAX_ACCURACY_METERS = 25;
const MIN_SEGMENT_METERS = 25;

const distanceBetween = (a, b) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b.longitude - a.longitude);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
};

const canAccessProject = (project, user) => {
  if (user.role === "builder" || user.role === "admin") return true;
  if (user.role !== "supervisor") return false;
  const assigned = Array.isArray(project.supervisorIds) ? project.supervisorIds : [];
  return assigned.some((entry) => String(entry?._id || entry) === String(user._id));
};

export const listRoadMeasurements = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!canAccessProject(project, req.user)) return res.status(403).json({ message: "You are not assigned to this project" });

    const records = await RoadMeasurement.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

export const createRoadMeasurement = async (req, res, next) => {
  try {
    const { projectId, points, startedAt } = req.body;
    if (!projectId || !Array.isArray(points) || points.length < 2) {
      return res.status(400).json({ message: "A project and at least two GPS points are required" });
    }
    if (points.length > 5000) return res.status(413).json({ message: "Trace is too large. Stop and save shorter road segments." });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!canAccessProject(project, req.user)) return res.status(403).json({ message: "You are not assigned to this project" });

    const cleanPoints = points.map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      accuracy: Number(point.accuracy),
      timestamp: Number(point.timestamp),
    })).filter((point) => (
      Number.isFinite(point.latitude)
      && point.latitude >= -90 && point.latitude <= 90
      && Number.isFinite(point.longitude)
      && point.longitude >= -180 && point.longitude <= 180
      && Number.isFinite(point.accuracy)
      && point.accuracy > 0 && point.accuracy <= MAX_ACCURACY_METERS
      && Number.isFinite(point.timestamp)
    ));

    if (cleanPoints.length < 2) {
      return res.status(422).json({ message: "Not enough accurate GPS fixes. Wait for accuracy of 25 m or better and retry." });
    }

    let distanceMeters = 0;
    const retainedPoints = [cleanPoints[0]];
    for (let i = 1; i < cleanPoints.length; i += 1) {
      const previous = retainedPoints[retainedPoints.length - 1];
      const current = cleanPoints[i];
      const stepMeters = distanceBetween(previous, current);
      const elapsedSeconds = Math.max((current.timestamp - previous.timestamp) / 1000, 0.25);

      // Ignore stationary GPS jitter and impossible jumps, which otherwise inflate a trace.
      if (stepMeters < Math.max(2.5, current.accuracy * 0.15)) continue;
      if (stepMeters / elapsedSeconds > 45) continue;

      distanceMeters += stepMeters;
      retainedPoints.push(current);
    }

    if (distanceMeters < MIN_SEGMENT_METERS || retainedPoints.length < 2) {
      return res.status(422).json({ message: "Trace is under 25 m or GPS drift dominated it. Record a longer segment outdoors with better GPS accuracy." });
    }

    const averageAccuracyMeters = retainedPoints.reduce((sum, point) => sum + point.accuracy, 0) / retainedPoints.length;
    const record = await RoadMeasurement.create({
      projectId,
      projectName: project.name,
      supervisorId: req.user._id,
      supervisorName: req.user.name,
      points: retainedPoints,
      pointCount: retainedPoints.length,
      distanceMeters: Math.round(distanceMeters),
      distanceKm: Number((distanceMeters / 1000).toFixed(3)),
      averageAccuracyMeters: Number(averageAccuracyMeters.toFixed(1)),
      startedAt: startedAt || retainedPoints[0].timestamp,
      endedAt: retainedPoints[retainedPoints.length - 1].timestamp,
      reviewStatus: "needs_review",
      countsTowardProgress: false,
    });

    res.status(201).json({
      message: "GPS road measurement saved for review. It has not been added to project progress.",
      measurement: record,
    });
  } catch (error) {
    next(error);
  }
};
