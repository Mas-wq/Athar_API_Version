import React from "react";

/*
  Every variant leaves room (pt-24) for the floating navbar.
  The dotted backdrop is rendered once in App.jsx, so the shell itself is transparent.
*/
const shellVariants = {
  default: {
    outer: "min-h-screen",
    padding: "pt-24 pb-16 px-4 sm:px-6 lg:px-8",
    container: "max-w-6xl mx-auto",
  },
  wide: {
    outer: "min-h-screen",
    padding: "pt-24 pb-16 px-4 sm:px-6 lg:px-8",
    container: "max-w-[90rem] mx-auto",
  },
  narrow: {
    outer: "min-h-screen",
    padding: "pt-24 pb-16 px-4 sm:px-6 lg:px-8",
    container: "max-w-3xl mx-auto",
  },
  centered: {
    outer: "min-h-screen flex items-center justify-center",
    padding: "p-6",
    container: "w-full max-w-md",
  },
};

export default function PageShell({
  children,
  variant = "default",
  className = "",
  containerClassName = "",
  withGlow = false,
}) {
  const v = shellVariants[variant] || shellVariants.default;

  return (
    <div className={`relative ${v.outer} ${className}`.trim()}>
      {withGlow && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-400/[0.07] hidden rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-teal-500/[0.07] hidden rounded-full" />
        </div>
      )}

      <div className={`relative z-10 ${v.padding}`.trim()}>
        <div className={`${v.container} ${containerClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}
