import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { 
  UserCheck, 
  ClipboardList, 
  Camera, 
  Receipt, 
  MapPin, 
  ArrowRight,
  Ruler
} from "lucide-react";
import { formatDate } from "../../utils/formatters";

export const SupervisorDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState({ present: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupervisorData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/projects");
        const projs = res.data || [];
        setProjects(projs);
        if (projs.length > 0) {
          setSelectedProject(projs[0]);
          const todayStr = new Date().toISOString().split("T")[0];
          const attRes = await api.get(`/attendance/by-date?projectId=${projs[0]._id}&date=${todayStr}`);
          const recs = attRes.data?.records || [];
          const pres = recs.filter((r) => r.attendance.status === "present" || r.attendance.status === "half-day").length;
          setTodayAttendanceCount({ present: pres, total: recs.length });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSupervisorData();
  }, []);

  const handleSelectSite = async (proj) => {
    setSelectedProject(proj);
    const todayStr = new Date().toISOString().split("T")[0];
    const attRes = await api.get(`/attendance/by-date?projectId=${proj._id}&date=${todayStr}`);
    const recs = attRes.data?.records || [];
    const pres = recs.filter((r) => r.attendance.status === "present" || r.attendance.status === "half-day").length;
    setTodayAttendanceCount({ present: pres, total: recs.length });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-6 rounded-3xl text-white shadow-xl shadow-emerald-950/40">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative">
          <span className="text-xs font-bold uppercase tracking-wider bg-zinc-950/20 px-2.5 py-1 rounded-full">
            On-Site Supervisor Portal
          </span>
          <h1 className="text-3xl font-black mt-2">Good Morning, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-xs font-semibold text-emerald-100/70 mt-0.5">
            Today: {formatDate(new Date())}
          </p>
        </div>
      </div>

      {projects.length > 1 && (
        <div className="bg-zinc-900/60 backdrop-blur p-3 rounded-2xl border border-zinc-800">
          <label className="block text-xs font-semibold text-zinc-400 mb-2">Switch Active Site:</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {projects.map((p) => (
              <button
                key={p._id}
                onClick={() => handleSelectSite(p)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedProject?._id === p._id
                    ? "bg-emerald-900 text-white shadow-md shadow-emerald-950/30"
                    : "bg-zinc-950 text-zinc-400 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="card-glow p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-green-400 font-bold uppercase">Active Site</span>
              <h2 className="text-xl font-black text-white">{selectedProject.name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                <MapPin className="w-3.5 h-3.5 text-green-400" />
                <span>{selectedProject.location}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-400 block">Progress</span>
              <strong className="text-xl font-bold font-mono text-green-400">
                {selectedProject.overallProgress}%
              </strong>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Today's Site Tasks</h3>

        <Link
          to={`/supervisor/measure-road?projectId=${selectedProject?._id || ""}`}
          className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800/80 border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Ruler className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Measure Road Length</h4>
              <p className="text-xs text-zinc-400">Record a GPS trace along the road centerline</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to={`/supervisor/ai-workflow?projectId=${selectedProject?._id || ""}`}
          className="flex items-center justify-between p-4 bg-zinc-900 hover:border-green-400 border border-green-700/40 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-800 text-white flex items-center justify-center font-bold group-hover:scale-105 transition-transform shadow-lg shadow-green-900/20">
              <Camera className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-base">Upload Images & Check AI Workflow</h4>
                <span className="text-[10px] bg-green-900/50 text-green-400 font-extrabold px-1.5 py-0.5 rounded border border-green-700/30">
                  AI Vision
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Drone/site photo detection: road progress, count workers & machinery, verify workflow
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to={`/supervisor/attendance?projectId=${selectedProject?._id || ""}`}
          className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-green-700/50 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-900/50 text-green-400 border border-green-700/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Mark Daily Attendance</h4>
              <p className="text-xs text-zinc-400">
                {todayAttendanceCount.present}/{todayAttendanceCount.total} Workers Logged Today
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to={`/supervisor/work-update?projectId=${selectedProject?._id || ""}`}
          className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-green-700/50 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-500/20 text-zinc-400 border border-zinc-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardList className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Add Daily Work Update</h4>
              <p className="text-xs text-zinc-400">Log progress, tasks completed & problems</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to={`/supervisor/photos?projectId=${selectedProject?._id || ""}`}
          className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-green-700/50 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Upload Site Photos</h4>
              <p className="text-xs text-zinc-400">Take pictures of progress & material unloading</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to={`/supervisor/expenses?projectId=${selectedProject?._id || ""}`}
          className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-green-700/50 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Receipt className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Record Site Expense</h4>
              <p className="text-xs text-zinc-400">Log cement purchase, transport & snacks</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
};
