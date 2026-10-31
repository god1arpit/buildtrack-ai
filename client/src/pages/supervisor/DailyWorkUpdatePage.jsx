import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { ClipboardList, ArrowLeft, Send } from "lucide-react";

export const DailyWorkUpdatePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [progressPercentage, setProgressPercentage] = useState(72);
  const [completedTasks, setCompletedTasks] = useState("");
  const [issues, setIssues] = useState("");
  const [materialsReceived, setMaterialsReceived] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const pRes = await api.get("/projects");
        const projs = pRes.data || [];
        setProjects(projs);
        if (!selectedProjectId && projs.length > 0) {
          setSelectedProjectId(projs[0]._id);
          setProgressPercentage(projs[0].overallProgress || 70);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchInit();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) return;

    try {
      setLoading(true);
      await api.post("/work-updates", {
        projectId: selectedProjectId,
        date,
        description,
        progressPercentage: Number(progressPercentage),
        completedTasks,
        issues,
        materialsReceived,
        tomorrowPlan,
      });
      setSavedSuccess(true);
      setTimeout(() => navigate("/supervisor"), 1500);
    } catch (e) {
      console.error(e);
      alert("Failed to submit work update");
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
        <div>
          <h1 className="text-xl font-bold text-white">Daily Construction Progress Report</h1>
          <p className="text-zinc-400 mt-0.5">Submit end-of-day site logs to the builder</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Select Site</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Report Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-zinc-300 font-semibold">Estimated Site Progress (%)</label>
              <span className="text-green-400 font-bold font-mono text-sm">{progressPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercentage}
              onChange={(e) => setProgressPercentage(e.target.value)}
              className="w-full accent-green-700"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Work Completed Today *</label>
            <textarea
              rows="3"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-green-700"
              placeholder="e.g. Ground floor north wall brickwork completed up to lintel beam level."
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Completed Tasks Checklist (One per line)</label>
            <textarea
              rows="2"
              value={completedTasks}
              onChange={(e) => setCompletedTasks(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-green-700"
              placeholder="North wall brickwork&#10;RCC column water curing"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Materials Received</label>
            <input
              type="text"
              value={materialsReceived}
              onChange={(e) => setMaterialsReceived(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="e.g. 1 truck red bricks (4,000 units) received."
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Problems / Stock Shortage</label>
            <input
              type="text"
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="e.g. Cement stock is low (50 bags needed tomorrow)."
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Tomorrow's Plan</label>
            <input
              type="text"
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="e.g. Start first-floor bedroom partitions."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-green-800 to-green-700 text-white font-bold rounded-2xl text-sm shadow-xl shadow-green-900/20 hover:opacity-90 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? "Submitting..." : savedSuccess ? "Report Submitted! ✓" : "SUBMIT DAILY REPORT"}
          </button>
        </form>
      </div>
    </div>
  );
};
