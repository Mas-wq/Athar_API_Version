import { useEffect, useState } from "react";

export default function BrandSplash({ onComplete }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";

  useEffect(() => {
    const prefersReducedMotion = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );
    const leaveTimer = window.setTimeout(() => setIsLeaving(true), prefersReducedMotion ? 700 : 2900);
    return () => window.clearTimeout(leaveTimer);
  }, []);

  return (
    <div
      className={`athar-intro-screen${isLeaving ? " athar-intro-screen--leaving" : ""}`}
      onAnimationEnd={(event) => {
        if (isLeaving && event.target === event.currentTarget) onComplete();
      }}
    >
      <iframe
        title="Athar introduction"
        src={`/branding/splash/athar-splash-${theme}.html`}
        className="athar-intro-frame"
        sandbox="allow-scripts"
      />
    </div>
  );
}
