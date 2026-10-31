import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Camera, ArrowLeft, Upload } from "lucide-react";

export const UploadPhotosPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [category, setCategory] = useState("progress");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80");
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!imageUrl) return;

    try {
      setLoading(true);
      await api.post("/photos", {
        projectId: selectedProjectId,
        category,
        description,
        imageUrl,
        date: new Date().toISOString().split("T")[0],
      });
      setUploaded(true);
      setTimeout(() => navigate("/supervisor"), 1500);
    } catch (e) {
      console.error(e);
      alert("Failed to upload photo");
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

      <div className="card-glow p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-950/40 text-purple-400 rounded-2xl border border-purple-900/50">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Upload Site Photo</h1>
            <p className="text-zinc-400">Capture visual evidence of site progress & materials</p>
          </div>
        </div>

        {/* AI Computer Vision Prompt Banner */}
        <div className="p-3.5 bg-zinc-950 border border-emerald-900/50 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-green-800 text-white font-bold">
              AI
            </span>
            <div>
              <span className="font-bold text-white block">Run Computer Vision Detection?</span>
              <span className="text-[11px] text-zinc-400">Detect workers, machinery and road surface progress automatically</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/supervisor/ai-workflow?projectId=${selectedProjectId}`)}
            className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white font-bold rounded-xl text-xs shrink-0 transition"
          >
            Open AI Studio
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
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

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Photo Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
            >
              <option value="progress">Work Progress</option>
              <option value="material">Materials Received / Stock</option>
              <option value="issue">Issue / Damage / Blockers</option>
              <option value="general">General Site View</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Photo URL / File Preview</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
              placeholder="https://..."
            />
          </div>

          {imageUrl && (
            <div className="h-44 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Photo Notes / Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white"
              placeholder="e.g. North wall brick masonry completed up to lintel beam level."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-green-800 hover:bg-green-700 text-white font-bold rounded-2xl text-sm shadow-xl shadow-green-900/20 flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {loading ? "Uploading..." : uploaded ? "Uploaded Successfully! ✓" : "SAVE SITE PHOTO"}
          </button>
        </form>
      </div>
    </div>
  );
};
