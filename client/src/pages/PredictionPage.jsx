import React, { useState, useEffect } from "react";
import api, { fetchAIPrediction } from "../api/api";
import { 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Sparkles,
  BarChart,
  ShieldCheck
} from "lucide-react";

export const PredictionPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predictionError, setPredictionError] = useState("");

  useEffect(() => {
    const fetchProj = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data || []);
        if (res.data?.length > 0) setSelectedProjectId(res.data[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProj();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const fetchPrediction = async () => {
      setLoading(true);
      setPrediction(null);
      setPredictionError("");
      try {
        const res = await fetchAIPrediction(selectedProjectId);
        setPrediction(res);
      } catch (e) {
        console.error(e);
        setPredictionError(e.response?.data?.detail || "No project forecast is available yet. Run a dated road analysis first.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrediction();
  }, [selectedProjectId]);

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Clock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">AI Completion Forecasting Engine</h1>
            <p className="text-xs text-zinc-400">
              Forecasts use recorded progress intervals when available; otherwise the estimate is clearly marked as a baseline.
            </p>
          </div>
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name} ({p.total_road_length} km)
            </option>
          ))}
        </select>
      </div>

      {/* Main Forecast Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block">
              {prediction?.status || "Project forecast"}
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Target Completion Horizon: {prediction?.predicted_completion_date || "Not available"}
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold font-mono">
            {prediction ? `${prediction.confidence_score ?? 0}% Confidence` : "Awaiting forecast"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
              Remaining Duration
            </span>
            <strong className="text-3xl font-black text-white font-mono block">
              {prediction ? `${prediction.estimated_days_remaining ?? 0} Days` : "—"}
            </strong>
            <span className="text-[11px] text-zinc-400 block">{prediction?.forecast_basis || "Create a project progress record to calculate an estimate."}</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
              Average Progress Velocity
            </span>
            <strong className="text-3xl font-black text-purple-400 font-mono block">
              {prediction ? `${prediction.daily_pace_km ?? 0} km/day` : "—"}
            </strong>
            <span className="text-[11px] text-zinc-400 block">{prediction?.forecast_basis || "Based on dated project progress records when available."}</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
              Planned vs Forecast Delta
            </span>
            <strong className="text-3xl font-black text-emerald-400 font-mono block">
              {currentProject && prediction?.predicted_completion_date
                ? `${Math.abs(Math.round((new Date(`${currentProject.planned_end_date}T00:00:00`) - new Date(`${prediction.predicted_completion_date}T00:00:00`)) / 86400000))} Days ${new Date(`${prediction.predicted_completion_date}T00:00:00`) <= new Date(`${currentProject.planned_end_date}T00:00:00`) ? "Before" : "After"} Plan`
                : "—"}
            </strong>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              {currentProject ? `Planned end: ${currentProject.planned_end_date}` : "Select a project to compare dates."}
            </span>
          </div>
        </div>

        {predictionError && (
          <div className="rounded-xl border border-green-700/30 bg-green-900/30 p-4 text-xs text-green-300">
            {predictionError}
          </div>
        )}
        {prediction?.forecast_basis && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-400">
            Forecast basis: <span className="text-zinc-200">{prediction.forecast_basis}</span>
          </div>
        )}
      </div>
    </div>
  );
};
