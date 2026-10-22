import React from "react";

export default function LoadingState({ label = "Loading...", className = "" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center py-24 ${className}`.trim()}
    >
      <div className="flex flex-col items-center gap-4 text-slate-300">
        <span className="relative block h-9 w-9" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-white/10" />
          <span className="absolute inset-0 rounded-full border border-transparent border-t-emerald-400 animate-spin" />
        </span>
        <p className="text-sm font-medium text-slate-400">{label}</p>
      </div>
    </div>
  );
}
