import React from "react";
import type { PathId, UniverseModel, ZoneId } from "@zoneflow/core";
import { Card } from "../common/Card";
import { SectionTitle } from "../common/SectionTitle";
import { DebugPanel } from "../debug/DebugPanel";
import { SelectionInspector } from "../debug/SelectionInspector";
import type { DebugState } from "../../hooks/useDebugState";
import { rightPanelStyle } from "./layout.styles";
import type { PlaygroundThemePreset } from "../../theme/playgroundThemes";

type Props = {
  debug: DebugState;
  hostWidth: number;
  hostHeight: number;
  themePreset: PlaygroundThemePreset;
  model: UniverseModel;
  selectedZoneIds: ZoneId[];
  selectedPathIds: PathId[];
};

export function RightPanel({
  debug,
  hostWidth,
  hostHeight,
  themePreset,
  model,
  selectedZoneIds,
  selectedPathIds,
}: Props) {
  const themedPanelStyle: React.CSSProperties = {
    ...rightPanelStyle,
    background: themePreset.sidebar.background,
    color: themePreset.sidebar.text,
    borderLeft: themePreset.sidebar.border,
    ["--pg-card-bg" as string]: themePreset.sidebar.cardBackground,
    ["--pg-card-border" as string]: themePreset.sidebar.cardBorder,
    ["--pg-panel-text" as string]: themePreset.sidebar.text,
    ["--pg-panel-muted" as string]: themePreset.sidebar.mutedText,
    ["--pg-section-title" as string]: themePreset.sidebar.sectionTitle,
    ["--pg-control-bg" as string]: themePreset.sidebar.controlBackground,
    ["--pg-control-border" as string]: themePreset.sidebar.controlBorder,
    ["--pg-control-text" as string]: themePreset.sidebar.controlText,
  };

  return (
    <aside style={themedPanelStyle}>
      <SectionTitle>Inspector</SectionTitle>

      <DebugPanel
        debug={debug}
        hostWidth={hostWidth}
        hostHeight={hostHeight}
      />

      <SelectionInspector
        model={model}
        zoneIds={selectedZoneIds}
        pathIds={selectedPathIds}
      />

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
