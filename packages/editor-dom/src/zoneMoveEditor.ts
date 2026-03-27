import {
  collectSubtreeZoneIds,
  getPathLayout,
  setPathComponentLayout,
  getZoneLayout,
  getZoneDepth,
  moveZone,
  updatePathLayout,
  updateZoneLayout,
  type PathId,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import type {
  CameraState,
  Rect,
  RendererFrame,
} from "@zoneflow/renderer-dom";

export type MoveEditorTarget =
  | {
      key: string;
      kind: "zone";
      zoneId: ZoneId;
      label: string;
      rect: Rect;
    }
  | {
      key: string;
      kind: "path";
      pathId: PathId;
      label: string;
      rect: Rect;
    };

export type MoveEditorTargetOptions = {
  includeRoot?: boolean;
  minVisibleSize?: number;
};

export type MoveEditorDragOrigin =
  | {
      kind: "zone";
      zoneId: ZoneId;
      originX: number;
      originY: number;
    }
  | {
      kind: "zone-group";
      primaryZoneId: ZoneId;
      originsByZoneId: Record<ZoneId, Point>;
    }
  | {
      kind: "path";
      pathId: PathId;
      originX: number;
      originY: number;
    }
  | {
      kind: "path-group";
      primaryPathId: PathId;
      originsByPathId: Record<
        PathId,
        {
          x: number;
          y: number;
          width: number;
          height: number;
          componentId: "body" | "label" | null;
        }
      >;
    };

export type ZoneResizeOrigin = {
  zoneId: ZoneId;
  originWidth: number;
  originHeight: number;
};

export type PathResizeOrigin = {
  pathId: PathId;
  componentId: "body" | "label";
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
};

export type GridSnapOptions = {
  enabled?: boolean;
  size?: number;
};

export type ZoneAlignMode =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "center-horizontal"
  | "center-vertical";
export type ZoneDistributeMode = "horizontal" | "vertical";
export type PathAlignMode = ZoneAlignMode;
export type PathDistributeMode = ZoneDistributeMode;

const DEFAULT_MIN_VISIBLE_SIZE = 18;
const DEFAULT_MIN_ZONE_WIDTH = 140;
const DEFAULT_MIN_ZONE_HEIGHT = 96;
const ROOT_WORLD_ORIGIN: Point = { x: 0, y: 0 };

function resolvePathNodeLayoutComponentId(
  layoutModel: UniverseLayoutModel,
  pathId: PathId
): "body" | "label" | null {
  const componentLayoutsById = getPathLayout(layoutModel, pathId)?.componentLayoutsById;
  if (componentLayoutsById?.body) return "body";
  if (componentLayoutsById?.label) return "label";
  return null;
}

function resolvePathNodeRect(params: {
  frame: RendererFrame;
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
}):
  | {
      componentId: "body" | "label" | null;
      rect: Rect;
    }
  | undefined {
  const { frame, layoutModel, pathId } = params;
  const pathVisual = frame.pipeline.graphLayout.pathsById[pathId];
  if (!pathVisual?.rect) return undefined;

  const componentId = resolvePathNodeLayoutComponentId(layoutModel, pathId);
  const componentRect =
    componentId
      ? getPathLayout(layoutModel, pathId)?.componentLayoutsById?.[componentId]
      : undefined;

  return {
    componentId,
    rect: componentRect
      ? {
          x: componentRect.x,
          y: componentRect.y,
          width: componentRect.width ?? pathVisual.rect.width,
          height: componentRect.height ?? pathVisual.rect.height,
        }
      : pathVisual.rect,
  };
}

function setPathNodePosition(params: {
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
  x: number;
  y: number;
  componentId?: "body" | "label" | null;
  width?: number;
  height?: number;
}): UniverseLayoutModel {
  const { layoutModel, pathId, x, y, width, height } = params;
  const componentId =
    params.componentId ?? resolvePathNodeLayoutComponentId(layoutModel, pathId);

  if (componentId) {
    const currentRect =
      getPathLayout(layoutModel, pathId)?.componentLayoutsById?.[componentId];

    return setPathComponentLayout(layoutModel, pathId, componentId, {
      x,
      y,
      width: width ?? currentRect?.width ?? 0,
      height: height ?? currentRect?.height ?? 0,
    });
  }

  if (width !== undefined && height !== undefined) {
    return setPathComponentLayout(layoutModel, pathId, "body", {
      x,
      y,
      width,
      height,
    });
  }

  return updatePathLayout(layoutModel, pathId, {
    routeOffset: {
      x,
      y,
    },
  });
}

function typedValues<TKey extends string, TValue>(
  record: Record<TKey, TValue>
): TValue[] {
  return Object.values(record) as TValue[];
}

function projectWorldRectToScreenRect(
  rect: Rect,
  camera: CameraState
): Rect {
  return {
    x: camera.x + rect.x * camera.zoom,
    y: camera.y + rect.y * camera.zoom,
    width: rect.width * camera.zoom,
    height: rect.height * camera.zoom,
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveSnapSize(options?: GridSnapOptions): number | null {
  if (!options?.enabled) return null;
  const size = options.size ?? 16;
  if (!Number.isFinite(size) || size <= 0) return null;
  return size;
}

function snapCoordinate(value: number, options?: GridSnapOptions): number {
  const size = resolveSnapSize(options);
  if (!size) return roundCoordinate(value);
  return roundCoordinate(Math.round(value / size) * size);
}

function resolveWorldZoneOrigin(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneId: ZoneId;
  cache?: Map<ZoneId, Point>;
}): Point {
  const {
    model,
    layoutModel,
    zoneId,
    cache = new Map<ZoneId, Point>(),
  } = params;

  const cached = cache.get(zoneId);
  if (cached) {
    return cached;
  }

  const zone = model.zonesById[zoneId];
  const layout = layoutModel.zoneLayoutsById[zoneId];
  if (!zone || !layout) {
    cache.set(zoneId, ROOT_WORLD_ORIGIN);
    return ROOT_WORLD_ORIGIN;
  }

  if (!zone.parentZoneId) {
    const point = {
      x: layout.x,
      y: layout.y,
    };
    cache.set(zoneId, point);
    return point;
  }

  const parentOrigin = resolveWorldZoneOrigin({
    model,
    layoutModel,
    zoneId: zone.parentZoneId,
    cache,
  });

  const point = {
    x: parentOrigin.x + layout.x,
    y: parentOrigin.y + layout.y,
  };

  cache.set(zoneId, point);
  return point;
}

function resolveWorldZoneRect(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneId: ZoneId;
  cache?: Map<ZoneId, Point>;
}): Rect | undefined {
  const { model, layoutModel, zoneId, cache } = params;
  const layout = getZoneLayout(layoutModel, zoneId);
  if (!layout) return undefined;

  const origin = resolveWorldZoneOrigin({
    model,
    layoutModel,
    zoneId,
    cache,
  });

  return {
    x: origin.x,
    y: origin.y,
    width: layout.width ?? 0,
    height: layout.height ?? 0,
  };
}

function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function getRectArea(rect: Rect): number {
  return rect.width * rect.height;
}

export function getMoveEditorTargets(params: {
  model: UniverseModel;
  frame: RendererFrame;
  camera: CameraState;
  options?: MoveEditorTargetOptions;
}): MoveEditorTarget[] {
  const {
    model,
    frame,
    camera,
    options,
  } = params;

  const includeRoot = options?.includeRoot ?? true;
  const minVisibleSize = options?.minVisibleSize ?? DEFAULT_MIN_VISIBLE_SIZE;
  const targets: MoveEditorTarget[] = [];

  for (const zoneVisual of typedValues(frame.pipeline.graphLayout.zonesById)) {
    const zone = model.zonesById[zoneVisual.zoneId];
    const visibility =
      frame.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];

    if (!zone || !visibility?.isVisible) continue;
    if (!includeRoot && model.rootZoneIds.includes(zone.id)) continue;

    const rect = projectWorldRectToScreenRect(zoneVisual.rect, camera);
    if (rect.width < minVisibleSize || rect.height < minVisibleSize) {
      continue;
    }

    targets.push({
      key: `zone:${zoneVisual.zoneId}`,
      kind: "zone",
      zoneId: zoneVisual.zoneId,
      label: zone.name,
      rect,
    });
  }

  for (const pathVisual of typedValues(frame.pipeline.graphLayout.pathsById)) {
    const visibility =
      frame.pipeline.visibility.pathVisibilityById[pathVisual.pathId];

    if (!visibility?.shouldRenderNode || !pathVisual.rect) continue;

    const rect = projectWorldRectToScreenRect(pathVisual.rect, camera);
    if (rect.width < minVisibleSize || rect.height < minVisibleSize) {
      continue;
    }

    targets.push({
      key: `path:${pathVisual.pathId}`,
      kind: "path",
      pathId: pathVisual.pathId,
      label: pathVisual.path.name,
      rect,
    });
  }

  return targets;
}

