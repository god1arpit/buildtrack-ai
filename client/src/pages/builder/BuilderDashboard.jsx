import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import { StatCard } from "../../components/StatCard";
import { SiteCard } from "../../components/SiteCard";
import { AddProjectModal } from "../../components/AddProjectModal";
import { AddWorkerModal } from "../../components/AddWorkerModal";
import { AddExpenseModal } from "../../components/AddExpenseModal";
import {
  Building2,
  Users,
  UserCheck,
  CircleDollarSign,
  AlertCircle,
  TrendingUp,
  Plus,
  Sparkles,
  ClipboardList,
  Calendar,
  Receipt,
  UserPlus,
  ChevronRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const BuilderDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [expensesData, setExpensesData] = useState(null);
  const [attendanceTrendData, setAttendanceTrendData] = useState([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const endDate = today.toISOString().slice(0, 10);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      const startDate = weekStart.toISOString().slice(0, 10);
      const [sumRes, updatesRes, supRes, expRes, attendanceRes] = await Promise.all([
        api.get("/reports/summary"),
        api.get("/work-updates?limit=4"),
        api.get("/auth/supervisors"),
        api.get("/expenses"),
        api.get("/attendance/history", { params: { startDate, endDate } }),
      ]);
      setSummary(sumRes.data);
      setRecentUpdates(updatesRes.data || []);
      setSupervisors(supRes.data || []);
      setExpensesData(expRes.data);
      const recordsByDate = (attendanceRes.data || []).reduce((groups, record) => {
        (groups[record.date] ||= []).push(record);
        return groups;
      }, {});
      setAttendanceTrendData(Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        const date = day.toISOString().slice(0, 10);
        const records = recordsByDate[date] || [];
        return {
          day: date === endDate ? "Today" : day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          present: records.filter((record) => record.status === "present" || record.status === "half-day").length,
          total: records.length,
        };
      }));
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Category chart data
  const categoryData = Object.entries(expensesData?.categoryBreakdown || {}).map(([cat, amt]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    amount: amt,
  }));

  const COLORS = ["#166534", "#A1A1AA", "#10B981", "#EC4899", "#8B5CF6", "#06B6D4"];

  // Empty-dashboard state: every KPI is zero, so show guidance instead of a dead-looking grid.
  const hasNoData =
    !loading &&
    summary &&
    (summary.activeProjectsCount ?? 0) === 0 &&
    (summary.totalWorkers ?? 0) === 0;
  // "0/0" reads like a broken division — show an em dash when nothing is recorded.
  const turnoutDisplay =
    !summary?.todayAttendance || summary.todayAttendance === "0/0"
      ? "—"
      : summary.todayAttendance;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-green-950/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                Builder Console
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">v2.0</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Builder dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">Sites, labour, attendance and wages at a glance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddWorker(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              Add Labour
            </button>
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              Log Expense
            </button>
            <button
              onClick={() => setShowAddProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-900 to-emerald-800 hover:from-emerald-800 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              New Site
            </button>
          </div>
        </div>
      </div>

      {/* Road inspection entry */}
      <div className="card-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-white">Road inspection</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Upload site media for a prototype road progress estimate.</p>
        </div>
        <Link to="/builder/ai-workflow" className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
          Open inspection <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Empty-state banner: only when the dashboard genuinely has no data yet */}
      {hasNoData && (
        <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-zinc-200">
            No data yet — add your first site to see stats here.
          </p>
          <button
            onClick={() => setShowAddProject(true)}
            className="shrink-0 px-4 py-2 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white text-sm font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            + New Site
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Sites"
          value={summary?.activeProjectsCount ?? 0}
          icon={Building2}
          subtext="Active Projects"
          color="amber"
        />
        <StatCard
          title="Total Labour"
          value={summary?.totalWorkers ?? 0}
          icon={Users}
          subtext="Registered Workers"
          color="blue"
        />
        <StatCard
          title="Today's Turnout"
          value={turnoutDisplay}
          icon={UserCheck}
          subtext={turnoutDisplay === "—" ? "No data yet" : "On-Site Attendance"}
          color="emerald"
        />
        <StatCard
          title="Today's Wages"
          value={formatCurrency(summary?.todayWages ?? 0)}
          icon={CircleDollarSign}
          subtext="Daily Accrual"
          color="amber"
        />
        <StatCard
          title="Pending Wages"
          value={formatCurrency(summary?.pendingWages ?? 0)}
          icon={AlertCircle}
          subtext="Unpaid Liabilities"
          color="rose"
        />
        <StatCard
          title="Overall Progress"
          value={`${summary?.overallProgress ?? 0}%`}
          icon={TrendingUp}
          subtext="Average Completion"
          color="purple"
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance Trends */}
        <div className="card-hover-glow bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Labour Attendance Trend</h3>
              <p className="text-[11px] text-zinc-400">Past 7 shifts attendance volume</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              {attendanceTrendData.some((day) => day.total > 0)
                ? `${Math.round(attendanceTrendData.reduce((sum, day) => sum + (day.total ? day.present / day.total : 0), 0) / attendanceTrendData.filter((day) => day.total > 0).length * 100)}% Average Turnout`
                : "No attendance recorded"}
            </span>
          </div>
          <div className="h-64 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#166534" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#166534" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} />
                <YAxis stroke="#a1a1aa" fontSize={11} domain={[0, 20]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "12px", fontSize: "12px" }}
                  labelStyle={{ color: "#f4f4f5", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="present" stroke="#166534" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="card-hover-glow bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Material & Site Expenses Breakdown</h3>
              <p className="text-[11px] text-zinc-400">Total expenditure by category</p>
            </div>
            <span className="text-xs font-bold text-green-400 font-mono">
              {formatCurrency(expensesData?.totalAmount ?? 0)}
            </span>
          </div>
          {categoryData.length === 0 ? (
            <div className="h-64 min-h-[240px] flex items-center justify-center text-xs text-zinc-400">No expenses recorded yet</div>
          ) : (
            <div className="h-64 min-h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip
                    formatter={(val) => formatCurrency(val)}
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "12px", fontSize: "12px" }}
                    labelStyle={{ color: "#f4f4f5", fontWeight: "bold" }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Construction Sites Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Active Construction Projects</h2>
            <p className="text-xs text-zinc-400">Live operational milestones and attendance per site</p>
          </div>
          <Link
            to="/builder/projects"
            className="text-xs font-semibold text-green-400 hover:text-green-300 transition-colors"
          >
            View All Projects →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(!summary?.projects || summary.projects.length === 0) ? (
            <div className="card-hover-glow col-span-full bg-zinc-900 border border-dashed border-zinc-800 rounded-3xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-green-900/30 text-green-400 border border-green-700/20 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No Construction Sites Added Yet</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Get started by creating your first construction site. You can assign site supervisors, set milestones, and start tracking live work.
              </p>
              <button
                onClick={() => setShowAddProject(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-800 to-green-700 text-white font-bold text-xs shadow-lg shadow-green-900/20 hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create First Site / Project</span>
              </button>
            </div>
          ) : (
            summary.projects.map((proj) => (
              <SiteCard key={proj._id} project={proj} />
            ))
          )}
        </div>
      </div>

      {/* Two Column Layout: Recent Daily Reports & AI Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Daily Work Updates */}
        <div className="card-hover-glow lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-green-900/50 text-green-400 border border-green-700/30">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recent Daily Work Updates</h3>
                <p className="text-xs text-zinc-400">Supervisor reports & milestone logs</p>
              </div>
            </div>
            <Link
              to="/builder/daily-updates"
              className="text-xs font-semibold text-green-400 hover:text-green-300"
            >
              All Reports →
            </Link>
          </div>

          <div className="space-y-4">
            {recentUpdates.length === 0 ? (
              <p className="text-center text-zinc-400 text-xs py-8">No daily updates submitted yet</p>
            ) : (
              recentUpdates.map((update) => (
                <div
                  key={update._id}
                  className="card-hover-glow bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-400">{update.projectId?.name || "Project"}</span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-zinc-400 font-medium">By {update.supervisorId?.name || "Supervisor"}</span>
                    </div>
                    <span className="text-zinc-400 font-mono text-[11px] bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                      {formatDate(update.date)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-zinc-200 leading-relaxed">{update.description}</p>

                  {update.aiSummary && (
                    <div className="bg-green-900/30 border border-green-700/20 rounded-xl p-2.5 text-[11px] text-green-300/90 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-green-400 font-semibold block text-[10px] uppercase tracking-wider">AI Executive Brief</strong>
                        {update.aiSummary}
                      </div>
                    </div>
                  )}

                  {update.issues && (
                    <div className="text-[11px] text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                      ⚠️ Bottleneck / Stock Shortage: {update.issues}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: AI Insights Quick Widget */}
        <div className="card-hover-glow bg-gradient-to-br from-zinc-900 via-zinc-900 to-green-950/20 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-green-400 uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Smart Site Intelligence</span>
            </div>
            <h3 className="text-base font-bold text-white">AI Site Insights</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Predictive risk analysis & inventory alerts across active construction sites.
            </p>

            <div className="space-y-3 mt-5 text-xs">
              <div className="card-hover-glow bg-zinc-950/80 p-3.5 rounded-2xl border border-green-700/30">
                <div className="flex items-center gap-1.5 text-green-400 font-semibold mb-1">
                  <span>🏗️ Site Overview</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {summary?.activeProjectsCount > 0
                    ? `${summary.activeProjectsCount} active site${summary.activeProjectsCount === 1 ? "" : "s"} currently tracked.`
                    : "No active sites recorded. Create a site to start tracking project progress."}
                </p>
              </div>

              <div className="card-hover-glow bg-zinc-950/80 p-3.5 rounded-2xl border border-emerald-500/30">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                  <span>👷 Labour & Attendance</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {summary?.totalWorkers > 0
                    ? `${summary.totalWorkers} labour profile${summary.totalWorkers === 1 ? "" : "s"} in the records; today's turnout is ${turnoutDisplay === "—" ? "not recorded yet" : turnoutDisplay}.`
                    : "No labour profiles recorded yet. Add a worker to begin tracking attendance."}
                </p>
              </div>

              <div className="card-hover-glow bg-zinc-950/80 p-3.5 rounded-2xl border border-rose-500/30">
                <div className="flex items-center gap-1.5 text-rose-400 font-semibold mb-1">
                  <span>💰 Pending Wage Advisory</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
              {!summary
                    ? "Loading current wage totals..."
                    : summary.pendingWages > 0
                    ? `Unpaid wage liability is ${formatCurrency(summary.pendingWages)} based on recorded attendance and payments.`
                    : "No unpaid wage liability is recorded for this month."}
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/builder/ai-insights"
            className="mt-5 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-green-400 font-bold rounded-xl text-xs text-center border border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Open Full AI Insights Center
          </Link>
        </div>

      </div>

      {showAddProject && (
        <AddProjectModal
          supervisors={supervisors}
          onClose={() => setShowAddProject(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {showAddWorker && (
        <AddWorkerModal
          projects={summary?.projects || []}
          onClose={() => setShowAddWorker(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {showAddExpense && (
        <AddExpenseModal
          projects={summary?.projects || []}
          onClose={() => setShowAddExpense(false)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
};
