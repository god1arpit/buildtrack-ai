import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { PhotoModal } from "../../components/PhotoModal";
import { Camera, Calendar, Filter } from "lucide-react";
import { formatDate } from "../../utils/formatters";

export const PhotosPage = () => {
  const [photos, setPhotos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activePhoto, setActivePhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const [phRes, pRes] = await Promise.all([
        api.get(`/photos?${selectedProject ? `projectId=${selectedProject}&` : ""}${selectedCategory !== "all" ? `category=${selectedCategory}` : ""}`),
        api.get("/projects"),
      ]);
      setPhotos(phRes.data || []);
      setProjects(pRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [selectedProject, selectedCategory]);

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Photo Gallery
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{photos.length} photos</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Construction Site Photo Gallery</h1>
            <p className="text-sm text-zinc-400 mt-1">Visual evidence of progress, deliveries, quality inspections & site issues</p>
          </div>
          <a
            href="/builder/ai-workflow"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/30 self-start sm:self-auto"
          >
            <span>Drone AI Workflow Center</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/60 backdrop-blur p-4 rounded-2xl border border-zinc-800">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Filter by Site</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          >
            <option value="">All Sites</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
          >
            <option value="all">All Photo Categories</option>
            <option value="progress">Work Progress</option>
            <option value="material">Materials Received</option>
            <option value="issue">Issues & Bottlenecks</option>
            <option value="general">General Site Views</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo._id}
            onClick={() => setActivePhoto(photo)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-green-700/60 transition-all shadow-lg flex flex-col justify-between"
          >
            <div className="h-44 overflow-hidden bg-zinc-950 relative">
              <img
                src={photo.imageUrl}
                alt={photo.description || "Site Photo"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-950/80 text-green-400 backdrop-blur-sm border border-zinc-700">
                {photo.category}
              </span>
            </div>

            <div className="p-3 text-xs space-y-1">
              <span className="font-bold text-white block truncate">{photo.projectId?.name}</span>
              <p className="text-zinc-300 line-clamp-2 text-[11px]">{photo.description || "No description provided."}</p>
              <span className="text-[10px] text-zinc-500 block pt-1">{formatDate(photo.date)}</span>
            </div>
          </div>
        ))}
      </div>

      {activePhoto && <PhotoModal photo={activePhoto} onClose={() => setActivePhoto(null)} />}
    </div>
  );
};
