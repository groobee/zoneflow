import React from "react";
import { Card } from "../common/Card";
import { SectionTitle } from "../common/SectionTitle";
import { leftPanelStyle } from "./layout.styles";
import {
  paletteZoneTemplates,
  writePaletteZoneDragData,
} from "../../palette/zonePalette";

export function LeftPanel(props: { isEditMode: boolean }) {
  const { isEditMode } = props;

  return (
    <aside style={leftPanelStyle}>
      <SectionTitle>Palette</SectionTitle>
      <div
        style={{
          fontSize: 12,
          color: "#94a3b8",
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
              color: "#e2e8f0",
              marginBottom: 4,
            }}
          >
            {template.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            {template.description}
          </div>
        </Card>
      ))}
    </aside>
  );
}
