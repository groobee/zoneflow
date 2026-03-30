import React, { useEffect, useRef } from "react";
import {
  createZoneFromDropTemplate,
  UniverseEditorCanvas,
  type CanvasExternalDropPayload,
  type UniverseEditorController,
} from "@zoneflow/react";
import type { DebugState } from "../../hooks/useDebugState";
import { readPaletteZoneDragData } from "../../palette/zonePalette";
import { canvasHostStyle } from "./layout.styles";
import {
  pathComponents,
  zoneComponents,
} from "../renderers/defaultComponents";
import {
  PlaygroundZoneEditButton,
  PlaygroundZoneEditor,
} from "../editor/PlaygroundZoneEditor";
import { PlaygroundPathEditor } from "../editor/PlaygroundPathEditor";

type Props = {
  editor: UniverseEditorController;
  debug: DebugState;
  onResize: (size: { width: number; height: number }) => void;
};

export function CanvasHost({
  editor,
  debug,
  onResize,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;

      onResize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [onResize]);

  const handlePaletteZoneDrop = (event: CanvasExternalDropPayload) => {
    const template = readPaletteZoneDragData(event.dataTransfer);
    if (!template) return;

    const next = createZoneFromDropTemplate({
      model: editor.model,
      layoutModel: editor.layoutModel,
      worldPoint: event.worldPoint,
      gridSnapEnabled: editor.gridSnapEnabled,
      gridSnapSize: editor.gridSnapSize,
      template: {
        name: template.label,
        zoneType: template.zoneType,
        width: template.width,
        height: template.height,
        action: template.action,
        inputDisabled: template.inputDisabled,
        outputDisabled: template.outputDisabled,
        meta: template.meta,
      },
    });

    editor.updateDraftModel(next.model);
    editor.updateDraftLayoutModel(next.layoutModel);
  };

  return (
    <main ref={ref} style={canvasHostStyle}>
      <UniverseEditorCanvas
        editor={editor}
        viewport={debug.viewport}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        editorConfig={{
          externalDrop: {
            enabled: true,
            onDrop: handlePaletteZoneDrop,
          },
          deleteInteraction: {
            animation: true,
            confirm: true,
          },
          renderZoneEditButton: (props) => (
            <PlaygroundZoneEditButton {...props} />
          ),
          renderZoneEditor: (props) =>
            props.onModelChange ? (
              <PlaygroundZoneEditor
                model={props.model}
                zoneId={props.zoneId}
                onModelChange={props.onModelChange}
                onClose={props.closeEditor}
              />
            ) : null,
          renderPathEditor: (props) =>
            props.onModelChange ? (
              <PlaygroundPathEditor
                model={props.model}
                pathId={props.pathId}
                sourceZoneId={props.sourceZoneId}
                onModelChange={props.onModelChange}
                onClose={props.closeEditor}
              />
            ) : null,
        }}
        debug={{
          enabled: debug.enabled,
          layers: debug.layers,
        }}
      />
    </main>
  );
}
