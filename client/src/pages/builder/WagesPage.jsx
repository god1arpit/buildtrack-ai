import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { PaymentModal } from "../../components/PaymentModal";
import { WageSlipModal } from "../../components/WageSlipModal";
import { CircleDollarSign, Calendar, RefreshCw, FileText, CheckCircle } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

export const WagesPage = () => {
  const [wagesData, setWagesData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedWorkerForPay, setSelectedWorkerForPay] = useState(null);
  const [selectedWageForSlip, setSelectedWageForSlip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWages = async () => {
    try {
      setLoading(true);
      const [wRes, pRes] = await Promise.all([
        api.get(`/wages/project?month=${selectedMonth}${selectedProject ? `&projectId=${selectedProject}` : ""}`),
        api.get("/projects"),
      ]);
      setWagesData(wRes.data);
      setProjects(pRes.data || []);
      if (!selectedProject && pRes.data?.length > 0) {
        setSelectedProject(pRes.data[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWages();
  }, [selectedMonth, selectedProject]);

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Payouts
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{selectedMonth}</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Wage Calculation & Labour Payouts</h1>
            <p className="text-sm text-zinc-400 mt-1">Automated wage calculations: Basic wage + Overtime - Deductions</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/60 backdrop-blur p-4 rounded-2xl border border-zinc-800">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Wage Period (Month)</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Select Construction Site</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="card-glow p-5">
          <span className="text-zinc-500 block uppercase font-bold text-[10px] tracking-wider">Total Accrued Wages</span>
          <strong className="text-white font-mono text-3xl mt-1 block">
            {formatCurrency(wagesData?.totalWageSum || 0)}
          </strong>
        </div>
        <div className="card-glow p-5">
          <span className="text-zinc-500 block uppercase font-bold text-[10px] tracking-wider">Total Disbursed Paid</span>
          <strong className="text-emerald-400 font-mono text-3xl mt-1 block">
            {formatCurrency(wagesData?.totalPaidSum || 0)}
          </strong>
        </div>
        <div className="card-glow p-5">
          <span className="text-zinc-500 block uppercase font-bold text-[10px] tracking-wider">Net Pending Liabilities</span>
          <strong className="text-rose-400 font-mono text-3xl mt-1 block">
            {formatCurrency(wagesData?.totalPendingSum || 0)}
          </strong>
        </div>
      </div>

      {/* Wages Table */}
      <div className="card-glow overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
            <tr>
              <th className="p-3.5">Worker</th>
              <th className="p-3.5">Days Worked</th>
              <th className="p-3.5">Overtime</th>
              <th className="p-3.5">Basic Wage</th>
              <th className="p-3.5">Total Earned</th>
              <th className="p-3.5">Paid</th>
              <th className="p-3.5">Pending</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {wagesData?.wages?.map((w) => (
              <tr key={w._id} className="hover:bg-zinc-800/40">
                <td className="p-3.5">
                  <strong className="text-white block">{w.workerId?.name}</strong>
                  <span className="text-[10px] text-zinc-400 font-mono">{w.workerId?.workerId} ({w.workerId?.skill})</span>
                </td>
                <td className="p-3.5 font-mono text-white">
                  {w.workingDays} full {w.halfDays > 0 ? `+ ${w.halfDays} half` : ""}
                </td>
                <td className="p-3.5 font-mono text-green-400">{w.overtimeHours} hrs</td>
                <td className="p-3.5 font-mono text-zinc-300">{formatCurrency(w.basicWage)}</td>
                <td className="p-3.5 font-mono font-bold text-white">{formatCurrency(w.totalWage)}</td>
                <td className="p-3.5 font-mono text-emerald-400">{formatCurrency(w.paidAmount)}</td>
                <td className="p-3.5 font-mono font-bold text-rose-400">{formatCurrency(w.pendingAmount)}</td>
                <td className="p-3.5 text-right space-x-2">
                  <button
                    onClick={() => setSelectedWageForSlip(w)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-semibold"
                  >
                    Slip
                  </button>
                  {w.pendingAmount > 0 && (
                    <button
                      onClick={() => setSelectedWorkerForPay({ worker: w.workerId, wage: w })}
                      className="px-2.5 py-1 bg-green-800 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold shadow"
                    >
                      Pay Now
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedWorkerForPay && (
        <PaymentModal
          worker={selectedWorkerForPay.worker}
          projectId={selectedProject}
          wage={selectedWorkerForPay.wage}
          onClose={() => setSelectedWorkerForPay(null)}
          onSuccess={fetchWages}
        />
      )}

      {selectedWageForSlip && (
        <WageSlipModal
          wage={selectedWageForSlip}
          worker={selectedWageForSlip.workerId}
          project={selectedWageForSlip.projectId}
          onClose={() => setSelectedWageForSlip(null)}
        />
      )}
    </div>
  );
};
