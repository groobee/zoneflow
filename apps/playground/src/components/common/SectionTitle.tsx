import React from "react";

const style: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "var(--pg-section-title, #94a3b8)",
  marginBottom: 10,
};

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={style}>{children}</div>;
}
