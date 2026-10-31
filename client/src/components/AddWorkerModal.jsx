import React, { useState } from "react";
import api from "../api/api";
import { X, UserPlus } from "lucide-react";

export const AddWorkerModal = ({ projects = [], onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    skill: "Mason",
    dailyWage: 800,
    overtimeRate: 100,
    projectId: projects[0]?._id || "",
    emergencyContact: "",
  });
  const [loading, setLoading] = useState(false);

  const skills = [
    "Mason",
    "Carpenter",
    "Painter",
    "Plumber",
    "Electrician",
    "Bar Bender",
    "Tiles Mason",
    "Helper",
    "Welder",
    "Supervisor",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/workers", formData);
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || "Failed to add worker");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-green-900/50 text-green-400 rounded-2xl border border-green-700/30">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Add Labour Worker</h3>
            <p className="text-xs text-zinc-400">Register new worker profile with daily wage configuration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Trade / Skill *</label>
              <select
                value={formData.skill}
                onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              >
                {skills.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Daily Wage (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.dailyWage}
                onChange={(e) => setFormData({ ...formData, dailyWage: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Overtime Rate (₹/hr) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.overtimeRate}
                onChange={(e) => setFormData({ ...formData, overtimeRate: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-green-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Assigned Construction Site</label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
            >
              <option value="">-- Floating / General Labour --</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name} ({p.location})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Emergency Contact</label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="e.g. +91 9811223344"
            />
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
              {loading ? "Adding..." : "Save Worker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
