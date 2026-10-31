import React, { useState, useEffect } from "react";
import api from "../api/api";
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Plus, 
  RefreshCw 
} from "lucide-react";

export const ReportsPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState("Daily");
  const [generating, setGenerating] = useState(false);

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

  const fetchReports = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await api.get(`/reports/${selectedProjectId}`);
      setReports(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedProjectId]);

  const handleGenerate = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    try {
      await api.post(`/reports/${selectedProjectId}/generate?report_type=${reportType}`);
      fetchReports();
    } catch (e) {
      alert("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-zinc-600/20 text-zinc-400 border border-zinc-500/30 flex items-center justify-center">
            <FileText className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Executive Inspection & Progress Reports</h1>
            <p className="text-xs text-zinc-400">
              Download and print engineering summaries, physical road completion audits, and labour productivity digests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-zinc-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Generator Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Generate Instant AI Site Audit</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Produces synthesized computer vision report with latest drone road progress, active headcount, and forecast
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="Daily">Daily Summary</option>
            <option value="Weekly">Weekly Progress</option>
            <option value="Monthly">Monthly Executive</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white font-bold text-xs shadow-lg shadow-zinc-600/20 transition flex items-center gap-1.5"
          >
            {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Compile New Report</span>
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs bg-zinc-900 border border-dashed border-zinc-800 rounded-3xl">
            No inspection reports compiled yet. Click "Compile New Report" to create your first report.
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/30 font-bold text-[10px] font-mono uppercase">
                    {r.report_type} Report
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    Compiled: {r.generated_at?.substring(0, 19)}
                  </span>
                </div>
                <button
                  onClick={handlePrint}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
                {r.summary_text}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