export function resolveMoveEditorDragOrigin(
  layoutModel: UniverseLayoutModel,
  target: MoveEditorTarget
): MoveEditorDragOrigin | undefined {
  if (target.kind === "zone") {
    const zoneLayout = getZoneLayout(layoutModel, target.zoneId);
    if (!zoneLayout) return undefined;

    return {
      kind: "zone",
      zoneId: target.zoneId,
      originX: zoneLayout.x,
      originY: zoneLayout.y,
    };
  }

  const routeOffset = getPathLayout(layoutModel, target.pathId)?.routeOffset;

  return {
    kind: "path",
    pathId: target.pathId,
    originX: routeOffset?.x ?? 0,
    originY: routeOffset?.y ?? 0,
  };
}

export function resolveGroupZoneDragOrigin(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  primaryZoneId: ZoneId;
}): MoveEditorDragOrigin | undefined {
  const { layoutModel, zoneIds, primaryZoneId } = params;
  const originsByZoneId: Record<ZoneId, Point> = {} as Record<ZoneId, Point>;

  for (const zoneId of zoneIds) {
    const zoneLayout = getZoneLayout(layoutModel, zoneId);
    if (!zoneLayout) continue;
    originsByZoneId[zoneId] = {
      x: zoneLayout.x,
      y: zoneLayout.y,
    };
  }

  if (!originsByZoneId[primaryZoneId]) {
    return undefined;
  }

  return {
    kind: "zone-group",
    primaryZoneId,
    originsByZoneId,
  };
}

