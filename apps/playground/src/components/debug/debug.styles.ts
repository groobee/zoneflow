import React from "react";

export const checkboxLabelStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--pg-panel-text, #cbd5e1)",
    cursor: "pointer",
};

export const buttonStyle: React.CSSProperties = {
    background: "var(--pg-control-bg, #1e293b)",
    color: "var(--pg-control-text, #e2e8f0)",
    border: "var(--pg-control-border, 1px solid rgba(148, 163, 184, 0.2))",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
};

export const gridStyle: React.CSSProperties = {
    display: "grid",
    gap: 8,
};

export const inputStyle: React.CSSProperties = {
    background: "var(--pg-control-bg, #111827)",
    color: "var(--pg-control-text, #e5e7eb)",
    border: "var(--pg-control-border, 1px solid rgba(148, 163, 184, 0.25))",
    borderRadius: 8,
    padding: "6px 8px",
    width: 88,
    boxSizing: "border-box",
};

export const selectStyle: React.CSSProperties = {
    background: "var(--pg-control-bg, #111827)",
    color: "var(--pg-control-text, #e5e7eb)",
    border: "var(--pg-control-border, 1px solid rgba(148, 163, 184, 0.25))",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
    boxSizing: "border-box",
};

export const sectionHeaderStyle: React.CSSProperties = {
    fontWeight: 700,
    marginBottom: 10,
};

export const subsectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--pg-panel-muted, #94a3b8)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
};

export const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
};

export const columnStyle: React.CSSProperties = {
    display: "grid",
    gap: 8,
};

export const anchorGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 36px)",
    gap: 6,
};

export const anchorButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    background: "var(--pg-control-bg, #1e293b)",
    color: "var(--pg-control-text, #e2e8f0)",
    border: "var(--pg-control-border, 1px solid rgba(148, 163, 184, 0.25))",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    lineHeight: "16px",
    padding: 0,
};
