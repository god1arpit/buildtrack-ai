import React from "react";

export const WorkerAvatar = ({ worker, className = "" }) => {
  if (worker?.photo) {
    return <img src={worker.photo} alt={worker.name || "Labour profile"} className={`${className} object-cover`} />;
  }

  const initials = String(worker?.name || "Labour")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`${className} flex items-center justify-center bg-zinc-800 text-green-300 font-bold`} aria-label="No profile photo uploaded">
      {initials || "L"}
    </div>
  );
};
