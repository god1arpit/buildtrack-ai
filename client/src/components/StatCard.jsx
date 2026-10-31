import React from "react";

export const StatCard = ({ title, value, icon: Icon, subtext, trend, color = "amber" }) => {
  const colorMap = {
    amber: "text-emerald-400",
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
    rose: "text-rose-400",
  };

  return (
    <div className="card-glow p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{title}</p>
          <h3 className="text-3xl font-black text-white mt-1 tracking-tight tabular-nums">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {(subtext || trend) && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs">
          {subtext && <span className="text-zinc-500 font-medium">{subtext}</span>}
          {trend && (
            <span className="text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded-md text-[10px]">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