export function resolveGroupPathDragOrigin(params: {
  frame: RendererFrame;
  layoutModel: UniverseLayoutModel;
  pathIds: PathId[];
  primaryPathId: PathId;
}): MoveEditorDragOrigin | undefined {
  const { frame, layoutModel, pathIds, primaryPathId } = params;
  const originsByPathId: Record<
    PathId,
    {
      x: number;
      y: number;
      width: number;
      height: number;
      componentId: "body" | "label" | null;
    }
  > = {} as Record<
    PathId,
    {
      x: number;
      y: number;
      width: number;
      height: number;
      componentId: "body" | "label" | null;
    }
  >;

  for (const pathId of pathIds) {
    const resolved = resolvePathNodeRect({
      frame,
      layoutModel,
      pathId,
    });
    if (!resolved) continue;

    originsByPathId[pathId] = {
      x: resolved.rect.x,
      y: resolved.rect.y,
      width: resolved.rect.width,
      height: resolved.rect.height,
      componentId: resolved.componentId,
    };
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

export function moveEditorTargetByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: MoveEditorDragOrigin;
  deltaX: number;
  deltaY: number;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    gridSnap,
  } = params;

  if (origin.kind === "zone") {
    const nextX = snapCoordinate(origin.originX + deltaX / camera.zoom, gridSnap);
    const nextY = snapCoordinate(origin.originY + deltaY / camera.zoom, gridSnap);
    return updateZoneLayout(layoutModel, origin.zoneId, {
      x: nextX,
      y: nextY,
    });
  }

  if (origin.kind === "zone-group") {
    const primaryOrigin = origin.originsByZoneId[origin.primaryZoneId];
    if (!primaryOrigin) return layoutModel;

    const primaryNextX = snapCoordinate(primaryOrigin.x + deltaX / camera.zoom, gridSnap);
    const primaryNextY = snapCoordinate(primaryOrigin.y + deltaY / camera.zoom, gridSnap);
    const effectiveDeltaX = primaryNextX - primaryOrigin.x;
    const effectiveDeltaY = primaryNextY - primaryOrigin.y;

    let nextLayoutModel = layoutModel;
    for (const [zoneId, point] of Object.entries(origin.originsByZoneId) as Array<
      [ZoneId, Point]
    >) {
      nextLayoutModel = updateZoneLayout(nextLayoutModel, zoneId, {
        x: roundCoordinate(point.x + effectiveDeltaX),
        y: roundCoordinate(point.y + effectiveDeltaY),
      });
    }

    return nextLayoutModel;
  }

  if (origin.kind === "path-group") {
    const primaryOrigin = origin.originsByPathId[origin.primaryPathId];
    if (!primaryOrigin) return layoutModel;

    const primaryNextX = snapCoordinate(primaryOrigin.x + deltaX / camera.zoom, gridSnap);
    const primaryNextY = snapCoordinate(primaryOrigin.y + deltaY / camera.zoom, gridSnap);
    const effectiveDeltaX = primaryNextX - primaryOrigin.x;
    const effectiveDeltaY = primaryNextY - primaryOrigin.y;

    let nextLayoutModel = layoutModel;
    for (const [pathId, rect] of Object.entries(origin.originsByPathId) as Array<
      [
        PathId,
        {
          x: number;
          y: number;
          width: number;
          height: number;
          componentId: "body" | "label" | null;
        },
      ]
    >) {
      nextLayoutModel = setPathNodePosition({
        layoutModel: nextLayoutModel,
        pathId,
        x: roundCoordinate(rect.x + effectiveDeltaX),
        y: roundCoordinate(rect.y + effectiveDeltaY),
        width: rect.width,
        height: rect.height,
        componentId: rect.componentId,
      });
    }

    return nextLayoutModel;
  }

  const nextX = snapCoordinate(origin.originX + deltaX / camera.zoom, gridSnap);
  const nextY = snapCoordinate(origin.originY + deltaY / camera.zoom, gridSnap);
  return setPathNodePosition({
    layoutModel,
    pathId: origin.pathId,
    x: nextX,
    y: nextY,
  });
}

