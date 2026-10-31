import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { ClipboardList, Sparkles, AlertTriangle, Calendar, User, ArrowRight } from "lucide-react";
import { formatDate } from "../../utils/formatters";

export const DailyUpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await api.get("/work-updates");
      setUpdates(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
              Reports
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">{updates.length} logs</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Supervisor Daily Reports & Field Logs</h1>
          <p className="text-sm text-zinc-400 mt-1">Timeline of on-site operations, tasks completed, materials, and AI summaries</p>
        </div>
      </div>

      <div className="space-y-5">
        {updates.map((update) => (
          <div
            key={update._id}
            className="card-glow p-6 shadow-xl space-y-4 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <span className="font-extrabold text-green-400 text-base">{update.projectId?.name}</span>
                <span className="text-zinc-500 mx-2">•</span>
                <span className="text-zinc-400">{update.projectId?.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-800 text-zinc-300 font-mono">
                  {formatDate(update.date)}
                </span>
                <span className="text-zinc-400 font-medium">By {update.supervisorId?.name || "Supervisor"}</span>
              </div>
            </div>

            <p className="text-sm text-zinc-200 leading-relaxed font-medium">{update.description}</p>

            {update.aiSummary && (
              <div className="bg-green-900/30 border border-green-700/30 p-4 rounded-2xl text-green-300 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-green-400 font-bold block text-xs uppercase tracking-wider mb-0.5">
                    AI Daily Executive Briefing
                  </strong>
                  <p className="text-xs leading-relaxed">{update.aiSummary}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              {update.completedTasks?.length > 0 && (
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80">
                  <strong className="text-zinc-300 block mb-1.5 font-semibold">🔨 Key Tasks Completed:</strong>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    {update.completedTasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {update.materialsReceived && (
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80">
                  <strong className="text-zinc-300 block mb-1 font-semibold">📦 Materials Received:</strong>
                  <p className="text-zinc-400">{update.materialsReceived}</p>
                </div>
              )}

              {update.tomorrowPlan && (
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80">
                  <strong className="text-zinc-300 block mb-1 font-semibold">📅 Tomorrow's Agenda:</strong>
                  <p className="text-zinc-400">{update.tomorrowPlan}</p>
                </div>
              )}
            </div>

            {update.issues && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-400 font-medium">
                ⚠️ Blockers / Shortages: {update.issues}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
