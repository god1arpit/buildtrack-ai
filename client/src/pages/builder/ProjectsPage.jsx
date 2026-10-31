import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { SiteCard } from "../../components/SiteCard";
import { AddProjectModal } from "../../components/AddProjectModal";
import { Plus, Search, Building2 } from "lucide-react";

export const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const [sumRes, supRes] = await Promise.all([
        api.get("/reports/summary"),
        api.get("/auth/supervisors"),
      ]);
      setProjects(sumRes.data?.projects || []);
      setSupervisors(supRes.data || []);
    } catch (e) {
      console.error("Projects fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.client && p.client.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Projects
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{filtered.length} sites</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Construction Projects & Sites</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage active, planned and completed construction sites</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-900 to-emerald-800 hover:from-emerald-800 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create New Site
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-zinc-900/60 backdrop-blur p-3 rounded-2xl border border-zinc-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search site by name, city or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="planned">Planned</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-green-900/30 text-green-400 border border-green-700/20 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Sites Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchTerm ? "No projects match your search query." : "You haven't created any construction sites yet. Click 'Create New Site' to start."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-800 to-green-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New Site</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((proj) => (
            <SiteCard key={proj._id} project={proj} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddProjectModal
          supervisors={supervisors}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchProjects}
        />
      )}
    </div>
  );
};
