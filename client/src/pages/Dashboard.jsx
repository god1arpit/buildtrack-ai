import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Users, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  UploadCloud,
  FileText,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: "",
    location: "",
    total_road_length: 10.0,
    start_date: new Date().toISOString().split("T")[0],
    planned_end_date: new Date(Date.now() + 60*24*60*60*1000).toISOString().split("T")[0],
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects");
      setProjects(res.data || []);
      if (res.data?.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (projId) => {
    if (!projId) return;
    try {
      const res = await api.get(`/dashboard/${projId}`);
      setDashboardData(res.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchDashboard(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/projects", newProject);
      setShowCreateModal(false);
      fetchProjects();
      setSelectedProjectId(res.data.id);
    } catch (err) {
      alert("Failed to create project");
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
        <span className="text-xs font-mono uppercase tracking-widest">Loading Computer Vision Road Analytics...</span>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const project = dashboardData?.project || {};
  const trend = dashboardData?.trend || [];

  // Chart 1: Progress Trend Chart
  const progressChartData = {
    labels: trend.map((t) => t.date),
    datasets: [
      {
        fill: true,
        label: "Completed Length (km)",
        data: trend.map((t) => t.completed_km),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(63, 63, 70, 0.15)",
        tension: 0.35,
        borderWidth: 2.5,
      },
    ],
  };

  // Chart 2: Workforce & Equipment Productivity Breakdown
  const fleetChartData = {
    labels: ["Rollers", "Excavators", "Pavers", "Dump Trucks"],
    datasets: [
      {
        label: "Machinery Units Active",
        data: [kpis.rollers || 0, kpis.excavators || 0, kpis.pavers || 0, kpis.trucks || 0],
        backgroundColor: [
          "rgba(147, 51, 234, 0.8)",
          "rgba(249, 115, 22, 0.8)",
          "rgba(20, 184, 166, 0.8)",
          "rgba(22, 101, 52, 0.8)",
        ],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Project Selector & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-zinc-600/20 text-zinc-400 border border-zinc-500/30 flex items-center justify-center shadow">
            <Building2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
              Active Road Corridor
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-zinc-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name} ({p.total_road_length} km)
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 rounded-xl bg-zinc-600/20 hover:bg-zinc-600 text-zinc-400 hover:text-white border border-zinc-500/30 transition"
                title="Create New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/upload"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white font-bold text-xs shadow-lg shadow-zinc-600/25 transition"
          >
            <UploadCloud className="w-4 h-4 stroke-[2.4]" />
            <span>Process Drone Footage</span>
          </Link>
          <button
            onClick={() => fetchDashboard(selectedProjectId)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (PRD / TRD Functional Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Road Completion */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Road Progress</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{kpis.progress_pct || 0}%</span>
            <span className="text-xs text-zinc-400 font-mono">
              ({kpis.completed_km || 0} / {project.total_km || 0} km)
            </span>
          </div>
          <div className="mt-3 w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.progress_pct || 0)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Workforce Detection & Activity Index */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Workforce Activity</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{kpis.worker_count || 0}</span>
            <span className="text-xs text-zinc-400 font-bold">Workers Detected</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 font-bold">{kpis.active_workers || 0} Active</span>
            <span className="text-rose-400 font-bold">{kpis.idle_workers || 0} Idle</span>
            <span className="text-zinc-400">({kpis.workforce_activity_rate || 0}% Rate)</span>
          </div>
        </div>

        {/* Metric 3: Fleet Machinery Utilization */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Machinery Fleet</span>
            <Truck className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{kpis.equipment_count || 0}</span>
            <span className="text-xs text-green-400 font-bold">Machinery Units</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-mono">Fleet Utilization:</span>
            <span className="text-green-400 font-bold font-mono text-xs">
              {kpis.equipment_utilization || 0}%
            </span>
          </div>
        </div>

        {/* Metric 4: AI Completion Forecast */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completion Forecast</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{kpis.estimated_days_remaining || 0}</span>
            <span className="text-xs text-purple-400 font-bold">Days Remaining</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-mono">Expected Date:</span>
            <span className="text-white font-mono font-bold">
              {kpis.predicted_completion_date || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Computer Vision Centerpiece: Drone Annotated Feed */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Computer Vision Inspection & Segmentation Feed
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Uploaded site media with prototype road surface estimates
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Road estimate: Prototype
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-bold">
              Prototype analysis
            </span>
          </div>
        </div>

        {dashboardData?.latest_media?.annotated_url ? (
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black flex justify-center group">
            <img
              src={dashboardData.latest_media.annotated_url}
              alt="Processed Drone Road Inspection"
              className="w-full max-h-[520px] object-contain"
            />
            <div className="absolute bottom-4 right-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-700 text-[11px] font-mono text-zinc-300">
              HUD Sensor Timestamp: {dashboardData.latest_media.upload_date?.substring(0, 19) || "Real-Time"}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
            No site media processed yet. Upload an image or video to generate a prototype road estimate.
          </div>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Historical Road Advancement (km)</h3>
              <p className="text-[11px] text-zinc-400">Cumulative physical road completion progress</p>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-500/10 px-2.5 py-1 rounded-lg border border-zinc-500/20">
              Avg Pace: {kpis.daily_pace_km || 0.25} km/day
            </span>
          </div>
          <div className="h-64">
            <Line
              data={progressChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { grid: { color: "#27272a" }, ticks: { color: "#a1a1aa", font: { size: 10 } } },
                  y: { grid: { color: "#27272a" }, ticks: { color: "#a1a1aa", font: { size: 10 } } },
                },
                plugins: {
                  legend: { display: false },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Machinery Equipment Utilization</h3>
              <p className="text-[11px] text-zinc-400">Active heavy machinery units detected on corridor</p>
            </div>
            <span className="text-xs font-mono font-bold text-green-400 bg-green-900/30 px-2.5 py-1 rounded-lg border border-green-700/20">
              Fleet Util: {kpis.equipment_utilization || 0}%
            </span>
          </div>
          <div className="h-64">
            <Bar
              data={fleetChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { grid: { color: "#27272a" }, ticks: { color: "#a1a1aa", font: { size: 10 } } },
                  y: { grid: { color: "#27272a" }, ticks: { color: "#a1a1aa", font: { size: 10 } } },
                },
                plugins: {
                  legend: { display: false },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Modal: Create New Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">Create Road Construction Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ring Road Phase-2 Expressway"
                  value={newProject.project_name}
                  onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chandigarh Bypass Corridor"
                  value={newProject.location}
                  onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Total Road Length (km) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newProject.total_road_length}
                  onChange={(e) => setNewProject({ ...newProject, total_road_length: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Planned End Date</label>
                  <input
                    type="date"
                    value={newProject.planned_end_date}
                    onChange={(e) => setNewProject({ ...newProject, planned_end_date: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white font-bold"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

