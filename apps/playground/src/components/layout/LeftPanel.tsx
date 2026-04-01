import React from "react";
import { Card } from "../common/Card";
import { SectionTitle } from "../common/SectionTitle";
import { leftPanelStyle } from "./layout.styles";
import {
  paletteZoneTemplates,
  writePaletteZoneDragData,
} from "../../palette/zonePalette";
import type { PlaygroundThemePreset } from "../../theme/playgroundThemes";

export function LeftPanel(props: {
  isEditMode: boolean;
  themePreset: PlaygroundThemePreset;
}) {
  const { isEditMode, themePreset } = props;
  const themedPanelStyle: React.CSSProperties = {
    ...leftPanelStyle,
    background: themePreset.sidebar.background,
    color: themePreset.sidebar.text,
    borderRight: themePreset.sidebar.border,
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
      <SectionTitle>Palette</SectionTitle>
      <div
        style={{
          fontSize: 12,
          color: themePreset.sidebar.mutedText,
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        {isEditMode
          ? "Drag a zone template into the canvas to create a new zone."
          : "Enter edit mode to drag palette items into the canvas."}
      </div>
      {paletteZoneTemplates.map((template) => (
        <Card
          key={template.id}
          draggable={isEditMode}
          onDragStart={(event) => {
            if (!isEditMode) return;
            writePaletteZoneDragData(event.dataTransfer, template);
          }}
          style={{
            cursor: isEditMode ? "grab" : "not-allowed",
            opacity: isEditMode ? 1 : 0.56,
            userSelect: "none",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: themePreset.sidebar.text,
              marginBottom: 4,
            }}
          >
            {template.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: themePreset.sidebar.mutedText,
            }}
          >
            {template.description}
          </div>
        </Card>
      ))}
    </aside>
  );
}
