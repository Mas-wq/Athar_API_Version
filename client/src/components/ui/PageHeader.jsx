import React from "react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  className = "",
}) {
  return (
    <div className={`mb-10 ${className}`.trim()}>
      {eyebrow ? (
        <div className="inline-flex items-center gap-2 mb-4 text-sm font-medium text-emerald-300">
          {Icon ? <Icon size={16} aria-hidden="true" /> : null}
          <span>{eyebrow}</span>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          {title ? (
            <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="text-slate-400 mt-3 max-w-2xl leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
