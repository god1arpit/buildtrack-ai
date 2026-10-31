import React from "react";

export const ProgressBar = ({ progress = 0, size = "md", showLabel = true, label = "" }) => {
  const percentage = Math.min(100, Math.max(0, Number(progress) || 0));

  const heightMap = {
    sm: "h-2",
    md: "h-3.5",
    lg: "h-5",
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
          <span className="text-zinc-300">{label || "Overall Progress"}</span>
          <span className="text-green-400 font-mono">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50 p-0.5 ${heightMap[size]}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-800 via-green-700 to-green-300 transition-all duration-500 ease-out shadow-sm shadow-green-900/50"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
