import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  findPathSourceZoneId,
  pruneLayoutModel,
  removePath,
  removeZone,
} from "@zoneflow/core";
import type {
  Path,
  PathId,
  Point,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneId,
} from "@zoneflow/core";
import {
  alignPathsByMode,
  alignZonesByMode,
  createPathFromOutputAnchorDrag,
  commitZoneGroupReparentAtCurrentPosition,
  commitZoneReparentAtCurrentPosition,
  distributePathsByMode,
  distributeZonesByMode,
  getMoveEditorTargets,
  moveEditorTargetByScreenDelta,
  resizeZoneByScreenDelta,
  resolveInputAnchorTargetZoneId,
  resolveGroupPathDragOrigin,
  resolveZoneReparentCandidate,
  resolveZoneAnchorScreenRect,
  resolveMoveEditorDragOrigin,
  resolveZoneResizeOrigin,
  screenPointToWorldPoint,
  type MoveEditorDragOrigin,
  type MoveEditorTarget,
  type ZoneResizeOrigin,
} from "@zoneflow/editor-dom";
import {
  resolvePathOutputAnchorScreenRect,
  retargetPathFromOutputAnchorDrag,
} from "../../../editor-dom/src/pathCreateEditor";
import {
  resolveGroupZoneDragOrigin,
  resolvePathResizeOrigin,
  resizePathNodeByScreenDelta,
  type PathResizeOrigin,
} from "../../../editor-dom/src/zoneMoveEditor";
import type {
  CameraState,
  PathComponentMount,
  PathComponentRendererContext,
  PathComponentSlotName,
  RendererExclusionState,
  RendererFrame,
  Rect,
  ZoneflowTheme,
  ZoneComponentMount,
  ZoneComponentRendererContext,
  ZoneComponentSlotName,
} from "@zoneflow/renderer-dom";
import type {
  PathSlotComponentMap,
  ZoneSlotComponentMap,
} from "../slots/slotComponents";

export type ZoneEditorButtonRenderProps = {
  zoneId: ZoneId;
  zone: Zone;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  rect: Rect;
  isSelected: boolean;
  isEditing: boolean;
  openEditor: () => void;
  closeEditor: () => void;
};

export type ZoneEditorRenderProps = {
  zoneId: ZoneId;
  zone: Zone;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  onModelChange?: (nextModel: UniverseModel) => void;
  onLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  closeEditor: () => void;
};

export type PathEditorRenderProps = {
  pathId: PathId;
  path: Path;
  sourceZoneId: ZoneId;
  sourceZone: Zone;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  onModelChange?: (nextModel: UniverseModel) => void;
  onLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  closeEditor: () => void;
};

export type PathLabelEventPayload = {
  pathId: PathId;
  sourceZoneId: ZoneId;
  path: Path;
  sourceZone: Zone;
  clientX: number;
  clientY: number;
};

export type CanvasExternalDropPayload = {
  dataTransfer: DataTransfer | null;
  clientX: number;
  clientY: number;
  screenPoint: Point;
  worldPoint: Point;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  frame: RendererFrame | null;
};

export type EditorTransactionMeta =
  | {
      kind: "move-zone";
      zoneIds: ZoneId[];
    }
  | {
      kind: "move-zone-group";
      zoneIds: ZoneId[];
    }
  | {
      kind: "move-path";
      pathIds: PathId[];
    }
  | {
      kind: "move-path-group";
      pathIds: PathId[];
    }
  | {
      kind: "resize-zone";
      zoneIds: ZoneId[];
    }
  | {
      kind: "resize-path";
      pathIds: PathId[];
    }
  | {
      kind: "create-path";
      sourceZoneId: ZoneId;
    }
  | {
      kind: "retarget-path";
      pathIds: PathId[];
      sourceZoneId: ZoneId;
    };

export type ZoneMoveEditorConfig = {
  enabled?: boolean;
  includeRoot?: boolean;
  gridSnap?: {
    enabled?: boolean;
    size?: number;
  };
  onModelChange?: (nextModel: UniverseModel) => void;
  onLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  renderZoneEditButton?: (props: ZoneEditorButtonRenderProps) => ReactNode;
  renderZoneEditor?: (props: ZoneEditorRenderProps) => ReactNode;
  renderPathEditor?: (props: PathEditorRenderProps) => ReactNode;
  onZoneEditClick?: (zoneId: ZoneId) => void;
  onPathLabelClick?: (event: PathLabelEventPayload) => void;
  onPathLabelDoubleClick?: (event: PathLabelEventPayload) => void;
  onPathLabelContextMenu?: (event: PathLabelEventPayload) => void;
  onTransactionStart?: (transaction: EditorTransactionMeta) => void;
  onTransactionCommit?: (transaction: EditorTransactionMeta) => void;
  onTransactionCancel?: (transaction: EditorTransactionMeta) => void;
  history?: {
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
  };
  overlayControls?: {
    enabled?: boolean;
    showHistory?: boolean;
    showDelete?: boolean;
    showGridToggle?: boolean;
    showSnapToggle?: boolean;
    showZoomControls?: boolean;
    showZoomValue?: boolean;
    gridVisible?: boolean;
    onToggleGridVisible?: () => void;
    snapEnabled?: boolean;
    onToggleSnap?: () => void;
    zoom?: number;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
  };
  externalDrop?: {
    enabled?: boolean;
    onDrop: (event: CanvasExternalDropPayload) => void;
  };
  deleteInteraction?: {
    animation?: boolean;
    confirm?: boolean;
    longPressMs?: number;
    undoMs?: number;
  };
};

type DragState = {
  target: MoveEditorTarget;
  origin: MoveEditorDragOrigin;
  startClientX: number;
  startClientY: number;
  hasMoved: boolean;
};

type ResizeState = {
  target: Extract<MoveEditorTarget, { kind: "zone" }>;
  origin: ZoneResizeOrigin;
  startClientX: number;
  startClientY: number;
};

type PathResizeState = {
  target: Extract<MoveEditorTarget, { kind: "path" }>;
  origin: PathResizeOrigin;
  startClientX: number;
  startClientY: number;
};

type PathCreateDragState = {
  sourceZoneId: ZoneId;
  startClientX: number;
  startClientY: number;
  currentScreenPoint: { x: number; y: number };
  hasMoved: boolean;
};

type PathRetargetDragState = {
  pathId: PathId;
  sourceZoneId: ZoneId;
  startClientX: number;
  startClientY: number;
  currentScreenPoint: { x: number; y: number };
  hasMoved: boolean;
};

type CornerHandleRect = {
  size: number;
  x: number;
  y: number;
};

type LongPressState = {
  target: MoveEditorTarget;
  startClientX: number;
  startClientY: number;
};

type DeleteConfirmState = {
  kind: "target";
  target: MoveEditorTarget;
} | {
  kind: "zone-selection";
  zoneIds: ZoneId[];
} | {
  kind: "path-selection";
  pathIds: PathId[];
};

type DeleteUndoState = {
  targetKey: string;
  label: string;
};

type MarqueeSelectionState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  appendToSelection: boolean;
};

type PreviewHostProps = {
  frame: RendererFrame;
  camera: CameraState;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  target: MoveEditorTarget;
  zoneComponents?: ZoneSlotComponentMap;
  pathComponents?: PathSlotComponentMap;
};

type TargetVisualState = "idle" | "hover" | "selected" | "dragging";

const previewHostStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  background: "rgba(255, 255, 255, 0.74)",
  boxSizing: "border-box",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.22)",
  opacity: 1,
};

const previewTheme: ZoneflowTheme = {
  background: "#020617",
  zoneTitle: "#0f172a",
  zoneSubtext: "#64748b",
  zoneContainerBorder: "#cbd5e1",
  zoneActionBorder: "#93c5fd",
  zoneBadgeBg: "#eff6ff",
  pathLabel: "#111827",
  pathEdge: "#334155",
  selection: "#2563eb",
  density: {
    zone: {
      detail: 1.2,
      near: 0.85,
      mid: 0.55,
    },
    path: {
      full: 1,
      chip: 0.7,
    },
  },
};

const DRAG_START_DISTANCE = 4;
const DELETE_LONG_PRESS_MS = 520;
const DELETE_UNDO_MS = 5000;
const DELETE_SHAKE_ANIMATION = "zoneflow-delete-shake 180ms ease-in-out infinite alternate";
const DELETE_ICON_POP_ANIMATION = "zoneflow-delete-pop 160ms ease-out";
const DELETE_TOAST_IN_ANIMATION = "zoneflow-delete-toast-in 180ms ease-out";

function createPreviewHost(): HTMLElement {
  return typeof document === "undefined"
    ? ({} as HTMLElement)
    : document.createElement("div");
}

function toScreenRect(rect: Rect, camera: CameraState): Rect {
  return {
    x: camera.x + rect.x * camera.zoom,
    y: camera.y + rect.y * camera.zoom,
    width: rect.width * camera.zoom,
    height: rect.height * camera.zoom,
  };
}

function toLocalRect(ownerRect: Rect, childRect: Rect): Rect {
  return {
    x: childRect.x - ownerRect.x,
    y: childRect.y - ownerRect.y,
    width: childRect.width,
    height: childRect.height,
  };
}

function getCornerResizeHandleRect(rect: Rect): CornerHandleRect {
  const size = Math.min(18, Math.max(14, Math.min(rect.width, rect.height) * 0.22));

  return {
    size,
    x: rect.width - size / 2,
    y: rect.height - size / 2,
  };
}

function resolveDeleteButtonPosition(target: MoveEditorTarget) {
  return target.kind === "zone"
    ? { x: target.rect.width - 24, y: -14 }
    : { x: target.rect.width - 22, y: -12 };
}

function resolveDeleteTargetLabel(target: MoveEditorTarget) {
  return target.kind === "zone" ? `존 "${target.label}"` : `패스 "${target.label}"`;
}

function resolveDeleteSelectionLabel(params: {
  kind: "zone" | "path";
  count: number;
}) {
  const { kind, count } = params;
  return kind === "zone" ? `존 ${count}개` : `패스 ${count}개`;
}

function resolveDragTransactionMeta(drag: DragState): EditorTransactionMeta {
  if (drag.origin.kind === "zone-group") {
    return {
      kind: "move-zone-group",
      zoneIds: Object.keys(drag.origin.originsByZoneId) as ZoneId[],
    };
  }

  if (drag.origin.kind === "path-group") {
    return {
      kind: "move-path-group",
      pathIds: Object.keys(drag.origin.originsByPathId) as PathId[],
    };
  }

  return drag.target.kind === "zone"
    ? {
        kind: "move-zone",
        zoneIds: [drag.target.zoneId],
      }
    : {
        kind: "move-path",
        pathIds: [drag.target.pathId],
      };
}

function collectTopLevelSelectedZoneIds(
  model: UniverseModel,
  zoneIds: ZoneId[]
): ZoneId[] {
  const selectedSet = new Set(zoneIds);

  return zoneIds.filter((zoneId) => {
    let currentParentId = model.zonesById[zoneId]?.parentZoneId ?? null;

    while (currentParentId) {
      if (selectedSet.has(currentParentId)) {
        return false;
      }

      currentParentId = model.zonesById[currentParentId]?.parentZoneId ?? null;
    }

    return true;
  });
}

function resolvePathLabelEventPayload(params: {
  model: UniverseModel;
  pathId: PathId;
  clientX: number;
  clientY: number;
}): PathLabelEventPayload | null {
  const { model, pathId, clientX, clientY } = params;
  const sourceZoneId = findPathSourceZoneId(model, pathId);
  if (!sourceZoneId) return null;

  const sourceZone = model.zonesById[sourceZoneId];
  const path = sourceZone?.pathsById[pathId];
  if (!sourceZone || !path) return null;

  return {
    pathId,
    sourceZoneId,
    path,
    sourceZone,
    clientX,
    clientY,
  };
}

function toCanvasScreenPoint(
  host: HTMLDivElement | null,
  clientX: number,
  clientY: number
) {
  const bounds = host?.getBoundingClientRect();
  return {
    x: clientX - (bounds?.left ?? 0),
    y: clientY - (bounds?.top ?? 0),
  };
}

function getScreenDistance(params: {
  startClientX: number;
  startClientY: number;
  nextClientX: number;
  nextClientY: number;
}) {
  const { startClientX, startClientY, nextClientX, nextClientY } = params;
  return Math.hypot(nextClientX - startClientX, nextClientY - startClientY);
}