function resolveResizedAnchor(params: {
  kind: "inlet" | "outlet";
  width: number;
  height: number;
  current?: NonNullable<UniverseLayoutModel["zoneLayoutsById"][ZoneId]>["anchors"]["inlet"];
}) {
  const { kind, width, height, current } = params;
  const rectWidth = current?.rect?.width;
  const rectHeight = current?.rect?.height;
  const nextCenterY = roundCoordinate(height / 2);
  const nextRectY =
    rectHeight !== undefined
      ? roundCoordinate(nextCenterY - rectHeight / 2)
      : undefined;

  return {
    point: {
      x: kind === "inlet" ? 0 : roundCoordinate(width),
      y: nextCenterY,
    },
    rect: current?.rect
      ? {
          ...current.rect,
          x:
            kind === "inlet"
              ? 0
              : roundCoordinate(width - (rectWidth ?? current.rect.width ?? 0)),
          y: nextRectY ?? current.rect.y,
          width: rectWidth,
          height: rectHeight,
        }
      : undefined,
  };
}

export function resolveZoneResizeOrigin(
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId
): ZoneResizeOrigin | undefined {
  const zoneLayout = getZoneLayout(layoutModel, zoneId);
  if (!zoneLayout) return undefined;

  return {
    zoneId,
    originWidth: zoneLayout.width ?? 0,
    originHeight: zoneLayout.height ?? 0,
  };
}

export function resizeZoneByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: ZoneResizeOrigin;
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
    minWidth = DEFAULT_MIN_ZONE_WIDTH,
    minHeight = DEFAULT_MIN_ZONE_HEIGHT,
    gridSnap,
  } = params;

  const currentLayout = getZoneLayout(layoutModel, origin.zoneId);
  if (!currentLayout) return layoutModel;

  const nextWidth = Math.max(
    minWidth,
    snapCoordinate(origin.originWidth + deltaX / camera.zoom, gridSnap)
  );
  const nextHeight = Math.max(
    minHeight,
    snapCoordinate(origin.originHeight + deltaY / camera.zoom, gridSnap)
  );

  return updateZoneLayout(layoutModel, origin.zoneId, {
    width: nextWidth,
    height: nextHeight,
    anchors: {
      inlet: resolveResizedAnchor({
        kind: "inlet",
        width: nextWidth,
        height: nextHeight,
        current: currentLayout.anchors.inlet,
      }),
      outlet: resolveResizedAnchor({
        kind: "outlet",
        width: nextWidth,
        height: nextHeight,
        current: currentLayout.anchors.outlet,
      }),
    },
  });
}

