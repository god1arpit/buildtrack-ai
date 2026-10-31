import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import { AddWorkerModal } from "../../components/AddWorkerModal";
import { DigitalLabourIdCard } from "../../components/DigitalLabourIdCard";
import { 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  HardHat, 
  CircleDollarSign, 
  ShieldCheck, 
  ShieldAlert, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { formatCurrency, getSkillColor } from "../../utils/formatters";

export const LabourPage = () => {
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIdWorker, setSelectedIdWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const [wRes, pRes] = await Promise.all([
        api.get("/workers"),
        api.get("/projects"),
      ]);
      setWorkers(wRes.data || []);
      setProjects(pRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

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
  ];

  const filtered = workers.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      w.name?.toLowerCase().includes(term) ||
      w.workerId?.toLowerCase().includes(term) ||
      (w.phone && w.phone.includes(searchTerm)) ||
      (w.aadharNumber && w.aadharNumber.includes(searchTerm));

    const matchesSkill = skillFilter === "all" || w.skill === skillFilter;
    const matchesProject =
      projectFilter === "all" ||
      (w.projectId && (w.projectId._id === projectFilter || w.projectId === projectFilter));
    const matchesVerification =
      verificationFilter === "all" || w.verificationStatus === verificationFilter;

    return matchesSearch && matchesSkill && matchesProject && matchesVerification;
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Labour Directory
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{filtered.length} workers</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Labour Management Directory</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage all construction workers, skills, daily rates, Aadhaar verification & Unique Labour IDs
            </p>
          </div>
          <div className="flex items-center gap-2">
          <Link
            to="/verification"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-900 border border-green-700/30 text-green-400 text-xs font-bold rounded-xl hover:bg-zinc-800 transition shadow"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verification Hub</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-800 to-green-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-green-900/20 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Labour Worker</span>
          </button>
        </div>
      </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-900/60 backdrop-blur p-3 rounded-2xl border border-zinc-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by Name, Unique ID or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          />
        </div>

        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
        >
          <option value="all">All Skills / Trades</option>
          {skills.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
        >
          <option value="all">All Verification Statuses</option>
          <option value="verified">✅ Verified Only</option>
          <option value="pending">⏳ Pending Verification</option>
          <option value="rejected">❌ Rejected</option>
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
        >
          <option value="all">All Sites</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((worker) => {
          const isVer = worker.verificationStatus === "verified";
          const isPen = worker.verificationStatus === "pending";

          return (
            <div
              key={worker._id}
              className="card-glow p-5 shadow-lg flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img
                      src={worker.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100&auto=format&fit=crop&q=80"}
                      alt={worker.name}
                      className="w-10 h-10 rounded-xl object-cover border border-zinc-700 shadow-sm"
                    />
                    <div>
                      <h3 className="font-bold text-white group-hover:text-green-400 transition-colors text-sm">
                        {worker.name}
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-green-400 block">
                        {worker.workerId}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getSkillColor(worker.skill)}`}>
                    {worker.skill}
                  </span>
                </div>

                {/* Verification Badge */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                      isVer
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : isPen
                        ? "bg-green-900/40 text-green-400 border-green-700/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {isVer ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    <span>{worker.verificationStatus || "pending"}</span>
                  </span>

                  {worker.aadharNumber ? (
                    <span className="text-[10px] font-mono text-zinc-400">
                      UIDAI: •••• {worker.aadharNumber.slice(-4)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">No Aadhaar</span>
                  )}
                </div>

                <div className="space-y-1.5 mt-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{worker.phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="truncate">{worker.projectId?.name || "Floating / General"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-800 text-xs">
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">Daily Wage</span>
                    <strong className="text-white font-mono text-xs">{formatCurrency(worker.dailyWage)}/d</strong>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">Overtime Rate</span>
                    <strong className="text-green-400 font-mono text-xs">₹{worker.overtimeRate}/hr</strong>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <button
                  onClick={() => setSelectedIdWorker(worker)}
                  className="w-full py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-green-400 hover:text-green-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>View Smart ID Card</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <AddWorkerModal
          projects={projects}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchWorkers}
        />
      )}

      {selectedIdWorker && (
        <DigitalLabourIdCard
          worker={selectedIdWorker}
          onClose={() => setSelectedIdWorker(null)}
        />
      )}
    </div>
  );
};
export default LabourPage;
