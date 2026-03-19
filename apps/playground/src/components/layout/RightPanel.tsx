import React from "react";
import { Card } from "../common/Card";
import { SectionTitle } from "../common/SectionTitle";
import { DebugPanel } from "../debug/DebugPanel";
import type { DebugLayer } from "../../hooks/useDebugState";
import { rightPanelStyle } from "./layout.styles";

type Props = {
  debug: {
    enabled: boolean;
    setEnabled: (v: boolean) => void;
    layers: DebugLayer[];
    toggleLayer: (l: DebugLayer) => void;
    enableAll: () => void;
    clearAll: () => void;
  };
};

export function RightPanel({ debug }: Props) {
  return (
    <aside style={rightPanelStyle}>
      <SectionTitle>Inspector</SectionTitle>

      <DebugPanel {...debug} />

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Selection</div>
        <div style={{ fontSize: 14, color: "#94a3b8" }}>
          Nothing selected
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Viewport Notes</div>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Canvas should stay clipped inside the center panel.</li>
          <li>Zoom and pan should not push outside this region.</li>
          <li>Toolbar and side panels should remain fixed.</li>
        </ul>
      </Card>
    </aside>
  );
}