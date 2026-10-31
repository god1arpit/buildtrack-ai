import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Receipt, ArrowLeft, Plus } from "lucide-react";

export const AddExpensePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [category, setCategory] = useState("cement");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data || []);
        if (!selectedProjectId && res.data?.length > 0) {
          setSelectedProjectId(res.data[0]._id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      setLoading(true);
      await api.post("/expenses", {
        projectId: selectedProjectId,
        category,
        amount: Number(amount),
        description,
        vendor,
        date: new Date().toISOString().split("T")[0],
      });
      setSaved(true);
      setTimeout(() => navigate("/supervisor"), 1500);
    } catch (e) {
      console.error(e);
      alert("Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16 text-xs">
      <button
        onClick={() => navigate("/supervisor")}
        className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Supervisor Home
      </button>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Record Site Expense</h1>
            <p className="text-zinc-400">Log material purchases, transport & petty cash expenses</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Select Construction Site</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
              >
                <option value="cement">Cement</option>
                <option value="steel">Steel / Rebar</option>
                <option value="bricks">Bricks / Blocks</option>
                <option value="sand">Sand / Aggregate</option>
                <option value="transport">Transport / Logistics</option>
                <option value="equipment">Equipment Hire</option>
                <option value="other">Other / Snacks / Petty</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-mono"
                placeholder="e.g. 1500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Description / Item Details *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
              placeholder="e.g. Emergency 5 bags cement from local supplier"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Vendor / Shop Name</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
              placeholder="e.g. City Building Store"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold rounded-2xl text-sm shadow-xl shadow-emerald-500/20 hover:opacity-90 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {loading ? "Recording..." : saved ? "Expense Saved! ✓" : "SAVE EXPENSE"}
          </button>
        </form>
      </div>
    </div>
  );
};
