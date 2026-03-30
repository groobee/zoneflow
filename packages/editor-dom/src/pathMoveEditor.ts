import {
  getPathLayout,
  setPathComponentLayout,
  updatePathLayout,
  type PathId,
  type UniverseLayoutModel,
} from "@zoneflow/core";
import type {
  CameraState,
  Rect,
  RendererFrame,
} from "@zoneflow/renderer-dom";
import {
  roundCoordinate,
  snapCoordinate,
  type GridSnapOptions,
  type MoveEditorDragOrigin,
  type PathAlignMode,
  type PathDistributeMode,
  type PathMoveOriginSnapshot,
  type PathResizeOrigin,
} from "./moveEditorShared";

export type PathNodeSnapshot = {
  pathId: PathId;
  origin: PathMoveOriginSnapshot;
  rect: Rect;
};

export function resolvePathNodeLayoutComponentId(
  layoutModel: UniverseLayoutModel,
  pathId: PathId
): "body" | "label" | null {
  const componentLayoutsById = getPathLayout(layoutModel, pathId)?.componentLayoutsById;
  if (componentLayoutsById?.body) return "body";
  if (componentLayoutsById?.label) return "label";
  return null;
}

export function resolvePathMoveOriginSnapshot(params: {
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
  frame?: RendererFrame;
}): PathMoveOriginSnapshot {
  const { layoutModel, pathId, frame } = params;
  const componentId = resolvePathNodeLayoutComponentId(layoutModel, pathId);
  const pathLayout = getPathLayout(layoutModel, pathId);
  const pathVisual = frame?.pipeline.graphLayout.pathsById[pathId];

  if (componentId) {
    const componentRect = pathLayout?.componentLayoutsById?.[componentId];

    if (componentRect) {
      return {
        x: componentRect.x,
        y: componentRect.y,
        width: componentRect.width ?? pathVisual?.rect?.width ?? 0,
        height: componentRect.height ?? pathVisual?.rect?.height ?? 0,
        componentId,
        coordinateSpace: "component-layout",
      };
    }
  }

  const routeOffset = pathLayout?.routeOffset;

  return {
    x: routeOffset?.x ?? 0,
    y: routeOffset?.y ?? 0,
    width: pathVisual?.rect?.width ?? 0,
    height: pathVisual?.rect?.height ?? 0,
    componentId: null,
    coordinateSpace: "route-offset",
  };
}

export function resolvePathNodeSnapshot(params: {
  frame: RendererFrame;
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
}): PathNodeSnapshot | undefined {
  const { frame, layoutModel, pathId } = params;
  const pathVisual = frame.pipeline.graphLayout.pathsById[pathId];
  if (!pathVisual?.rect) return undefined;

  const origin = resolvePathMoveOriginSnapshot({
    frame,
    layoutModel,
    pathId,
  });

  return {
    pathId,
    origin,
    rect:
      origin.coordinateSpace === "component-layout"
        ? {
            x: origin.x,
            y: origin.y,
            width: origin.width,
            height: origin.height,
          }
        : pathVisual.rect,
  };
}

export function applyPathMovePosition(params: {
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
  origin: PathMoveOriginSnapshot;
  x: number;
  y: number;
}): UniverseLayoutModel {
  const { layoutModel, pathId, origin, x, y } = params;

  if (origin.coordinateSpace === "route-offset") {
    return updatePathLayout(layoutModel, pathId, {
      routeOffset: {
        x,
        y,
      },
    });
  }

  return setPathComponentLayout(
    layoutModel,
    pathId,
    origin.componentId ?? "body",
    {
      x,
      y,
      width: origin.width,
      height: origin.height,
    }
  );
}

export function applyPathNodeSnapshotRect(params: {
  layoutModel: UniverseLayoutModel;
  snapshot: PathNodeSnapshot;
  rect: Rect;
}): UniverseLayoutModel {
  const { layoutModel, snapshot, rect } = params;

  if (
    snapshot.origin.coordinateSpace === "route-offset" &&
    rect.width === snapshot.rect.width &&
    rect.height === snapshot.rect.height
  ) {
    const deltaX = rect.x - snapshot.rect.x;
    const deltaY = rect.y - snapshot.rect.y;

    return updatePathLayout(layoutModel, snapshot.pathId, {
      routeOffset: {
        x: roundCoordinate(snapshot.origin.x + deltaX),
        y: roundCoordinate(snapshot.origin.y + deltaY),
      },
    });
  }

  return setPathComponentLayout(
    layoutModel,
    snapshot.pathId,
    snapshot.origin.componentId ?? "body",
    {
      x: roundCoordinate(rect.x),
      y: roundCoordinate(rect.y),
      width: roundCoordinate(rect.width),
      height: roundCoordinate(rect.height),
    }
  );
}

export function resolveGroupPathDragOrigin(params: {
  frame: RendererFrame;
  layoutModel: UniverseLayoutModel;
  pathIds: PathId[];
  primaryPathId: PathId;
}): MoveEditorDragOrigin | undefined {
  const { frame, layoutModel, pathIds, primaryPathId } = params;
  const originsByPathId: Record<PathId, PathMoveOriginSnapshot> =
    {} as Record<PathId, PathMoveOriginSnapshot>;

  for (const pathId of pathIds) {
    const resolved = resolvePathNodeSnapshot({
      frame,
      layoutModel,
      pathId,
    });
    if (!resolved) continue;

    originsByPathId[pathId] = resolved.origin;
  }

  if (!originsByPathId[primaryPathId]) {
    return undefined;
  }

  return {
    kind: "path-group",
    primaryPathId,
    originsByPathId,
  };
}

