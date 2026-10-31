import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { FileSpreadsheet, Download, Printer, Users, CircleDollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const ReportsPage = () => {
  const [reportType, setReportType] = useState("attendance");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [wageReport, setWageReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      if (reportType === "attendance") {
        const res = await api.get(`/reports/attendance?month=${selectedMonth}`);
        setAttendanceReport(res.data?.report || []);
      } else {
        const res = await api.get(`/reports/wages?month=${selectedMonth}`);
        setWageReport(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl no-print">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Audit
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{selectedMonth}</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Audit Reports & Export Center</h1>
            <p className="text-sm text-zinc-400 mt-1">Generate official printable attendance registers and wage disbursement ledgers</p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 hover:from-emerald-800 hover:to-emerald-700"
          >
            <Printer className="w-4 h-4" />
            Print / PDF Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-zinc-900/60 backdrop-blur p-4 rounded-2xl border border-zinc-800 no-print">
        <button
          onClick={() => setReportType("attendance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            reportType === "attendance" ? "bg-emerald-900 text-emerald-400 border border-emerald-800" : "text-zinc-400 hover:text-white"
          }`}
        >
          Labour Attendance Register
        </button>
        <button
          onClick={() => setReportType("wages")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            reportType === "wages" ? "bg-emerald-900 text-emerald-400 border border-emerald-800" : "text-zinc-400 hover:text-white"
          }`}
        >
          Labour Wage & Payout Ledger
        </button>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="ml-auto bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white"
        />
      </div>

      {/* Report Table Card */}
      <div className="card-print bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl text-xs">
        <div className="border-b border-zinc-800 pb-4 mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">
              {reportType === "attendance" ? "Monthly Labour Attendance Summary Register" : "Monthly Labour Wage Statement"}
            </h2>
            <p className="text-zinc-400">Statement Period: {selectedMonth}</p>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">BuildTrack Verified Audit</span>
        </div>

        {reportType === "attendance" ? (
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3">Worker Name</th>
                <th className="p-3">Trade</th>
                <th className="p-3">Site</th>
                <th className="p-3 text-center">Present</th>
                <th className="p-3 text-center">Half Days</th>
                <th className="p-3 text-center">Absent</th>
                <th className="p-3 text-center">OT Hours</th>
                <th className="p-3 text-right">Est. Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {attendanceReport.map((r, i) => (
                <tr key={i} className="hover:bg-zinc-800/40">
                  <td className="p-3 font-semibold text-white">{r.name} ({r.workerId})</td>
                  <td className="p-3 text-zinc-300">{r.skill}</td>
                  <td className="p-3 text-zinc-400">{r.projectName}</td>
                  <td className="p-3 text-center font-mono text-emerald-400">{r.presentDays}</td>
                  <td className="p-3 text-center font-mono text-green-400">{r.halfDays}</td>
                  <td className="p-3 text-center font-mono text-rose-400">{r.absentDays}</td>
                  <td className="p-3 text-center font-mono text-zinc-300">{r.totalOvertime}h</td>
                  <td className="p-3 text-right font-mono font-bold text-white">{formatCurrency(r.totalEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3">Worker</th>
                <th className="p-3">Site</th>
                <th className="p-3 text-right">Basic Wage</th>
                <th className="p-3 text-right">Overtime</th>
                <th className="p-3 text-right">Total Accrued</th>
                <th className="p-3 text-right">Paid Disbursed</th>
                <th className="p-3 text-right">Net Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {wageReport?.records?.map((w, i) => (
                <tr key={i} className="hover:bg-zinc-800/40">
                  <td className="p-3 font-semibold text-white">{w.workerId?.name} ({w.workerId?.workerId})</td>
                  <td className="p-3 text-zinc-400">{w.projectId?.name}</td>
                  <td className="p-3 text-right font-mono text-zinc-300">{formatCurrency(w.basicWage)}</td>
                  <td className="p-3 text-right font-mono text-green-400">{formatCurrency(w.overtimeAmount)}</td>
                  <td className="p-3 text-right font-mono font-bold text-white">{formatCurrency(w.totalWage)}</td>
                  <td className="p-3 text-right font-mono text-emerald-400">{formatCurrency(w.paidAmount)}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-400">{formatCurrency(w.pendingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
