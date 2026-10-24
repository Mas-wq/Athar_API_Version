import React from "react";

const logoPath = (theme, variant) =>
  `/branding/logos/athar-${variant}-${theme}.svg`;

function ThemeLogo({ variant, height, className = "", label }) {
  return (
    <span
      className={`athar-themed-logo ${className}`}
      style={{
        height,
        width: variant === "mark" ? height : height * (460 / 170),
      }}
      role="img"
      aria-label={label}
    >
      <img
        src={logoPath("dark", variant)}
        alt=""
        aria-hidden="true"
        className="athar-themed-logo__image athar-themed-logo__image--dark"
      />
      <img
        src={logoPath("light", variant)}
        alt=""
        aria-hidden="true"
        className="athar-themed-logo__image athar-themed-logo__image--light"
      />
    </span>
  );
}

export function AtharMark({ size = 36, className = "", title = "Athar" }) {
  return <ThemeLogo variant="mark" height={size} className={className} label={title} />;
}

export default function AtharLogo({ variant = "full", height = 36, className = "" }) {
  const assetVariant = variant === "mark" ? "mark" : "logo";
  return (
    <ThemeLogo
      variant={assetVariant}
      height={height}
      className={className}
      label="Athar | أثر"
    />
  );
}
