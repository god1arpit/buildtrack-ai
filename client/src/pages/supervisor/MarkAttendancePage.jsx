import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/api";
import { Check, X, Clock, Save, ArrowLeft, ShieldCheck, ShieldAlert, Search, UserPlus } from "lucide-react";
import { formatDate, getSkillColor } from "../../utils/formatters";

export const MarkAttendancePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const pRes = await api.get("/projects");
        const projs = pRes.data || [];
        setProjects(projs);
        if (!selectedProjectId && projs.length > 0) {
          setSelectedProjectId(projs[0]._id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchInit();
  }, []);

  const fetchAttendanceList = async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/attendance/by-date?projectId=${selectedProjectId}&date=${date}`);
      const formatted = (res.data?.records || []).map((r) => ({
        workerId: r.worker._id,
        name: r.worker.name,
        code: r.worker.workerId,
        skill: r.worker.skill,
        dailyWage: r.worker.dailyWage,
        photo: r.worker.photo,
        verificationStatus: r.worker.verificationStatus || "pending",
        aadharNumber: r.worker.aadharNumber || "",
        status: r.attendance.status || "present",
        overtimeHours: r.attendance.overtimeHours || 0,
        notes: r.attendance.notes || "",
      }));
      setRecords(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceList();
  }, [selectedProjectId, date]);

  const setWorkerStatus = (workerId, newStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.workerId === workerId ? { ...r, status: newStatus } : r))
    );
  };

  const toggleOvertime = (workerId) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.workerId === workerId
          ? { ...r, overtimeHours: r.overtimeHours > 0 ? 0 : 2 }
          : r
      )
    );
  };

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "present" })));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post("/attendance/mark", {
        projectId: selectedProjectId,
        date,
        records,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = records.filter((r) => r.status === "present" || r.status === "half-day").length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/supervisor")}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Supervisor Home
        </button>
      </div>

      <div className="card-glow p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white">Mark Labour Attendance</h1>
            <p className="text-xs text-zinc-400 mt-0.5">{presentCount}/{records.length} Present Today</p>
          </div>
          <button
            onClick={markAllPresent}
            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold"
          >
            Mark All Present ✓
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Select Site</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Quick Search Labour</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Name or Unique ID (BT-LBR)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
          <span className="text-[11px] text-zinc-400">
            Showing {records.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.code.toLowerCase().includes(searchTerm.toLowerCase())).length} workers
          </span>
          <Link
            to="/verification"
            className="flex items-center gap-1 text-[11px] font-bold text-green-400 hover:text-green-300"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enrol New Labour at Gate</span>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {records
          .filter((worker) =>
            worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.code.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((worker) => {
            const isVerified = worker.verificationStatus === "verified";
            return (
              <div
                key={worker.workerId}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img
                      src={worker.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100&auto=format&fit=crop&q=80"}
                      alt={worker.name}
                      className="w-10 h-10 rounded-xl object-cover border border-zinc-700 shadow-sm"
                    />
                    <div>
                      <strong className="text-base text-white block">{worker.name}</strong>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-green-400 font-mono font-bold bg-green-900/30 px-1.5 py-0.5 rounded border border-green-700/20">
                          {worker.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${getSkillColor(worker.skill)}`}>
                          {worker.skill}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            isVerified
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-green-900/40 text-green-400 border-green-700/30"
                          }`}
                        >
                          {isVerified ? <ShieldCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                          <span>{worker.verificationStatus}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleOvertime(worker.workerId)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                      worker.overtimeHours > 0
                        ? "bg-green-800 text-white border-green-400 shadow-sm"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800"
                    }`}
                  >
                    {worker.overtimeHours > 0 ? `+${worker.overtimeHours}h OT` : "+ Add OT"}
                  </button>
                </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWorkerStatus(worker.workerId, "present")}
                className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  worker.status === "present"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-extrabold"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Present
              </button>

              <button
                type="button"
                onClick={() => setWorkerStatus(worker.workerId, "half-day")}
                className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  worker.status === "half-day"
                    ? "bg-green-800 text-white shadow-md shadow-green-900/30 font-extrabold"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                }`}
              >
                <Clock className="w-4 h-4" />
                Half Day
              </button>

              <button
                type="button"
                onClick={() => setWorkerStatus(worker.workerId, "absent")}
                className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  worker.status === "absent"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 font-extrabold"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                }`}
              >
                <X className="w-4 h-4 stroke-[3]" />
                Absent
              </button>
            </div>
          </div>
        );
      })}
      </div>

      <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-green-800 via-green-700 to-green-800 text-white font-black text-base rounded-2xl shadow-2xl shadow-green-900/40 hover:opacity-95 flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5 stroke-[2.5]" />
          {saving ? "Saving Attendance..." : savedSuccess ? "Saved Successfully! ✓" : "SAVE ATTENDANCE NOW"}
        </button>
      </div>
    </div>
  );
};