function getExclusionState(target: MoveEditorTarget): RendererExclusionState {
  if (target.kind === "zone") {
    return {
      excludedZoneIds: [target.zoneId],
    };
  }

  return {
    excludedPathIds: [target.pathId],
  };
}

function getTargetBadgeLabel(target: MoveEditorTarget): string {
  return target.kind === "zone" ? "ZONE" : "PATH";
}

function getTargetVisualState(params: {
  target: MoveEditorTarget;
  hoveredTargetKey: string | null;
  isSelected: boolean;
  draggingTargetKey: string | null;
}): TargetVisualState {
  const { target, hoveredTargetKey, isSelected, draggingTargetKey } = params;

  if (draggingTargetKey === target.key) return "dragging";
  if (isSelected) return "selected";
  if (hoveredTargetKey === target.key) return "hover";
  return "idle";
}

function getTargetOutlineStyle(
  target: MoveEditorTarget,
  visualState: TargetVisualState
): CSSProperties {
  const isZone = target.kind === "zone";

  if (visualState === "dragging") {
    return {
      border: "2px solid rgba(37, 99, 235, 0.95)",
      background: "rgba(37, 99, 235, 0.12)",
      boxShadow: "0 0 0 1px rgba(147, 197, 253, 0.35) inset",
      borderRadius: isZone ? 18 : 14,
    };
  }

  if (visualState === "selected") {
    return {
      border: "2px solid rgba(14, 165, 233, 0.9)",
      background: "rgba(14, 165, 233, 0.08)",
      boxShadow: "0 0 0 1px rgba(125, 211, 252, 0.28) inset",
      borderRadius: isZone ? 18 : 14,
    };
  }

  if (visualState === "hover") {
    return {
      border: "1px dashed rgba(125, 211, 252, 0.88)",
      background: "rgba(14, 165, 233, 0.05)",
      borderRadius: isZone ? 18 : 14,
    };
  }

  return {
    border: "1px dashed rgba(148, 163, 184, 0.34)",
    background: "rgba(15, 23, 42, 0.02)",
    borderRadius: isZone ? 18 : 14,
  };
}

function getTargetBadgeStyle(visualState: TargetVisualState): CSSProperties {
  if (visualState === "dragging") {
    return {
      background: "#2563eb",
      color: "#eff6ff",
    };
  }

  if (visualState === "selected") {
    return {
      background: "#0f172a",
      color: "#e2e8f0",
    };
  }

  if (visualState === "hover") {
    return {
      background: "rgba(15, 23, 42, 0.9)",
      color: "#e2e8f0",
    };
  }

  return {
    background: "rgba(15, 23, 42, 0.72)",
    color: "#cbd5e1",
  };
}

function shouldShowTargetMeta(visualState: TargetVisualState): boolean {
  return visualState === "selected" || visualState === "dragging";
}

function toggleZoneSelection(zoneIds: ZoneId[], zoneId: ZoneId): ZoneId[] {
  return zoneIds.includes(zoneId)
    ? zoneIds.filter((current) => current !== zoneId)
    : [...zoneIds, zoneId];
}

function togglePathSelection(pathIds: PathId[], pathId: PathId): PathId[] {
  return pathIds.includes(pathId)
    ? pathIds.filter((current) => current !== pathId)
    : [...pathIds, pathId];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeMarqueeRect(selection: MarqueeSelectionState): Rect {
  const x = Math.min(selection.startX, selection.currentX);
  const y = Math.min(selection.startY, selection.currentY);
  return {
    x,
    y,
    width: Math.abs(selection.currentX - selection.startX),
    height: Math.abs(selection.currentY - selection.startY),
  };
}

function intersectsRect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function renderDefaultZoneEditButton(props: ZoneEditorButtonRenderProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.openEditor();
      }}
      style={{
        position: "absolute",
        right: 8,
        top: -12,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(37, 99, 235, 0.28)",
        background: props.isEditing ? "#2563eb" : "rgba(255, 255, 255, 0.96)",
        color: props.isEditing ? "#eff6ff" : "#0f172a",
        fontSize: 11,
        fontWeight: 700,
        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      {props.isEditing ? "열림" : "수정"}
    </button>
  );
}

function renderZoneFallback(
  slot: ZoneComponentSlotName,
  context: ZoneComponentRendererContext
) {
  switch (slot) {
    case "title":
      return (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {context.zone.name}
        </div>
      );
    case "type":
      return (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#64748b",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {context.zone.zoneType}
        </div>
      );
    case "badge":
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: 11,
            fontWeight: 700,
            boxSizing: "border-box",
          }}
        >
          {context.zone.action?.type ?? "group"}
        </div>
      );
    case "body":
      return (
        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.45 }}>
          {context.zone.childZoneIds.length} child zones
        </div>
      );
    case "footer":
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          <span>{context.visibility.emphasis}</span>
          <span>{context.density}</span>
        </div>
      );
  }
}

function renderPathFallback(
  slot: PathComponentSlotName,
  context: PathComponentRendererContext
) {
  switch (slot) {
    case "label":
      return (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#111827",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {context.path.name.trim() || "Empty"}
        </div>
      );
    case "rule":
      return (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#7c3aed",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {context.path.rule?.type ?? "Empty"}
        </div>
      );
    case "target":
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          <span>next</span>
          <span>{context.pathVisual.targetZoneId ?? "unresolved"}</span>
        </div>
      );
    case "body":
      return (
        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
          {context.path.rule
            ? context.path.rule.payload
              ? JSON.stringify(context.path.rule.payload)
              : "No payload"
            : "No rule configured"}
        </div>
      );
  }
}

