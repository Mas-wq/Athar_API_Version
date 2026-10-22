import React from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`surface rounded-2xl text-center p-10 sm:p-14 ${className}`.trim()}
    >
      {Icon ? (
        <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto mb-5">
          <Icon size={26} className="text-emerald-300" />
        </div>
      ) : null}
      {title ? (
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      ) : null}
      {description ? (
        <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
