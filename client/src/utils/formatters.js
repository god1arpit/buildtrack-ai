export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
  return "₹" + Number(amount).toLocaleString("en-IN");
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const getSkillColor = (skill) => {
  const map = {
    Mason: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    Carpenter: "bg-green-900/40 text-green-400 border-green-700/30",
    Painter: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    Plumber: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    Electrician: "bg-green-900/40 text-green-400 border-green-700/30",
    "Bar Bender": "bg-orange-500/15 text-orange-400 border-orange-500/30",
    "Tiles Mason": "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    Helper: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Welder: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    Supervisor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  };
  return map[skill] || "bg-zinc-800 text-zinc-300 border-zinc-700";
};

export const getStatusBadge = (status) => {
  switch (status) {
    case "present":
      return { label: "Present", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    case "absent":
      return { label: "Absent", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
    case "half-day":
      return { label: "Half Day", color: "bg-green-900/40 text-green-400 border-green-700/30" };
    case "leave":
      return { label: "Leave", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    default:
      return { label: status || "-", color: "bg-zinc-800 text-zinc-300 border-zinc-700" };
  }
};
