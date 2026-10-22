import React from "react";

export default function Card({ children, className = "" }) {
  return <div className={`surface rounded-2xl ${className}`.trim()}>{children}</div>;
}
