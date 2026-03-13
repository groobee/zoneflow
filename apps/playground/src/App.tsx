import { UniverseCanvas } from "@zoneflow/react-renderer";
import { sampleLargeUniverse, sampleLargeUniverseLayout } from "./mock/sampleLargeUniverse";
import {sampleUniverse, sampleUniverseLayout} from "./mock/sampleUniverse";

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

export default function App() {
  return (
    <div style={shellStyle}>
      <div style={topbarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>Zoneflow Playground</strong>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>
            viewport / zoom / pan test shell
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "#cbd5e1" }}>
          <span>Ctrl/Cmd + Wheel: Zoom</span>
          <span>•</span>
          <span>Alt + Drag: Pan</span>
          <span>•</span>
          <span>Middle Drag: Pan</span>
        </div>
      </div>

      <aside style={leftPanelStyle}>
        <div style={sectionTitleStyle}>Palette</div>
        <div style={cardStyle}>Send Push</div>
        <div style={cardStyle}>Wait Timer</div>
        <div style={cardStyle}>Condition Branch</div>
        <div style={cardStyle}>Coupon Action</div>
        <div style={cardStyle}>Container Zone</div>
      </aside>

      <main style={canvasHostStyle}>
        <UniverseCanvas
          model={sampleUniverse}
          layoutModel={sampleUniverseLayout}
          textScale={"md"}
        />
      </main>

      <aside style={rightPanelStyle}>
        <div style={sectionTitleStyle}>Inspector</div>
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Selection</div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>Nothing selected</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Viewport Notes</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Canvas should stay clipped inside the center panel.</li>
            <li>Zoom and pan should not push outside this region.</li>
            <li>Toolbar and side panels should remain fixed.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
