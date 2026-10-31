import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { AddExpenseModal } from "../../components/AddExpenseModal";
import { Plus, Receipt, Search, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const ExpensesPage = () => {
  const [expensesData, setExpensesData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const [expRes, pRes] = await Promise.all([
        api.get(`/expenses?${selectedProject ? `projectId=${selectedProject}&` : ""}${selectedCategory !== "all" ? `category=${selectedCategory}` : ""}`),
        api.get("/projects"),
      ]);
      setExpensesData(expRes.data);
      setProjects(pRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedProject, selectedCategory]);

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Expenses
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{expensesData?.totalAmount ? formatCurrency(expensesData.totalAmount) : "0"}</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Site Expenses & Material Vouchers</h1>
            <p className="text-sm text-zinc-400 mt-1">Track raw materials (cement, steel, sand, bricks), equipment & logistics</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-900 to-emerald-800 hover:from-emerald-800 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Record Site Expense
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/60 backdrop-blur p-4 rounded-2xl border border-zinc-800">
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
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Expense Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          >
            <option value="all">All Categories</option>
            <option value="cement">Cement</option>
            <option value="steel">Steel / Rebar</option>
            <option value="bricks">Bricks / Blocks</option>
            <option value="sand">Sand / Aggregate</option>
            <option value="transport">Transport / Logistics</option>
            <option value="equipment">Equipment Hire</option>
          </select>
        </div>
      </div>

      {/* Total Amount Badge */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex justify-between items-center">
        <div>
          <span className="text-xs text-zinc-400 block font-medium">Total Site Expenditures</span>
          <h2 className="text-3xl font-extrabold text-white font-mono mt-1">
            {formatCurrency(expensesData?.totalAmount || 0)}
          </h2>
        </div>
        <div className="p-3 bg-green-900/50 text-green-400 rounded-2xl border border-green-700/30">
          <Receipt className="w-8 h-8" />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-800">
            <tr>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Description</th>
              <th className="p-3.5">Site</th>
              <th className="p-3.5">Vendor</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {expensesData?.expenses?.map((exp) => (
              <tr key={exp._id} className="hover:bg-zinc-800/40">
                <td className="p-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-green-400 font-semibold uppercase text-[10px] border border-zinc-700">
                    {exp.category}
                  </span>
                </td>
                <td className="p-3.5 text-zinc-200">{exp.description}</td>
                <td className="p-3.5 text-zinc-300">{exp.projectId?.name || "-"}</td>
                <td className="p-3.5 text-zinc-400">{exp.vendor || "-"}</td>
                <td className="p-3.5 text-zinc-400 font-mono">{formatDate(exp.date)}</td>
                <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                  {formatCurrency(exp.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddExpenseModal
          projects={projects}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchExpenses}
        />
      )}
    </div>
  );
};