export function alignZonesByMode(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  mode: ZoneAlignMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { layoutModel, zoneIds, mode, gridSnap } = params;
  const entries = zoneIds
    .map((zoneId) => ({
      zoneId,
      layout: getZoneLayout(layoutModel, zoneId),
    }))
    .filter(
      (
        entry
      ): entry is {
        zoneId: ZoneId;
        layout: NonNullable<ReturnType<typeof getZoneLayout>>;
      } => Boolean(entry.layout)
    );

  if (entries.length < 2) return layoutModel;

  const reference =
    mode === "left"
      ? Math.min(...entries.map((entry) => entry.layout.x))
      : mode === "right"
        ? Math.max(
            ...entries.map((entry) => entry.layout.x + (entry.layout.width ?? 0))
          )
        : mode === "top"
          ? Math.min(...entries.map((entry) => entry.layout.y))
          : mode === "bottom"
            ? Math.max(
                ...entries.map((entry) => entry.layout.y + (entry.layout.height ?? 0))
              )
            : mode === "center-horizontal"
              ? entries.reduce(
                  (sum, entry) => sum + entry.layout.x + (entry.layout.width ?? 0) / 2,
                  0
                ) / entries.length
              : entries.reduce(
                  (sum, entry) => sum + entry.layout.y + (entry.layout.height ?? 0) / 2,
                  0
                ) / entries.length;
  const snappedReference = snapCoordinate(reference, gridSnap);

  let nextLayoutModel = layoutModel;
  for (const entry of entries) {
    nextLayoutModel = updateZoneLayout(nextLayoutModel, entry.zoneId, {
      x:
        mode === "left"
          ? snappedReference
          : mode === "right"
            ? snapCoordinate(
                snappedReference - (entry.layout.width ?? 0),
                gridSnap
              )
            : mode === "center-horizontal"
              ? snapCoordinate(
                  snappedReference - (entry.layout.width ?? 0) / 2,
                  gridSnap
                )
              : entry.layout.x,
      y:
        mode === "top"
          ? snappedReference
          : mode === "bottom"
            ? snapCoordinate(
                snappedReference - (entry.layout.height ?? 0),
                gridSnap
              )
            : mode === "center-vertical"
              ? snapCoordinate(
                  snappedReference - (entry.layout.height ?? 0) / 2,
                  gridSnap
                )
              : entry.layout.y,
    });
  }

  return nextLayoutModel;
}

