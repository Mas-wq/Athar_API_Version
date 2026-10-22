import React from "react";

/*
  Button
  primary   - bright brand fill, dark text (highest contrast, one per view)
  secondary - translucent surface with hairline border
  danger    - destructive actions
  ghost     - text-only
  Same props as before: variant, className, type, disabled, ...rest
*/
const variants = {
  primary:
    "bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-[0_8px_24px_-10px_rgb(63_214_189/0.65)]",
  secondary:
    "bg-white/[0.05] hover:bg-white/[0.09] text-slate-100 border border-white/10 hover:border-white/20",
  danger:
    "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_8px_24px_-10px_rgb(236_92_112/0.6)]",
  ghost: "bg-transparent hover:bg-white/[0.06] text-slate-200",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer";
  const v = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${v} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
