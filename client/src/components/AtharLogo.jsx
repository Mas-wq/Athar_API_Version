import React from "react";
import fullLogo from "../assets/athar-logo.png";

/**
 * Athar logo.
 *  - "mark"     : the refined SVG symbol only (favicon, avatars, tight spaces)
 *  - "full"     : SVG symbol + the original bilingual wordmark (navbar, footer, auth)
 *  - "original" : the untouched supplied PNG, kept as a fallback
 *
 * The symbol is inline SVG so it stays sharp at any size and can use a unique
 * gradient id per instance (several logos can be on one page).
 */
let uid = 0;

export function AtharMark({ size = 36, className = "", title = "Athar" }) {
  const [id] = React.useState(() => `athar-g-${++uid}`);
  return (
    <svg
      viewBox="0 0 112 112"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="10" y1="6" x2="100" y2="108">
          <stop offset="0" stopColor="#1fe0b0" />
          <stop offset="0.55" stopColor="#20b4ee" />
          <stop offset="1" stopColor="#2f6df0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 90C32 74 15 62 15 44a35 35 0 0 1 56-28" strokeWidth="10" />
        <path d="M60 10a35 35 0 0 1 25 34c0 18-17 30-35 46" strokeWidth="10" />
        <path d="M66 3a47 47 0 0 1 34 41" strokeWidth="7" />
      </g>
      <circle cx="50" cy="44" r="10" fill={`url(#${id})`} />
      <path fill={`url(#${id})`} d="M12 106l19-32 12 9-13 23z" />
      <path fill={`url(#${id})`} d="M88 106L69 74l-12 9 13 23z" />
    </svg>
  );
}

export default function AtharLogo({ variant = "full", height = 36, className = "" }) {
  if (variant === "original") {
    return <img src={fullLogo} alt="Athar | أثر" style={{ height }} className={`w-auto ${className}`} />;
  }
  if (variant === "mark") {
    return <AtharMark size={height} className={className} />;
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Athar | أثر" role="img">
      <AtharMark size={height} />
      <span className="inline-flex items-center gap-1.5 leading-none">
        <span className="text-[15px] font-bold tracking-[-0.04em] text-slate-100">Athar</span>
        <span aria-hidden="true" className="h-4 border-s border-slate-500/60" />
        <span lang="ar" className="text-[15px] font-bold text-emerald-300">أثر</span>
      </span>
    </span>
  );
}
