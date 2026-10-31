import React, { useState, useEffect, useRef } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { DigitalLabourIdCard } from "../components/DigitalLabourIdCard";
import { WorkerAvatar } from "../components/WorkerAvatar";
import confetti from "canvas-confetti";
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  HardHat,
  User,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  Phone,
  Calendar,
  Eye,
  Camera,
  Upload,
  AlertCircle,
  Check,
  Filter,
  ArrowRight,
  RefreshCw,
  Printer
} from "lucide-react";
import { formatCurrency, getSkillColor } from "../utils/formatters";

export const VerificationPage = () => {
  const { user, role } = useAuth();
  
  // Section: 'builder' | 'munshi' | 'labour'
  // Default based on current logged in user role, but allow full exploration
  const [activeSection, setActiveSection] = useState(
    role === "supervisor" ? "munshi" : role === "labour" ? "labour" : "builder"
  );

  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalWorkers: 0,
    verifiedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    verifiedPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  // Selected worker for ID Card modal
  const [selectedIdWorker, setSelectedIdWorker] = useState(null);

  // Review modal state (Builder Section)
  const [inspectingWorker, setInspectingWorker] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Munshi Enrolment Form State
  const [enrolForm, setEnrolForm] = useState({
    name: "",
    phone: "",
    dob: "",
    photo: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&auto=format&fit=crop&q=80",
    aadharNumber: "",
    aadharDoc: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80",
    govIdType: "eshram",
    govIdNumber: "",
    govIdDoc: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
    skill: "Mason",
    dailyWage: 800,
    overtimeRate: 100,
    projectId: "",
    fieldInspected: true,
  });
  const [enrolSuccessWorker, setEnrolSuccessWorker] = useState(null);
  const [enrolError, setEnrolError] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Labour Self-Service State
  const [labourSearchQuery, setLabourSearchQuery] = useState(
    role === "labour" ? (user?.phone || "9834567890") : "BT-LBR-1001"
  );
  const [labourResult, setLabourResult] = useState(null);
  const [labourLookupLoading, setLabourLookupLoading] = useState(false);
  const [labourLookupError, setLabourLookupError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);
  const [verificationForm, setVerificationForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    dob: "",
    aadharNumber: "",
    govIdType: "eshram",
    govIdNumber: "",
  });

  const fetchLabourProfile = async () => {
    setLabourLookupLoading(true);
    setLabourLookupError("");
    try {
      const res = await api.get("/workers/me");
      setLabourResult(res.data);
    } catch (err) {
      setLabourResult(null);
      if (err.response?.status !== 404) {
        setLabourLookupError(err.response?.data?.message || "Unable to load your verification profile.");
      }
    } finally {
      setLabourLookupLoading(false);
    }
  };

  const submitVerification = async (event) => {
    event.preventDefault();
    setLabourLookupLoading(true);
    setLabourLookupError("");
    try {
      const res = await api.post("/workers/me", verificationForm);
      setLabourResult(res.data);
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    } catch (err) {
      setLabourLookupError(err.response?.data?.message || "Unable to submit your details.");
    } finally {
      setLabourLookupLoading(false);
    }
  };

  const uploadLabourPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLabourLookupError("Choose an image file for your profile photo.");
      return;
    }
    setPhotoUploading(true);
    setLabourLookupError("");
    try {
      const body = new FormData();
      body.append("photo", file);
      const res = await api.post("/workers/me/photo", body);
      setLabourResult(res.data);
      window.dispatchEvent(new CustomEvent("buildtrack-worker-photo-updated", { detail: res.data.photo }));
    } catch (err) {
      setLabourLookupError(err.response?.data?.message || "Unable to upload your profile photo.");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wRes, pRes, sRes] = await Promise.all([
        api.get("/workers").catch(() => ({ data: [] })),
        api.get("/projects").catch(() => ({ data: [] })),
        api.get("/workers/verification/stats").catch(() => ({ data: {} })),
      ]);
      setWorkers(wRes.data || []);
      setProjects(pRes.data || []);
      setStats(sRes.data || {});

      // Pre-set project for enrolment if available
      if (pRes.data && pRes.data.length > 0 && !enrolForm.projectId) {
        setEnrolForm((prev) => ({ ...prev, projectId: pRes.data[0]._id }));
      }
    } catch (err) {
      console.error("Error loading verification data:", err);
    } finally {
      setLoading(false);
    }

    if (role === "labour") {
      fetchLabourProfile();
    }
  };

  useEffect(() => {
    if (role === "labour") {
      setActiveSection("labour");
    } else if (role === "supervisor") {
      setActiveSection("munshi");
    } else {
      setActiveSection("builder");
    }
  }, [role]);

  useEffect(() => {
    fetchData();
  }, [role]);

  const handleLabourLookup = async () => {
    if (!labourSearchQuery.trim()) return;
    setLabourLookupLoading(true);
    setLabourLookupError("");
    try {
      const res = await api.get(`/workers/lookup/${encodeURIComponent(labourSearchQuery.trim())}`);
      setLabourResult(res.data);
    } catch (err) {
      setLabourLookupError(err.response?.data?.message || "Labour profile not found. Please verify the ID or Mobile number.");
      setLabourResult(null);
    } finally {
      setLabourLookupLoading(false);
    }
  };

  // Builder Verification Action (Approve / Reject)
  const handleVerifyAction = async (workerId, action, reason = "") => {
    try {
      setActionLoading(true);
      const res = await api.put(`/workers/${workerId}/verify-status`, {
        action,
        reason,
        notes: reason || "Verified and approved by Builder admin.",
      });

      if (action === "approve") {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      setInspectingWorker(null);
      setShowRejectBox(false);
      setRejectionReason("");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Munshi Enrolment Submit
  const handleEnrolSubmit = async (e) => {
    e.preventDefault();
    setEnrolError("");

    // Validate Aadhaar (12 digits)
    const cleanAadhaar = enrolForm.aadharNumber.replace(/[^0-9]/g, "");
    if (cleanAadhaar && cleanAadhaar.length !== 12) {
      setEnrolError("Aadhaar Number must be exactly 12 digits.");
      return;
    }

    // Validate Phone (10 digits)
    const cleanPhone = enrolForm.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      setEnrolError("Mobile Number must have at least 10 digits.");
      return;
    }

    setEnrolling(true);
    try {
      const res = await api.post("/workers", {
        ...enrolForm,
        aadharNumber: cleanAadhaar,
        phone: cleanPhone,
        verificationStatus: role === "builder" ? "verified" : "pending",
      });

      setEnrolSuccessWorker(res.data);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      // Refresh list
      fetchData();

      // Reset form
      setEnrolForm({
        name: "",
        phone: "",
        dob: "",
        photo: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&auto=format&fit=crop&q=80",
        aadharNumber: "",
        aadharDoc: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80",
        govIdType: "eshram",
        govIdNumber: "",
        govIdDoc: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
        skill: "Mason",
        dailyWage: 800,
        overtimeRate: 100,
        projectId: projects[0]?._id || "",
        fieldInspected: true,
      });
    } catch (err) {
      setEnrolError(err.response?.data?.message || "Failed to enrol labour worker.");
    } finally {
      setEnrolling(false);
    }
  };

  // Auto-format Aadhaar with spaces (XXXX XXXX XXXX)
  const formatAadhaarInput = (value) => {
    const raw = value.replace(/[^0-9]/g, "").substring(0, 12);
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  // Filtered workers for Builder list
  const filteredWorkers = workers.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      w.name?.toLowerCase().includes(term) ||
      w.workerId?.toLowerCase().includes(term) ||
      w.phone?.includes(term) ||
      w.aadharNumber?.includes(term) ||
      w.govIdNumber?.includes(term);

    const matchesStatus = statusFilter === "all" || w.verificationStatus === statusFilter;
    const matchesProject =
      projectFilter === "all" ||
      (w.projectId && (w.projectId._id === projectFilter || w.projectId === projectFilter));

    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Page Title & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-green-800 to-green-700 flex items-center justify-center shadow-lg shadow-green-900/20">
              <ShieldCheck className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Labour Verification & Smart ID Hub</h1>
              <p className="text-xs text-zinc-400">
                Aadhaar (UIDAI), e-Shram & Contractor ID Verification Engine with Unique Labour ID Generator
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* 3-SECTION NAVIGATION SWITCHER (Builder | Munshi | Labour) */}
      <div className="bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl flex flex-col sm:flex-row gap-1.5">
        <button
          onClick={() => setActiveSection("builder")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSection === "builder"
              ? "bg-gradient-to-r from-green-800 to-green-700 text-white shadow-md shadow-green-900/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <Building2 className="w-4 h-4 stroke-[2.2]" />
          <span>1. Builder Section (Compliance & Approval)</span>
          {stats.pendingCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSection === "builder" ? "bg-zinc-950 text-green-400" : "bg-green-800 text-white"
              }`}
            >
              {stats.pendingCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection("munshi")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSection === "munshi"
              ? "bg-gradient-to-r from-green-800 to-green-700 text-white shadow-md shadow-green-900/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <HardHat className="w-4 h-4 stroke-[2.2]" />
          <span>2. Munshi Section (On-Site Enrolment)</span>
        </button>

        <button
          onClick={() => setActiveSection("labour")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSection === "labour"
              ? "bg-gradient-to-r from-green-800 to-green-700 text-white shadow-md shadow-green-900/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          }`}
        >
          <User className="w-4 h-4 stroke-[2.2]" />
          <span>3. Labour Section (Self-Service & Smart ID)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: BUILDER SECTION (CENTRAL COMPLIANCE & APPROVAL) */}
      {/* ========================================================================= */}
      {activeSection === "builder" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Total Registered Labours
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">{stats.totalWorkers}</span>
                <span className="text-xs text-zinc-500">Across All Sites</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                  Verified & Active
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-400">{stats.verifiedCount}</span>
                <span className="text-xs font-semibold text-emerald-400/80">
                  {stats.verifiedPercentage}% Compliance
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-green-700/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider block">
                  Pending Approvals
                </span>
                <ShieldAlert className="w-4 h-4 text-green-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-green-400">{stats.pendingCount}</span>
                <span className="text-xs text-green-400/80 font-medium">Awaiting Review</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-rose-500/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
                  Rejected / Action Req.
                </span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-rose-400">{stats.rejectedCount}</span>
                <span className="text-xs text-zinc-500">Document Mismatch</span>
              </div>
            </div>
          </div>

          {/* Search, Status & Site Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by Name, Unique ID (BT-LBR-...), Mobile or Aadhaar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-green-700 placeholder-zinc-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
            >
              <option value="all">All Verification Statuses</option>
              <option value="pending">⏳ Pending Approval ({stats.pendingCount})</option>
              <option value="verified">✅ Verified Only ({stats.verifiedCount})</option>
              <option value="rejected">❌ Rejected ({stats.rejectedCount})</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
            >
              <option value="all">All Construction Sites</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Verification Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Labour Compliance Verification Ledger</h3>
                <p className="text-[11px] text-zinc-400">
                  Review and sign off labour identification dossiers submitted by site munshis
                </p>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                Showing {filteredWorkers.length} labours
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Labour Profile</th>
                    <th className="py-3 px-4">Unique Labour ID</th>
                    <th className="py-3 px-4">Trade & Site</th>
                    <th className="py-3 px-4">Aadhaar (12-Digit)</th>
                    <th className="py-3 px-4">Govt / Company ID</th>
                    <th className="py-3 px-4">Verification Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredWorkers.map((worker) => {
                    const isVer = worker.verificationStatus === "verified";
                    const isPen = worker.verificationStatus === "pending";
                    return (
                      <tr key={worker._id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={worker.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100&auto=format&fit=crop&q=80"}
                              alt={worker.name}
                              className="w-9 h-9 rounded-xl object-cover border border-zinc-700 shadow-sm"
                            />
                            <div>
                              <span className="font-bold text-white block">{worker.name}</span>
                              <span className="text-[11px] text-zinc-400 font-mono">{worker.phone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-lg border border-green-700/20">
                            {worker.workerId}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getSkillColor(worker.skill)}`}>
                              {worker.skill}
                            </span>
                            <span className="text-[11px] text-zinc-400 block mt-0.5 truncate max-w-[140px]">
                              {worker.projectId?.name || "General"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {worker.aadharNumber ? (
                            <div>
                              <span className="font-mono text-zinc-200 block text-[11px]">
                                {`XXXX-XXXX-${worker.aadharNumber.slice(-4)}`}
                              </span>
                              <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-2.5 h-2.5" /> 12 Digits Verified
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-[11px] italic">Not Provided</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {worker.govIdNumber ? (
                            <div>
                              <span className="font-mono text-zinc-300 block text-[11px]">
                                {worker.govIdNumber}
                              </span>
                              <span className="text-[9px] text-zinc-400 uppercase">
                                {worker.govIdType || "e-Shram"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-[11px] italic">Not Linked</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              isVer
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : isPen
                                ? "bg-green-900/40 text-green-400 border-green-700/30"
                                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {isVer ? <CheckCircle2 className="w-3 h-3" /> : isPen ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {worker.verificationStatus}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect Dossier Modal */}
                            <button
                              onClick={() => setInspectingWorker(worker)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1"
                              title="Inspect Documents & Verify"
                            >
                              <Eye className="w-3 h-3 text-green-400" />
                              <span>Inspect</span>
                            </button>

                            {/* View Digital ID Card */}
                            <button
                              onClick={() => setSelectedIdWorker(worker)}
                              className="p-1 rounded-lg bg-green-900/40 text-green-400 hover:bg-green-900/60 border border-green-700/30 transition"
                              title="View Smart Labour ID Card"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: MUNSHI / SUPERVISOR SECTION (ON-SITE ENROLMENT) */}
      {/* ========================================================================= */}
      {activeSection === "munshi" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* On-Site Enrolment Form */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-900/50 text-green-400 border border-green-700/30 flex items-center justify-center">
                  <HardHat className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">On-Site Labour Enrolment Form</h3>
                  <p className="text-xs text-zinc-400">
                    Register arriving labourer, verify Aadhaar & e-Shram, and issue Unique Labour ID
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Field Gatepass Ready
              </span>
            </div>

            {enrolError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{enrolError}</span>
              </div>
            )}

            <form onSubmit={handleEnrolSubmit} className="space-y-4">
              {/* Row 1: Full Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Labour Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={enrolForm.name}
                    onChange={(e) => setEnrolForm({ ...enrolForm, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98XXXXXXXX"
                    value={enrolForm.phone}
                    onChange={(e) => setEnrolForm({ ...enrolForm, phone: e.target.value.replace(/[^0-9]/g, "") })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-green-700"
                  />
                </div>
              </div>

              {/* Row 2: DOB & Trade / Skill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={enrolForm.dob}
                    onChange={(e) => setEnrolForm({ ...enrolForm, dob: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Trade / Skill
                  </label>
                  <select
                    value={enrolForm.skill}
                    onChange={(e) => setEnrolForm({ ...enrolForm, skill: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
                  >
                    <option value="Mason">Mason (Rajmistri)</option>
                    <option value="Carpenter">Carpenter (Badhai)</option>
                    <option value="Bar Bender">Bar Bender (Sariya Fitter)</option>
                    <option value="Painter">Painter (Rangsaaj)</option>
                    <option value="Tiles Mason">Tiles Mason</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Helper">Helper (Beldar)</option>
                    <option value="Welder">Welder</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Aadhaar Verification & Formatting */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Aadhaar Verification (12 Digits) *</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">UIDAI Format</span>
                </div>

                <input
                  type="text"
                  placeholder="XXXX XXXX XXXX"
                  value={formatAadhaarInput(enrolForm.aadharNumber)}
                  onChange={(e) => setEnrolForm({ ...enrolForm, aadharNumber: e.target.value.replace(/[^0-9]/g, "").substring(0, 12) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-green-300 focus:outline-none focus:border-green-700"
                />

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Entered: {enrolForm.aadharNumber.replace(/[^0-9]/g, "").length} / 12 digits</span>
                  {enrolForm.aadharNumber.replace(/[^0-9]/g, "").length === 12 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Valid 12-Digit Format
                    </span>
                  ) : (
                    <span className="text-green-400 text-[10px]">Enter 12 digits</span>
                  )}
                </div>
              </div>

              {/* Row 4: Secondary ID (e-Shram or Company ID) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Secondary ID Type
                  </label>
                  <select
                    value={enrolForm.govIdType}
                    onChange={(e) => setEnrolForm({ ...enrolForm, govIdType: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
                  >
                    <option value="eshram">e-Shram 12-Digit UAN</option>
                    <option value="company_id">Private Company / Contractor ID</option>
                    <option value="voter_id">Voter ID (EPIC)</option>
                    <option value="pan">PAN Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    ID / UAN Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100984726152 or CONTR-9941"
                    value={enrolForm.govIdNumber}
                    onChange={(e) => setEnrolForm({ ...enrolForm, govIdNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-green-700"
                  />
                </div>
              </div>

              {/* Row 5: Construction Site & Daily Wage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Assigned Construction Site
                  </label>
                  <select
                    value={enrolForm.projectId}
                    onChange={(e) => setEnrolForm({ ...enrolForm, projectId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-700"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Daily Wage Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={enrolForm.dailyWage}
                    onChange={(e) => setEnrolForm({ ...enrolForm, dailyWage: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-green-700"
                  />
                </div>
              </div>

              {/* Physical Gatepass Checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <input
                  type="checkbox"
                  id="fieldInspect"
                  checked={enrolForm.fieldInspected}
                  onChange={(e) => setEnrolForm({ ...enrolForm, fieldInspected: e.target.checked })}
                  className="w-4 h-4 rounded text-green-400 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="fieldInspect" className="text-xs text-zinc-300 cursor-pointer">
                  <strong className="text-white block">Physically Inspected Documents at Site Gate</strong>
                  <span className="text-[11px] text-zinc-400">
                    I certify that original Aadhaar / e-Shram card was examined in person.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={enrolling}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-800 to-green-700 text-white font-bold text-xs shadow-lg shadow-green-900/20 hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                {enrolling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 stroke-[3]" />
                )}
                <span>Enrol Labour & Generate Unique Smart ID (BT-LBR)</span>
              </button>
            </form>
          </div>

          {/* Munshi Right Column: Instant ID Card Preview & Recent Enrolments */}
          <div className="lg:col-span-5 space-y-4">
            {enrolSuccessWorker ? (
              <div className="bg-gradient-to-br from-emerald-950/60 to-zinc-900 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h4 className="text-sm font-bold">Labour Enrolled Successfully!</h4>
                </div>

                <p className="text-xs text-zinc-300">
                  Unique Labour ID has been generated. Worker is queued for central Builder sign-off.
                </p>

                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-semibold">
                      Generated Labour ID
                    </span>
                    <span className="text-lg font-black font-mono text-green-400">
                      {enrolSuccessWorker.workerId}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedIdWorker(enrolSuccessWorker)}
                    className="px-3 py-1.5 rounded-xl bg-green-800 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-green-900/20 hover:opacity-90"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>View Card</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Munshi's Site Labours */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Labours on My Site
                </h4>
                <span className="text-[11px] font-mono text-zinc-400">{workers.length} Total</span>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {workers.slice(0, 8).map((w) => (
                  <div
                    key={w._id}
                    className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={w.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100&auto=format&fit=crop&q=80"}
                        alt={w.name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{w.name}</span>
                          <span className="text-[10px] font-mono text-green-400 font-bold">{w.workerId}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block">{w.skill} • ₹{w.dailyWage}/d</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedIdWorker(w)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-green-400 transition"
                      title="View ID Card"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: LABOUR SECTION (SELF-SERVICE & SMART ID CARD) */}
      {/* ========================================================================= */}
      {activeSection === "labour" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Labour account verification */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white">My Verification Profile</h3>
              <p className="text-xs text-zinc-400">
                Submit your identity details for review and check your verification status.
              </p>
            </div>

            {!labourResult && !labourLookupLoading && (
              <form onSubmit={submitVerification} className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs text-zinc-300">Full name
                  <input required value={verificationForm.name} onChange={(e) => setVerificationForm({ ...verificationForm, name: e.target.value })} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" />
                </label>
                <label className="text-xs text-zinc-300">Mobile number
                  <input required value={verificationForm.phone} onChange={(e) => setVerificationForm({ ...verificationForm, phone: e.target.value })} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" />
                </label>
                <label className="text-xs text-zinc-300">Date of birth
                  <input type="date" value={verificationForm.dob} onChange={(e) => setVerificationForm({ ...verificationForm, dob: e.target.value })} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" />
                </label>
                <label className="text-xs text-zinc-300">Aadhaar number
                  <input inputMode="numeric" maxLength={12} value={verificationForm.aadharNumber} onChange={(e) => setVerificationForm({ ...verificationForm, aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" placeholder="12 digits" />
                </label>
                <label className="text-xs text-zinc-300">e-Shram / government ID
                  <input value={verificationForm.govIdNumber} onChange={(e) => setVerificationForm({ ...verificationForm, govIdNumber: e.target.value })} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" />
                </label>
                <button disabled={labourLookupLoading} className="self-end py-2.5 px-4 rounded-xl bg-green-800 text-white font-bold text-xs disabled:opacity-60">
                  {labourLookupLoading ? "Submitting..." : "Submit for verification"}
                </button>
              </form>
            )}

            {labourResult && labourResult.verificationStatus !== "verified" && (
              <button
                onClick={() => {
                  setVerificationForm({
                    name: labourResult.name || user?.name || "",
                    phone: labourResult.phone || user?.phone || "",
                    dob: labourResult.dob || "",
                    aadharNumber: labourResult.aadharNumber || "",
                    govIdType: labourResult.govIdType || "eshram",
                    govIdNumber: labourResult.govIdNumber || "",
                  });
                  setLabourResult(null);
                }}
                className="text-xs text-green-400 hover:underline"
              >
                Update submitted details
              </button>
            )}

            {labourLookupError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {labourLookupError}
              </div>
            )}
          </div>

          {/* Labour Result Profile & Smart ID */}
          {labourResult && (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                <WorkerAvatar worker={labourResult} className="w-14 h-14 rounded-xl" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">Profile photo</h4>
                  <p className="text-xs text-zinc-400">This same photo appears on your Smart ID and labour profile.</p>
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLabourPhoto(e.target.files?.[0])} />
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading} className="px-3 py-2 rounded-xl bg-green-800 text-white font-bold text-xs disabled:opacity-60">
                  {photoUploading ? "Uploading…" : labourResult.photo ? "Change photo" : "Upload photo"}
                </button>
              </div>
              {/* Status Header Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  labourResult.verificationStatus === "verified"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : labourResult.verificationStatus === "pending"
                    ? "bg-green-950/40 border-green-700/40 text-green-300"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {labourResult.verificationStatus === "verified" ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  ) : labourResult.verificationStatus === "pending" ? (
                    <ShieldAlert className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-tight">
                      {labourResult.verificationStatus === "verified"
                        ? "Active & Aadhaar Verified Labour"
                        : labourResult.verificationStatus === "pending"
                        ? "Verification In Progress (Site Gate Inspection Done)"
                        : "Verification Action Required"}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {labourResult.verificationNotes || "Cleared for site entry, daily attendance, and automated wage ledger."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedIdWorker(labourResult)}
                  className="px-3 py-1.5 rounded-xl bg-white text-zinc-950 font-bold text-xs shadow hover:opacity-90 flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Open Smart ID</span>
                </button>
              </div>

              {/* Direct Card View */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    My Official Digital Labour Smart Card
                  </span>
                  <button
                    onClick={() => setSelectedIdWorker(labourResult)}
                    className="text-xs text-green-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Full Card & Print</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Compact preview */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center gap-4">
                  <WorkerAvatar worker={labourResult} className="w-16 h-20 rounded-xl border border-zinc-700" />
                  <div className="space-y-1 text-xs">
                    <span className="text-base font-bold text-white block">{labourResult.name}</span>
                    <span className="text-xs font-mono font-bold text-green-400 block">{labourResult.workerId}</span>
                    <span className="text-zinc-400 block">{labourResult.skill} • ₹{labourResult.dailyWage}/day</span>
                    <span className="text-[11px] font-mono text-zinc-400 block">
                      Aadhaar: {labourResult.aadharNumber ? `XXXX-XXXX-${labourResult.aadharNumber.slice(-4)}` : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INSPECT DOSSIER MODAL (BUILDER SECTION) */}
      {/* ========================================================================= */}
      {inspectingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Labour Verification Dossier: {inspectingWorker.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectingWorker(null)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo & Identity Numbers */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={inspectingWorker.photo || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80"}
                    alt={inspectingWorker.name}
                    className="w-14 h-16 rounded-xl object-cover border border-zinc-700"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{inspectingWorker.name}</h4>
                    <span className="text-xs font-mono font-bold text-green-400 block">{inspectingWorker.workerId}</span>
                    <span className="text-[11px] text-zinc-400 block">{inspectingWorker.skill}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 text-xs border-t border-zinc-800/80">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Mobile No:</span>
                    <span className="font-mono text-white">{inspectingWorker.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Date of Birth:</span>
                    <span className="font-mono text-white">{inspectingWorker.dob || "Not Provided"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Assigned Site:</span>
                    <span className="text-white truncate max-w-[150px]">{inspectingWorker.projectId?.name || "General"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Daily Wage:</span>
                    <span className="font-mono text-green-400 font-bold">₹{inspectingWorker.dailyWage}/day</span>
                  </div>
                </div>
              </div>

              {/* Aadhaar & e-Shram Details */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h5 className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  Government & Company ID Credentials
                </h5>

                {/* Aadhaar */}
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Aadhaar (UIDAI):</span>
                    {inspectingWorker.aadharNumber?.length === 12 ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> 12 Digits
                      </span>
                    ) : (
                      <span className="text-[10px] text-green-400">Pending</span>
                    )}
                  </div>
                  <div className="font-mono text-sm font-bold text-white tracking-wider">
                    {inspectingWorker.aadharNumber
                      ? `${inspectingWorker.aadharNumber.substring(0, 4)} ${inspectingWorker.aadharNumber.substring(4, 8)} ${inspectingWorker.aadharNumber.substring(8, 12)}`
                      : "Not Provided"}
                  </div>
                </div>

                {/* e-Shram or Company ID */}
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium uppercase">
                      {inspectingWorker.govIdType === "eshram" ? "e-Shram 12-Digit UAN:" : "Company ID:"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Registered</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-green-400">
                    {inspectingWorker.govIdNumber || "Not Linked"}
                  </div>
                </div>

                {/* Gate Inspection Note */}
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Field Inspected by: <strong className="text-white">{inspectingWorker.fieldInspectedBy || "Site Munshi"}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection box toggle */}
            {showRejectBox && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                <label className="text-xs font-semibold text-rose-300 block">
                  Provide Rejection Reason to Munshi / Labour:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Aadhaar name does not match worker, document is illegible..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <button
                onClick={() => setSelectedIdWorker(inspectingWorker)}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4 text-green-400" />
                <span>Preview Smart ID Card</span>
              </button>

              <div className="flex items-center gap-2">
                {!showRejectBox ? (
                  <button
                    onClick={() => setShowRejectBox(true)}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold"
                  >
                    Reject
                  </button>
                ) : (
                  <button
                    onClick={() => handleVerifyAction(inspectingWorker._id, "reject", rejectionReason)}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                )}

                <button
                  onClick={() => handleVerifyAction(inspectingWorker._id, "approve")}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
                  <span>Approve & Issue Smart ID</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIGITAL SMART LABOUR ID CARD MODAL */}
      {/* ========================================================================= */}
      {selectedIdWorker && (
        <DigitalLabourIdCard
          worker={selectedIdWorker}
          onClose={() => setSelectedIdWorker(null)}
        />
      )}
    </div>
  );
};
export default VerificationPage;
