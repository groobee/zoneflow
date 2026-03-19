import React from "react";
import { Card } from "../common/Card";
import { SectionTitle } from "../common/SectionTitle";
import { DebugPanel } from "../debug/DebugPanel";
import type { DebugState } from "../../hooks/useDebugState";
import { rightPanelStyle } from "./layout.styles";

type Props = {
  debug: DebugState;
};

export function RightPanel({ debug }: Props) {
  return (
    <aside style={rightPanelStyle}>
      <SectionTitle>Inspector</SectionTitle>

      <DebugPanel debug={debug} />

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
          <li>Viewport override is for debug rendering only.</li>
        </ul>
      </Card>
    </aside>
  );
}