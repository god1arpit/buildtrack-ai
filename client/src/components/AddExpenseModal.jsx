import React, { useState } from "react";
import api from "../api/api";
import { X, Receipt } from "lucide-react";

export const AddExpenseModal = ({ projectId, projects = [], onClose, onSuccess }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || projects[0]?._id || "");
  const [category, setCategory] = useState("cement");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: "cement", label: "Cement" },
    { value: "steel", label: "Steel / Rebar" },
    { value: "bricks", label: "Bricks / Blocks" },
    { value: "sand", label: "Sand / Aggregate" },
    { value: "transport", label: "Transport / Freight" },
    { value: "labour", label: "Direct Labour" },
    { value: "equipment", label: "Equipment / Machine Hire" },
    { value: "electrical", label: "Electrical Conduit & Wire" },
    { value: "plumbing", label: "Plumbing Pipes & Fittings" },
    { value: "other", label: "Other / Petty Cash" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return;

    setLoading(true);
    try {
      await api.post("/expenses", {
        projectId: selectedProjectId,
        category,
        amount: Number(amount),
        description,
        vendor,
        date,
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-green-900/50 text-green-400 rounded-2xl border border-green-700/30">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Record Site Expense</h3>
            <p className="text-xs text-zinc-400">Track raw materials, transport, equipment & petty cash</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!projectId && projects.length > 0 && (
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Select Project *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Expense Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-green-700"
                placeholder="e.g. 15000"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Description / Items *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="e.g. 40 Bags Ultratech PPC Cement"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Vendor / Supplier</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
                placeholder="e.g. Gupta Building Materials"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-green-800 to-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