export function alignPathsByMode(params: {
  frame: RendererFrame;
  layoutModel: UniverseLayoutModel;
  pathIds: PathId[];
  mode: PathAlignMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { frame, layoutModel, pathIds, mode, gridSnap } = params;
  const entries = pathIds
    .map((pathId) =>
      resolvePathNodeSnapshot({
        frame,
        layoutModel,
        pathId,
      })
    )
    .filter((entry): entry is PathNodeSnapshot => Boolean(entry));

  if (entries.length < 2) return layoutModel;

  const reference =
    mode === "left"
      ? Math.min(...entries.map((entry) => entry.rect.x))
      : mode === "right"
        ? Math.max(...entries.map((entry) => entry.rect.x + entry.rect.width))
        : mode === "top"
          ? Math.min(...entries.map((entry) => entry.rect.y))
          : mode === "bottom"
            ? Math.max(...entries.map((entry) => entry.rect.y + entry.rect.height))
            : mode === "center-horizontal"
              ? entries.reduce(
                  (sum, entry) => sum + entry.rect.x + entry.rect.width / 2,
                  0
                ) / entries.length
              : entries.reduce(
                  (sum, entry) => sum + entry.rect.y + entry.rect.height / 2,
                  0
                ) / entries.length;
  const snappedReference = snapCoordinate(reference, gridSnap);

  let nextLayoutModel = layoutModel;
  for (const entry of entries) {
    nextLayoutModel = applyPathNodeSnapshotRect({
      layoutModel: nextLayoutModel,
      snapshot: entry,
      rect: {
        x:
          mode === "left"
            ? snappedReference
            : mode === "right"
              ? snapCoordinate(snappedReference - entry.rect.width, gridSnap)
              : mode === "center-horizontal"
                ? snapCoordinate(snappedReference - entry.rect.width / 2, gridSnap)
                : entry.rect.x,
        y:
          mode === "top"
            ? snappedReference
            : mode === "bottom"
              ? snapCoordinate(snappedReference - entry.rect.height, gridSnap)
              : mode === "center-vertical"
                ? snapCoordinate(snappedReference - entry.rect.height / 2, gridSnap)
                : entry.rect.y,
        width: entry.rect.width,
        height: entry.rect.height,
      },
    });
  }

  return nextLayoutModel;
}

export function distributePathsByMode(params: {
  frame: RendererFrame;
  layoutModel: UniverseLayoutModel;
  pathIds: PathId[];
  mode: PathDistributeMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { frame, layoutModel, pathIds, mode, gridSnap } = params;
  const axis = mode === "horizontal" ? "x" : "y";
  const sizeKey = mode === "horizontal" ? "width" : "height";
  const entries = pathIds
    .map((pathId) =>
      resolvePathNodeSnapshot({
        frame,
        layoutModel,
        pathId,
      })
    )
    .filter((entry): entry is PathNodeSnapshot => Boolean(entry))
    .sort((a, b) => a.rect[axis] - b.rect[axis]);

  if (entries.length < 3) return layoutModel;

  const first = entries[0];
  const last = entries[entries.length - 1];
  const span = last.rect[axis] + last.rect[sizeKey] - first.rect[axis];
  const occupied = entries.reduce((sum, entry) => sum + entry.rect[sizeKey], 0);
  const gap = (span - occupied) / (entries.length - 1);

  let cursor = first.rect[axis] + first.rect[sizeKey] + gap;
  let nextLayoutModel = layoutModel;

  for (const entry of entries.slice(1, -1)) {
    const snapped = snapCoordinate(cursor, gridSnap);
    nextLayoutModel = applyPathNodeSnapshotRect({
      layoutModel: nextLayoutModel,
      snapshot: entry,
      rect: {
        x: mode === "horizontal" ? snapped : entry.rect.x,
        y: mode === "vertical" ? snapped : entry.rect.y,
        width: entry.rect.width,
        height: entry.rect.height,
      },
    });
    cursor += entry.rect[sizeKey] + gap;
  }

  return nextLayoutModel;
}

export function resolvePathResizeOrigin(params: {
  frame: RendererFrame;
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
}): PathResizeOrigin | undefined {
  const { frame, layoutModel, pathId } = params;
  const snapshot = resolvePathNodeSnapshot({
    frame,
    layoutModel,
    pathId,
  });
  if (!snapshot) return undefined;

  return {
    pathId,
    componentId: snapshot.origin.componentId ?? "body",
    originX: snapshot.rect.x,
    originY: snapshot.rect.y,
    originWidth: snapshot.rect.width,
    originHeight: snapshot.rect.height,
  };
}

export function resizePathNodeByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: PathResizeOrigin;
  deltaX: number;
  deltaY: number;
  minWidth?: number;
  minHeight?: number;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    minWidth = 140,
    minHeight = 32,
    gridSnap,
  } = params;

  const nextWidth = Math.max(
    minWidth,
    snapCoordinate(origin.originWidth + deltaX / camera.zoom, gridSnap)
  );
  const nextHeight = Math.max(
    minHeight,
    snapCoordinate(origin.originHeight + deltaY / camera.zoom, gridSnap)
  );

  return setPathComponentLayout(
    layoutModel,
    origin.pathId,
    origin.componentId,
    {
      x: origin.originX,
      y: origin.originY,
      width: nextWidth,
      height: nextHeight,
    }
  );
}
