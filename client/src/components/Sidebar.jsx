import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  CircleDollarSign,
  Receipt,
  FileSpreadsheet,
  Camera,
  ClipboardList,
  Sparkles,
  UserCheck,
  ShieldCheck
} from "lucide-react";

export const Sidebar = ({ isMobileOpen, closeMobileSidebar }) => {
  const { role } = useAuth();

  const builderLinks = [
    { to: "/builder", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/builder/ai-workflow", label: "AI Road & Site Progress", icon: Sparkles, badge: "AI Vision" },
    { to: "/verification", label: "Labour Verification", icon: ShieldCheck, badge: "Smart ID" },
    { to: "/builder/projects", label: "Projects & Sites", icon: Building2 },
    { to: "/builder/labour", label: "Labour Directory", icon: Users },
    { to: "/builder/attendance", label: "Daily Attendance", icon: CalendarCheck },
    { to: "/builder/wages", label: "Wages & Payouts", icon: CircleDollarSign },
    { to: "/builder/expenses", label: "Site Expenses", icon: Receipt },
    { to: "/builder/daily-updates", label: "Daily Reports", icon: ClipboardList },
    { to: "/builder/photos", label: "Site Photos", icon: Camera },
    { to: "/builder/reports", label: "Reports & Exports", icon: FileSpreadsheet },
    { to: "/builder/ai-insights", label: "AI Insights Hub", icon: Sparkles, badge: "AI" },
  ];

  const supervisorLinks = [
    { to: "/supervisor", label: "Site Home", icon: LayoutDashboard, end: true },
    { to: "/supervisor/ai-workflow", label: "Upload & Check AI Workflow", icon: Sparkles, badge: "AI Vision" },
    { to: "/verification", label: "Labour Verification", icon: ShieldCheck, badge: "Enrol" },
    { to: "/supervisor/attendance", label: "Mark Attendance", icon: UserCheck },
    { to: "/supervisor/work-update", label: "Add Work Update", icon: ClipboardList },
    { to: "/supervisor/photos", label: "Upload Photos", icon: Camera },
    { to: "/supervisor/expenses", label: "Add Expense", icon: Receipt },
  ];

  const labourLinks = [
    { to: "/labour", label: "My Dashboard", icon: LayoutDashboard, end: true },
    { to: "/verification", label: "My Smart ID Card", icon: ShieldCheck, badge: "Smart ID" },
  ];

  const links = role === "supervisor" ? supervisorLinks : role === "labour" ? labourLinks : builderLinks;

  const setRevealOrigin = (event, center = false) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = center ? bounds.width / 2 : event.clientX - bounds.left;
    const y = center ? bounds.height / 2 : event.clientY - bounds.top;
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(bounds.width - x, y),
      Math.hypot(x, bounds.height - y),
      Math.hypot(bounds.width - x, bounds.height - y),
    );
    event.currentTarget.style.setProperty("--radial-x", `${x}px`);
    event.currentTarget.style.setProperty("--radial-y", `${y}px`);
    event.currentTarget.style.setProperty("--radial-radius", `${radius + 2}px`);
  };

  return (
    <>
      {isMobileOpen && (
        <div 
          onClick={closeMobileSidebar}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <aside className={`
        fixed md:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col transition-transform duration-300
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">
          <div className="px-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Navigation
            </span>
          </div>

          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={closeMobileSidebar}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setRevealOrigin(event);
                  }}
                  onFocus={(event) => setRevealOrigin(event, true)}
                  className={({ isActive }) =>
                    `group radial-reveal-link relative isolate flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 shadow-inner"
                        : "text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800/50"
                    }`
                  }
                >
                  <span aria-hidden="true" className="radial-reveal-fill" />
                  <span className="relative z-10 flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-green-300" />
                      <span>{link.label}</span>
                    </span>
                    {link.badge && (
                      <span className="shrink-0 text-[10px] bg-green-800 text-white font-extrabold px-1.5 py-0.5 rounded">
                        {link.badge}
                      </span>
                    )}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 mt-4 bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-green-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>BuildTrack Pro v1.0</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Live Site Management Platform</p>
        </div>
      </aside>
    </>
  );
};
