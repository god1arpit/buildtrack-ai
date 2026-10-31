import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createServerConnectionCode } from "../api/api";
import { 
  HardHat, 
  Sparkles,
  Building2, 
  User, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Camera,
  Layers,
  CheckCircle2,
  Wifi
} from "lucide-react";

export const Navbar = ({ toggleMobileSidebar, isMobileSidebarOpen }) => {
  const { user, logout, switchDemoRole, role } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = async (targetRole) => {
    await switchDemoRole(targetRole);
    if (targetRole === "builder") navigate("/builder");
    else if (targetRole === "supervisor") navigate("/supervisor");
    else navigate("/labour");
  };

  const handleConfigureIp = async () => {
    if (window.location.hostname.endsWith(".vercel.app") || window.location.hostname.endsWith(".pages.dev")) {
      const custom = localStorage.getItem("buildtrack_server_ip");
      if (custom) {
        localStorage.removeItem("buildtrack_server_ip");
        window.alert("Cloud connection active! Any stale local server overrides have been removed.");
      } else {
        window.alert("BuildTrack Cloud is connected directly to permanent Cloud AI Services on Render.");
      }
      return;
    }
    const current = localStorage.getItem("buildtrack_server_ip") || "192.168.0.101";
    const next = window.prompt(
      "Enter a BuildTrack connection code (BT1-...) or server address. Same Wi-Fi: laptop IP. Outside Wi-Fi: public HTTPS tunnel URL/code; the laptop and tunnel must stay online.",
      current
    );
    if (next === null || !next.trim()) return;

    try {
      const code = createServerConnectionCode(next.trim());
      localStorage.setItem("buildtrack_server_ip", code);
      const enteredCode = next.trim().startsWith("BT1-");
      if (!enteredCode) {
        try {
          await navigator.clipboard.writeText(code);
          window.alert(`BuildTrack connection code copied. Share this with the other phone:\n\n${code}`);
        } catch {
          window.prompt("Copy this BuildTrack connection code and share it with the other phone:", code);
        }
      } else {
        window.alert("BuildTrack server connection code saved.");
      }
      window.location.reload();
    } catch (error) {
      window.alert(error.message || "That server address or connection code is invalid.");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 text-white shadow-xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          {toggleMobileSidebar && (
            <button
              onClick={toggleMobileSidebar}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link to={role === "supervisor" ? "/supervisor" : role === "labour" ? "/labour" : "/builder"} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-green-700/40 shadow-lg shadow-green-950/40 group-hover:scale-105 transition-transform bg-[#29282d]" aria-hidden="true">
              <img src="/brand/buildtrack-icon.png" alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-base tracking-tight">
                <span>Build<span className="text-green-400">Track</span></span>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 font-extrabold px-1.5 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Vision
                </span>
              </div>
              <span className="text-[9px] text-zinc-400 font-mono tracking-wider block -mt-1 uppercase hidden sm:block">
                Construction & Workforce Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Contextual Quick Actions based on Role — hidden below xl so the top bar never crowds */}
        <div className="hidden xl:flex items-center gap-2 text-xs">
          {role === "supervisor" ? (
            <>
              <Link
                to="/supervisor/ai-workflow"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-900/40 text-green-400 border border-green-700/30 font-bold hover:bg-green-900/60 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload & Check AI Workflow</span>
              </Link>
              <Link
                to="/verification"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold hover:text-white transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Labour Enrolment</span>
              </Link>
            </>
          ) : role === "labour" ? (
            <Link
              to="/verification"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-900/40 text-green-400 border border-green-700/30 font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>My Smart ID Card</span>
            </Link>
          ) : (
            <>
              <Link
                to="/builder/ai-workflow"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold hover:bg-zinc-700 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>AI Road & Workflow HUD</span>
              </Link>
              <Link
                to="/verification"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold hover:text-white transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Labour Verification</span>
              </Link>
            </>
          )}
        </div>

        {/* Right: Quick Role Switcher & User Account */}
        <div className="flex items-center gap-3">
          {/* 1-Click Role Switcher */}
          <div className="hidden lg:flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <span className="text-[10px] text-zinc-500 font-bold px-2 uppercase">Switch:</span>
            <button
              onClick={() => handleRoleChange("builder")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                role === "builder"
                  ? "bg-green-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3 h-3" />
              Builder
            </button>
            <button
              onClick={() => handleRoleChange("supervisor")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                role === "supervisor"
                  ? "bg-green-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <HardHat className="w-3 h-3" />
              Supervisor
            </button>
            <button
              onClick={() => handleRoleChange("labour")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                role === "labour"
                  ? "bg-green-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <User className="w-3 h-3" />
              Labour
            </button>
          </div>

          {/* Server IP Config Icon for Mobile */}
          <button
            onClick={handleConfigureIp}
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            title="Configure BuildTrack connection code or server address"
          >
            <Wifi className="w-4 h-4" />
          </button>

          {/* User Profile — first name only on screen, full name in tooltip, so long names never truncate mid-word */}
          {user ? (
            <div className="flex items-center gap-2 bg-zinc-950/80 pl-3 pr-1 py-1 rounded-2xl border border-zinc-800 text-xs">
              <div className="text-right hidden sm:block">
                <span
                  title={user.name}
                  className="font-bold text-white block text-xs leading-tight truncate max-w-[110px]"
                >
                  {user.name?.split(" ")[0]}
                </span>
                <span className="text-[10px] text-green-400 uppercase font-mono font-semibold">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl bg-green-800 text-white text-xs font-bold shadow hover:bg-green-700 transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
