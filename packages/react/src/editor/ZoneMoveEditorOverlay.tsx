import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type {
  PathId,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneId,
} from "@zoneflow/core";
import {
  createPathFromOutputAnchorDrag,
  commitZoneReparentAtCurrentPosition,
  getMoveEditorTargets,
  moveEditorTargetByScreenDelta,
  resizePathNodeByScreenDelta,
  resizeZoneByScreenDelta,
  resolveInputAnchorTargetZoneId,
  resolvePathResizeOrigin,
  resolveZoneReparentCandidate,
  resolveZoneAnchorScreenRect,
  resolveMoveEditorDragOrigin,
  resolveZoneResizeOrigin,
  screenPointToWorldPoint,
  type MoveEditorDragOrigin,
  type MoveEditorTarget,
  type PathResizeOrigin,
  type ZoneResizeOrigin,
} from "@zoneflow/editor-dom";
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

export type PathLabelEventPayload = {
  pathId: PathId;
  clientX: number;
  clientY: number;
};

export type ZoneMoveEditorConfig = {
  enabled?: boolean;
  includeRoot?: boolean;
  onModelChange?: (nextModel: UniverseModel) => void;
  onLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  renderZoneEditButton?: (props: ZoneEditorButtonRenderProps) => ReactNode;
  renderZoneEditor?: (props: ZoneEditorRenderProps) => ReactNode;
  onZoneEditClick?: (zoneId: ZoneId) => void;
  onPathLabelClick?: (event: PathLabelEventPayload) => void;
  onPathLabelDoubleClick?: (event: PathLabelEventPayload) => void;
  onPathLabelContextMenu?: (event: PathLabelEventPayload) => void;
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
  selectedTargetKey: string | null;
  draggingTargetKey: string | null;
}): TargetVisualState {
  const { target, hoveredTargetKey, selectedTargetKey, draggingTargetKey } = params;

  if (draggingTargetKey === target.key) return "dragging";
  if (selectedTargetKey === target.key) return "selected";
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
          {context.path.name}
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
          {context.path.rule?.type ?? context.path.key}
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
          {context.path.rule?.payload
            ? JSON.stringify(context.path.rule.payload)
            : "No payload"}
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
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredTargetKey, setHoveredTargetKey] = useState<string | null>(null);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<ZoneId | null>(null);
  const [creatingPath, setCreatingPath] = useState<PathCreateDragState | null>(null);
  const [pathCreateTargetZoneId, setPathCreateTargetZoneId] = useState<ZoneId | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const pathResizeRef = useRef<PathResizeState | null>(null);
  const pathCreateRef = useRef<PathCreateDragState | null>(null);
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
    onModelChange: editor?.onModelChange,
    onLayoutModelChange: editor?.onLayoutModelChange,
    onExclusionStateChange,
  });

  useEffect(() => {
    latestRef.current = {
      model,
      layoutModel,
      camera,
      frame,
      onModelChange: editor?.onModelChange,
      onLayoutModelChange: editor?.onLayoutModelChange,
      onExclusionStateChange,
    };
  }, [model, layoutModel, camera, frame, editor, onExclusionStateChange]);

  useEffect(() => {
    if (editor?.enabled) return;
    dragRef.current = null;
    resizeRef.current = null;
    pathResizeRef.current = null;
    pathCreateRef.current = null;
    setDraggingTarget(null);
    setIsResizing(false);
    setCreatingPath(null);
    setPathCreateTargetZoneId(null);
    setHoveredTargetKey(null);
    setSelectedTargetKey(null);
    setEditingZoneId(null);
    onExclusionStateChange?.(undefined);
  }, [editor?.enabled, onExclusionStateChange]);

  useEffect(() => {
    if (!editingZoneId) return;
    if (model.zonesById[editingZoneId]) return;
    setEditingZoneId(null);
  }, [editingZoneId, model]);

  const isPathLabelClickSuppressed = (targetKey: string) => {
    const current = suppressedPathLabelClickRef.current;
    return current.targetKey === targetKey && Date.now() < current.until;
  };

  useEffect(() => {
    const stopDragging = () => {
      const drag = dragRef.current;
      const resize = resizeRef.current;
      const pathResize = pathResizeRef.current;
      const pathCreate = pathCreateRef.current;

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

      if (drag?.target.kind === "zone" && drag.hasMoved && !resize && !pathResize) {
        const reparented = commitZoneReparentAtCurrentPosition({
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
        });

        if (created) {
          latestRef.current.onModelChange?.(created.model);
          latestRef.current.onLayoutModelChange?.(created.layoutModel);
          setSelectedTargetKey(`path:${created.pathId}`);
        }
      }

      dragRef.current = null;
      resizeRef.current = null;
      pathResizeRef.current = null;
      pathCreateRef.current = null;
      setDraggingTarget(null);
      setIsResizing(false);
      setCreatingPath(null);
      setPathCreateTargetZoneId(null);
      setHoveredTargetKey(null);
      latestRef.current.onExclusionStateChange?.(undefined);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const handlePointerMove = (event: PointerEvent) => {
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
        });

        onLayoutModelChange(nextLayoutModel);
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
          dragRef.current = {
            ...drag,
            hasMoved: true,
          };
          setDraggingTarget(drag.target);
          latestRef.current.onExclusionStateChange?.(getExclusionState(drag.target));
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
        }

        const nextLayoutModel = moveEditorTargetByScreenDelta({
          layoutModel: latestRef.current.layoutModel,
          camera: latestRef.current.camera,
          origin: drag.origin,
          deltaX: event.clientX - drag.startClientX,
          deltaY: event.clientY - drag.startClientY,
        });

        onLayoutModelChange(nextLayoutModel);
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

  const dropTargetZoneId = useMemo(() => {
    if (isResizing || draggingTarget?.kind !== "zone") {
      return null;
    }

    const resolved = resolveZoneReparentCandidate({
      model,
      layoutModel,
      zoneId: draggingTarget.zoneId,
    });

    if (resolved.candidateParentZoneId === resolved.currentParentZoneId) {
      return null;
    }

    return resolved.candidateParentZoneId;
  }, [draggingTarget, isResizing, layoutModel, model]);

  const openZoneEditor = (zoneId: ZoneId, targetKey: string) => {
    if (editor?.onZoneEditClick) {
      editor.onZoneEditClick(zoneId);
    } else {
      setEditingZoneId(zoneId);
    }

    setSelectedTargetKey(targetKey);
  };

  if (!editor?.enabled || !frame) return null;

  const editingZone = editingZoneId ? model.zonesById[editingZoneId] : undefined;
  const dropTargetRect = dropTargetZoneId
    ? frame.pipeline.graphLayout.zonesById[dropTargetZoneId]?.rect
    : undefined;
  const dropTargetScreenRect = dropTargetRect
    ? toScreenRect(dropTargetRect, camera)
    : undefined;
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

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
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
        {draggingTarget
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
            Drag nodes to move them. Drag the right anchor to add a condition path.
            Use the bottom-right handle to resize zones, or double-click a zone
            to edit it. Drag the right-side grip on a path to widen its label area.
          </div>
        </div>

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

        {dropTargetScreenRect && dropTargetZoneId ? (
          <div
            style={{
              position: "absolute",
              left: `${dropTargetScreenRect.x}px`,
              top: `${dropTargetScreenRect.y}px`,
              width: `${dropTargetScreenRect.width}px`,
              height: `${dropTargetScreenRect.height}px`,
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
        ) : null}

        {targets.map((target) => {
          const isDragging = draggingTarget?.key === target.key;
          const isResizingTarget = isResizing && isDragging;
          const resizeCursor =
            isResizingTarget && target.kind === "path"
              ? "ew-resize"
              : "nwse-resize";
          const visualState = getTargetVisualState({
            target,
            hoveredTargetKey,
            selectedTargetKey,
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
          const shouldShowPathResizeHandle =
            target.kind === "path" &&
            !creatingPath &&
            (visualState === "hover" ||
              visualState === "selected" ||
              isResizingTarget);
          const shouldShowZoneEditButton =
            target.kind === "zone" &&
            !!zone &&
            (!!editor.renderZoneEditor || !!editor.onZoneEditClick) &&
            !isDragging &&
            (visualState !== "idle" || isEditingZone);
          const shouldShowResizeHandle =
            target.kind === "zone" &&
            !creatingPath &&
            (visualState === "hover" ||
              visualState === "selected" ||
              isResizingTarget);
          const shouldShowPathEditTrigger =
            target.kind === "path" &&
            (!!editor.onPathLabelClick ||
              !!editor.onPathLabelDoubleClick ||
              !!editor.onPathLabelContextMenu) &&
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
                const origin = resolveMoveEditorDragOrigin(layoutModel, target);
                if (!origin) return;

                if (target.kind === "zone") {
                  event.preventDefault();
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
                ...getTargetOutlineStyle(target, visualState),
              }}
            >
              {sourceAnchorLocalRect && target.kind === "zone" ? (
                <button
                  type="button"
                  title={`${target.label} add path`}
                  onPointerDown={(event) => {
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

              {shouldShowResizeHandle ? (
                <button
                  type="button"
                  title={`${target.label} resize`}
                  onPointerDown={(event) => {
                    if (target.kind !== "zone") return;

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
                  title={`${target.label} width`}
                  onPointerDown={(event) => {
                    if (target.kind !== "path") return;

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

                    setDraggingTarget(target);
                    setIsResizing(true);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    onExclusionStateChange?.(getExclusionState(target));
                    document.body.style.cursor = "ew-resize";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    right: -7,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 16,
                    height: 28,
                    border: "1px solid rgba(51, 65, 85, 0.92)",
                    borderRadius: 999,
                    background: "#f8fafc",
                    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.16)",
                    cursor: "ew-resize",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 5,
                      top: 6,
                      width: 1,
                      height: 14,
                      background: "#0f172a",
                      boxShadow: "4px 0 0 #0f172a",
                    }}
                  />
                </button>
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
                    if (isPathLabelClickSuppressed(target.key)) return;
                    setSelectedTargetKey(target.key);
                    editor.onPathLabelClick?.({
                      pathId: target.pathId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (isPathLabelClickSuppressed(target.key)) return;
                    setSelectedTargetKey(target.key);
                    editor.onPathLabelDoubleClick?.({
                      pathId: target.pathId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
                  }}
                  onContextMenu={(event) => {
                    if (!editor.onPathLabelContextMenu) return;

                    event.preventDefault();
                    event.stopPropagation();
                    if (isPathLabelClickSuppressed(target.key)) return;
                    setSelectedTargetKey(target.key);
                    editor.onPathLabelContextMenu({
                      pathId: target.pathId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
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
    </div>
  );
}
