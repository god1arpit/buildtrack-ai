import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { measureRoadUnderConstruction, getAiApiBaseUrl, resolveMediaUrl } from "../../api/api";
import { compressImageForUpload } from "../../utils/imageCompressor";
import { useAuth } from "../../context/AuthContext";
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  HardHat,
  Truck,
  Activity,
  ArrowRight,
  Layers,
  Sparkles,
  RefreshCw,
  Send,
  Eye,
  FileCheck,
  Ruler
} from "lucide-react";

const describeInferenceError = (err) => {
  if (err.response?.data?.detail) return err.response.data.detail;
  if (err.code === "ERR_NETWORK") {
    return `Cannot reach the AI service at ${getAiApiBaseUrl()}. Start the AI service on the computer, keep the phone on the same Wi-Fi, and set the computer's IP using the Wi-Fi button above.`;
  }
  if (err.code === "ECONNABORTED") {
    return "AI analysis timed out. Keep the AI service running and try a smaller image.";
  }
  return err.message || "AI Computer Vision processing failed.";
};

export const SupervisorAIWorkflow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState("drone_image");
  const [knownRoadWidth, setKnownRoadWidth] = useState(7.0);

  const [analyzing, setAnalyzing] = useState(false);
  const [cvResult, setCvResult] = useState(null);
  const [error, setError] = useState(null);

  const [syncingUpdate, setSyncingUpdate] = useState(false);
  const [syncedSuccess, setSyncedSuccess] = useState(false);
  const [roadBoundaryMode, setRoadBoundaryMode] = useState("strict");

  // Sample drone images for instant one-click testing
  const samplePresets = [
    {
      name: "Highway Paving Drone View",
      url: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=1000&auto=format&fit=crop&q=80",
      type: "drone_image"
    },
    {
      name: "Site Earthwork & Grading",
      url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1000&auto=format&fit=crop&q=80",
      type: "site_camera"
    },
    {
      name: "Asphalt Compaction Sector",
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80",
      type: "drone_image"
    }
  ];

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        const list = res.data || [];
        setProjects(list);
        if (!selectedProjectId && list.length > 0) {
          setSelectedProjectId(list[0]._id);
        }
      } catch (e) {
        console.error("Error fetching projects:", e);
      }
    };
    fetchProjects();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCvResult(null);
      setSyncedSuccess(false);
    }
  };

  const handleSelectPreset = async (preset) => {
    try {
      setAnalyzing(true);
      setError(null);
      setSyncedSuccess(false);
      setPreviewUrl(preset.url);

      // Fetch sample as blob to feed multipart form
      const response = await fetch(preset.url);
      const blob = await response.blob();
      const file = new File([blob], "drone_inspection_capture.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      setMediaType(preset.type);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("known_road_width_m", (knownRoadWidth || 7.0).toString());
      formData.append("road_threshold", roadBoundaryMode === "strict" ? "0.68" : "0.58");

      const result = await measureRoadUnderConstruction(formData);
      setCvResult(result);
    } catch (err) {
      console.error("Inference error:", err);
      setError(describeInferenceError(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunInference = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select or upload an image file first.");
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      setSyncedSuccess(false);

      const file = await compressImageForUpload(selectedFile);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("known_road_width_m", (knownRoadWidth || 7.0).toString());
      formData.append("road_threshold", roadBoundaryMode === "strict" ? "0.68" : "0.58");

      const result = await measureRoadUnderConstruction(formData);
      setCvResult(result);
    } catch (err) {
      console.error("Inference error:", err);
      setError(describeInferenceError(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSyncToWorkUpdate = async () => {
    if (!cvResult) return;
    try {
      setSyncingUpdate(true);
      const measurements = cvResult.measurements || cvResult.cv_analytics?.measurements || {};
      let desc = `[AI Road Vision] Visible frame estimate: ${measurements?.completed_length_m || 0}m paved (${measurements?.completed_pct || 0}%), ${measurements?.under_construction_length_m || 0}m under construction (${measurements?.under_construction_pct || 0}%). This is an image-based corridor estimate, not whole-project progress.`;
      if (measurements && measurements.total_length_m) {
        desc += ` [Road Dimensions] Total corridor: ${measurements.total_length_m}m (${measurements.chainage_start} to ${measurements.chainage_end}), Mean width: ${measurements.avg_width_m}m, Surface area: ${Number(measurements.total_area_sqm).toLocaleString()} sq.m. Under construction: ${measurements.under_construction_length_m}m (${measurements.under_construction_pct}%), Paved completed: ${measurements.completed_length_m}m (${measurements.completed_pct}%).`;
      }
      
      await api.post("/work-updates", {
        projectId: selectedProjectId || projects[0]?._id,
        workDone: desc,
        challenges: "Verify the image-based road estimate on site before using it as a project progress record.",
        materialsUsed: "Not identified by the road surface model.",
        date: new Date().toISOString().split("T")[0],
      });

      setSyncedSuccess(true);
    } catch (err) {
      console.error("Sync error:", err);
      alert("Failed to sync AI update to BuildTrack logs.");
    } finally {
      setSyncingUpdate(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-6 rounded-3xl text-white shadow-xl shadow-emerald-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-zinc-950/20 px-2.5 py-1 rounded-full">
              Supervisor Site Console
            </span>
            <span className="text-xs font-bold bg-zinc-950 text-emerald-400 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Vision Engine
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2">Upload Site Media & Check Workflow</h1>
          <p className="text-xs font-semibold text-emerald-100/70 mt-0.5">
            Measure the visible road corridor from a site image or video frame
          </p>
        </div>

        <button
          onClick={() => navigate("/supervisor")}
          className="self-start md:self-auto px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-emerald-400 rounded-xl text-xs font-bold transition shadow"
        >
          Back to Site Home
        </button>
      </div>

      {/* Main Grid: Upload & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-glow p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-400" />
              1. Select Site & Media Source
            </h2>

            {/* Project Select */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Target Project Site</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} - {p.location || "Active"}
                  </option>
                ))}
              </select>
            </div>

            {/* Media Type */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Media Source Type</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMediaType("drone_image")}
                  className={`p-2 rounded-xl border text-center transition ${
                    mediaType === "drone_image"
                      ? "bg-green-900/50 border-green-700 text-green-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  Drone Ortho
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("drone_video")}
                  className={`p-2 rounded-xl border text-center transition ${
                    mediaType === "drone_video"
                      ? "bg-green-900/50 border-green-700 text-green-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  Drone Video
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("site_camera")}
                  className={`p-2 rounded-xl border text-center transition ${
                    mediaType === "site_camera"
                      ? "bg-green-900/50 border-green-700 text-green-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  Site Camera
                </button>
              </div>
            </div>

            {/* Road Width Calibration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-green-400" />
                  Carriageway Design Width
                </label>
                <span className="text-[11px] font-mono font-bold text-green-400">{knownRoadWidth} m</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {[
                  { label: "3.75m", val: 3.75 },
                  { label: "7.0m", val: 7.0 },
                  { label: "10.5m", val: 10.5 },
                  { label: "14.0m", val: 14.0 }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setKnownRoadWidth(item.val)}
                    className={`py-1.5 px-1 rounded-lg border text-center transition ${
                      knownRoadWidth === item.val
                        ? "bg-green-900/50 border-green-700 text-green-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.label}
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
                <span className="text-[10px] text-green-400 font-mono">
                  {roadBoundaryMode === "strict" ? "🛡️ Cuts Gravel" : "🛣️ Standard"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRoadBoundaryMode("strict")}
                  className={`py-1.5 px-2 rounded-lg border text-left transition flex flex-col ${
                    roadBoundaryMode === "strict"
                      ? "bg-green-900/50 border-green-700 text-green-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>🛡️ Strict Pavement</span>
                  <span className="text-[9px] font-normal text-zinc-400">Prunes dirt & gravel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoadBoundaryMode("standard")}
                  className={`py-1.5 px-2 rounded-lg border text-left transition flex flex-col ${
                    roadBoundaryMode === "standard"
                      ? "bg-green-900/50 border-green-700 text-green-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>🛣️ Standard</span>
                  <span className="text-[9px] font-normal text-zinc-400">Full corridor</span>
                </button>
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Upload Footage / Photo</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 hover:border-green-700/60 rounded-2xl cursor-pointer bg-zinc-950/60 transition group text-center">
                <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-green-400 transition mb-2" />
                <span className="text-xs font-semibold text-zinc-200">
                  {selectedFile ? selectedFile.name : "Click or drop drone image / video"}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">
                  Supports JPG, PNG, MP4, MOV, AVI up to 25MB
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Or Try Sample Drone Presets:
              </span>
              <div className="space-y-1.5">
                {samplePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full text-left p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between group transition"
                  >
                    <span>{preset.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-green-400 group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Run Button */}
            <button
              onClick={handleRunInference}
              disabled={analyzing || !selectedFile}
              className="w-full py-3 bg-gradient-to-r from-green-800 to-green-700 text-white font-black rounded-xl text-xs shadow-lg shadow-green-900/20 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Computer Vision Pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  Execute Computer Vision Inference
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Workflow Results HUD (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-400" />
                2. Real-Time Computer Vision HUD
              </h2>
              {cvResult && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Inference Complete
                </span>
              )}
            </div>

            {/* Image Preview & HUD Overlay */}
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 min-h-[300px] flex items-center justify-center">
              {cvResult?.processed_image_url ? (
                <div className="relative w-full">
                  <img
                    src={resolveMediaUrl(cvResult.processed_image_url)}
                    alt="AI Annotated HUD"
                    className="w-full h-80 object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-700 text-[10px] font-mono font-bold text-green-400">
                    CV PIPELINE: ACTIVE
                  </div>
                  <div className="absolute bottom-3 right-3 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-700 text-[10px] font-mono text-zinc-300">
                    Segmentation: {cvResult.cv_analytics?.progress_percentage}% Paved in Frame
                  </div>
                </div>
              ) : previewUrl ? (
                <div className="relative w-full">
                  {selectedFile?.type?.startsWith("video/") ? (
                    <video src={previewUrl} controls className="w-full h-80 object-contain bg-black opacity-90" />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Raw Site Preview"
                      className="w-full h-80 object-cover opacity-80"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm">
                    <span className="text-xs font-bold text-white bg-zinc-900/90 px-4 py-2 rounded-xl border border-zinc-700">
                      Ready for Analysis. Click "Execute Computer Vision Inference"
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-zinc-500">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No media selected yet</p>
                  <p className="text-[11px] mt-1">Upload drone footage or select a preset on the left</p>
                </div>
              )}
            </div>

            {/* Workflow KPIs Breakdown */}
            {cvResult ? (
              <div className="space-y-4 pt-2">
                {(() => {
                  const m = cvResult.measurements || cvResult.cv_analytics?.measurements || {};
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Progress KPI */}
                        <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Road Progress</span>
                          <span className="text-xl font-black text-green-400 font-mono">
                            {m.completed_pct ?? cvResult.cv_analytics?.progress_percentage ?? 0}%
                          </span>
                          <span className="text-[10px] text-zinc-500 block">
                            {m.completed_length_m ?? 0} m estimated paved
                          </span>
                        </div>

                        {/* Corridor Dimensions KPI */}
                        <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Corridor Length</span>
                          <span className="text-xl font-black text-zinc-400 font-mono">
                            {m.total_length_m || 0} m
                          </span>
                          <span className="text-[10px] text-zinc-400 font-semibold block">
                            Mean Width: {m.avg_width_m || 7.0} m
                          </span>
                        </div>

                        {/* Under Construction KPI */}
                        <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Under Construction</span>
                          <span className="text-xl font-black text-green-400 font-mono">
                            {m.under_construction_length_m || 0} m
                          </span>
                          <span className="text-[10px] text-green-400 block">
                            {m.under_construction_pct || 0}% Earthwork / Subgrade
                          </span>
                        </div>
                      </div>

                      {/* Physical Dimensions & Construction Breakdown */}
                      {m.total_length_m && (
                        <div className="p-4 bg-zinc-950/90 rounded-2xl border border-green-700/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Ruler className="w-4 h-4 text-green-400" />
                              AI Road Measurements & Construction Status
                            </span>
                            <span className="text-[10px] bg-green-900/50 text-green-300 font-mono font-bold px-2 py-0.5 rounded border border-green-700/40">
                              {m.chainage_start} → {m.chainage_end}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Total Length</span>
                              <span className="text-sm font-black text-white font-mono">{m.total_length_m} m</span>
                            </div>
                            <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Mean Width</span>
                              <span className="text-sm font-black text-zinc-400 font-mono">{m.avg_width_m} m</span>
                            </div>
                            <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Under Construction</span>
                              <span className="text-sm font-black text-green-400 font-mono">{m.under_construction_length_m} m ({m.under_construction_pct}%)</span>
                            </div>
                            <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Completed Paved</span>
                              <span className="text-sm font-black text-emerald-400 font-mono">{m.completed_length_m} m ({m.completed_pct}%)</span>
                            </div>
                          </div>

                          {/* Split progress bar */}
                          <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden flex border border-zinc-800">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-500"
                              style={{ width: `${m.completed_pct}%` }}
                              title={`Completed Paved: ${m.completed_length_m}m`}
                            />
                            <div
                              className="bg-green-800 h-full transition-all duration-500"
                              style={{ width: `${m.under_construction_pct}%` }}
                              title={`Under Construction: ${m.under_construction_length_m}m`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Workflow Compliance Check */}
                      <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-green-400" />
                            Road Construction Status
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (m.under_construction_pct || 0) <= 35
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-green-900/50 text-green-400 border border-green-700/30"
                          }`}>
                            {(m.under_construction_pct || 0) <= 35 ? "Surfacing on Track" : "Grading & Subgrade Active"}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          These are estimates for the visible image corridor only. Estimated paved area: <strong className="text-zinc-200">{Number(m.completed_area_sqm || 0).toLocaleString()} sq.m</strong>; estimated under-construction area: <strong className="text-zinc-200">{Number(m.under_construction_area_sqm || 0).toLocaleString()} sq.m</strong>. Total measured corridor: <strong className="text-zinc-200">{m.total_length_m || 0}m</strong> at mean width of <strong className="text-zinc-200">{m.avg_width_m || 0}m</strong>. Forecast: <strong className="text-zinc-200">{cvResult.prediction?.predicted_completion_date || "Unavailable"}</strong> ({cvResult.prediction?.estimated_days_remaining ?? 0} days, based on the configured paving pace).
                        </p>
                      </div>
                    </>
                  );
                })()}

                {/* Sync to Daily Work Update Button */}
                <div className="pt-1">
                  {syncedSuccess ? (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Road measurement findings successfully synced to BuildTrack Daily Updates!</span>
                      </div>
                      <button
                        onClick={() => navigate("/supervisor")}
                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                      >
                        Site Home
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSyncToWorkUpdate}
                      disabled={syncingUpdate}
                      className="w-full py-3 bg-zinc-600 hover:bg-zinc-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-zinc-600/20 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {syncingUpdate ? "Syncing to Work Updates..." : "Sync Road Measurements to BuildTrack Daily Update"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-xs text-zinc-400">
                Run inference to view computer vision segmentation, road dimensions, and under-construction measurements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
