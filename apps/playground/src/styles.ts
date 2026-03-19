
const shellStyle: React.CSSProperties = {
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

const topbarStyle: React.CSSProperties = {
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

const panelBaseStyle: React.CSSProperties = {
    background: "#0b1220",
    color: "#cbd5e1",
    fontFamily: "sans-serif",
    padding: 12,
    boxSizing: "border-box",
    overflow: "auto",
};

const leftPanelStyle: React.CSSProperties = {
...panelBaseStyle,
gridArea: "left",
borderRight: "1px solid rgba(148, 163, 184, 0.2)",
};

const rightPanelStyle: React.CSSProperties = {
...panelBaseStyle,
gridArea: "right",
borderLeft: "1px solid rgba(148, 163, 184, 0.2)",
};

const canvasHostStyle: React.CSSProperties = {
    gridArea: "canvas",
    minWidth: 0,
    minHeight: 0,
    position: "relative",
    overflow: "hidden",
    background: "#020617",
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: 10,
};

const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    background: "rgba(15, 23, 42, 0.72)",
};

const controlGroupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
};

const checkboxLabelStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#cbd5e1",
    cursor: "pointer",
};

const selectStyle: React.CSSProperties = {
    background: "#111827",
    color: "#e5e7eb",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: 8,
    padding: "6px 10px",
};