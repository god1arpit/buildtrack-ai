import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { Sparkles, Bot, AlertTriangle, CheckCircle2, TrendingUp, RefreshCw } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

export const AIInsightsPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [generatedSummary, setGeneratedSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data || []);
        if (res.data?.length > 0) {
          setSelectedProject(res.data[0]._id);
          fetchInsights(res.data[0]._id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, []);

  const fetchInsights = async (pId) => {
    try {
      const res = await api.get(`/ai/insights/${pId}`);
      setInsights(res.data?.insights || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedProject) return;
    try {
      setLoadingSummary(true);
      const res = await api.post("/ai/daily-summary", {
        projectId: selectedProject,
        date: selectedDate,
      });
      setGeneratedSummary(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-900 to-emerald-800 text-white font-bold shadow-lg shadow-emerald-950/40">
            <Sparkles className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                AI Intelligence
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">AI Daily Summary & Site Insights</h1>
            <p className="text-sm text-zinc-400 mt-1">Automated executive summaries, delay forecast & inventory alert generation</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* On-Demand AI Daily Summary Generator */}
        <div className="card-glow p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>On-Demand Daily Summary Generator</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Select Construction Site</label>
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  fetchInsights(e.target.value);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-700"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.location})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-700"
              />
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={loadingSummary}
              className="w-full py-3 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/40 hover:from-emerald-800 hover:to-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loadingSummary ? "Analyzing Site Logs..." : "Generate AI Daily Brief"}
            </button>
          </div>

          {generatedSummary && (
            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 text-xs text-emerald-300 mt-4 space-y-2 animate-fadeIn">
              <strong className="text-emerald-400 font-bold block text-sm">
                Generated Executive Summary ({generatedSummary.projectName})
              </strong>
              <p className="leading-relaxed">{generatedSummary.summary}</p>
            </div>
          )}
        </div>

        {/* Predictive Site Insights */}
        <div className="card-glow p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Predictive Site Intelligence</span>
          </div>

          <div className="space-y-3">
            {insights.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No active alerts for this site.</p>
            ) : (
              insights.map((ins, idx) => (
                <div key={idx} className="card-glow p-4 rounded-2xl text-xs flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{ins.title}</h4>
                    <p className="text-zinc-300 mt-1 leading-relaxed text-[11px]">{ins.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
