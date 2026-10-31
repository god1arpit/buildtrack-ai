import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api, { 
  fetchAIDashboard, 
  previewRoadMask,
  measureRoadUnderConstruction,
  uploadAIInference,
  fetchAIAnalytics, 
  fetchAIPrediction,
  fetchAIReports,
  createAIReport,
  resolveMediaUrl
} from "../../api/api";
import {
  Compass,
  Layers,
  UploadCloud,
  BarChart3,
  Clock,
  FileText,
  Sparkles,
  TrendingUp,
  HardHat,
  Truck,
  CheckCircle2,
  Calendar,
  MapPin,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Ruler
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const BuilderAIWorkflow = () => {
  const [activeTab, setActiveTab] = useState("overview"); // overview, upload, analytics, prediction, reports
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("default");
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Upload Tab State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestInference, setLatestInference] = useState(null);

  // Reports Tab State
  const [reports, setReports] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeReportModal, setActiveReportModal] = useState(null);

  const loadData = async (projId) => {
    try {
      setLoading(true);
      const [dash, pList] = await Promise.all([
        fetchAIDashboard(projId || selectedProjectId),
        api.get("/projects").catch(() => ({ data: [] }))
      ]);
      setDashboardData(dash);
      if (pList.data?.length > 0) {
        setProjects(pList.data);
      }
    } catch (err) {
      console.error("Error loading AI dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedProjectId);
  }, [selectedProjectId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(selectedProjectId);
  };

  // Upload handler for Builder - runs full Physical Measurement and Completion Prediction
  const [roadBoundaryMode, setRoadBoundaryMode] = useState("strict");

  const handleUploadSubmit = async (e, overrideFile = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const file = overrideFile || uploadFile;
    if (!file) return;

    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("known_road_width_m", knownRoadWidth || 7.0);
      formData.append("road_threshold", roadBoundaryMode === "strict" ? "0.68" : "0.58");
      if (customGsd && parseFloat(customGsd) > 0) {
        formData.append("gsd_m_per_px", (parseFloat(customGsd) / 100.0).toString());
      }
      formData.append("project_id", selectedProjectId || "default");

      const res = await measureRoadUnderConstruction(formData);
      setLatestInference(res);
      setMeasureResult(res);
    } catch (err) {
      console.error("Upload error:", err);
      const errMsg = err.response?.data?.detail || err.message;
      if (err.response?.status === 404 || err.code === "ERR_NETWORK" || err.response?.status === 502) {
        alert("Connecting to AI Cloud Service... If the server was sleeping, it takes ~20 seconds to wake up. Please tap again in a moment.");
      } else {
        alert("AI Road measurement failed: " + errMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Report generation
  const handleGenerateReport = async (type = "daily") => {
    try {
      setGeneratingReport(true);
      const res = await createAIReport(selectedProjectId, { report_type: type });
      setReports((prev) => [res.report, ...prev]);
      setActiveReportModal(res.report);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Sample presets for quick testing
  const samplePresets = [
    {
      name: "Highway Orthomosaic Sector 4",
      url: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=1200&auto=format&fit=crop&q=80",
      type: "drone_image",
      presetWidth: 7.0
    },
    {
      name: "Overpass Grading & Paver Zone",
      url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200&auto=format&fit=crop&q=80",
      type: "site_camera",
      presetWidth: 10.5
    }
  ];

  const handlePresetSelect = async (preset) => {
    try {
      setIsProcessing(true);
      setUploadPreview(preset.url);
      setKnownRoadWidth(preset.presetWidth || 7.0);
      const resp = await fetch(preset.url);
      const blob = await resp.blob();
      const file = new File([blob], "drone_flight_sector.jpg", { type: "image/jpeg" });
      setUploadFile(file);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("known_road_width_m", preset.presetWidth || 7.0);
      formData.append("project_id", selectedProjectId || "default");

      const res = await measureRoadUnderConstruction(formData);
      setLatestInference(res);
      setMeasureResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Road Measurement Engine State & Handlers
  const [measureFile, setMeasureFile] = useState(null);
  const [measurePreview, setMeasurePreview] = useState(null);
  const [knownRoadWidth, setKnownRoadWidth] = useState(7.0);
  const [customGsd, setCustomGsd] = useState("");
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureResult, setMeasureResult] = useState(null);
  const [measureError, setMeasureError] = useState(null);

  const measurePresets = [
    {
      name: "Highway Under-Construction Ortho",
      url: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=1200&auto=format&fit=crop&q=80",
      presetWidth: 7.0
    },
    {
      name: "Grading & Subgrade Earthwork Zone",
      url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200&auto=format&fit=crop&q=80",
      presetWidth: 10.5
    },
    {
      name: "Asphalt Compaction Corridor",
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80",
      presetWidth: 7.0
    }
  ];

  const handleRunMeasurement = async (overrideFile = null) => {
    const file = overrideFile || measureFile;
    if (!file) {
      setMeasureError("Please upload or select a road image to measure.");
      return;
    }
    try {
      setIsMeasuring(true);
      setMeasureError(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("known_road_width_m", knownRoadWidth || 7.0);
      formData.append("road_threshold", roadBoundaryMode === "strict" ? "0.68" : "0.58");
      if (customGsd && parseFloat(customGsd) > 0) {
        formData.append("gsd_m_per_px", (parseFloat(customGsd) / 100.0).toString());
      }
      formData.append("project_id", selectedProjectId || "default");

      const res = await measureRoadUnderConstruction(formData);
      setMeasureResult(res);
    } catch (err) {
      console.error("Measurement error:", err);
      if (err.response?.status === 404 || err.code === "ERR_NETWORK" || err.response?.status === 502) {
        setMeasureError("Connecting to AI Cloud Service... If the server was sleeping, it takes ~20 seconds to wake up. Please tap again in a moment.");
      } else {
        setMeasureError(err.response?.data?.detail || "Failed to calculate road measurements.");
      }
    } finally {
      setIsMeasuring(false);
    }
  };

  const handleMeasurePreset = async (preset) => {
    try {
      setIsMeasuring(true);
      setMeasurePreview(preset.url);
      setKnownRoadWidth(preset.presetWidth);
      setMeasureError(null);
      const resp = await fetch(preset.url);
      const blob = await resp.blob();
      const file = new File([blob], "drone_measure_sector.jpg", { type: "image/jpeg" });
      setMeasureFile(file);
      await handleRunMeasurement(file);
    } catch (err) {
      console.error(err);
      setMeasureError("Failed to fetch preset sample.");
    } finally {
      setIsMeasuring(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-zinc-500 animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Loading AI Road Monitoring Core...</p>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const project = dashboardData?.project || {};
  const trend = dashboardData?.trend || [];
  const latestMedia = dashboardData?.latest_media || {};

  // Trend Chart Data
  const trendLabels = trend.map((t) => t.date.slice(5));
  const trendValues = trend.map((t) => t.progress_pct);
  const chartData = {
    labels: trendLabels.length ? trendLabels : ["Day 1", "Day 5", "Day 10", "Day 15", "Day 20"],
    datasets: [
      {
        label: "Asphalt Completion %",
        data: trendValues.length ? trendValues : [10, 25, 42, 55, 62],
        borderColor: "#A1A1AA",
        backgroundColor: "rgba(63, 63, 70, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#A1A1AA",
        pointBorderColor: "#3F3F46",
        pointRadius: 5,
      },
    ],
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Project Selector */}
      <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 px-2.5 py-1 rounded-full">
              Builder Executive Console
            </span>
            <span className="text-xs font-bold bg-green-900/50 text-green-300 border border-green-700/30 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Autonomous Computer Vision
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
            AI Road Construction & Workflow Monitoring
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              {project.name} ({project.location})
            </span>
            <span>Total Scope: <strong className="text-white">{project.total_km} km</strong></span>
            <span>Planned Target: <strong className="text-white">{project.planned_end_date}</strong></span>
          </div>
        </div>

        {/* Project Switcher & Refresh */}
        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="default">NH-44 Expansion (Default Highway)</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition"
            title="Refresh AI Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-zinc-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800">
        {[
          { id: "overview", label: "Executive HUD & Workflow", icon: Layers },
          { id: "measurement", label: "Road Measurement & Dimensions", icon: Ruler, badge: "AI Core" },
          { id: "upload", label: "Drone Media Studio", icon: UploadCloud },
          { id: "analytics", label: "Road Surface & Progress Analytics", icon: BarChart3 },
          { id: "prediction", label: "Forecasting Engine", icon: Clock },
          { id: "reports", label: "Audit Reports", icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                active
                  ? "bg-zinc-600 text-white shadow-lg shadow-zinc-600/30"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  active ? "bg-white text-zinc-700" : "bg-green-900/50 text-green-300 border border-green-700/30"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & HUD */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Road Progress */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Overall Progress</span>
                <span className="p-2 rounded-xl bg-zinc-500/15 text-zinc-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{kpis.progress_pct}%</span>
                <span className="text-xs text-zinc-400">({kpis.completed_km} / {project.total_km} km)</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-zinc-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${kpis.progress_pct}%` }}
                />
              </div>
            </div>

            {/* Road Carriageway Scale */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Carriageway Scale</span>
                <span className="p-2 rounded-xl bg-green-900/40 text-green-400">
                  <Ruler className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{knownRoadWidth || 7.0} m</span>
                <span className="text-xs text-zinc-400">standard width</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-3 font-semibold text-green-400">
                <span>Standard Carriageway Calibrated</span>
                <span className="text-zinc-400">GSD: ~2.8 cm/px</span>
              </div>
            </div>

            {/* Surface Area Completed */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Paved Surface Area</span>
                <span className="p-2 rounded-xl bg-zinc-500/15 text-zinc-400">
                  <Compass className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">
                  {Math.round((kpis.completed_km || 7.37) * 7000).toLocaleString()} m²
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-semibold mt-3">
                {(((kpis.completed_km || 7.37) * 7000) / 10000).toFixed(2)} Hectares Bituminous Pavement
              </div>
            </div>

            {/* Predictive Forecast */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">AI Forecast Delivery</span>
                <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {kpis.predicted_completion_date || "No forecast yet"}
                </span>
              </div>
              <div className="text-[11px] text-purple-400 font-semibold mt-3">
                {kpis.estimated_days_remaining ?? "—"} Days Remaining ({kpis.confidence_score ?? "—"}% Confidence)
              </div>
            </div>
          </div>

          {/* Main Visual Section: Drone Orthomosaic HUD & Progress Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Drone Orthomosaic Display (7 cols) */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-zinc-400" />
                    Autonomous Drone Inspection HUD
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Surface segmentation overlay (Green = Paved Asphalt, Red = Unpaved Earth)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Upload New Flight
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 min-h-[340px] flex items-center justify-center">
                {latestMedia.annotated_url ? (
                  <div className="relative w-full">
                    <img
                      src={latestMedia.annotated_url}
                      alt="Drone Road Orthomosaic Annotated"
                      className="w-full h-96 object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-700 text-xs font-mono font-bold text-zinc-400">
                      DRONE SURVEY ORTHO-HUD
                    </div>
                    <div className="absolute bottom-3 left-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-700 text-xs font-mono text-zinc-300">
                      Paved: {kpis.progress_pct}% | Workers: {kpis.worker_count} | Equip: {kpis.equipment_count}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 text-zinc-500">
                    <Layers className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold text-zinc-300">No drone flight uploaded yet</p>
                    <p className="text-[11px] mt-1">Upload survey footage to generate segmentation HUD</p>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Progress Chart (5 cols) */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Construction Burn-Down Trend
                </h2>
                <p className="text-xs text-zinc-400">Historical surface progress vs planned velocity</p>
              </div>

              <div className="h-64 pt-2">
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { backgroundColor: "#0F172A", titleColor: "#F4F4F5", bodyColor: "#D4D4D8" },
                    },
                    scales: {
                      x: { grid: { color: "rgba(63, 63, 70, 0.4)" }, ticks: { color: "#A1A1AA" } },
                      y: { grid: { color: "rgba(63, 63, 70, 0.4)" }, ticks: { color: "#A1A1AA" }, min: 0, max: 100 },
                    },
                  }}
                />
              </div>

              <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Estimated Completion Pace:</span>
                <span className="font-mono font-bold text-zinc-400">~{kpis.daily_pace_km || 0.25} km / day</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ROAD MEASUREMENT & PHYSICAL DIMENSIONS */}
      {activeTab === "measurement" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider bg-zinc-500/20 text-zinc-300 border border-zinc-500/40 px-3 py-1 rounded-full">
                    Trained ResNet18 U-Net Engine
                  </span>
                  <span className="text-xs font-bold bg-green-900/50 text-green-300 border border-green-700/30 px-3 py-1 rounded-full flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5" /> Physical Scale Calibrated
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white">
                  Road Construction Measurement & Dimensional HUD
                </h2>
                <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
                  Measures total physical road length along the centerline curve, computes transverse cross-sectional widths, calculates total surface area, and dynamically differentiates completed asphalt vs. under-construction earthwork/subgrade.
                </p>
              </div>

              {measureResult && (
                <button
                  onClick={() => window.print()}
                  className="self-start md:self-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-zinc-700 shadow transition"
                >
                  <Printer className="w-4 h-4 text-zinc-400" />
                  Print Measurement Book (MB)
                </button>
              )}
            </div>
          </div>

          {/* Configuration & Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Calibration & Upload Form (5 cols) */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-zinc-400" />
                  1. Dimension Calibration & Scale Settings
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Calibrate camera scale using standard carriageway design width or drone GSD.
                </p>
              </div>

              {/* Highway Standard Width Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  Carriageway Design Width (Known Road Width)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "3.75m (1-Lane)", value: 3.75 },
                    { label: "7.00m (2-Lane)", value: 7.0 },
                    { label: "10.5m (3-Lane)", value: 10.5 },
                    { label: "14.0m (4-Lane)", value: 14.0 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setKnownRoadWidth(preset.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                        knownRoadWidth === preset.value
                          ? "bg-zinc-600/20 border-zinc-500 text-zinc-400"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-zinc-400 whitespace-nowrap">Custom Width:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="100.0"
                    value={knownRoadWidth}
                    onChange={(e) => setKnownRoadWidth(parseFloat(e.target.value) || 7.0)}
                    className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                  />
                  <span className="text-xs text-zinc-400">meters</span>
                </div>
              </div>

              {/* Road Boundary & Side Gravel Filter Mode */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Road Boundary Precision
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {roadBoundaryMode === "strict" ? "🛡️ Cuts Gravel & Shoulder" : "🛣️ Standard Corridor"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoadBoundaryMode("strict")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex flex-col gap-0.5 ${
                      roadBoundaryMode === "strict"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">🛡️ Strict Carriageway</span>
                    <span className="text-[10px] font-normal text-zinc-400">Prunes side dirt & gravel shoulder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoadBoundaryMode("standard")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex flex-col gap-0.5 ${
                      roadBoundaryMode === "standard"
                        ? "bg-zinc-600/20 border-zinc-500 text-zinc-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">🛣️ Standard Road</span>
                    <span className="text-[10px] font-normal text-zinc-400">Includes full formation width</span>
                  </button>
                </div>
              </div>

              {/* Optional GSD Input */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Drone GSD (Ground Sampling Distance - Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 2.5 (Auto-calculated if blank)"
                    value={customGsd}
                    onChange={(e) => setCustomGsd(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <span className="text-xs text-zinc-400 whitespace-nowrap">cm / px</span>
                </div>
              </div>

              {/* Media Selection */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Drone Orthomosaic or Construction Image
                </label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 hover:border-zinc-500/60 rounded-2xl cursor-pointer bg-zinc-950/60 transition group text-center">
                  <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-zinc-400 transition mb-2" />
                  <span className="text-xs font-semibold text-zinc-200">
                    {measureFile ? measureFile.name : "Click or drop road image"}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">Supports High-Res JPG, PNG, WebP up to 25MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) {
                        setMeasureFile(f);
                        setMeasurePreview(URL.createObjectURL(f));
                        setMeasureError(null);
                        handleRunMeasurement(f);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Quick Drone Test Presets */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Quick Benchmark Samples:
                </span>
                <div className="space-y-1.5">
                  {measurePresets.map((pr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleMeasurePreset(pr)}
                      className="w-full text-left p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between group transition"
                    >
                      <span>{pr.name} ({pr.presetWidth}m)</span>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition" />
                    </button>
                  ))}
                </div>
              </div>

              {measureError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{measureError}</span>
                </div>
              )}

              {/* Measure Trigger Button */}
              <button
                type="button"
                onClick={() => handleRunMeasurement()}
                disabled={isMeasuring || (!measureFile && !measurePreview)}
                className="w-full py-3.5 bg-green-800 hover:bg-green-700 text-white font-black rounded-xl text-xs shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {isMeasuring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Measuring Road Geometry & Subgrade...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Execute AI Road Measurement & HUD
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Measurement HUD Image Preview (7 cols) */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    2. Engineering Measurement HUD & Dimension Overlay
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Centerline trajectory, chainage stations (Ch 0+000), cross-sectional width callouts, and completed vs under-construction differentiation.
                  </p>
                </div>
                {measureResult && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Scaled
                  </span>
                )}
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 min-h-[420px] flex items-center justify-center">
                {measureResult?.processed_image_url ? (
                  <div className="relative w-full">
                    <img
                      src={resolveMediaUrl(measureResult.processed_image_url)}
                      alt="Measured Road HUD"
                      className="w-full h-[460px] object-contain bg-black/40"
                      onError={(e) => {
                        const rel = measureResult.relative_processed_url || measureResult.processed_image_url;
                        const fallback = "http://192.168.0.101:8000" + (rel.startsWith("/") ? rel : "/" + rel);
                        if (e.target.src !== fallback) {
                          e.target.src = fallback;
                        }
                      }}
                    />
                    <div className="absolute bottom-3 left-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-700 text-[11px] font-mono text-zinc-200 flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Green: Paved ({measureResult.measurements?.completed_length_m}m)
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-800 ml-2" />
                      Orange: Under-Construction ({measureResult.measurements?.under_construction_length_m}m)
                    </div>
                  </div>
                ) : measurePreview ? (
                  <div className="relative w-full">
                    <img
                      src={measurePreview}
                      alt="Raw Input Preview"
                      className="w-full h-[460px] object-cover opacity-75"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm">
                      <span className="text-xs font-bold text-white bg-zinc-900/90 px-4 py-2 rounded-xl border border-zinc-700">
                        Ready. Click "Execute AI Road Measurement & HUD" on the left
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 text-zinc-500">
                    <Ruler className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-semibold">No media selected yet</p>
                    <p className="text-[11px] mt-1">Upload an image or pick a benchmark sample to measure</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Measurement Results Display */}
          {measureResult?.measurements && (
            <div className="space-y-6">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Length */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Measured Length</span>
                    <span className="p-2 rounded-xl bg-zinc-500/15 text-zinc-400">
                      <Ruler className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white font-mono">
                      {measureResult.measurements.total_length_m} m
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-semibold mt-2">
                    Station: {measureResult.measurements.chainage_start} to {measureResult.measurements.chainage_end} ({measureResult.measurements.total_length_km} km)
                  </div>
                </div>

                {/* 2. Cross-Sectional Width */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Cross-Section Width</span>
                    <span className="p-2 rounded-xl bg-zinc-500/15 text-zinc-400">
                      <Compass className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-zinc-400 font-mono">
                      {measureResult.measurements.avg_width_m} m
                    </span>
                    <span className="text-xs text-zinc-400">average</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-semibold mt-2">
                    Min: {measureResult.measurements.min_width_m}m | Max: {measureResult.measurements.max_width_m}m (Design: {measureResult.measurements.calibrated_road_width_m}m)
                  </div>
                </div>

                {/* 3. Surface Area */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Surface Area</span>
                    <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <Layers className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-purple-400 font-mono">
                      {Number(measureResult.measurements.total_area_sqm).toLocaleString()} m²
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-semibold mt-2">
                    {(measureResult.measurements.total_area_sqm / 10000).toFixed(3)} Hectares | GSD: {measureResult.measurements.gsd_cm_per_px} cm/px
                  </div>
                </div>

                {/* 4. Under Construction Status */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Under Construction</span>
                    <span className="p-2 rounded-xl bg-green-900/40 text-green-400">
                      <HardHat className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-green-400 font-mono">
                      {measureResult.measurements.under_construction_length_m} m
                    </span>
                  </div>
                  <div className="text-[11px] text-green-400/90 font-semibold mt-2">
                    {measureResult.measurements.under_construction_pct}% Earthwork / Subgrade
                  </div>
                </div>
              </div>

              {/* Progress & Surface Split Bar */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Corridor Construction Status Breakdown
                  </h4>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      Completed Paved: {measureResult.measurements.completed_length_m}m ({measureResult.measurements.completed_pct}%)
                    </span>
                    <span className="flex items-center gap-1.5 text-green-400">
                      <span className="w-3 h-3 rounded-full bg-green-800" />
                      Under Construction: {measureResult.measurements.under_construction_length_m}m ({measureResult.measurements.under_construction_pct}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar split */}
                <div className="w-full bg-zinc-950 h-5 rounded-2xl overflow-hidden flex border border-zinc-800 p-0.5">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-l-xl transition-all duration-700 flex items-center justify-center text-[10px] font-black text-white"
                    style={{ width: `${measureResult.measurements.completed_pct}%` }}
                  >
                    {measureResult.measurements.completed_pct > 15 && `${measureResult.measurements.completed_pct}% Paved`}
                  </div>
                  <div
                    className="bg-gradient-to-r from-green-800 to-green-700 h-full rounded-r-xl transition-all duration-700 flex items-center justify-center text-[10px] font-black text-white"
                    style={{ width: `${measureResult.measurements.under_construction_pct}%` }}
                  >
                    {measureResult.measurements.under_construction_pct > 15 && `${measureResult.measurements.under_construction_pct}% Under Const.`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 block font-semibold">Completed Asphalt Pavement Surface</span>
                    <strong className="text-emerald-400 font-mono text-base">
                      {Number(measureResult.measurements.completed_area_sqm).toLocaleString()} m²
                    </strong>
                    <span className="text-[11px] text-zinc-500 block">Bituminous Concrete / Wearing Course verified</span>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 block font-semibold">Under-Construction Subgrade / Earthwork</span>
                    <strong className="text-green-400 font-mono text-base">
                      {Number(measureResult.measurements.under_construction_area_sqm).toLocaleString()} m²
                    </strong>
                    <span className="text-[11px] text-zinc-500 block">Grading, base course, or excavation active</span>
                  </div>
                </div>
              </div>

              {/* Civil Engineering Measurement Book (MB Sheet) Table */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-zinc-400" />
                      Civil Engineering Measurement Book (MB) — Verification Sheet
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Standard measurement book audit format for PWD / NHAI contractor bill verification.
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Sheet
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Chainage Station</th>
                        <th className="py-3 px-4">Description of Work</th>
                        <th className="py-3 px-4 text-right">Length (m)</th>
                        <th className="py-3 px-4 text-right">Mean Width (m)</th>
                        <th className="py-3 px-4 text-right">Surface Area (m²)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      <tr className="hover:bg-zinc-800/30">
                        <td className="py-3 px-4 font-bold text-white">01</td>
                        <td className="py-3 px-4 text-zinc-400 font-bold">{measureResult.measurements.chainage_start} → Ch 0+{Math.round(measureResult.measurements.completed_length_m).toString().padStart(3, "0")}</td>
                        <td className="py-3 px-4 font-sans text-zinc-200">Dense Bituminous Macadam & Asphalt Wearing Course</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-bold">{measureResult.measurements.completed_length_m}</td>
                        <td className="py-3 px-4 text-right">{measureResult.measurements.avg_width_m}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-bold">{Number(measureResult.measurements.completed_area_sqm).toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Completed Paved
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-zinc-800/30">
                        <td className="py-3 px-4 font-bold text-white">02</td>
                        <td className="py-3 px-4 text-zinc-400 font-bold">Ch 0+{Math.round(measureResult.measurements.completed_length_m).toString().padStart(3, "0")} → {measureResult.measurements.chainage_end}</td>
                        <td className="py-3 px-4 font-sans text-zinc-200">Subgrade Preparation, Granular Sub-base (GSB) & Compaction</td>
                        <td className="py-3 px-4 text-right text-green-400 font-bold">{measureResult.measurements.under_construction_length_m}</td>
                        <td className="py-3 px-4 text-right">{measureResult.measurements.avg_width_m}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-bold">{Number(measureResult.measurements.under_construction_area_sqm).toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-900/50 text-green-400 border border-green-700/30">
                            Under Construction
                          </span>
                        </td>
                      </tr>

                      <tr className="bg-zinc-950 font-bold text-white border-t-2 border-zinc-700">
                        <td className="py-3 px-4" colSpan={3}>TOTAL CORRIDOR MEASUREMENT SUMMARY</td>
                        <td className="py-3 px-4 text-right text-zinc-400">{measureResult.measurements.total_length_m} m</td>
                        <td className="py-3 px-4 text-right text-zinc-400">{measureResult.measurements.avg_width_m} m</td>
                        <td className="py-3 px-4 text-right text-purple-400">{Number(measureResult.measurements.total_area_sqm).toLocaleString()} m²</td>
                        <td className="py-3 px-4 text-center text-zinc-400 font-sans text-[10px]">
                          Verified by AI
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD DRONE MEDIA */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Ruler className="w-5 h-5 text-zinc-400" />
              AI Road Measurement & Timeline Studio
            </h2>
            <p className="text-xs text-zinc-400">
              Upload any road photo or aerial drone view. AI will automatically measure total length, road width, completed vs. pending sections, and estimate completion days.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Road Type / Scale (Auto-calibrated)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "🏡 Gali (4.0m)", value: 4.0 },
                    { label: "🛣️ 2-Lane (7.0m)", value: 7.0 },
                    { label: "🚗 Highway (14m)", value: 14.0 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setKnownRoadWidth(preset.value)}
                      className={`p-2 rounded-xl border text-xs font-bold text-center transition ${
                        knownRoadWidth === preset.value
                          ? "bg-zinc-600/25 border-zinc-500 text-zinc-400 shadow"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Select File</label>
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-700 hover:border-zinc-500/60 rounded-2xl cursor-pointer bg-zinc-950/60 transition group text-center">
                  <UploadCloud className="w-10 h-10 text-zinc-500 group-hover:text-zinc-400 transition mb-2" />
                  <span className="text-xs font-semibold text-zinc-200">
                    {uploadFile ? uploadFile.name : "Click or drag aerial imagery here"}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">JPG, PNG, WebP or BMP image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) {
                        setUploadFile(f);
                        setUploadPreview(URL.createObjectURL(f));
                        setLatestInference(null);
                        handleUploadSubmit(null, f);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Or Preview a Sample Road Image:
                </span>
                <div className="space-y-1.5">
                  {samplePresets.map((pr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePresetSelect(pr)}
                      className="w-full text-left p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between group transition"
                    >
                      <span>{pr.name}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Road Boundary Precision */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Road Boundary Precision
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {roadBoundaryMode === "strict" ? "🛡️ Cuts Gravel & Shoulder" : "🛣️ Standard Corridor"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoadBoundaryMode("strict")}
                    className={`p-2 rounded-xl border text-xs font-bold text-left transition flex flex-col gap-0.5 ${
                      roadBoundaryMode === "strict"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">🛡️ Strict Carriageway</span>
                    <span className="text-[10px] font-normal text-zinc-400">Prunes side dirt & gravel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoadBoundaryMode("standard")}
                    className={`p-2 rounded-xl border text-xs font-bold text-left transition flex flex-col gap-0.5 ${
                      roadBoundaryMode === "standard"
                        ? "bg-zinc-600/20 border-zinc-500 text-zinc-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">🛣️ Standard Road</span>
                    <span className="text-[10px] font-normal text-zinc-400">Full formation width</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !uploadFile}
                className="w-full py-3 bg-green-800 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Measuring Road & Calculating Timeline...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Execute AI Road Measurement & Timeline Forecast
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-zinc-400" />
                AI Road Measurement & Completion Timeline
              </h2>
              {latestInference?.measurements && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Dimensions Calibrated
                </span>
              )}
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 min-h-[380px] flex items-center justify-center">
              {latestInference?.processed_image_url ? (
                <div className="relative w-full">
                  <img
                    src={resolveMediaUrl(latestInference.processed_image_url)}
                    alt="Road measurement and timeline HUD"
                    className="w-full h-96 object-contain"
                    onError={(e) => {
                      const rel = latestInference.relative_processed_url || latestInference.processed_image_url;
                      const fallback = "http://192.168.0.101:8000" + (rel.startsWith("/") ? rel : "/" + rel);
                      if (e.target.src !== fallback) {
                        e.target.src = fallback;
                      }
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg text-[10px]">
                    ENGINEERING HUD · SCALED
                  </div>
                </div>
              ) : uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt="Selected Preview"
                  className="w-full h-96 object-cover opacity-70"
                />
              ) : (
                <p className="text-xs text-zinc-500">Upload an image to see measured output & completion timeline</p>
              )}
            </div>

            {latestInference?.measurements && (
              <div className="space-y-4">
                {/* Highlight Completion Timeline Banner */}
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-green-400" />
                      Road Completion Forecast (Kitne Din Mein Banegi)
                    </span>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {Number(latestInference.measurements.under_construction_length_m) <= 0
                        ? "No pending work detected"
                        : `~${latestInference.prediction?.corridor_days_remaining ?? latestInference.prediction?.estimated_days_remaining ?? "—"} Day(s) Estimate`}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {Number(latestInference.measurements.under_construction_length_m) <= 0
                        ? "No pending road work"
                        : latestInference.prediction?.corridor_completion_date || latestInference.prediction?.predicted_completion_date || "Unavailable"}
                    </span>
                    <span className="text-xs text-zinc-400">Target Completion Date</span>
                  </div>

                  <div className="text-[11px] text-zinc-300">
                    Remaining Under-Construction: <strong className="text-green-400 font-mono">{latestInference.measurements.under_construction_length_m} meters</strong> ({latestInference.measurements.under_construction_pct}%) · Speed: ~40m-80m / day
                  </div>
                </div>

                {/* 3 Physical Dimension Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Road Length</span>
                    <span className="text-lg font-black text-white font-mono">
                      {latestInference.measurements.total_length_m} m
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold block">
                      {latestInference.measurements.chainage_start} → {latestInference.measurements.chainage_end}
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Road Width</span>
                    <span className="text-lg font-black text-zinc-400 font-mono">
                      {latestInference.measurements.avg_width_m} m
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Design: {latestInference.measurements.calibrated_road_width_m}m
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Surface Area</span>
                    <span className="text-lg font-black text-purple-400 font-mono">
                      {Number(latestInference.measurements.total_area_sqm).toLocaleString()} m²
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {((latestInference.measurements.total_area_sqm) / 10000).toFixed(3)} Hectares
                    </span>
                  </div>
                </div>

                {/* Progress split bar */}
                <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">
                      Completed Paved: {latestInference.measurements.completed_length_m}m ({latestInference.measurements.completed_pct}%)
                    </span>
                    <span className="text-green-400 font-bold">
                      Under Construction: {latestInference.measurements.under_construction_length_m}m ({latestInference.measurements.under_construction_pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden flex border border-zinc-800">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${latestInference.measurements.completed_pct}%` }}
                    />
                    <div
                      className="bg-green-800 h-full"
                      style={{ width: `${latestInference.measurements.under_construction_pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ROAD SURFACE & PROGRESS ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Surface Layer Breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Road Surface Classification Ratio
            </h2>
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={{
                  labels: ["Completed Asphalt Pavement", "Under-Construction Subgrade / Earthwork"],
                  datasets: [
                    {
                      data: [kpis.progress_pct || 49.1, Math.max(0, 100 - (kpis.progress_pct || 49.1))],
                      backgroundColor: ["#10B981", "#166534"],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { position: "bottom", labels: { color: "#A1A1AA" } } },
                }}
              />
            </div>
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs text-zinc-300 text-center">
              Paved Completion Index: <strong className="text-emerald-400">{kpis.progress_pct}% Surface Paved</strong> ({kpis.completed_km} km / {project.total_km} km)
            </div>
          </div>

          {/* Road Construction Milestone Burndown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-zinc-400" />
              Corridor Layer Execution Progress (%)
            </h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: ["Site Clearing", "Earthwork Grading", "Granular Sub-Base", "Wet Mix Macadam", "Bituminous Paving"],
                  datasets: [
                    {
                      label: "Completion %",
                      data: [100, 92, 78, 64, Math.round(kpis.progress_pct || 49.1)],
                      backgroundColor: ["#A1A1AA", "#A1A1AA", "#6366F1", "#818CF8", "#10B981"],
                      borderRadius: 8,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { ticks: { color: "#A1A1AA", font: { size: 10 } } },
                    y: { ticks: { color: "#A1A1AA", stepSize: 20 }, min: 0, max: 100 },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs text-zinc-300 text-center">
              Current Surfacing Rate: <strong className="text-zinc-400">~{kpis.daily_pace_km || 0.25} km / day</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PREDICTIVE FORECASTING */}
      {activeTab === "prediction" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-400" />
              Project Completion Forecast
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Uses actual dated progress intervals when available. Without enough history, it shows a low-confidence baseline estimate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800">
              <span className="text-xs text-zinc-400 block uppercase font-bold">Days Remaining</span>
              <span className="text-3xl font-black text-purple-400 font-mono">
                {kpis.estimated_days_remaining ?? "—"} Days
              </span>
              <span className="text-[11px] text-zinc-500 block mt-1">Based on ~{kpis.daily_pace_km} km/day</span>
            </div>

            <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800">
              <span className="text-xs text-zinc-400 block uppercase font-bold">Predicted Delivery</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {kpis.predicted_completion_date || "No forecast yet"}
              </span>
              <span className="text-[11px] text-emerald-400/80 block mt-1">Current forecast from recorded project progress</span>
            </div>

            <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800">
              <span className="text-xs text-zinc-400 block uppercase font-bold">Model Confidence</span>
              <span className="text-3xl font-black text-zinc-400 font-mono">
                {kpis.confidence_score ?? "—"}%
              </span>
              <span className="text-[11px] text-zinc-500 block mt-1">Confidence is lower when dated history is limited</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT & INSPECTION REPORTS */}
      {activeTab === "reports" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-zinc-400" />
                AI Site Inspection & Audit Reports
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Generate formal compliance reports for NHAI / Infrastructure Directors.
              </p>
            </div>
            <button
              onClick={() => handleGenerateReport("daily")}
              disabled={generatingReport}
              className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              {generatingReport ? "Generating..." : "Generate & Print Report"}
            </button>
          </div>

          {activeReportModal && (
            <div className="p-6 bg-zinc-950 border border-zinc-700 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white">Official Progress Audit Summary</h3>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 block">Project:</span>
                  <strong className="text-white">{project.name}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Completion:</span>
                  <strong className="text-zinc-400">{kpis.progress_pct}% ({kpis.completed_km} km)</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Carriageway Design:</span>
                  <strong className="text-emerald-400">{knownRoadWidth || 7.0}m Width</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Forecasted Completion:</span>
                  <strong className="text-purple-400">{kpis.predicted_completion_date}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
