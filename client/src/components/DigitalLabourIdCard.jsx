import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Printer, 
  X, 
  Building2, 
  Phone, 
  Calendar, 
  CreditCard, 
  HardHat, 
  CheckCircle2, 
  Copy, 
  Check
} from "lucide-react";
import { useState } from "react";
import { WorkerAvatar } from "./WorkerAvatar";

export const DigitalLabourIdCard = ({ worker, onClose }) => {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef();

  if (!worker) return null;

  const isVerified = worker.verificationStatus === "verified";
  const isPending = worker.verificationStatus === "pending";

  const handleCopyId = () => {
    navigator.clipboard.writeText(worker.workerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Mask Aadhaar for privacy (XXXX-XXXX-1234)
  const formatAadhaar = (num) => {
    if (!num) return "Not Linked";
    const clean = num.replace(/[^0-9]/g, "");
    if (clean.length >= 12) {
      return `XXXX-XXXX-${clean.substring(8)}`;
    }
    return `XXXX-${clean}`;
  };

  const qrData = JSON.stringify({
    id: worker.workerId,
    name: worker.name,
    phone: worker.phone,
    trade: worker.skill,
    status: worker.verificationStatus,
    verifiedAt: worker.verifiedAt || "N/A",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl p-6 shadow-2xl">
        {/* Modal Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Official Digital Labour Smart ID Card</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
              title="Print PVC Card"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE SMART CARD */}
        <div className="mt-5 flex justify-center">
          <div
            ref={cardRef}
            className="w-full max-w-md bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-green-700/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden text-zinc-100"
          >
            {/* Holographic Top Banner */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-800 via-emerald-400 to-green-800" />
            
            {/* Header: Republic / National Registry Watermark Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center shadow-md shadow-green-900/30">
                  <HardHat className="w-5 h-5 text-white stroke-[2.4]" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-green-400">
                    Build<span className="text-white">Track</span> Verified ID
                  </h3>
                  <p className="text-[9px] text-zinc-400 tracking-tight uppercase">
                    Construction Worker Digital Credential
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                  isVerified
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : isPending
                    ? "bg-green-900/40 text-green-400 border-green-700/40"
                    : "bg-rose-500/15 text-rose-400 border-rose-500/40"
                }`}
              >
                {isVerified ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-green-400" />
                )}
                <span>{worker.verificationStatus}</span>
              </div>
            </div>

            {/* Unique Labour ID Box */}
            <div className="mt-3 bg-zinc-900/90 border border-green-700/30 rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-semibold block">
                  Unique Labour ID (UID)
                </span>
                <span className="text-sm font-black font-mono tracking-wider text-green-300">
                  {worker.workerId}
                </span>
              </div>
              <button
                onClick={handleCopyId}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition flex items-center gap-1 text-[10px]"
                title="Copy ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {/* Profile & Vital Details Section */}
            <div className="mt-4 grid grid-cols-12 gap-3.5 items-start">
              {/* Photo & QR Code */}
              <div className="col-span-4 flex flex-col items-center gap-2">
                <div className="relative w-24 h-28 rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-800 shadow-md">
                  <WorkerAvatar worker={worker} className="w-full h-full" />
                  {isVerified && (
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[8px] font-black uppercase text-center py-0.5 tracking-wider">
                      Verified
                    </div>
                  )}
                </div>

                {/* Scannable QR Code */}
                <div className="bg-white p-1.5 rounded-lg shadow-sm">
                  <QRCodeSVG value={qrData} size={70} level="M" />
                </div>
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Scan to Verify</span>
              </div>

              {/* Information Grid */}
              <div className="col-span-8 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Full Name</span>
                  <span className="text-sm font-bold text-white tracking-tight">{worker.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Trade / Skill</span>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-green-900/50 text-green-300 font-semibold text-[11px] border border-green-700/30">
                      {worker.skill}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Daily Wage</span>
                    <span className="font-mono text-white font-bold text-[11px]">₹{worker.dailyWage}/day</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Mobile No</span>
                    <span className="font-mono text-zinc-300 text-[11px] flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-zinc-500" />
                      {worker.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Date of Birth</span>
                    <span className="font-mono text-zinc-300 text-[11px] flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 text-zinc-500" />
                      {worker.dob || "Recorded"}
                    </span>
                  </div>
                </div>

                {/* Aadhaar Verification Box */}
                <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-medium">Aadhaar (UIDAI):</span>
                    {worker.aadharVerified ? (
                      <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-[9px] text-green-400 font-medium">Pending Match</span>
                    )}
                  </div>
                  <div className="font-mono text-xs font-semibold text-zinc-200">
                    {formatAadhaar(worker.aadharNumber)}
                  </div>
                </div>

                {/* e-Shram / Company ID Box */}
                <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase">
                      {worker.govIdType === "eshram" ? "e-Shram UAN:" : "Company ID:"}
                    </span>
                    {worker.govIdVerified ? (
                      <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Linked
                      </span>
                    ) : (
                      <span className="text-[9px] text-zinc-400 font-medium">Recorded</span>
                    )}
                  </div>
                  <div className="font-mono text-xs font-semibold text-green-400">
                    {worker.govIdNumber || "Not Linked"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[9px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-zinc-400" />
                <span className="truncate max-w-[190px]">
                  Site: {worker.projectId?.name || "All Registered Sites"}
                </span>
              </div>
              <div className="text-right">
                <span>Verified by: {worker.verifiedBy || "Site Munshi"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Helpful instructions below card */}
        <p className="mt-4 text-center text-xs text-zinc-400">
          This digital smart ID card serves as official identity & site gate-pass for attendance, wage payments, and compliance.
        </p>
      </div>
    </div>
  );
};
