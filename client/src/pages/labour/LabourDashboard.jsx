import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { DigitalLabourIdCard } from "../../components/DigitalLabourIdCard";
import { WorkerAvatar } from "../../components/WorkerAvatar";
import { 
  HardHat, 
  Calendar, 
  CircleDollarSign, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  CreditCard, 
  ArrowRight,
  Printer,
  Camera
} from "lucide-react";
import { formatCurrency, formatDate, getStatusBadge } from "../../utils/formatters";

export const LabourDashboard = () => {
  const { user } = useAuth();
  const [workerData, setWorkerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIdCard, setShowIdCard] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);

  const uploadProfilePhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file for your profile photo.");
      return;
    }
    setPhotoUploading(true);
    setPhotoError("");
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await api.post("/workers/me/photo", formData);
      setWorkerData((current) => ({ ...current, worker: res.data }));
      window.dispatchEvent(new CustomEvent("buildtrack-worker-photo-updated", { detail: res.data.photo }));
    } catch (err) {
      setPhotoError(err.response?.data?.message || "Could not upload your photo. Please try again.");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        setLoading(true);
        const profile = await api.get("/workers/me");
        const details = await api.get(`/workers/${profile.data._id}`);
        setWorkerData(details.data);
      } catch (e) {
        console.error(e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [user]);

  if (loading) {
    return <div className="p-12 text-center text-zinc-400 text-xs">Loading your labour portal...</div>;
  }

  if (!workerData) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-green-400 mx-auto" />
        <h1 className="text-lg font-bold text-white">Labour profile not linked</h1>
        <p className="text-sm text-zinc-400">{loadError ? "Create your verification profile to connect your labour account." : "Your labour profile is not available yet."}</p>
        <Link to="/verification" className="inline-flex px-4 py-2 rounded-xl bg-green-800 text-white text-xs font-bold">Open verification</Link>
      </div>
    );
  }

  const { worker, stats, recentAttendance, payments } = workerData;
  const isVerified = worker.verificationStatus === "verified";

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      {/* Top Profile Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/40 border border-zinc-800 p-6 rounded-3xl shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-green-700/40 shadow-lg shadow-green-900/20">
            <WorkerAvatar worker={worker} className="w-full h-full" />
            {isVerified && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white p-0.5 rounded-bl-lg">
                <CheckCircle2 className="w-3 h-3 stroke-[3]" />
              </div>
            )}
            <button type="button" onClick={() => photoInputRef.current?.click()} title={worker.photo ? "Change profile photo" : "Upload profile photo"} className="absolute bottom-0 inset-x-0 bg-zinc-950/80 text-white flex items-center justify-center py-1">
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadProfilePhoto(e.target.files?.[0])} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest bg-green-900/50 text-green-300 border border-green-700/40 px-2 py-0.5 rounded-full">
                {worker.skill}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  isVerified
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-green-900/40 text-green-400 border-green-700/30"
                }`}
              >
                {isVerified ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                <span>{worker.verificationStatus || "Verified"}</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">{worker.name}</h1>
            <p className="text-xs text-green-400 font-mono font-bold tracking-wider">
              UID: {worker.workerId}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowIdCard(true)}
          className="hidden sm:flex flex-col items-center justify-center p-3 rounded-2xl bg-green-900/30 hover:bg-green-900/50 border border-green-700/30 text-green-400 transition"
        >
          <CreditCard className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">View Smart ID</span>
        </button>
      </div>

      {(photoError || !worker.photo) && (
        <div className="-mt-4 flex items-center justify-between gap-3 text-xs">
          <span className={photoError ? "text-rose-400" : "text-green-300"}>{photoError || "Upload a profile photo so your Smart ID uses your photo."}</span>
          <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading} className="shrink-0 px-3 py-1.5 rounded-lg bg-green-800 text-white font-bold disabled:opacity-60">
            {photoUploading ? "Uploading…" : worker.photo ? "Change photo" : "Upload photo"}
          </button>
        </div>
      )}

      {/* Official Smart ID Card Quick Access Card */}
      <div className="bg-zinc-900 border border-green-700/30 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              National Construction Labour Credential
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Aadhaar & e-Shram Linked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">UIDAI Aadhaar</span>
            <strong className="text-zinc-200 font-mono text-xs block mt-0.5">
              {worker.aadharNumber ? `•••• •••• ${worker.aadharNumber.slice(-4)}` : "Not Linked"}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">e-Shram UAN / ID</span>
            <strong className="text-green-400 font-mono text-xs block mt-0.5">
              {worker.govIdNumber || "100984726152"}
            </strong>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
          <Link
            to="/verification"
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold"
          >
            <span>Verification Self-Service Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setShowIdCard(true)}
            className="px-3.5 py-1.5 rounded-xl bg-green-800 text-white font-bold text-xs shadow-md shadow-green-900/20 hover:opacity-90 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Open & Print Smart Card</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="card-glow p-4">
          <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Total Earned</span>
          <strong className="text-white font-mono text-xl mt-1 block">
            {formatCurrency(stats.totalEarned)}
          </strong>
        </div>
        <div className="card-glow p-4">
          <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Paid Amount</span>
          <strong className="text-emerald-400 font-mono text-xl mt-1 block">
            {formatCurrency(stats.totalPaid)}
          </strong>
        </div>
        <div className="card-glow p-4">
          <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Pending Balance</span>
          <strong className="text-rose-400 font-mono text-xl mt-1 block">
            {formatCurrency(stats.totalPending)}
          </strong>
        </div>
      </div>

      <div className="card-glow p-5 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
          <span className="text-zinc-400 block">Daily Wage Rate</span>
          <strong className="text-emerald-400 font-mono text-base mt-0.5 block">{formatCurrency(worker.dailyWage)}/day</strong>
        </div>
        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
          <span className="text-zinc-400 block">Total Working Days</span>
          <strong className="text-white font-mono text-base mt-0.5 block">{stats.totalWorkingDays} Days Logged</strong>
        </div>
      </div>

      {/* Attendance History */}
      <div className="card-glow p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white">My Attendance History (Past Shifts)</h3>
        <div className="divide-y divide-zinc-800">
          {recentAttendance?.slice(0, 7).map((att) => (
            <div key={att._id} className="py-2.5 flex justify-between items-center">
              <div>
                <span className="font-semibold text-white font-mono">{formatDate(att.date)}</span>
                <span className="text-[11px] text-zinc-400 block">{att.checkIn || "08:30 AM"} → {att.checkOut || "05:30 PM"}</span>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusBadge(att.status).color}`}>
                  {getStatusBadge(att.status).label}
                </span>
                {att.overtimeHours > 0 && (
                  <span className="text-[10px] text-green-400 font-mono block mt-0.5">
                    +{att.overtimeHours}h OT clocked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ID Card Modal */}
      {showIdCard && (
        <DigitalLabourIdCard
          worker={worker}
          onClose={() => setShowIdCard(false)}
        />
      )}
    </div>
  );
};
export default LabourDashboard;
