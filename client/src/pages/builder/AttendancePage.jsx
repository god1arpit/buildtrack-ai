import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { Calendar, Search, Filter, Download } from "lucide-react";
import { formatDate, getSkillColor, getStatusBadge } from "../../utils/formatters";

export const AttendancePage = () => {
  const [attendance, setAttendance] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [attRes, pRes] = await Promise.all([
        api.get(`/attendance/history?date=${selectedDate}${selectedProject ? `&projectId=${selectedProject}` : ""}`),
        api.get("/projects"),
      ]);
      setAttendance(attRes.data || []);
      setProjects(pRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedProject]);

  const presentCount = attendance.filter((a) => a.status === "present" || a.status === "half-day").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const overtimeCount = attendance.filter((a) => (a.overtimeHours || 0) > 0).length;

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Attendance
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{selectedDate}</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Daily Labour Attendance Master</h1>
            <p className="text-sm text-zinc-400 mt-1">Live daily attendance records and check-in/out logs across sites</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/60 backdrop-blur p-4 rounded-2xl border border-zinc-800">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Select Attendance Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Filter by Site</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          >
            <option value="">All Construction Sites</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="card-glow p-4">
          <span className="text-zinc-500 block uppercase font-bold text-[10px] tracking-wider">Total Present</span>
          <strong className="text-emerald-400 font-mono text-lg">{presentCount} Workers</strong>
        </div>
        <div className="card-glow p-4">
          <span className="text-zinc-500 block uppercase font-bold text-[10px] tracking-wider">Total Absent</span>
          <strong className="text-rose-400 font-mono text-lg">{absentCount} Workers</strong>
        </div>
        <div className="card-glow p-4">
          <span className="text-zinc-500 block uppercase font-bold text-[10px] tracking-wider">Clocked Overtime</span>
          <strong className="text-emerald-400 font-mono text-lg">{overtimeCount} Workers</strong>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card-glow overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
            <tr>
              <th className="p-3.5">Worker</th>
              <th className="p-3.5">Skill</th>
              <th className="p-3.5">Site</th>
              <th className="p-3.5">Check-In / Out</th>
              <th className="p-3.5">Hours</th>
              <th className="p-3.5">Overtime</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {attendance.map((att) => (
              <tr key={att._id} className="hover:bg-zinc-800/40">
                <td className="p-3.5">
                  <strong className="text-white block">{att.workerId?.name}</strong>
                  <span className="text-[10px] text-zinc-400 font-mono">{att.workerId?.workerId}</span>
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${getSkillColor(att.workerId?.skill)}`}>
                    {att.workerId?.skill}
                  </span>
                </td>
                <td className="p-3.5 text-zinc-300">{att.projectId?.name || "-"}</td>
                <td className="p-3.5 font-mono text-zinc-300">{att.checkIn} → {att.checkOut}</td>
                <td className="p-3.5 font-mono text-white">{att.totalHours} hrs</td>
                <td className="p-3.5 font-mono text-green-400">
                  {att.overtimeHours > 0 ? `+${att.overtimeHours} hrs` : "-"}
                </td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusBadge(att.status).color}`}>
                    {getStatusBadge(att.status).label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
