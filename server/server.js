import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Import route handlers
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import wageRoutes from "./routes/wageRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import workUpdateRoutes from "./routes/workUpdateRoutes.js";
import photoRoutes from "./routes/photoRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import roadMeasurementRoutes from "./routes/roadMeasurementRoutes.js";
import { upload } from "./middleware/upload.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to Database
await connectDB();

// Middlewares
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Static files for uploads (Site photos & receipts)
app.use("/uploads", express.static(process.env.BUILDTRACK_UPLOAD_DIR || path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/wages", wageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/work-updates", workUpdateRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/road-measurements", roadMeasurementRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "BuildTrack API",
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.BUILDTRACK_HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`[BuildTrack Server] Running on http://${HOST}:${PORT}`);
});

export default app;
