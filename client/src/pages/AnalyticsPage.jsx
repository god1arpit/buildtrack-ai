import React, { useState, useEffect } from "react";
import api from "../api/api";
import { 
  BarChart3, 
  Users, 
  Truck, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ShieldCheck
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const AnalyticsPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/analytics/${selectedProjectId}`);
        setAnalytics(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAnalytics();
  }, [selectedProjectId]);

  const workforce = analytics?.workforce || { worker_count: 0, active_workers: 0, idle_workers: 0, activity_rate: 0 };
  const equipment = analytics?.equipment || { equipment_count: 0, utilization_rate: 0, rollers_count: 0, excavators_count: 0, pavers_count: 0, trucks_count: 0 };

  // Doughnut: Worker Activity Ratio
  const workerRatioData = {
    labels: ["Active Workforce", "Stationary / Idle"],
    datasets: [
      {
        data: [workforce.active_workers, workforce.idle_workers],
        backgroundColor: ["#A1A1AA", "#EF4444"],
        borderColor: "#18181b",
        borderWidth: 3,
      },
    ],
  };

  // Bar: Equipment Utilization
  const machineryData = {
    labels: ["Road Rollers", "Excavators", "Asphalt Pavers", "Dump Trucks"],
    datasets: [
      {
        label: "Machinery Units Active",
        data: [equipment.rollers_count, equipment.excavators_count, equipment.pavers_count, equipment.trucks_count],
        backgroundColor: ["#8B5CF6", "#F97316", "#14B8A6", "#166534"],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-zinc-600/20 text-zinc-400 border border-zinc-500/30 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Workforce & Equipment Analytics</h1>
            <p className="text-xs text-zinc-400">
              Analytics from uploaded inspection records. Workforce and equipment counts are prototype estimates.
            </p>
          </div>
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-zinc-500"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name} ({p.total_road_length} km)
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block">
            Labour Productivity Index
          </span>
          <strong className="text-2xl font-black text-white font-mono block mt-1">
            {workforce.activity_rate}%
          </strong>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
            {workforce.worker_count > 0 ? (workforce.activity_rate >= 80 ? "✓ At or above 80% benchmark" : "Below 80% benchmark") : "No workforce records yet"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block">
            Fleet Utilization Index
          </span>
          <strong className="text-2xl font-black text-green-400 font-mono block mt-1">
            {equipment.utilization_rate}%
          </strong>
          <span className="text-[11px] text-zinc-400 block mt-1">
            {equipment.equipment_count} heavy units deployed
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block">
            Active Workers
          </span>
          <strong className="text-2xl font-black text-zinc-400 font-mono block mt-1">
            {workforce.active_workers}
          </strong>
          <span className="text-[11px] text-zinc-400 block mt-1">
            Out of {workforce.worker_count} total detected
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block">
            Idle Personnel Alert
          </span>
          <strong className="text-2xl font-black text-rose-400 font-mono block mt-1">
            {workforce.idle_workers}
          </strong>
          <span className="text-[11px] text-rose-400/80 block mt-1">
            Exceeding 10m stationary threshold
          </span>
        </div>
      </div>

      {/* Analytics Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workforce Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Workforce Active vs. Idle Distribution</h3>
            <p className="text-xs text-zinc-400">Prototype counts; no worker detector or motion tracker is configured</p>
          </div>
          <div className="h-64 flex justify-center">
            <Doughnut
              data={workerRatioData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { color: "#a1a1aa", font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>

        {/* Machinery Units Active */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Heavy Machinery Category Fleet</h3>
            <p className="text-xs text-zinc-400">Prototype equipment counts; validate on site</p>
          </div>
          <div className="h-64">
            <Bar
              data={machineryData}
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
    </div>
  );
};