export function distributeZonesByMode(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  mode: ZoneDistributeMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { layoutModel, zoneIds, mode, gridSnap } = params;
  const axis = mode === "horizontal" ? "x" : "y";
  const sizeKey = mode === "horizontal" ? "width" : "height";
  const entries = zoneIds
    .map((zoneId) => ({
      zoneId,
      layout: getZoneLayout(layoutModel, zoneId),
    }))
    .filter(
      (
        entry
      ): entry is {
        zoneId: ZoneId;
        layout: NonNullable<ReturnType<typeof getZoneLayout>>;
      } => Boolean(entry.layout)
    )
    .sort((a, b) => a.layout[axis] - b.layout[axis]);

  if (entries.length < 3) return layoutModel;

  const first = entries[0];
  const last = entries[entries.length - 1];
  const span =
    last.layout[axis] + (last.layout[sizeKey] ?? 0) - first.layout[axis];
  const occupied = entries.reduce(
    (sum, entry) => sum + (entry.layout[sizeKey] ?? 0),
    0
  );
  const gap = (span - occupied) / (entries.length - 1);

  let cursor = first.layout[axis] + (first.layout[sizeKey] ?? 0) + gap;
  let nextLayoutModel = layoutModel;

  for (const entry of entries.slice(1, -1)) {
    const snapped = snapCoordinate(cursor, gridSnap);
    nextLayoutModel = updateZoneLayout(nextLayoutModel, entry.zoneId, {
      x: mode === "horizontal" ? snapped : entry.layout.x,
      y: mode === "vertical" ? snapped : entry.layout.y,
    });
    cursor += (entry.layout[sizeKey] ?? 0) + gap;
  }

  return nextLayoutModel;
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
    .map((pathId) => {
      const resolved = resolvePathNodeRect({
        frame,
        layoutModel,
        pathId,
      });

      return resolved
        ? {
            pathId,
            componentId: resolved.componentId,
            rect: resolved.rect,
          }
        : null;
    })
    .filter(
      (
        entry
      ): entry is {
        pathId: PathId;
        componentId: "body" | "label" | null;
        rect: Rect;
      } => Boolean(entry)
    );

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
    nextLayoutModel = setPathNodePosition({
      layoutModel: nextLayoutModel,
      pathId: entry.pathId,
      componentId: entry.componentId,
      width: entry.rect.width,
      height: entry.rect.height,
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
    .map((pathId) => {
      const resolved = resolvePathNodeRect({
        frame,
        layoutModel,
        pathId,
      });

      return resolved
        ? {
            pathId,
            componentId: resolved.componentId,
            rect: resolved.rect,
          }
        : null;
    })
    .filter(
      (
        entry
      ): entry is {
        pathId: PathId;
        componentId: "body" | "label" | null;
        rect: Rect;
      } => Boolean(entry)
    )
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
    nextLayoutModel = setPathNodePosition({
      layoutModel: nextLayoutModel,
      pathId: entry.pathId,
      componentId: entry.componentId,
      width: entry.rect.width,
      height: entry.rect.height,
      x: mode === "horizontal" ? snapped : entry.rect.x,
      y: mode === "vertical" ? snapped : entry.rect.y,
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
  const pathVisual = frame.pipeline.graphLayout.pathsById[pathId];
  if (!pathVisual?.rect) return undefined;

  const componentId =
    resolvePathNodeLayoutComponentId(layoutModel, pathId) ?? "body";
  const currentLayout =
    getPathLayout(layoutModel, pathId)?.componentLayoutsById?.[componentId];
  const rect = currentLayout ?? pathVisual.rect;

  return {
    pathId,
    componentId,
    originX: rect.x,
    originY: rect.y,
    originWidth: rect.width ?? pathVisual.rect.width,
    originHeight: rect.height ?? pathVisual.rect.height,
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

export function resolveZoneReparentCandidate(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneId: ZoneId;
}) {
  const {
    model,
    layoutModel,
    zoneId,
  } = params;

  const zone = model.zonesById[zoneId];
  const zoneLayout = getZoneLayout(layoutModel, zoneId);
  if (!zone || !zoneLayout) {
    return {
      candidateParentZoneId: null,
      currentParentZoneId: null,
      worldRect: undefined,
    };
  }

  const cache = new Map<ZoneId, Point>();
  const worldRect = resolveWorldZoneRect({
    model,
    layoutModel,
    zoneId,
    cache,
  });

  if (!worldRect) {
    return {
      candidateParentZoneId: zone.parentZoneId,
      currentParentZoneId: zone.parentZoneId,
      worldRect: undefined,
    };
  }

  const centerPoint = {
    x: worldRect.x + worldRect.width / 2,
    y: worldRect.y + worldRect.height / 2,
  };

  const invalidZoneIds = new Set(collectSubtreeZoneIds(model, zoneId));
  let nextParentZoneId = zone.parentZoneId;
  let bestDepth = -1;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const candidateZone of typedValues(model.zonesById)) {
    if (invalidZoneIds.has(candidateZone.id)) continue;

    const candidateRect = resolveWorldZoneRect({
      model,
      layoutModel,
      zoneId: candidateZone.id,
      cache,
    });

    if (!candidateRect || !containsPoint(candidateRect, centerPoint)) {
      continue;
    }

    const candidateDepth = getZoneDepth(model, candidateZone.id);
    const candidateArea = getRectArea(candidateRect);

    if (
      candidateDepth > bestDepth ||
      (candidateDepth === bestDepth && candidateArea < bestArea)
    ) {
      nextParentZoneId = candidateZone.id;
      bestDepth = candidateDepth;
      bestArea = candidateArea;
    }
  }

  return {
    candidateParentZoneId:
      bestDepth >= 0 ? nextParentZoneId : null,
    currentParentZoneId: zone.parentZoneId,
    worldRect,
  };
}

export function commitZoneReparentAtCurrentPosition(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneId: ZoneId;
}): {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  nextParentZoneId: ZoneId | null;
  didReparent: boolean;
} {
  const {
    model,
    layoutModel,
    zoneId,
  } = params;

  const resolved = resolveZoneReparentCandidate({
    model,
    layoutModel,
    zoneId,
  });

  if (
    !resolved.worldRect ||
    resolved.candidateParentZoneId === resolved.currentParentZoneId
  ) {
    return {
      model,
      layoutModel,
      nextParentZoneId: resolved.candidateParentZoneId,
      didReparent: false,
    };
  }

  const nextModel = moveZone(model, zoneId, resolved.candidateParentZoneId);
  const nextParentOrigin = resolved.candidateParentZoneId
    ? resolveWorldZoneOrigin({
        model,
        layoutModel,
        zoneId: resolved.candidateParentZoneId,
      })
    : ROOT_WORLD_ORIGIN;

  const nextLayoutModel = updateZoneLayout(layoutModel, zoneId, {
    x: roundCoordinate(resolved.worldRect.x - nextParentOrigin.x),
    y: roundCoordinate(resolved.worldRect.y - nextParentOrigin.y),
  });

  return {
    model: nextModel,
    layoutModel: nextLayoutModel,
    nextParentZoneId: resolved.candidateParentZoneId,
    didReparent: true,
  };
}

export const reparentZoneAtCurrentPosition = commitZoneReparentAtCurrentPosition;
