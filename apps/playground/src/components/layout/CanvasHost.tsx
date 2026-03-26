import React, { useEffect, useRef, useState } from "react";
import type { PathId, ZoneId } from "@zoneflow/core";
import { UniverseCanvas, type ZoneMoveEditorConfig } from "@zoneflow/react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import type { DebugState } from "../../hooks/useDebugState";
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
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  isEditMode: boolean;
  onDraftModelChange: (nextModel: UniverseModel) => void;
  onDraftLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  debug: DebugState;
  onResize: (size: { width: number; height: number }) => void;
};

export function CanvasHost({
                             model,
                             layoutModel,
                             isEditMode,
                             onDraftModelChange,
                             onDraftLayoutModelChange,
                             debug,
                             onResize,
                           }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [editingPathId, setEditingPathId] = useState<PathId | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<ZoneId | null>(null);

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

  useEffect(() => {
    if (isEditMode) return;
    setEditingPathId(null);
    setEditingZoneId(null);
  }, [isEditMode]);

  const zoneMoveEditor: ZoneMoveEditorConfig | undefined = isEditMode
    ? {
      enabled: true,
      onModelChange: onDraftModelChange,
      onLayoutModelChange: onDraftLayoutModelChange,
        renderZoneEditButton: (props) => (
          <PlaygroundZoneEditButton {...props} />
        ),
        onZoneEditClick: (zoneId: ZoneId) => {
          setEditingZoneId(zoneId);
        },
        onPathLabelClick: ({ pathId }: { pathId: PathId }) => {
          setEditingPathId(pathId);
        },
        onPathLabelDoubleClick: ({ pathId }: { pathId: PathId }) => {
          setEditingPathId(pathId);
        },
        onPathLabelContextMenu: ({ pathId }: { pathId: PathId }) => {
          setEditingPathId(pathId);
        },
      }
    : undefined;

  return (
    <main ref={ref} style={canvasHostStyle}>
      <UniverseCanvas
        model={model}
        layoutModel={layoutModel}
        viewport={debug.viewport}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        zoneMoveEditor={zoneMoveEditor}
        debug={{
          enabled: debug.enabled,
          layers: debug.layers,
        }}
      />
      {editingPathId ? (
        <PlaygroundPathEditor
          key={editingPathId}
          model={model}
          pathId={editingPathId}
          onModelChange={onDraftModelChange}
          onClose={() => setEditingPathId(null)}
        />
      ) : null}
      {editingZoneId ? (
        <PlaygroundZoneEditor
          key={editingZoneId}
          model={model}
          zoneId={editingZoneId}
          onModelChange={onDraftModelChange}
          onClose={() => setEditingZoneId(null)}
        />
      ) : null}
    </main>
  );
}
