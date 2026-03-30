import React, { useEffect, useRef, useState } from "react";
import {
  createZone,
  createZoneId,
  createZoneLayout,
  findPathSourceZoneId,
  setZoneLayout,
  type PathId,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import {
  resolveZonePlacementAtWorldRect,
} from "@zoneflow/editor-dom";
import {
  UniverseCanvas,
  type CanvasExternalDropPayload,
  type PathLabelEventPayload,
  type ZoneMoveEditorConfig,
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
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  isEditMode: boolean;
  gridSnapEnabled: boolean;
  gridSnapSize: 8 | 12 | 16 | 24;
  onDraftModelChange: (nextModel: UniverseModel) => void;
  onDraftLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  debug: DebugState;
  onResize: (size: { width: number; height: number }) => void;
};

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function snapCoordinate(
  value: number,
  enabled: boolean,
  size: 8 | 12 | 16 | 24
): number {
  if (!enabled) return roundCoordinate(value);
  return roundCoordinate(Math.round(value / size) * size);
}

export function CanvasHost({
  model,
  layoutModel,
  isEditMode,
  gridSnapEnabled,
  gridSnapSize,
  onDraftModelChange,
  onDraftLayoutModelChange,
  debug,
  onResize,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [editingPath, setEditingPath] = useState<{
    pathId: PathId;
    sourceZoneId: ZoneId;
  } | null>(null);
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
    setEditingPath(null);
    setEditingZoneId(null);
  }, [isEditMode]);

  useEffect(() => {
    if (!editingZoneId) return;
    if (model.zonesById[editingZoneId]) return;
    setEditingZoneId(null);
  }, [editingZoneId, model]);

  useEffect(() => {
    if (!editingPath) return;
    const sourceZoneId = findPathSourceZoneId(model, editingPath.pathId);
    if (sourceZoneId && sourceZoneId === editingPath.sourceZoneId) return;
    setEditingPath(null);
  }, [editingPath, model]);

  const handlePaletteZoneDrop = (event: CanvasExternalDropPayload) => {
    const template = readPaletteZoneDragData(event.dataTransfer);
    if (!template) return;

    const worldRect = {
      x: snapCoordinate(
        event.worldPoint.x - template.width / 2,
        gridSnapEnabled,
        gridSnapSize
      ),
      y: snapCoordinate(
        event.worldPoint.y - template.height / 2,
        gridSnapEnabled,
        gridSnapSize
      ),
      width: template.width,
      height: template.height,
    };
    const placement = resolveZonePlacementAtWorldRect({
      model,
      layoutModel,
      worldRect,
    });
    const zoneId = createZoneId();
    const nextModel = createZone(model, {
      id: zoneId,
      name: template.label,
      parentZoneId: placement.parentZoneId,
      zoneType: template.zoneType,
      action: template.action,
      inputDisabled: template.inputDisabled,
      outputDisabled: template.outputDisabled,
      meta: template.meta,
    });
    const nextLayoutModel = setZoneLayout(
      layoutModel,
      zoneId,
      createZoneLayout({
        x: placement.x,
        y: placement.y,
        width: template.width,
        height: template.height,
      })
    );

    onDraftModelChange(nextModel);
    onDraftLayoutModelChange(nextLayoutModel);
  };

  const zoneMoveEditor: ZoneMoveEditorConfig | undefined = isEditMode
    ? {
        enabled: true,
        gridSnap: {
          enabled: gridSnapEnabled,
          size: gridSnapSize,
        },
        onModelChange: onDraftModelChange,
        onLayoutModelChange: onDraftLayoutModelChange,
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
        onZoneEditClick: (zoneId: ZoneId) => {
          setEditingZoneId(zoneId);
        },
        onPathLabelDoubleClick: ({
          pathId,
          sourceZoneId,
        }: PathLabelEventPayload) => {
          setEditingPath({ pathId, sourceZoneId });
        },
        onPathLabelContextMenu: ({
          pathId,
          sourceZoneId,
        }: PathLabelEventPayload) => {
          setEditingPath({ pathId, sourceZoneId });
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
      {editingPath ? (
        <PlaygroundPathEditor
          key={`${editingPath.sourceZoneId}:${editingPath.pathId}`}
          model={model}
          pathId={editingPath.pathId}
          sourceZoneId={editingPath.sourceZoneId}
          onModelChange={onDraftModelChange}
          onClose={() => setEditingPath(null)}
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
