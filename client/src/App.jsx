import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

// Auth Pages
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

// Builder Pages
import { BuilderDashboard } from "./pages/builder/BuilderDashboard";
import { BuilderAIWorkflow } from "./pages/builder/BuilderAIWorkflow";
import { ProjectsPage } from "./pages/builder/ProjectsPage";
import { ProjectDetailPage } from "./pages/builder/ProjectDetailPage";
import { LabourPage } from "./pages/builder/LabourPage";
import { AttendancePage } from "./pages/builder/AttendancePage";
import { WagesPage } from "./pages/builder/WagesPage";
import { ExpensesPage } from "./pages/builder/ExpensesPage";
import { DailyUpdatesPage } from "./pages/builder/DailyUpdatesPage";
import { PhotosPage } from "./pages/builder/PhotosPage";
import { ReportsPage } from "./pages/builder/ReportsPage";
import { AIInsightsPage } from "./pages/builder/AIInsightsPage";

// Supervisor Pages
import { SupervisorDashboard } from "./pages/supervisor/SupervisorDashboard";
import { SupervisorAIWorkflow } from "./pages/supervisor/SupervisorAIWorkflow";
import { MarkAttendancePage } from "./pages/supervisor/MarkAttendancePage";
import { DailyWorkUpdatePage } from "./pages/supervisor/DailyWorkUpdatePage";
import { UploadPhotosPage } from "./pages/supervisor/UploadPhotosPage";
import { AddExpensePage } from "./pages/supervisor/AddExpensePage";
import { RoadMeasurementPage } from "./pages/supervisor/RoadMeasurementPage";

// Labour Pages
import { LabourDashboard } from "./pages/labour/LabourDashboard";

// Unified Verification System
import { VerificationPage } from "./pages/VerificationPage";

export function App() {
  const { user, role } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  const getHomeRedirect = () => {
    if (!user) return "/login";
    if (role === "supervisor") return "/supervisor";
    if (role === "labour") return "/labour";
    return "/builder";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-green-800 selection:text-white">
      {/* Global Navigation Header */}
      <Navbar
        toggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
        isMobileSidebarOpen={isMobileOpen}
      />

      {isAuthPage ? (
        <main className="flex-1 flex items-center justify-center p-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      ) : (
        <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
          {/* Role-Specific Navigation Sidebar */}
          <Sidebar
            isMobileOpen={isMobileOpen}
            closeMobileSidebar={() => setIsMobileOpen(false)}
          />

          {/* Main App Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            <Routes>
              {/* Home redirect */}
              <Route path="/" element={<Navigate to={getHomeRedirect()} replace />} />

              {/* Builder Routes */}
              <Route path="/builder" element={<BuilderDashboard />} />
              <Route path="/builder/ai-workflow" element={<BuilderAIWorkflow />} />
              <Route path="/builder/upload-ai" element={<BuilderAIWorkflow />} />
              <Route path="/builder/projects" element={<ProjectsPage />} />
              <Route path="/builder/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/builder/labour" element={<LabourPage />} />
              <Route path="/builder/attendance" element={<AttendancePage />} />
              <Route path="/builder/wages" element={<WagesPage />} />
              <Route path="/builder/expenses" element={<ExpensesPage />} />
              <Route path="/builder/daily-updates" element={<DailyUpdatesPage />} />
              <Route path="/builder/photos" element={<PhotosPage />} />
              <Route path="/builder/reports" element={<ReportsPage />} />
              <Route path="/builder/ai-insights" element={<AIInsightsPage />} />

              {/* Supervisor Routes */}
              <Route path="/supervisor" element={<SupervisorDashboard />} />
              <Route path="/supervisor/ai-workflow" element={<SupervisorAIWorkflow />} />
              <Route path="/supervisor/workflow-check" element={<SupervisorAIWorkflow />} />
              <Route path="/supervisor/attendance" element={<MarkAttendancePage />} />
              <Route path="/supervisor/work-update" element={<DailyWorkUpdatePage />} />
              <Route path="/supervisor/photos" element={<UploadPhotosPage />} />
              <Route path="/supervisor/measure-road" element={<RoadMeasurementPage />} />
              <Route path="/supervisor/expenses" element={<AddExpensePage />} />

              {/* Labour Routes */}
              <Route path="/labour" element={<LabourDashboard />} />

              {/* Multi-Section Verification Hub */}
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/builder/verification" element={<VerificationPage />} />
              <Route path="/supervisor/verification" element={<VerificationPage />} />
              <Route path="/labour/verification" element={<VerificationPage />} />

              {/* Global AI Shortcuts */}
              <Route path="/upload" element={<SupervisorAIWorkflow />} />
              <Route path="/ai-workflow" element={<BuilderAIWorkflow />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to={getHomeRedirect()} replace />} />
            </Routes>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