function renderZonePreview(props: PreviewHostProps) {
  const {
    frame,
    camera,
    model,
    layoutModel,
    target,
    zoneComponents,
  } = props;

  if (target.kind !== "zone") return null;

  const zoneVisual = frame.pipeline.graphLayout.zonesById[target.zoneId];
  const componentLayout = frame.pipeline.componentLayout.zonesById[target.zoneId];
  const visibility = frame.pipeline.visibility.zoneVisibilityById[target.zoneId];
  const density = frame.pipeline.density.zoneDensityById[target.zoneId];
  if (!zoneVisual || !componentLayout || !visibility || !density) return null;

  const worldRect = zoneVisual.rect;
  const context: ZoneComponentRendererContext = {
    model,
    layoutModel,
    zone: zoneVisual.zone,
    zoneVisual,
    density,
    visibility,
    componentLayout,
    camera,
    theme: previewTheme,
    textScale: "md",
  };

  return (
    <div
      style={{
        ...previewHostStyle,
        left: `${worldRect.x}px`,
        top: `${worldRect.y}px`,
        width: `${worldRect.width}px`,
        height: `${worldRect.height}px`,
        borderRadius: zoneVisual.zone.zoneType === "action" ? 18 : 22,
        border: `1px solid ${
          zoneVisual.zone.zoneType === "action" ? "#93c5fd" : "#cbd5e1"
        }`,
        overflow: "hidden",
      }}
    >
      {(Object.keys(componentLayout.slots) as ZoneComponentSlotName[]).map(
        (slot) => {
          const slotRect = componentLayout.slots[slot];
          if (!slotRect) return null;

          const localRect = toLocalRect(worldRect, slotRect);
          const Component = zoneComponents?.[slot];
          const mount: ZoneComponentMount = {
            key: `editor-preview:${target.zoneId}:${slot}`,
            zoneId: target.zoneId,
            slot,
            host: createPreviewHost(),
            rect: slotRect,
            context,
          };

          return (
            <div
              key={mount.key}
              style={{
                position: "absolute",
                left: `${localRect.x}px`,
                top: `${localRect.y}px`,
                width: `${localRect.width}px`,
                height: `${localRect.height}px`,
                boxSizing: "border-box",
                fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
              }}
            >
              {Component ? (
                <Component mount={mount} />
              ) : (
                renderZoneFallback(slot, context)
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

function renderPathPreview(props: PreviewHostProps) {
  const {
    frame,
    camera,
    model,
    layoutModel,
    target,
    pathComponents,
  } = props;

  if (target.kind !== "path") return null;

  const pathVisual = frame.pipeline.graphLayout.pathsById[target.pathId];
  const componentLayout = frame.pipeline.componentLayout.pathsById[target.pathId];
  const visibility = frame.pipeline.visibility.pathVisibilityById[target.pathId];
  const density = frame.pipeline.density.pathDensityById[target.pathId];
  if (!pathVisual?.rect || !componentLayout || !visibility || !density) {
    return null;
  }

  const worldRect = pathVisual.rect;
  const context: PathComponentRendererContext = {
    model,
    layoutModel,
    path: pathVisual.path,
    pathVisual,
    density,
    visibility,
    componentLayout,
    camera,
    theme: previewTheme,
    textScale: "md",
  };

  return (
    <div
      style={{
        ...previewHostStyle,
        left: `${worldRect.x}px`,
        top: `${worldRect.y}px`,
        width: `${worldRect.width}px`,
        height: `${worldRect.height}px`,
        borderRadius: 16,
        border: "1px solid #334155",
        overflow: "hidden",
      }}
    >
      {(Object.keys(componentLayout.slots) as PathComponentSlotName[]).map(
        (slot) => {
          const slotRect = componentLayout.slots[slot];
          if (!slotRect) return null;

          const localRect = toLocalRect(worldRect, slotRect);
          const Component = pathComponents?.[slot];
          const mount: PathComponentMount = {
            key: `editor-preview:${target.pathId}:${slot}`,
            pathId: target.pathId,
            slot,
            host: createPreviewHost(),
            rect: slotRect,
            context,
          };

          return (
            <div
              key={mount.key}
              style={{
                position: "absolute",
                left: `${localRect.x}px`,
                top: `${localRect.y}px`,
                width: `${localRect.width}px`,
                height: `${localRect.height}px`,
                boxSizing: "border-box",
                fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
              }}
            >
              {Component ? (
                <Component mount={mount} />
              ) : (
                renderPathFallback(slot, context)
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

export function ZoneMoveEditorOverlay(props: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  frame: RendererFrame | null;
  zoneComponents?: ZoneSlotComponentMap;
  pathComponents?: PathSlotComponentMap;
  editor?: ZoneMoveEditorConfig;
  onExclusionStateChange?: (next: RendererExclusionState | undefined) => void;
}) {
  const {
    model,
    layoutModel,
    camera,
    frame,
    zoneComponents,
    pathComponents,
    editor,
    onExclusionStateChange,
  } = props;

  const [draggingTarget, setDraggingTarget] = useState<MoveEditorTarget | null>(null);
  const [draggingZoneGroupIds, setDraggingZoneGroupIds] = useState<ZoneId[]>([]);
  const [draggingPathGroupIds, setDraggingPathGroupIds] = useState<PathId[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredTargetKey, setHoveredTargetKey] = useState<string | null>(null);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<ZoneId[]>([]);
  const [selectedPathIds, setSelectedPathIds] = useState<PathId[]>([]);
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelectionState | null>(null);
  const [deleteArmedTargetKey, setDeleteArmedTargetKey] = useState<string | null>(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState | null>(null);
  const [deleteUndoState, setDeleteUndoState] = useState<DeleteUndoState | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<ZoneId | null>(null);
  const [editingPathState, setEditingPathState] = useState<{
    pathId: PathId;
    sourceZoneId: ZoneId;
  } | null>(null);
  const [creatingPath, setCreatingPath] = useState<PathCreateDragState | null>(null);
  const [pathCreateTargetZoneId, setPathCreateTargetZoneId] = useState<ZoneId | null>(null);
  const [retargetingPath, setRetargetingPath] = useState<PathRetargetDragState | null>(null);
  const [retargetPathTargetZoneId, setRetargetPathTargetZoneId] = useState<ZoneId | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const pathResizeRef = useRef<PathResizeState | null>(null);
  const pathCreateRef = useRef<PathCreateDragState | null>(null);
  const pathRetargetRef = useRef<PathRetargetDragState | null>(null);
  const marqueeSelectionRef = useRef<MarqueeSelectionState | null>(null);
  const selectedZoneIdsRef = useRef<ZoneId[]>([]);
  const selectedPathIdsRef = useRef<PathId[]>([]);
  const longPressRef = useRef<LongPressState | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const deleteUndoTimerRef = useRef<number | null>(null);
  const activeTransactionRef = useRef<EditorTransactionMeta | null>(null);
  const suppressedPathLabelClickRef = useRef<{
    targetKey: string | null;
    until: number;
  }>({
    targetKey: null,
    until: 0,
  });
  const latestRef = useRef({
    model,
    layoutModel,
    camera,
    frame,
    includeRoot: editor?.includeRoot,
    gridSnap: editor?.gridSnap,
    onModelChange: editor?.onModelChange,
    onLayoutModelChange: editor?.onLayoutModelChange,
    onTransactionStart: editor?.onTransactionStart,
    onTransactionCommit: editor?.onTransactionCommit,
    onTransactionCancel: editor?.onTransactionCancel,
    onExclusionStateChange,
  });

  useEffect(() => {
    latestRef.current = {
      model,
      layoutModel,
      camera,
      frame,
      includeRoot: editor?.includeRoot,
      gridSnap: editor?.gridSnap,
      onModelChange: editor?.onModelChange,
      onLayoutModelChange: editor?.onLayoutModelChange,
      onTransactionStart: editor?.onTransactionStart,
      onTransactionCommit: editor?.onTransactionCommit,
      onTransactionCancel: editor?.onTransactionCancel,
      onExclusionStateChange,
    };
  }, [model, layoutModel, camera, frame, editor, onExclusionStateChange]);

  useEffect(() => {
    selectedZoneIdsRef.current = selectedZoneIds;
  }, [selectedZoneIds]);

  useEffect(() => {
    selectedPathIdsRef.current = selectedPathIds;
  }, [selectedPathIds]);

  useEffect(() => {
    if (editor?.enabled) return;
    cancelTransaction();
    dragRef.current = null;
    resizeRef.current = null;
    pathResizeRef.current = null;
    pathCreateRef.current = null;
    pathRetargetRef.current = null;
    marqueeSelectionRef.current = null;
    setDraggingTarget(null);
    setDraggingZoneGroupIds([]);
    setDraggingPathGroupIds([]);
    setIsResizing(false);
    setCreatingPath(null);
    setPathCreateTargetZoneId(null);
    setRetargetingPath(null);
    setRetargetPathTargetZoneId(null);
    setHoveredTargetKey(null);
    setSelectedTargetKey(null);
    setSelectedZoneIds([]);
    setSelectedPathIds([]);
    setMarqueeSelection(null);
    setDeleteArmedTargetKey(null);
    setDeleteConfirmState(null);
    setDeleteUndoState(null);
    setEditingZoneId(null);
    setEditingPathState(null);
    onExclusionStateChange?.(undefined);
  }, [editor?.enabled, onExclusionStateChange]);

  useEffect(() => {
    return () => {
      if (deleteUndoTimerRef.current !== null) {
        window.clearTimeout(deleteUndoTimerRef.current);
      }
      cancelTransaction();
    };
  }, []);

  useEffect(() => {
    if (!editingZoneId) return;
    if (model.zonesById[editingZoneId]) return;
    setEditingZoneId(null);
  }, [editingZoneId, model]);

  useEffect(() => {
    if (!editingPathState) return;
    const sourceZoneId = findPathSourceZoneId(model, editingPathState.pathId);
    if (sourceZoneId && sourceZoneId === editingPathState.sourceZoneId) return;
    setEditingPathState(null);
  }, [editingPathState, model]);

  useEffect(() => {
    if (!deleteUndoState) return;
    if (editor?.history?.canUndo ?? false) return;
    clearDeleteUndoTimer();
    setDeleteUndoState(null);
  }, [deleteUndoState, editor?.history?.canUndo]);

  useEffect(() => {
    setSelectedZoneIds((current) =>
      current.filter((zoneId) => Boolean(model.zonesById[zoneId]))
    );
  }, [model]);

  useEffect(() => {
    setSelectedPathIds((current) =>
      current.filter((pathId) => Boolean(frame?.pipeline.graphLayout.pathsById[pathId]))
    );
  }, [frame]);

  const isPathLabelClickSuppressed = (targetKey: string) => {
    const current = suppressedPathLabelClickRef.current;
    return current.targetKey === targetKey && Date.now() < current.until;
  };

  const shouldAnimateDeleteUi = editor?.deleteInteraction?.animation ?? true;
  const deleteLongPressMs =
    editor?.deleteInteraction?.longPressMs ?? DELETE_LONG_PRESS_MS;
  const deleteUndoMs = editor?.deleteInteraction?.undoMs ?? DELETE_UNDO_MS;
  const shouldConfirmDelete = editor?.deleteInteraction?.confirm ?? true;
  const overlayControlsEnabled = editor?.overlayControls?.enabled ?? false;
  const overlayControls = editor?.overlayControls;

  const startTransaction = (transaction: EditorTransactionMeta) => {
    if (activeTransactionRef.current) return;
    activeTransactionRef.current = transaction;
    latestRef.current.onTransactionStart?.(transaction);
  };

  const commitTransaction = () => {
    const transaction = activeTransactionRef.current;
    if (!transaction) return;
    activeTransactionRef.current = null;
    latestRef.current.onTransactionCommit?.(transaction);
  };

  const cancelTransaction = () => {
    const transaction = activeTransactionRef.current;
    if (!transaction) return;
    activeTransactionRef.current = null;
    latestRef.current.onTransactionCancel?.(transaction);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    longPressRef.current = null;
  };

  const armDeleteTarget = (target: MoveEditorTarget) => {
    dragRef.current = null;
    setDraggingTarget(null);
    setIsResizing(false);
    setDeleteConfirmState(null);
    latestRef.current.onExclusionStateChange?.(undefined);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setDeleteArmedTargetKey(target.key);
    setSelectedTargetKey(target.key);
    setHoveredTargetKey(target.key);
  };

  const clearDeleteUndoTimer = () => {
    if (deleteUndoTimerRef.current !== null) {
      window.clearTimeout(deleteUndoTimerRef.current);
      deleteUndoTimerRef.current = null;
    }
  };

  const pushDeleteUndoState = (next: DeleteUndoState) => {
    clearDeleteUndoTimer();
    setDeleteUndoState(next);
    deleteUndoTimerRef.current = window.setTimeout(() => {
      deleteUndoTimerRef.current = null;
      setDeleteUndoState((current) =>
        current?.targetKey === next.targetKey ? null : current
      );
    }, deleteUndoMs);
  };

  const commitDeleteTarget = (target: MoveEditorTarget) => {
    const previousModel = latestRef.current.model;
    const previousLayoutModel = latestRef.current.layoutModel;

    if (target.kind === "zone") {
      const nextModel = removeZone(previousModel, target.zoneId);
      const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

      latestRef.current.onModelChange?.(nextModel);
      latestRef.current.onLayoutModelChange?.(nextLayoutModel);
      pushDeleteUndoState({
        targetKey: target.key,
        label: resolveDeleteTargetLabel(target),
      });
      setEditingZoneId((current) => (current === target.zoneId ? null : current));
    } else {
      const sourceZoneId = findPathSourceZoneId(previousModel, target.pathId);
      if (!sourceZoneId) return;

      const nextModel = removePath(previousModel, sourceZoneId, target.pathId);
      const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

      latestRef.current.onModelChange?.(nextModel);
      latestRef.current.onLayoutModelChange?.(nextLayoutModel);
      pushDeleteUndoState({
        targetKey: target.key,
        label: resolveDeleteTargetLabel(target),
      });
    }

    setDeleteConfirmState(null);
    setDeleteArmedTargetKey(null);
    setSelectedTargetKey(null);
    setHoveredTargetKey(null);
  };

  const commitDeleteZoneSelection = (zoneIds: ZoneId[]) => {
    if (zoneIds.length === 0) return;

    const previousModel = latestRef.current.model;
    const previousLayoutModel = latestRef.current.layoutModel;
    const topLevelZoneIds = collectTopLevelSelectedZoneIds(previousModel, zoneIds);

    let nextModel = previousModel;
    for (const zoneId of topLevelZoneIds) {
      nextModel = removeZone(nextModel, zoneId);
    }

    const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

    latestRef.current.onModelChange?.(nextModel);
    latestRef.current.onLayoutModelChange?.(nextLayoutModel);
    pushDeleteUndoState({
      targetKey: `selection:zones:${topLevelZoneIds.join(",")}`,
      label: resolveDeleteSelectionLabel({
        kind: "zone",
        count: topLevelZoneIds.length,
      }),
    });
    setSelectedZoneIds([]);
    setSelectedTargetKey(null);
    setHoveredTargetKey(null);
    setDeleteArmedTargetKey(null);
    setDeleteConfirmState(null);
    setEditingZoneId((current) =>
      current && topLevelZoneIds.includes(current) ? null : current
    );
  };

  const commitDeletePathSelection = (pathIds: PathId[]) => {
    if (pathIds.length === 0) return;

    const previousModel = latestRef.current.model;
    const previousLayoutModel = latestRef.current.layoutModel;
    let nextModel = previousModel;

    for (const pathId of pathIds) {
      const sourceZoneId = findPathSourceZoneId(nextModel, pathId);
      if (!sourceZoneId) continue;
      nextModel = removePath(nextModel, sourceZoneId, pathId);
    }

    const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

    latestRef.current.onModelChange?.(nextModel);
    latestRef.current.onLayoutModelChange?.(nextLayoutModel);
    pushDeleteUndoState({
      targetKey: `selection:paths:${pathIds.join(",")}`,
      label: resolveDeleteSelectionLabel({
        kind: "path",
        count: pathIds.length,
      }),
    });
    setSelectedPathIds([]);
    setSelectedTargetKey(null);
    setHoveredTargetKey(null);
    setDeleteArmedTargetKey(null);
    setDeleteConfirmState(null);
  };

  const requestDeleteZoneSelection = () => {
    if (selectedZoneIds.length < 2) return;

    if (shouldConfirmDelete) {
      setDeleteConfirmState({
        kind: "zone-selection",
        zoneIds: [...selectedZoneIds],
      });
      return;
    }

    commitDeleteZoneSelection(selectedZoneIds);
  };

  const requestDeletePathSelection = () => {
    if (selectedPathIds.length < 2) return;

    if (shouldConfirmDelete) {
      setDeleteConfirmState({
        kind: "path-selection",
        pathIds: [...selectedPathIds],
      });
      return;
    }

    commitDeletePathSelection(selectedPathIds);
  };

  useEffect(() => {
    const stopDragging = () => {
      cancelLongPress();

      const drag = dragRef.current;
      const resize = resizeRef.current;
      const pathResize = pathResizeRef.current;
      const pathCreate = pathCreateRef.current;
      const pathRetarget = pathRetargetRef.current;
      const marquee = marqueeSelectionRef.current;

      if (drag?.hasMoved && drag.target.kind === "path") {
        suppressedPathLabelClickRef.current = {
          targetKey: drag.target.key,
          until: Date.now() + 180,
        };
      }

      if (pathResize?.target.kind === "path") {
        suppressedPathLabelClickRef.current = {
          targetKey: pathResize.target.key,
          until: Date.now() + 180,
        };
      }

      if (
        drag?.target.kind === "zone" &&
        drag.hasMoved &&
        !resize &&
        !pathResize
      ) {
        const reparented =
          drag.origin.kind === "zone-group"
            ? commitZoneGroupReparentAtCurrentPosition({
                model: latestRef.current.model,
                layoutModel: latestRef.current.layoutModel,
                zoneIds: Object.keys(drag.origin.originsByZoneId) as ZoneId[],
              })
            : commitZoneReparentAtCurrentPosition({
                model: latestRef.current.model,
                layoutModel: latestRef.current.layoutModel,
                zoneId: drag.target.zoneId,
              });

        if (reparented.didReparent) {
          latestRef.current.onModelChange?.(reparented.model);
          latestRef.current.onLayoutModelChange?.(reparented.layoutModel);
        }
      }

      if (pathCreate?.hasMoved && latestRef.current.frame) {
        const targetZoneId = resolveInputAnchorTargetZoneId({
          model: latestRef.current.model,
          frame: latestRef.current.frame,
          camera: latestRef.current.camera,
          point: pathCreate.currentScreenPoint,
        });
        const created = createPathFromOutputAnchorDrag({
          model: latestRef.current.model,
          layoutModel: latestRef.current.layoutModel,
          frame: latestRef.current.frame,
          sourceZoneId: pathCreate.sourceZoneId,
          dropWorldPoint: screenPointToWorldPoint(
            pathCreate.currentScreenPoint,
            latestRef.current.camera
          ),
          targetZoneId,
          gridSnap: latestRef.current.gridSnap,
        });

        if (created) {
          latestRef.current.onModelChange?.(created.model);
          latestRef.current.onLayoutModelChange?.(created.layoutModel);
          setSelectedTargetKey(`path:${created.pathId}`);
        }
      }

      if (pathRetarget?.hasMoved && latestRef.current.frame) {
        const targetZoneId = resolveInputAnchorTargetZoneId({
          model: latestRef.current.model,
          frame: latestRef.current.frame,
          camera: latestRef.current.camera,
          point: pathRetarget.currentScreenPoint,
        });

        const nextModel = retargetPathFromOutputAnchorDrag({
          model: latestRef.current.model,
          sourceZoneId: pathRetarget.sourceZoneId,
          pathId: pathRetarget.pathId,
          targetZoneId,
        });

        if (nextModel) {
          latestRef.current.onModelChange?.(nextModel);
          setSelectedTargetKey(`path:${pathRetarget.pathId}`);
        }
      }

      if (marquee && latestRef.current.frame) {
        const marqueeRect = normalizeMarqueeRect(marquee);
        const didMarqueeSelect =
          marqueeRect.width >= DRAG_START_DISTANCE ||
          marqueeRect.height >= DRAG_START_DISTANCE;

        if (didMarqueeSelect) {
          const matchedTargets = getMoveEditorTargets({
            model: latestRef.current.model,
            frame: latestRef.current.frame,
            camera: latestRef.current.camera,
            options: {
              includeRoot: latestRef.current.includeRoot,
            },
          }).filter((target) => intersectsRect(target.rect, marqueeRect));

          const matchedZoneIds = matchedTargets
            .filter(
              (target): target is Extract<MoveEditorTarget, { kind: "zone" }> =>
                target.kind === "zone"
            )
            .map((target) => target.zoneId);
          const matchedPathIds = matchedTargets
            .filter(
              (target): target is Extract<MoveEditorTarget, { kind: "path" }> =>
                target.kind === "path"
            )
            .map((target) => target.pathId);

          const shouldPreferZones = matchedZoneIds.length > 0;
          const nextZoneIds = shouldPreferZones
            ? marquee.appendToSelection
              ? Array.from(new Set([...selectedZoneIdsRef.current, ...matchedZoneIds]))
              : matchedZoneIds
            : [];
          const nextPathIds = shouldPreferZones
            ? []
            : marquee.appendToSelection
              ? Array.from(new Set([...selectedPathIdsRef.current, ...matchedPathIds]))
              : matchedPathIds;
          const selectedKeys = [
            ...nextZoneIds.map((zoneId) => `zone:${zoneId}`),
            ...nextPathIds.map((pathId) => `path:${pathId}`),
          ];

          setSelectedZoneIds(nextZoneIds);
          setSelectedPathIds(nextPathIds);
          setSelectedTargetKey(
            selectedKeys.length === 1 ? selectedKeys[0] : null
          );
        } else if (!marquee.appendToSelection) {
          setSelectedZoneIds([]);
          setSelectedPathIds([]);
          setSelectedTargetKey(null);
        }
      }

      commitTransaction();

      dragRef.current = null;
      resizeRef.current = null;
      pathResizeRef.current = null;
      pathCreateRef.current = null;
      pathRetargetRef.current = null;
      marqueeSelectionRef.current = null;
      setDraggingTarget(null);
      setDraggingZoneGroupIds([]);
      setDraggingPathGroupIds([]);
      setIsResizing(false);
      setCreatingPath(null);
      setPathCreateTargetZoneId(null);
      setRetargetingPath(null);
      setRetargetPathTargetZoneId(null);
      setMarqueeSelection(null);
      setHoveredTargetKey(null);
      latestRef.current.onExclusionStateChange?.(undefined);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const handlePointerMove = (event: PointerEvent) => {
      const longPress = longPressRef.current;
      if (longPress) {
        const moved =
          getScreenDistance({
            startClientX: longPress.startClientX,
            startClientY: longPress.startClientY,
            nextClientX: event.clientX,
            nextClientY: event.clientY,
          }) >= DRAG_START_DISTANCE;

        if (moved) {
          cancelLongPress();
        }
      }

      const resize = resizeRef.current;
      if (resize) {
        const onLayoutModelChange = latestRef.current.onLayoutModelChange;
        if (!onLayoutModelChange) return;

        event.preventDefault();

        const nextLayoutModel = resizeZoneByScreenDelta({
          layoutModel: latestRef.current.layoutModel,
          camera: latestRef.current.camera,
          origin: resize.origin,
          deltaX: event.clientX - resize.startClientX,
          deltaY: event.clientY - resize.startClientY,
          gridSnap: latestRef.current.gridSnap,
        });

        onLayoutModelChange(nextLayoutModel);
        return;
      }

      const marquee = marqueeSelectionRef.current;
      if (marquee) {
        event.preventDefault();

        const nextSelection: MarqueeSelectionState = {
          ...marquee,
          currentX: toCanvasScreenPoint(
            overlayRef.current,
            event.clientX,
            event.clientY
          ).x,
          currentY: toCanvasScreenPoint(
            overlayRef.current,
            event.clientX,
            event.clientY
          ).y,
        };

        marqueeSelectionRef.current = nextSelection;
        setMarqueeSelection(nextSelection);
        return;
      }

      const pathResize = pathResizeRef.current;
      if (pathResize) {
        const onLayoutModelChange = latestRef.current.onLayoutModelChange;
        if (!onLayoutModelChange) return;

        event.preventDefault();

        const nextLayoutModel = resizePathNodeByScreenDelta({
          layoutModel: latestRef.current.layoutModel,
          camera: latestRef.current.camera,
          origin: pathResize.origin,
          deltaX: event.clientX - pathResize.startClientX,
          deltaY: event.clientY - pathResize.startClientY,
          gridSnap: latestRef.current.gridSnap,
        });

        onLayoutModelChange(nextLayoutModel);
        return;
      }

      const drag = dragRef.current;
      if (drag) {
        const onLayoutModelChange = latestRef.current.onLayoutModelChange;
        if (!onLayoutModelChange) return;

        const hasMoved =
          drag.hasMoved ||
          getScreenDistance({
            startClientX: drag.startClientX,
            startClientY: drag.startClientY,
            nextClientX: event.clientX,
            nextClientY: event.clientY,
          }) >= DRAG_START_DISTANCE;

        if (!hasMoved) {
          return;
        }

        event.preventDefault();

        if (!drag.hasMoved) {
          startTransaction(resolveDragTransactionMeta(drag));
          dragRef.current = {
            ...drag,
            hasMoved: true,
          };
          setDraggingTarget(drag.target);
          if (drag.origin.kind === "zone-group") {
            setDraggingZoneGroupIds(Object.keys(drag.origin.originsByZoneId) as ZoneId[]);
            setDraggingPathGroupIds([]);
            latestRef.current.onExclusionStateChange?.(undefined);
          } else if (drag.origin.kind === "path-group") {
            setDraggingZoneGroupIds([]);
            setDraggingPathGroupIds(Object.keys(drag.origin.originsByPathId) as PathId[]);
            latestRef.current.onExclusionStateChange?.(undefined);
          } else {
            setDraggingZoneGroupIds([]);
            setDraggingPathGroupIds([]);
            latestRef.current.onExclusionStateChange?.(getExclusionState(drag.target));
          }
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
        }

        const nextLayoutModel = moveEditorTargetByScreenDelta({
          layoutModel: latestRef.current.layoutModel,
          camera: latestRef.current.camera,
          origin: drag.origin,
          deltaX: event.clientX - drag.startClientX,
          deltaY: event.clientY - drag.startClientY,
          gridSnap: latestRef.current.gridSnap,
        });

        onLayoutModelChange(nextLayoutModel);
        return;
      }

      const pathRetarget = pathRetargetRef.current;
      if (pathRetarget && latestRef.current.frame) {
        event.preventDefault();

        const currentScreenPoint = toCanvasScreenPoint(
          overlayRef.current,
          event.clientX,
          event.clientY
        );
        const hasMoved =
          pathRetarget.hasMoved ||
          getScreenDistance({
            startClientX: pathRetarget.startClientX,
            startClientY: pathRetarget.startClientY,
            nextClientX: event.clientX,
            nextClientY: event.clientY,
          }) >= 10;
        const nextState: PathRetargetDragState = {
          ...pathRetarget,
          currentScreenPoint,
          hasMoved,
        };

        pathRetargetRef.current = nextState;
        setRetargetingPath(nextState);
        setRetargetPathTargetZoneId(
          resolveInputAnchorTargetZoneId({
            model: latestRef.current.model,
            frame: latestRef.current.frame,
            camera: latestRef.current.camera,
            point: currentScreenPoint,
          })
        );
        return;
      }

      const pathCreate = pathCreateRef.current;
      if (!pathCreate || !latestRef.current.frame) return;

      event.preventDefault();

      const currentScreenPoint = toCanvasScreenPoint(
        overlayRef.current,
        event.clientX,
        event.clientY
      );
      const hasMoved =
        pathCreate.hasMoved ||
        getScreenDistance({
          startClientX: pathCreate.startClientX,
          startClientY: pathCreate.startClientY,
          nextClientX: event.clientX,
          nextClientY: event.clientY,
        }) >= 10;
      const nextState: PathCreateDragState = {
        ...pathCreate,
        currentScreenPoint,
        hasMoved,
      };

      pathCreateRef.current = nextState;
      setCreatingPath(nextState);
      setPathCreateTargetZoneId(
        resolveInputAnchorTargetZoneId({
          model: latestRef.current.model,
          frame: latestRef.current.frame,
          camera: latestRef.current.camera,
          point: currentScreenPoint,
        })
      );
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      stopDragging();
    };
  }, []);

  const targets = useMemo<MoveEditorTarget[]>(() => {
    if (!frame || !editor?.enabled || !editor.onLayoutModelChange) {
      return [];
    }

    return getMoveEditorTargets({
      model,
      frame,
      camera,
      options: {
        includeRoot: editor.includeRoot,
      },
    });
  }, [camera, editor, frame, model]);

  const selectedZoneTargets = useMemo(
    () =>
      targets.filter(
        (target): target is Extract<MoveEditorTarget, { kind: "zone" }> =>
          target.kind === "zone" && selectedZoneIds.includes(target.zoneId)
      ),
    [selectedZoneIds, targets]
  );

  const selectedPathTargets = useMemo(
    () =>
      targets.filter(
        (target): target is Extract<MoveEditorTarget, { kind: "path" }> =>
          target.kind === "path" && selectedPathIds.includes(target.pathId)
      ),
    [selectedPathIds, targets]
  );

  const selectionBounds = useMemo(() => {
    if (selectedZoneTargets.length === 0) return null;

    const minX = Math.min(...selectedZoneTargets.map((target) => target.rect.x));
    const minY = Math.min(...selectedZoneTargets.map((target) => target.rect.y));
    const maxX = Math.max(
      ...selectedZoneTargets.map((target) => target.rect.x + target.rect.width)
    );
    const maxY = Math.max(
      ...selectedZoneTargets.map((target) => target.rect.y + target.rect.height)
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedZoneTargets]);

  const pathSelectionBounds = useMemo(() => {
    if (selectedPathTargets.length === 0) return null;

    const minX = Math.min(...selectedPathTargets.map((target) => target.rect.x));
    const minY = Math.min(...selectedPathTargets.map((target) => target.rect.y));
    const maxX = Math.max(
      ...selectedPathTargets.map((target) => target.rect.x + target.rect.width)
    );
    const maxY = Math.max(
      ...selectedPathTargets.map((target) => target.rect.y + target.rect.height)
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedPathTargets]);

  const canRunZoneSelectionCommands = useMemo(() => {
    if (selectedZoneTargets.length < 2) return false;

    const parentIds = new Set(
      selectedZoneTargets.map((target) => model.zonesById[target.zoneId]?.parentZoneId ?? null)
    );

    return parentIds.size === 1;
  }, [model, selectedZoneTargets]);

  const canRunPathSelectionCommands = selectedPathTargets.length >= 2;
  const selectedTarget = useMemo(
    () =>
      selectedTargetKey
        ? targets.find((target) => target.key === selectedTargetKey) ?? null
        : null,
    [selectedTargetKey, targets]
  );

  const dropTargetZoneIds = useMemo(() => {
    if (isResizing || draggingTarget?.kind !== "zone") {
      return [];
    }

    const zoneIdsToEvaluate =
      draggingZoneGroupIds.length > 0
        ? draggingZoneGroupIds
        : [draggingTarget.zoneId];
    const nextZoneIds = new Set<ZoneId>();

    for (const zoneId of zoneIdsToEvaluate) {
      const resolved = resolveZoneReparentCandidate({
        model,
        layoutModel,
        zoneId,
      });

      if (
        resolved.candidateParentZoneId !== null &&
        resolved.candidateParentZoneId !== resolved.currentParentZoneId
      ) {
        nextZoneIds.add(resolved.candidateParentZoneId);
      }
    }

    return Array.from(nextZoneIds);
  }, [draggingTarget, draggingZoneGroupIds, isResizing, layoutModel, model]);

  const openZoneEditor = (zoneId: ZoneId, targetKey: string) => {
    if (editor?.onZoneEditClick) {
      editor.onZoneEditClick(zoneId);
    } else {
      setEditingZoneId(zoneId);
    }

    setSelectedTargetKey(targetKey);
  };

  const openPathEditor = (
    payload: PathLabelEventPayload,
    targetKey: string,
    trigger?: (event: PathLabelEventPayload) => void
  ) => {
    if (trigger) {
      trigger(payload);
    } else if (editor?.renderPathEditor) {
      setEditingPathState({
        pathId: payload.pathId,
        sourceZoneId: payload.sourceZoneId,
      });
    }

    setSelectedTargetKey(targetKey);
  };

  const runZoneSelectionCommand = (
    command:
      | "align-left"
      | "align-right"
      | "align-top"
      | "align-bottom"
      | "align-center-horizontal"
      | "align-center-vertical"
      | "distribute-horizontal"
      | "distribute-vertical"
  ) => {
    if (!latestRef.current.onLayoutModelChange) return;
    if (selectedZoneIds.length < 2) return;
    if (!canRunZoneSelectionCommands) return;

    const nextLayoutModel =
      command === "align-left"
        ? alignZonesByMode({
            layoutModel: latestRef.current.layoutModel,
            zoneIds: selectedZoneIds,
            mode: "left",
            gridSnap: latestRef.current.gridSnap,
          })
        : command === "align-right"
          ? alignZonesByMode({
              layoutModel: latestRef.current.layoutModel,
              zoneIds: selectedZoneIds,
              mode: "right",
              gridSnap: latestRef.current.gridSnap,
            })
        : command === "align-top"
          ? alignZonesByMode({
              layoutModel: latestRef.current.layoutModel,
              zoneIds: selectedZoneIds,
              mode: "top",
              gridSnap: latestRef.current.gridSnap,
            })
          : command === "align-bottom"
            ? alignZonesByMode({
                layoutModel: latestRef.current.layoutModel,
                zoneIds: selectedZoneIds,
                mode: "bottom",
                gridSnap: latestRef.current.gridSnap,
              })
            : command === "align-center-horizontal"
              ? alignZonesByMode({
                  layoutModel: latestRef.current.layoutModel,
                  zoneIds: selectedZoneIds,
                  mode: "center-horizontal",
                  gridSnap: latestRef.current.gridSnap,
                })
              : command === "align-center-vertical"
                ? alignZonesByMode({
                    layoutModel: latestRef.current.layoutModel,
                    zoneIds: selectedZoneIds,
                    mode: "center-vertical",
                    gridSnap: latestRef.current.gridSnap,
                  })
          : command === "distribute-horizontal"
            ? distributeZonesByMode({
                layoutModel: latestRef.current.layoutModel,
                zoneIds: selectedZoneIds,
                mode: "horizontal",
                gridSnap: latestRef.current.gridSnap,
              })
            : distributeZonesByMode({
                layoutModel: latestRef.current.layoutModel,
                zoneIds: selectedZoneIds,
                mode: "vertical",
                gridSnap: latestRef.current.gridSnap,
              });

    latestRef.current.onLayoutModelChange(nextLayoutModel);
  };

  const runPathSelectionCommand = (
    command:
      | "align-left"
      | "align-right"
      | "align-top"
      | "align-bottom"
      | "align-center-horizontal"
      | "align-center-vertical"
      | "distribute-horizontal"
      | "distribute-vertical"
  ) => {
    if (!latestRef.current.onLayoutModelChange) return;
    if (!latestRef.current.frame) return;
    if (selectedPathIds.length < 2) return;
    if (!canRunPathSelectionCommands) return;

    const nextLayoutModel =
      command === "align-left"
        ? alignPathsByMode({
            frame: latestRef.current.frame,
            layoutModel: latestRef.current.layoutModel,
            pathIds: selectedPathIds,
            mode: "left",
            gridSnap: latestRef.current.gridSnap,
          })
        : command === "align-right"
          ? alignPathsByMode({
              frame: latestRef.current.frame,
              layoutModel: latestRef.current.layoutModel,
              pathIds: selectedPathIds,
              mode: "right",
              gridSnap: latestRef.current.gridSnap,
            })
        : command === "align-top"
          ? alignPathsByMode({
              frame: latestRef.current.frame,
              layoutModel: latestRef.current.layoutModel,
              pathIds: selectedPathIds,
              mode: "top",
              gridSnap: latestRef.current.gridSnap,
            })
          : command === "align-bottom"
            ? alignPathsByMode({
                frame: latestRef.current.frame,
                layoutModel: latestRef.current.layoutModel,
                pathIds: selectedPathIds,
                mode: "bottom",
                gridSnap: latestRef.current.gridSnap,
              })
            : command === "align-center-horizontal"
              ? alignPathsByMode({
                  frame: latestRef.current.frame,
                  layoutModel: latestRef.current.layoutModel,
                  pathIds: selectedPathIds,
                  mode: "center-horizontal",
                  gridSnap: latestRef.current.gridSnap,
                })
              : command === "align-center-vertical"
                ? alignPathsByMode({
                    frame: latestRef.current.frame,
                    layoutModel: latestRef.current.layoutModel,
                    pathIds: selectedPathIds,
                    mode: "center-vertical",
                    gridSnap: latestRef.current.gridSnap,
                  })
                : command === "distribute-horizontal"
                  ? distributePathsByMode({
                      frame: latestRef.current.frame,
                      layoutModel: latestRef.current.layoutModel,
                      pathIds: selectedPathIds,
                      mode: "horizontal",
                      gridSnap: latestRef.current.gridSnap,
                    })
                  : distributePathsByMode({
                      frame: latestRef.current.frame,
                      layoutModel: latestRef.current.layoutModel,
                      pathIds: selectedPathIds,
                      mode: "vertical",
                      gridSnap: latestRef.current.gridSnap,
                    });

    latestRef.current.onLayoutModelChange(nextLayoutModel);
  };

  const requestDeleteCurrentSelection = () => {
    if (deleteConfirmState) return;

    if (selectedZoneIds.length > 1) {
      requestDeleteZoneSelection();
      return;
    }

    if (selectedPathIds.length > 1) {
      requestDeletePathSelection();
      return;
    }

    if (selectedZoneIds.length === 1) {
      const target =
        targets.find(
          (candidate) =>
            candidate.kind === "zone" && candidate.zoneId === selectedZoneIds[0]
        ) ??
        (selectedTarget?.kind === "zone" ? selectedTarget : null);

      if (!target) return;
      if (shouldConfirmDelete) {
        setDeleteConfirmState({ kind: "target", target });
      } else {
        commitDeleteTarget(target);
      }
      return;
    }

    if (selectedPathIds.length === 1) {
      const target =
        targets.find(
          (candidate) =>
            candidate.kind === "path" && candidate.pathId === selectedPathIds[0]
        ) ??
        (selectedTarget?.kind === "path" ? selectedTarget : null);

      if (!target) return;
      if (shouldConfirmDelete) {
        setDeleteConfirmState({ kind: "target", target });
      } else {
        commitDeleteTarget(target);
      }
      return;
    }

    if (!selectedTarget) return;
    if (shouldConfirmDelete) {
      setDeleteConfirmState({ kind: "target", target: selectedTarget });
    } else {
      commitDeleteTarget(selectedTarget);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (isEditableTarget) return;

      const hasSelection =
        selectedZoneIds.length > 0 ||
        selectedPathIds.length > 0 ||
        selectedTarget !== null;

      if (!hasSelection) return;

      event.preventDefault();
      event.stopPropagation();
      requestDeleteCurrentSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    deleteConfirmState,
    requestDeleteCurrentSelection,
    selectedPathIds,
    selectedTarget,
    selectedZoneIds,
  ]);

  if (!editor?.enabled || !frame) return null;

  const marqueeRect = marqueeSelection
    ? normalizeMarqueeRect(marqueeSelection)
    : null;
  const overlayWidth =
    overlayRef.current?.clientWidth ??
    (typeof window === "undefined" ? 0 : window.innerWidth);
  const canDeleteSelection =
    !deleteConfirmState &&
    (selectedZoneIds.length > 0 ||
      selectedPathIds.length > 0 ||
      selectedTarget !== null);

  const editingZone = editingZoneId ? model.zonesById[editingZoneId] : undefined;
  const editingPathSourceZone = editingPathState
    ? model.zonesById[editingPathState.sourceZoneId]
    : undefined;
  const editingPath =
    editingPathState && editingPathSourceZone
      ? editingPathSourceZone.pathsById[editingPathState.pathId]
      : undefined;
  const dropTargetScreenRects = dropTargetZoneIds
    .map((zoneId) => {
      const rect = frame.pipeline.graphLayout.zonesById[zoneId]?.rect;

      if (!rect) {
        return null;
      }

      return {
        zoneId,
        rect: toScreenRect(rect, camera),
      };
    })
    .filter(
      (
        value
      ): value is {
        zoneId: ZoneId;
        rect: Rect;
      } => value !== null
    );
  const pathCreateSourceAnchorRect =
    creatingPath
      ? resolveZoneAnchorScreenRect({
          frame,
          camera,
          zoneId: creatingPath.sourceZoneId,
          kind: "outlet",
        })
      : undefined;
  const pathCreateTargetAnchorRect =
    creatingPath && pathCreateTargetZoneId
      ? resolveZoneAnchorScreenRect({
          frame,
          camera,
          zoneId: pathCreateTargetZoneId,
          kind: "inlet",
        })
      : undefined;
  const pathRetargetSourceAnchorRect =
    retargetingPath
      ? resolvePathOutputAnchorScreenRect({
          frame,
          camera,
          pathId: retargetingPath.pathId,
        })
      : undefined;
  const pathRetargetTargetAnchorRect =
    retargetingPath && retargetPathTargetZoneId
      ? resolveZoneAnchorScreenRect({
          frame,
          camera,
          zoneId: retargetPathTargetZoneId,
          kind: "inlet",
        })
      : undefined;

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
        zIndex: 30,
      }}
    >
      {shouldAnimateDeleteUi ? (
        <style>
          {`
            @keyframes zoneflow-delete-shake {
              0% { transform: translate3d(-1px, 0, 0) rotate(-0.85deg); }
              100% { transform: translate3d(1px, 0, 0) rotate(0.85deg); }
            }
            @keyframes zoneflow-delete-pop {
              0% { opacity: 0; transform: scale(0.84); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes zoneflow-delete-toast-in {
              0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.96); }
              100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
            }
          `}
        </style>
      ) : null}
      <div
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (event.pointerType === "touch") return;
          if (event.altKey) return;
          if (event.target !== event.currentTarget) return;
          const currentCursor = window.getComputedStyle(
            event.currentTarget
          ).cursor;
          if (currentCursor === "grab" || currentCursor === "grabbing") {
            return;
          }
          if (
            dragRef.current ||
            resizeRef.current ||
            pathResizeRef.current ||
            pathCreateRef.current ||
            pathRetargetRef.current
          ) {
            return;
          }

          cancelLongPress();
          setDeleteArmedTargetKey(null);
          setDeleteConfirmState(null);
          setHoveredTargetKey(null);

          const start = toCanvasScreenPoint(
            overlayRef.current,
            event.clientX,
            event.clientY
          );
          const nextSelection: MarqueeSelectionState = {
            startX: start.x,
            startY: start.y,
            currentX: start.x,
            currentY: start.y,
            appendToSelection:
              event.shiftKey || event.metaKey || event.ctrlKey,
          };

          marqueeSelectionRef.current = nextSelection;
          setMarqueeSelection(nextSelection);
          document.body.style.cursor = "crosshair";
          document.body.style.userSelect = "none";
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "auto",
          background: "transparent",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {draggingTarget &&
        draggingZoneGroupIds.length === 0 &&
        draggingPathGroupIds.length === 0
          ? renderZonePreview({
              frame,
              camera,
              model,
              layoutModel,
              target: draggingTarget,
              zoneComponents,
              pathComponents,
            }) ??
            renderPathPreview({
              frame,
              camera,
              model,
              layoutModel,
              target: draggingTarget,
              zoneComponents,
              pathComponents,
            })
          : null}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {creatingPath && pathCreateSourceAnchorRect ? (
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <line
              x1={pathCreateSourceAnchorRect.x + pathCreateSourceAnchorRect.width}
              y1={pathCreateSourceAnchorRect.y + pathCreateSourceAnchorRect.height / 2}
              x2={creatingPath.currentScreenPoint.x}
              y2={creatingPath.currentScreenPoint.y}
              stroke={pathCreateTargetZoneId ? "#0f766e" : "#0f172a"}
              strokeWidth={2.5}
              strokeDasharray={pathCreateTargetZoneId ? "0" : "6 6"}
              strokeLinecap="round"
              opacity={0.92}
            />
          </svg>
        ) : null}

        {retargetingPath && pathRetargetSourceAnchorRect ? (
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <line
              x1={pathRetargetSourceAnchorRect.x + pathRetargetSourceAnchorRect.width}
              y1={pathRetargetSourceAnchorRect.y + pathRetargetSourceAnchorRect.height / 2}
              x2={retargetingPath.currentScreenPoint.x}
              y2={retargetingPath.currentScreenPoint.y}
              stroke={retargetPathTargetZoneId ? "#0f766e" : "#0f172a"}
              strokeWidth={2.5}
              strokeDasharray={retargetPathTargetZoneId ? "0" : "6 6"}
              strokeLinecap="round"
              opacity={0.92}
            />
          </svg>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 16,
            top: 16,
            padding: "8px 10px",
            borderRadius: 12,
            background: "rgba(15, 23, 42, 0.88)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            color: "#e2e8f0",
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "0.04em",
            boxShadow: "0 12px 24px rgba(2, 6, 23, 0.18)",
          }}
        >
          EDIT MODE
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 0,
              color: "#94a3b8",
            }}
          >
            Drag nodes to move them. Shift-click zones or paths to multi-select,
            then align or distribute them from the floating toolbar. Drag the right
            anchor to add a condition path. Use the bottom-right handle to resize
            zones, or double-click a zone to edit it. Drag the right-side anchor on
            a path to reconnect it, and use the corner handle to resize the path
            label box. Drag empty canvas space to marquee-select zones and paths.
          </div>
        </div>

        {overlayControlsEnabled ? (
          <div
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              display: "grid",
              gap: 8,
              padding: 10,
              minWidth: 198,
              borderRadius: 14,
              border: "1px solid rgba(148, 163, 184, 0.22)",
              background: "rgba(15, 23, 42, 0.9)",
              boxShadow: "0 16px 32px rgba(2, 6, 23, 0.22)",
              pointerEvents: "auto",
            }}
          >
            {overlayControls?.showHistory !== false ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => editor.history?.onUndo?.()}
                  disabled={!editor.history?.canUndo}
                  style={{
                    ...HUD_BUTTON_STYLE,
                    opacity: editor.history?.canUndo ? 1 : 0.48,
                    cursor: editor.history?.canUndo ? "pointer" : "not-allowed",
                  }}
                >
                  되돌리기
                </button>
                <button
                  type="button"
                  onClick={() => editor.history?.onRedo?.()}
                  disabled={!editor.history?.canRedo}
                  style={{
                    ...HUD_BUTTON_STYLE,
                    opacity: editor.history?.canRedo ? 1 : 0.48,
                    cursor: editor.history?.canRedo ? "pointer" : "not-allowed",
                  }}
                >
                  다시하기
                </button>
              </div>
            ) : null}

            {overlayControls?.showDelete !== false ? (
              <button
                type="button"
                onClick={() => requestDeleteCurrentSelection()}
                disabled={!canDeleteSelection}
                style={{
                  ...HUD_BUTTON_STYLE,
                  background: canDeleteSelection
                    ? "rgba(127, 29, 29, 0.74)"
                    : "rgba(15, 23, 42, 0.72)",
                  border: canDeleteSelection
                    ? "1px solid rgba(248, 113, 113, 0.44)"
                    : HUD_BUTTON_STYLE.border,
                  color: canDeleteSelection ? "#fee2e2" : "#e2e8f0",
                  opacity: canDeleteSelection ? 1 : 0.48,
                  cursor: canDeleteSelection ? "pointer" : "not-allowed",
                }}
              >
                선택 삭제
              </button>
            ) : null}

            {(overlayControls?.showGridToggle !== false ||
              overlayControls?.showSnapToggle !== false) ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {overlayControls?.showGridToggle !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onToggleGridVisible?.()}
                    style={{
                      ...HUD_BUTTON_STYLE,
                      ...(overlayControls?.gridVisible ? HUD_ACTIVE_BUTTON_STYLE : null),
                    }}
                  >
                    Grid {overlayControls?.gridVisible ? "On" : "Off"}
                  </button>
                ) : null}
                {overlayControls?.showSnapToggle !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onToggleSnap?.()}
                    style={{
                      ...HUD_BUTTON_STYLE,
                      ...(overlayControls?.snapEnabled ? HUD_ACTIVE_BUTTON_STYLE : null),
                    }}
                  >
                    Snap {overlayControls?.snapEnabled ? "On" : "Off"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {(overlayControls?.showZoomControls !== false ||
              overlayControls?.showZoomValue !== false) ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px minmax(0, 1fr) 36px",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {overlayControls?.showZoomControls !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onZoomOut?.()}
                    style={HUD_BUTTON_STYLE}
                  >
                    -
                  </button>
                ) : (
                  <div />
                )}
                {overlayControls?.showZoomValue !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onResetZoom?.()}
                    style={{
                      ...HUD_BUTTON_STYLE,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.round((overlayControls?.zoom ?? 1) * 100)}%
                  </button>
                ) : (
                  <div />
                )}
                {overlayControls?.showZoomControls !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onZoomIn?.()}
                    style={HUD_BUTTON_STYLE}
                  >
                    +
                  </button>
                ) : (
                  <div />
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {selectionBounds && selectedZoneTargets.length > 1 ? (
          <div
            style={{
              position: "absolute",
              left: `${clamp(selectionBounds.x + selectionBounds.width / 2, 96, overlayWidth - 96)}px`,
              top: `${Math.max(18, selectionBounds.y - 18)}px`,
              transform: "translate(-50%, -100%)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 14,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "rgba(15, 23, 42, 0.94)",
              color: "#e2e8f0",
              boxShadow: "0 18px 30px rgba(2, 6, 23, 0.22)",
              pointerEvents: "auto",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: "#bfdbfe",
                paddingRight: 4,
                whiteSpace: "nowrap",
              }}
            >
              {selectedZoneTargets.length} selected
            </span>
            {[
              ["좌측", "align-left"],
              ["우측", "align-right"],
              ["상단", "align-top"],
              ["하단", "align-bottom"],
              ["가로중앙", "align-center-horizontal"],
              ["세로중앙", "align-center-vertical"],
              ["가로 분배", "distribute-horizontal"],
              ["세로 분배", "distribute-vertical"],
            ].map(([label, command]) => (
              <button
                key={command}
                type="button"
                disabled={
                  !canRunZoneSelectionCommands ||
                  (command.includes("distribute") && selectedZoneTargets.length < 3)
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  runZoneSelectionCommand(
                    command as
                      | "align-left"
                      | "align-right"
                      | "align-top"
                      | "align-bottom"
                      | "align-center-horizontal"
                      | "align-center-vertical"
                      | "distribute-horizontal"
                      | "distribute-vertical"
                  );
                }}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: canRunZoneSelectionCommands
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.04)",
                  color: canRunZoneSelectionCommands
                    ? "#f8fafc"
                    : "rgba(226, 232, 240, 0.48)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: canRunZoneSelectionCommands ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
                title={
                  canRunZoneSelectionCommands
                    ? undefined
                    : "정렬/분배는 같은 부모를 가진 존들만 지원합니다."
                }
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                requestDeleteZoneSelection();
              }}
              style={{
                border: "1px solid rgba(239, 68, 68, 0.38)",
                background: "rgba(239, 68, 68, 0.16)",
                color: "#fecaca",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              삭제
            </button>
          </div>
        ) : null}

        {pathSelectionBounds && selectedPathTargets.length > 1 ? (
          <div
            style={{
              position: "absolute",
              left: `${clamp(pathSelectionBounds.x + pathSelectionBounds.width / 2, 96, overlayWidth - 96)}px`,
              top: `${Math.max(18, pathSelectionBounds.y - 18)}px`,
              transform: "translate(-50%, -100%)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 14,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "rgba(15, 23, 42, 0.94)",
              color: "#e2e8f0",
              boxShadow: "0 18px 30px rgba(2, 6, 23, 0.22)",
              pointerEvents: "auto",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: "#c7d2fe",
                paddingRight: 4,
                whiteSpace: "nowrap",
              }}
            >
              {selectedPathTargets.length} paths
            </span>
            {[
              ["좌측", "align-left"],
              ["우측", "align-right"],
              ["상단", "align-top"],
              ["하단", "align-bottom"],
              ["가로중앙", "align-center-horizontal"],
              ["세로중앙", "align-center-vertical"],
              ["가로 분배", "distribute-horizontal"],
              ["세로 분배", "distribute-vertical"],
            ].map(([label, command]) => (
              <button
                key={command}
                type="button"
                disabled={
                  !canRunPathSelectionCommands ||
                  (command.includes("distribute") && selectedPathTargets.length < 3)
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  runPathSelectionCommand(
                    command as
                      | "align-left"
                      | "align-right"
                      | "align-top"
                      | "align-bottom"
                      | "align-center-horizontal"
                      | "align-center-vertical"
                      | "distribute-horizontal"
                      | "distribute-vertical"
                  );
                }}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: canRunPathSelectionCommands
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.04)",
                  color: canRunPathSelectionCommands
                    ? "#f8fafc"
                    : "rgba(226, 232, 240, 0.48)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: canRunPathSelectionCommands ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                requestDeletePathSelection();
              }}
              style={{
                border: "1px solid rgba(239, 68, 68, 0.38)",
                background: "rgba(239, 68, 68, 0.16)",
                color: "#fecaca",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              삭제
            </button>
          </div>
        ) : null}

        {deleteConfirmState?.kind === "zone-selection" &&
        selectionBounds &&
        deleteConfirmState.zoneIds.length > 1 ? (
          <div
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{
              position: "absolute",
              left: `${clamp(selectionBounds.x + selectionBounds.width / 2, 120, overlayWidth - 120)}px`,
              top: `${Math.max(72, selectionBounds.y - 88)}px`,
              transform: "translate(-50%, -100%)",
              minWidth: 196,
              padding: "12px 12px 10px",
              borderRadius: 14,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              background: "rgba(255, 255, 255, 0.98)",
              boxShadow: "0 18px 32px rgba(15, 23, 42, 0.18)",
              pointerEvents: "auto",
              zIndex: 13,
              animation: shouldAnimateDeleteUi
                ? DELETE_ICON_POP_ANIMATION
                : undefined,
            }}
          >
            <div
              style={{
                color: "#0f172a",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 10,
                whiteSpace: "nowrap",
              }}
            >
              {resolveDeleteSelectionLabel({
                kind: "zone",
                count: deleteConfirmState.zoneIds.length,
              })}{" "}
              삭제할까요?
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDeleteConfirmState(null);
                }}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  background: "#ffffff",
                  color: "#334155",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  commitDeleteZoneSelection(deleteConfirmState.zoneIds);
                }}
                style={{
                  border: "1px solid rgba(239, 68, 68, 0.86)",
                  background: "#ef4444",
                  color: "#fff7f7",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ) : null}

        {deleteConfirmState?.kind === "path-selection" &&
        pathSelectionBounds &&
        deleteConfirmState.pathIds.length > 1 ? (
          <div
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{
              position: "absolute",
              left: `${clamp(pathSelectionBounds.x + pathSelectionBounds.width / 2, 120, overlayWidth - 120)}px`,
              top: `${Math.max(72, pathSelectionBounds.y - 88)}px`,
              transform: "translate(-50%, -100%)",
              minWidth: 196,
              padding: "12px 12px 10px",
              borderRadius: 14,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              background: "rgba(255, 255, 255, 0.98)",
              boxShadow: "0 18px 32px rgba(15, 23, 42, 0.18)",
              pointerEvents: "auto",
              zIndex: 13,
              animation: shouldAnimateDeleteUi
                ? DELETE_ICON_POP_ANIMATION
                : undefined,
            }}
          >
            <div
              style={{
                color: "#0f172a",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 10,
                whiteSpace: "nowrap",
              }}
            >
              {resolveDeleteSelectionLabel({
                kind: "path",
                count: deleteConfirmState.pathIds.length,
              })}{" "}
              삭제할까요?
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDeleteConfirmState(null);
                }}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  background: "#ffffff",
                  color: "#334155",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  commitDeletePathSelection(deleteConfirmState.pathIds);
                }}
                style={{
                  border: "1px solid rgba(239, 68, 68, 0.86)",
                  background: "#ef4444",
                  color: "#fff7f7",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ) : null}

        {marqueeRect ? (
          <div
            style={{
              position: "absolute",
              left: `${marqueeRect.x}px`,
              top: `${marqueeRect.y}px`,
              width: `${marqueeRect.width}px`,
              height: `${marqueeRect.height}px`,
              border: "1.5px dashed rgba(37, 99, 235, 0.94)",
              background: "rgba(59, 130, 246, 0.12)",
              boxShadow: "0 0 0 1px rgba(191, 219, 254, 0.28) inset",
              borderRadius: 12,
              pointerEvents: "none",
            }}
          />
        ) : null}

        {creatingPath && pathCreateTargetAnchorRect ? (
          <div
            style={{
              position: "absolute",
              left: `${pathCreateTargetAnchorRect.x}px`,
              top: `${pathCreateTargetAnchorRect.y}px`,
              width: `${pathCreateTargetAnchorRect.width}px`,
              height: `${pathCreateTargetAnchorRect.height}px`,
              borderRadius: 999,
              border: "2px solid rgba(13, 148, 136, 0.92)",
              background: "rgba(45, 212, 191, 0.18)",
              boxShadow: "0 0 0 1px rgba(153, 246, 228, 0.22) inset",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "#0f766e",
                color: "#f0fdfa",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
              }}
            >
              CONNECT
            </div>
          </div>
        ) : null}

        {retargetingPath && pathRetargetTargetAnchorRect ? (
          <div
            style={{
              position: "absolute",
              left: `${pathRetargetTargetAnchorRect.x}px`,
              top: `${pathRetargetTargetAnchorRect.y}px`,
              width: `${pathRetargetTargetAnchorRect.width}px`,
              height: `${pathRetargetTargetAnchorRect.height}px`,
              borderRadius: 999,
              border: "2px solid rgba(13, 148, 136, 0.92)",
              background: "rgba(45, 212, 191, 0.18)",
              boxShadow: "0 0 0 1px rgba(153, 246, 228, 0.22) inset",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "#0f766e",
                color: "#f0fdfa",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
              }}
            >
              RECONNECT
            </div>
          </div>
        ) : null}

        {dropTargetScreenRects.map(({ zoneId, rect }) => (
          <div
            key={`drop-target-${zoneId}`}
            style={{
              position: "absolute",
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              borderRadius: 22,
              border: "2px solid rgba(34, 197, 94, 0.95)",
              background: "rgba(34, 197, 94, 0.08)",
              boxShadow: "0 0 0 1px rgba(134, 239, 172, 0.24) inset",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 10,
                top: -12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "#16a34a",
                color: "#f0fdf4",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
              }}
            >
              DROP TARGET
            </div>
          </div>
        ))}

        {targets.map((target) => {
          const isDragging = draggingTarget?.key === target.key;
          const isResizingTarget = isResizing && isDragging;
          const resizeCursor = "nwse-resize";
          const isZoneSelected =
            target.kind === "zone" && selectedZoneIds.includes(target.zoneId);
          const isPathSelected =
            target.kind === "path" && selectedPathIds.includes(target.pathId);
          const isSelected =
            target.kind === "zone"
              ? isZoneSelected
              : isPathSelected;
          const visualState = getTargetVisualState({
            target,
            hoveredTargetKey,
            isSelected,
            draggingTargetKey: draggingTarget?.key ?? null,
          });
          const zone = target.kind === "zone" ? model.zonesById[target.zoneId] : undefined;
          const isEditingZone =
            target.kind === "zone" && editingZoneId === target.zoneId;
          const sourceAnchorScreenRect =
            target.kind === "zone"
              ? resolveZoneAnchorScreenRect({
                  frame,
                  camera,
                  zoneId: target.zoneId,
                  kind: "outlet",
                })
              : undefined;
          const sourceAnchorLocalRect =
            sourceAnchorScreenRect && target.kind === "zone"
              ? toLocalRect(target.rect, sourceAnchorScreenRect)
              : undefined;
          const pathLabelRect =
            target.kind === "path"
              ? frame.pipeline.componentLayout.pathsById[target.pathId]?.slots.label
              : undefined;
          const pathLabelScreenRect = pathLabelRect
            ? toScreenRect(pathLabelRect, camera)
            : undefined;
          const pathLabelLocalRect =
            pathLabelScreenRect && target.kind === "path"
              ? toLocalRect(target.rect, pathLabelScreenRect)
              : undefined;
          const pathOutputAnchorScreenRect =
            target.kind === "path"
              ? resolvePathOutputAnchorScreenRect({
                  frame,
                  camera,
                  pathId: target.pathId,
                })
              : undefined;
          const pathOutputAnchorLocalRect =
            pathOutputAnchorScreenRect && target.kind === "path"
              ? toLocalRect(target.rect, pathOutputAnchorScreenRect)
              : undefined;
          const cornerResizeHandleRect = getCornerResizeHandleRect(target.rect);
          const deleteButtonPosition = resolveDeleteButtonPosition(target);
          const isDeleteArmed = deleteArmedTargetKey === target.key;
          const isDeleteConfirmOpen =
            deleteConfirmState?.kind === "target" &&
            deleteConfirmState.target.key === target.key;
          const pathVisual =
            target.kind === "path"
              ? frame.pipeline.graphLayout.pathsById[target.pathId]
              : undefined;
          const shouldShowPathRetargetHandle =
            target.kind === "path" &&
            !creatingPath &&
            !retargetingPath &&
            !isDeleteArmed &&
            !!pathOutputAnchorLocalRect &&
            (visualState === "hover" || visualState === "selected");
          const shouldShowPathResizeHandle =
            target.kind === "path" &&
            !creatingPath &&
            !retargetingPath &&
            !isDeleteArmed &&
            (visualState === "hover" ||
              visualState === "selected" ||
              isResizingTarget);
          const shouldShowZoneEditButton =
            target.kind === "zone" &&
            !!zone &&
            (!!editor.renderZoneEditor || !!editor.onZoneEditClick) &&
            !isDeleteArmed &&
            !isDragging &&
            (visualState !== "idle" || isEditingZone);
          const shouldShowResizeHandle =
            target.kind === "zone" &&
            !creatingPath &&
            !isDeleteArmed &&
            (visualState === "hover" ||
              visualState === "selected" ||
              isResizingTarget);
          const shouldShowPathEditTrigger =
            target.kind === "path" &&
            (!!editor.renderPathEditor ||
              !!editor.onPathLabelClick ||
              !!editor.onPathLabelDoubleClick ||
              !!editor.onPathLabelContextMenu) &&
            !isDeleteArmed &&
            !!pathLabelLocalRect &&
            !isDragging;
          const zoneEditButton =
            shouldShowZoneEditButton && zone
              ? editor.renderZoneEditButton?.({
                  zoneId: target.zoneId,
                  zone,
                  model,
                  layoutModel,
                  rect: target.rect,
                  isSelected: visualState === "selected",
                  isEditing: isEditingZone,
                  openEditor: () => {
                    openZoneEditor(target.zoneId, target.key);
                  },
                  closeEditor: () => {
                    setEditingZoneId((current) =>
                      current === target.zoneId ? null : current
                    );
                  },
                })
              : undefined;

          return (
            <div
              key={target.key}
              title={`${target.label} move`}
              onPointerEnter={() => {
                if (isDragging) return;
                setHoveredTargetKey(target.key);
              }}
              onPointerLeave={() => {
                if (isDragging) return;
                setHoveredTargetKey((current) =>
                  current === target.key ? null : current
                );
              }}
              onDoubleClick={(event) => {
                if (target.kind !== "zone") return;
                if (!editor.onZoneEditClick && !editor.renderZoneEditor) return;

                event.preventDefault();
                event.stopPropagation();
                openZoneEditor(target.zoneId, target.key);
              }}
              onPointerDown={(event) => {
                if (isDeleteArmed) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }

                const isToggleSelection =
                  (target.kind === "zone" || target.kind === "path") &&
                  (event.shiftKey || event.metaKey || event.ctrlKey);

                if (isToggleSelection) {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelLongPress();
                  setDeleteArmedTargetKey(null);
                  setDeleteConfirmState(null);
                  if (target.kind === "zone") {
                    setSelectedPathIds([]);
                    setSelectedZoneIds((current) => {
                      const nextZoneIds = toggleZoneSelection(current, target.zoneId);
                      const selectedKeys = nextZoneIds.map((zoneId) => `zone:${zoneId}`);
                      setSelectedTargetKey(
                        selectedKeys.length === 1 ? selectedKeys[0] : null
                      );
                      return nextZoneIds;
                    });
                  } else {
                    setSelectedZoneIds([]);
                    setSelectedPathIds((current) => {
                      const nextPathIds = togglePathSelection(current, target.pathId);
                      const selectedKeys = nextPathIds.map((pathId) => `path:${pathId}`);
                      setSelectedTargetKey(
                        selectedKeys.length === 1 ? selectedKeys[0] : null
                      );
                      return nextPathIds;
                    });
                  }
                  return;
                }

                const shouldStartZoneGroupDrag =
                  target.kind === "zone" &&
                  selectedZoneIds.includes(target.zoneId) &&
                  selectedZoneIds.length > 1;
                const shouldStartPathGroupDrag =
                  target.kind === "path" &&
                  selectedPathIds.includes(target.pathId) &&
                  selectedPathIds.length > 1;
                const origin = shouldStartZoneGroupDrag
                  ? resolveGroupZoneDragOrigin({
                      model,
                      layoutModel,
                      zoneIds: selectedZoneIds,
                      primaryZoneId: target.zoneId,
                    })
                  : shouldStartPathGroupDrag
                    ? resolveGroupPathDragOrigin({
                        frame,
                        layoutModel,
                        pathIds: selectedPathIds,
                        primaryPathId: target.pathId,
                      })
                  : resolveMoveEditorDragOrigin(layoutModel, target);
                if (!origin) return;

                cancelLongPress();
                setDeleteArmedTargetKey((current) =>
                  current === target.key ? current : null
                );
                setDeleteConfirmState((current) =>
                  current?.kind === "target" && current.target.key === target.key
                    ? current
                    : null
                );

                if (target.kind === "zone") {
                  event.preventDefault();
                  if (!shouldStartZoneGroupDrag || !isZoneSelected) {
                    setSelectedZoneIds([target.zoneId]);
                  }
                  setSelectedPathIds([]);
                } else {
                  setSelectedZoneIds([]);
                  if (!shouldStartPathGroupDrag || !isPathSelected) {
                    setSelectedPathIds([target.pathId]);
                  }
                }
                event.stopPropagation();

                dragRef.current = {
                  target,
                  origin,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  hasMoved: false,
                };

                setSelectedTargetKey(target.key);
                setHoveredTargetKey(target.key);
                longPressRef.current = {
                  target,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                };
                longPressTimerRef.current = window.setTimeout(() => {
                  const active = longPressRef.current;
                  if (!active || active.target.key !== target.key) return;
                  cancelLongPress();
                  armDeleteTarget(target);
                }, deleteLongPressMs);
                if (target.kind === "zone") {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                }
              }}
              style={{
                position: "absolute",
                left: `${target.rect.x}px`,
                top: `${target.rect.y}px`,
                width: `${target.rect.width}px`,
                height: `${target.rect.height}px`,
                pointerEvents: "auto",
                cursor: isResizingTarget
                  ? resizeCursor
                  : isDragging
                    ? "grabbing"
                    : "grab",
                touchAction: "none",
                animation:
                  isDeleteArmed && shouldAnimateDeleteUi
                    ? DELETE_SHAKE_ANIMATION
                    : undefined,
                transformOrigin: "center center",
                ...getTargetOutlineStyle(target, visualState),
              }}
            >
              {sourceAnchorLocalRect && target.kind === "zone" ? (
                <button
                  type="button"
                  title={`${target.label} add path`}
                  onPointerDown={(event) => {
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);
                    const currentScreenPoint = toCanvasScreenPoint(
                      overlayRef.current,
                      event.clientX,
                      event.clientY
                    );

                    event.preventDefault();
                    event.stopPropagation();

                    const nextState: PathCreateDragState = {
                      sourceZoneId: target.zoneId,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      currentScreenPoint,
                      hasMoved: false,
                    };
                    startTransaction({
                      kind: "create-path",
                      sourceZoneId: target.zoneId,
                    });

                    pathCreateRef.current = nextState;
                    setCreatingPath(nextState);
                    setPathCreateTargetZoneId(null);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    document.body.style.cursor = "crosshair";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    left: `${sourceAnchorLocalRect.x}px`,
                    top: `${sourceAnchorLocalRect.y}px`,
                    width: `${sourceAnchorLocalRect.width}px`,
                    height: `${sourceAnchorLocalRect.height}px`,
                    border: 0,
                    borderRadius: 999,
                    background: "transparent",
                    cursor: "crosshair",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                />
              ) : null}

              {shouldShowPathRetargetHandle ? (
                <button
                  type="button"
                  title={`${target.label} reconnect`}
                  onPointerDown={(event) => {
                    if (target.kind !== "path") return;
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);

                    const currentScreenPoint = toCanvasScreenPoint(
                      overlayRef.current,
                      event.clientX,
                      event.clientY
                    );
                    if (!pathVisual) return;

                    event.preventDefault();
                    event.stopPropagation();

                    const nextState: PathRetargetDragState = {
                      pathId: target.pathId,
                      sourceZoneId: pathVisual.sourceZoneId,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      currentScreenPoint,
                      hasMoved: false,
                    };
                    startTransaction({
                      kind: "retarget-path",
                      pathIds: [target.pathId],
                      sourceZoneId: pathVisual.sourceZoneId,
                    });

                    pathRetargetRef.current = nextState;
                    setRetargetingPath(nextState);
                    setRetargetPathTargetZoneId(null);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    document.body.style.cursor = "crosshair";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    left: `${pathOutputAnchorLocalRect?.x ?? 0}px`,
                    top: `${pathOutputAnchorLocalRect?.y ?? 0}px`,
                    width: `${pathOutputAnchorLocalRect?.width ?? 0}px`,
                    height: `${pathOutputAnchorLocalRect?.height ?? 0}px`,
                    border: "1px solid rgba(13, 148, 136, 0.92)",
                    borderRadius: 999,
                    background: "#f0fdfa",
                    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.16)",
                    cursor: "crosshair",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0f766e",
                      fontSize: 13,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    →
                  </span>
                </button>
              ) : null}

              {shouldShowResizeHandle ? (
                <button
                  type="button"
                  title={`${target.label} resize`}
                  onPointerDown={(event) => {
                    if (target.kind !== "zone") return;
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);

                    const origin = resolveZoneResizeOrigin(
                      layoutModel,
                      target.zoneId
                    );
                    if (!origin) return;

                    event.preventDefault();
                    event.stopPropagation();

                    resizeRef.current = {
                      target,
                      origin,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                    };
                    startTransaction({
                      kind: "resize-zone",
                      zoneIds: [target.zoneId],
                    });

                    setDraggingTarget(target);
                    setIsResizing(true);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    onExclusionStateChange?.(getExclusionState(target));
                    document.body.style.cursor = "nwse-resize";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    right: -7,
                    bottom: -7,
                    width: 18,
                    height: 18,
                    border: "1px solid rgba(14, 165, 233, 0.92)",
                    borderRadius: 999,
                    background: "#eff6ff",
                    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.16)",
                    cursor: "nwse-resize",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      right: 4,
                      bottom: 3,
                      width: 7,
                      height: 7,
                      borderRight: "2px solid #0f172a",
                      borderBottom: "2px solid #0f172a",
                    }}
                  />
                </button>
              ) : null}

              {shouldShowPathResizeHandle ? (
                <button
                  type="button"
                  title={`${target.label} resize`}
                  onPointerDown={(event) => {
                    if (target.kind !== "path") return;
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);

                    const origin = resolvePathResizeOrigin({
                      frame,
                      layoutModel,
                      pathId: target.pathId,
                    });
                    if (!origin) return;

                    event.preventDefault();
                    event.stopPropagation();

                    pathResizeRef.current = {
                      target,
                      origin,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                    };
                    startTransaction({
                      kind: "resize-path",
                      pathIds: [target.pathId],
                    });

                    setDraggingTarget(target);
                    setIsResizing(true);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    onExclusionStateChange?.(getExclusionState(target));
                    document.body.style.cursor = "nwse-resize";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    left: `${cornerResizeHandleRect.x}px`,
                    top: `${cornerResizeHandleRect.y}px`,
                    width: `${cornerResizeHandleRect.size}px`,
                    height: `${cornerResizeHandleRect.size}px`,
                    border: "1px solid rgba(51, 65, 85, 0.92)",
                    borderRadius: 999,
                    background: "#f8fafc",
                    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.16)",
                    cursor: "nwse-resize",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      right: 4,
                      bottom: 3,
                      width: 7,
                      height: 7,
                      borderRight: "2px solid #0f172a",
                      borderBottom: "2px solid #0f172a",
                    }}
                  />
                </button>
              ) : null}

              {isDeleteArmed ? (
                <button
                  type="button"
                  title={`${target.label} delete`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (shouldConfirmDelete) {
                      setDeleteConfirmState({ kind: "target", target });
                      return;
                    }

                    commitDeleteTarget(target);
                  }}
                  style={{
                    position: "absolute",
                    left: `${deleteButtonPosition.x}px`,
                    top: `${deleteButtonPosition.y}px`,
                    width: 24,
                    height: 24,
                    border: "1px solid rgba(239, 68, 68, 0.42)",
                    borderRadius: 999,
                    background: "#ef4444",
                    color: "#fff7f7",
                    boxShadow: "0 10px 20px rgba(127, 29, 29, 0.22)",
                    cursor: "pointer",
                    pointerEvents: "auto",
                    fontSize: 14,
                    fontWeight: 900,
                    lineHeight: 1,
                    animation: shouldAnimateDeleteUi
                      ? DELETE_ICON_POP_ANIMATION
                      : undefined,
                  }}
                >
                  ×
                </button>
              ) : null}

              {isDeleteConfirmOpen ? (
                <div
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  style={{
                    position: "absolute",
                    right: -6,
                    top: -64,
                    minWidth: 196,
                    padding: "12px 12px 10px",
                    borderRadius: 14,
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    background: "rgba(255, 255, 255, 0.98)",
                    boxShadow: "0 18px 32px rgba(15, 23, 42, 0.18)",
                    pointerEvents: "auto",
                    zIndex: 4,
                    animation: shouldAnimateDeleteUi
                      ? DELETE_ICON_POP_ANIMATION
                      : undefined,
                  }}
                >
                  <div
                    style={{
                      color: "#0f172a",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {resolveDeleteTargetLabel(target)} 삭제할까요?
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDeleteConfirmState(null);
                      }}
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.3)",
                        background: "#ffffff",
                        color: "#334155",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        commitDeleteTarget(target);
                      }}
                      style={{
                        border: "1px solid rgba(239, 68, 68, 0.86)",
                        background: "#ef4444",
                        color: "#fff7f7",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : null}

              {shouldShowZoneEditButton && zone ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    pointerEvents: "auto",
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  {zoneEditButton !== undefined
                    ? zoneEditButton
                    :
                    renderDefaultZoneEditButton({
                      zoneId: target.zoneId,
                      zone,
                      model,
                      layoutModel,
                      rect: target.rect,
                      isSelected: visualState === "selected",
                      isEditing: isEditingZone,
                      openEditor: () => {
                        openZoneEditor(target.zoneId, target.key);
                      },
                      closeEditor: () => {
                        setEditingZoneId((current) =>
                          current === target.zoneId ? null : current
                        );
                      },
                    })}
                </div>
              ) : null}
              {shouldShowPathEditTrigger && pathLabelLocalRect ? (
                <button
                  type="button"
                  title={`${target.label} edit`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedTargetKey(target.key);
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (isPathLabelClickSuppressed(target.key)) return;
                    setSelectedTargetKey(target.key);
                    const payload = resolvePathLabelEventPayload({
                      model,
                      pathId: target.pathId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
                    if (!payload) return;
                    const trigger = editor.onPathLabelDoubleClick ?? editor.onPathLabelClick;
                    openPathEditor(payload, target.key, trigger);
                  }}
                  onContextMenu={(event) => {
                    if (!editor.onPathLabelContextMenu && !editor.renderPathEditor) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    if (isPathLabelClickSuppressed(target.key)) return;
                    setSelectedTargetKey(target.key);
                    const payload = resolvePathLabelEventPayload({
                      model,
                      pathId: target.pathId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
                    if (!payload) return;
                    openPathEditor(payload, target.key, editor.onPathLabelContextMenu);
                  }}
                  style={{
                    position: "absolute",
                    left: `${pathLabelLocalRect.x}px`,
                    top: `${pathLabelLocalRect.y}px`,
                    width: `${pathLabelLocalRect.width}px`,
                    height: `${pathLabelLocalRect.height}px`,
                    border: 0,
                    borderRadius: 10,
                    background: "transparent",
                    color: "transparent",
                    cursor: "pointer",
                    pointerEvents: "auto",
                  }}
                >
                  Edit path
                </button>
              ) : null}
              {shouldShowTargetMeta(visualState) ? (
                <>
                  <div
                    style={{
                      position: "absolute",
                      left: 10,
                      top: -12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
                      ...getTargetBadgeStyle(visualState),
                    }}
                  >
                    {getTargetBadgeLabel(target)}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: 10,
                      bottom: 8,
                      padding: "3px 7px",
                      borderRadius: 999,
                      background: "rgba(255, 255, 255, 0.84)",
                      color: "#0f172a",
                      fontSize: 10,
                      fontWeight: 700,
                      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    {isResizingTarget ? "RESIZE" : isDragging ? "MOVING" : "DRAG"}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {deleteUndoState ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            background: "rgba(15, 23, 42, 0.94)",
            color: "#f8fafc",
            boxShadow: "0 18px 36px rgba(15, 23, 42, 0.28)",
            pointerEvents: "auto",
            zIndex: 12,
            animation: shouldAnimateDeleteUi
              ? DELETE_TOAST_IN_ANIMATION
              : undefined,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {deleteUndoState.label} 삭제됨
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              clearDeleteUndoTimer();
              editor.history?.onUndo?.();
              setDeleteUndoState(null);
            }}
            style={{
              border: "1px solid rgba(96, 165, 250, 0.78)",
              background: "#2563eb",
              color: "#eff6ff",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 800,
              cursor: editor.history?.canUndo ? "pointer" : "not-allowed",
              opacity: editor.history?.canUndo ? 1 : 0.56,
            }}
            disabled={!editor.history?.canUndo}
          >
            되돌리기
          </button>
        </div>
      ) : null}

      {editingZone && editor.renderZoneEditor
        ? editor.renderZoneEditor({
            zoneId: editingZone.id,
            zone: editingZone,
            model,
            layoutModel,
            onModelChange: editor.onModelChange,
            onLayoutModelChange: editor.onLayoutModelChange,
            closeEditor: () => {
              setEditingZoneId(null);
            },
          })
        : null}

      {editingPath && editingPathSourceZone && editor.renderPathEditor
        ? editor.renderPathEditor({
            pathId: editingPath.id,
            path: editingPath,
            sourceZoneId: editingPathSourceZone.id,
            sourceZone: editingPathSourceZone,
            model,
            layoutModel,
            onModelChange: editor.onModelChange,
            onLayoutModelChange: editor.onLayoutModelChange,
            closeEditor: () => {
              setEditingPathState(null);
            },
          })
        : null}
    </div>
  );
}

const HUD_BUTTON_STYLE: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: 10,
  background: "rgba(15, 23, 42, 0.74)",
  color: "#e2e8f0",
  minHeight: 34,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const HUD_ACTIVE_BUTTON_STYLE: CSSProperties = {
  background: "rgba(37, 99, 235, 0.92)",
  border: "1px solid rgba(96, 165, 250, 0.4)",
  color: "#eff6ff",
};
