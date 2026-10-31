import React from "react";
import { X, Printer, HardHat } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";

export const WageSlipModal = ({ wage, worker, project, onClose }) => {
  if (!wage || !worker) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative">
        <div className="flex justify-between items-center no-print mb-4">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-800 text-white text-xs font-bold shadow hover:bg-green-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Wage Slip
          </button>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="card-print bg-white text-zinc-900 p-6 rounded-2xl border border-zinc-300">
          <div className="flex items-center justify-between border-b pb-4 border-zinc-300">
            <div>
              <div className="flex items-center gap-2">
                <HardHat className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-black tracking-tight text-zinc-900">BUILDTRACK</h2>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Labour Wage Slip & Payment Voucher</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-zinc-700 block">Period: {wage.month}</span>
              <span className="text-[10px] text-zinc-500">Generated: {formatDate(new Date())}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4 text-xs">
            <div>
              <span className="text-zinc-500 block">Worker Name:</span>
              <strong className="text-zinc-900 font-bold">{worker.name}</strong>
              <span className="text-zinc-500 block mt-1">Worker ID: <strong>{worker.workerId}</strong></span>
              <span className="text-zinc-500 block">Trade / Skill: <strong>{worker.skill}</strong></span>
            </div>
            <div>
              <span className="text-zinc-500 block">Assigned Site:</span>
              <strong className="text-zinc-900 font-bold">{project?.name || "Sharma Residence"}</strong>
              <span className="text-zinc-500 block mt-1">Daily Wage Rate: <strong>{formatCurrency(worker.dailyWage)}</strong></span>
              <span className="text-zinc-500 block">Overtime Rate: <strong>₹{worker.overtimeRate}/hr</strong></span>
            </div>
          </div>

          <div className="border border-zinc-300 rounded-lg overflow-hidden my-4 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 border-b border-zinc-300 font-bold">
                <tr>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-center">Days / Hours</th>
                  <th className="p-2 text-right">Rate (₹)</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr>
                  <td className="p-2 font-medium">Full Working Days</td>
                  <td className="p-2 text-center">{wage.workingDays} days</td>
                  <td className="p-2 text-right">{formatCurrency(wage.dailyWageRate)}</td>
                  <td className="p-2 text-right font-mono font-semibold">{formatCurrency(wage.workingDays * wage.dailyWageRate)}</td>
                </tr>
                {wage.halfDays > 0 && (
                  <tr>
                    <td className="p-2 font-medium">Half Days</td>
                    <td className="p-2 text-center">{wage.halfDays} days</td>
                    <td className="p-2 text-right">{formatCurrency(wage.dailyWageRate / 2)}</td>
                    <td className="p-2 text-right font-mono font-semibold">{formatCurrency(wage.halfDays * (wage.dailyWageRate / 2))}</td>
                  </tr>
                )}
                <tr>
                  <td className="p-2 font-medium">Overtime Hours</td>
                  <td className="p-2 text-center">{wage.overtimeHours} hrs</td>
                  <td className="p-2 text-right">{formatCurrency(wage.overtimeRate)}</td>
                  <td className="p-2 text-right font-mono font-semibold">{formatCurrency(wage.overtimeAmount)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-zinc-50 font-bold border-t border-zinc-300">
                <tr>
                  <td colSpan="3" className="p-2 text-right">Total Wages:</td>
                  <td className="p-2 text-right font-mono font-bold text-sm text-zinc-900">{formatCurrency(wage.totalWage)}</td>
                </tr>
                <tr>
                  <td colSpan="3" className="p-2 text-right text-emerald-700">Paid Disbursed:</td>
                  <td className="p-2 text-right font-mono text-emerald-700 font-bold">{formatCurrency(wage.paidAmount)}</td>
                </tr>
                <tr className="bg-green-50">
                  <td colSpan="3" className="p-2 text-right text-green-900">Net Pending Balance:</td>
                  <td className="p-2 text-right font-mono font-bold text-green-900 text-sm">{formatCurrency(wage.pendingAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
