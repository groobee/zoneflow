import React from "react";

export const shellStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "grid",
  gridTemplateRows: "56px 1fr",
  gridTemplateColumns: "240px minmax(0, 1fr) 280px",
  gridTemplateAreas: `
    "topbar topbar topbar"
    "left canvas right"
  `,
  background: "#020617",
};

export const topbarStyle: React.CSSProperties = {
  gridArea: "topbar",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
  background: "#0f172a",
  color: "#e2e8f0",
  fontFamily: "sans-serif",
};

export const controlGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

export const selectStyle: React.CSSProperties = {
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 8,
  padding: "6px 10px",
};

export const buttonStyle: React.CSSProperties = {
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

export const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#2563eb",
  borderColor: "#2563eb",
  color: "#eff6ff",
};

export const panelBaseStyle: React.CSSProperties = {
  background: "#0b1220",
  color: "#cbd5e1",
  fontFamily: "sans-serif",
  padding: 12,
  boxSizing: "border-box",
  overflow: "auto",
};

export const leftPanelStyle: React.CSSProperties = {
  ...panelBaseStyle,
  gridArea: "left",
  borderRight: "1px solid rgba(148, 163, 184, 0.2)",
};

export const rightPanelStyle: React.CSSProperties = {
  ...panelBaseStyle,
  gridArea: "right",
  borderLeft: "1px solid rgba(148, 163, 184, 0.2)",
};

export const canvasHostStyle: React.CSSProperties = {
  gridArea: "canvas",
  minWidth: 0,
  minHeight: 0,
  position: "relative",
  overflow: "hidden",
  background: "#020617",
};
