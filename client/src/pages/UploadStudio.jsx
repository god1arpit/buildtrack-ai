import React, { useState, useEffect } from "react";
import api, { uploadAIInference, resolveMediaUrl } from "../api/api";
import { 
  UploadCloud, 
  CheckCircle2, 
  Camera, 
  Video, 
  RefreshCw, 
  Layers, 
  ShieldCheck, 
  Users, 
  Truck, 
  TrendingUp, 
  Clock,
  Sparkles
} from "lucide-react";

export const UploadStudio = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [mediaType, setMediaType] = useState("drone_image");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const fetchProj = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data || []);
        if (res.data?.length > 0) setSelectedProjectId(res.data[0].id);
      } catch (e) {
        console.error(e);
      }
    };
    fetchProj();
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setProcessedResult(null);
      setUploadError("");
      setMediaType(selected.type.startsWith("video/") ? "drone_video" : "drone_image");
    }
  };

  const handleUploadAndAnalyze = async (e) => {
    e.preventDefault();
    if (!file || !selectedProjectId) return;

    setProcessing(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("project_id", selectedProjectId);
    formData.append("media_type", mediaType);
    formData.append("file", file);

    try {
      const result = await uploadAIInference(formData);
      setProcessedResult(result);
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.response?.data?.message || "Could not process this file. Check that the AI service is running and the file is supported.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-zinc-600/20 text-zinc-400 border border-zinc-500/30 flex items-center justify-center">
            <UploadCloud className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Drone & Camera AI Processing Studio</h1>
            <p className="text-xs text-zinc-400">
              Upload a site image or video. Videos are analyzed using one representative frame.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Controls */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Media Ingestion Config
          </h2>

          <form onSubmit={handleUploadAndAnalyze} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Target Project Corridor</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-zinc-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name} ({p.total_road_length} km)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Sensor / Media Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "drone_image", label: "Drone Ortho", icon: Camera },
                  { id: "drone_video", label: "Drone Video", icon: Video },
                  { id: "site_camera", label: "Site Camera", icon: Layers },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = mediaType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMediaType(item.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 font-bold transition ${
                        active
                          ? "bg-zinc-600/20 border-zinc-500 text-zinc-400 shadow-sm"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-500/50 rounded-2xl p-6 text-center bg-zinc-950/60 transition group cursor-pointer relative">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-zinc-400 mx-auto mb-2 transition" />
              <p className="font-bold text-white text-xs">
                {file ? file.name : "Select or Drop Drone Footage File"}
              </p>
              <span className="text-[10px] text-zinc-500 block mt-1">Supports JPG, PNG, WebP, BMP, MP4, MOV, AVI, MKV, WebM</span>
            </div>

            <button
              type="submit"
              disabled={!file || processing}
              className="w-full py-3 rounded-xl bg-green-800 hover:bg-green-700 text-white font-bold text-xs shadow-lg shadow-green-900/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing {mediaType === "drone_video" ? "a representative video frame" : "image"}…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Site Media</span>
                </>
              )}
            </button>
          </form>

          {uploadError && (
            <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {uploadError}
            </div>
          )}

          {/* Pipeline Details Card */}
          <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800 space-y-2 text-[11px] text-zinc-400">
            <span className="font-bold text-white block uppercase tracking-wider text-[10px]">
              Prototype Analysis
            </span>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Road surface estimate from image color and edges</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Worker counts are demo-simulated, not detected</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Equipment counts are demo-simulated, not detected</span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Output & Bounding Boxes */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Computer Vision Annotation Studio
            </h2>

            {processedResult ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-zinc-700 bg-black flex justify-center">
                  <img
                    src={resolveMediaUrl(processedResult.processed_image_url)}
                    alt="AI Annotated Output"
                    className="w-full max-h-[480px] object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur px-3 py-1 rounded-xl border border-zinc-700 text-[10px] font-mono text-emerald-400 font-bold">
                    ✓ Frame analysis complete
                  </div>
                </div>

                {/* Instant Metric Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Completed</span>
                    <strong className="text-white text-sm font-mono font-bold block mt-0.5">
                      {processedResult.cv_analytics?.completed_km} km ({processedResult.cv_analytics?.progress_percentage}%)
                    </strong>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Workers</span>
                    <strong className="text-zinc-400 text-sm font-mono font-bold block mt-0.5">
                      {processedResult.cv_analytics?.workers?.total} ({processedResult.cv_analytics?.workers?.activity_rate}% Act.)
                    </strong>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Machinery</span>
                    <strong className="text-green-400 text-sm font-mono font-bold block mt-0.5">
                      {processedResult.cv_analytics?.equipment?.total} Units ({processedResult.cv_analytics?.equipment?.utilization_rate}%)
                    </strong>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Forecast</span>
                    <strong className="text-purple-400 text-sm font-mono font-bold block mt-0.5">
                      {processedResult.prediction?.estimated_days_remaining} Days Left
                    </strong>
                  </div>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black flex justify-center">
                {mediaType === "drone_video" ? (
                  <video
                    src={previewUrl}
                    aria-label="Selected site video preview"
                    controls
                    className="w-full max-h-[480px] object-contain opacity-80"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Selected site image preview"
                    className="w-full max-h-[480px] object-contain opacity-80"
                  />
                )}
                <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xl">
                    Click "Analyze Site Media" to create a prototype estimate
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-20 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl space-y-2">
                <UploadCloud className="w-10 h-10 text-zinc-600 mx-auto" />
                <p>Upload a site image or video to create a prototype road estimate. Validate results in the field.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

