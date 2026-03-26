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
      kind: "path";
      pathId: PathId;
      originX: number;
      originY: number;
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

export function moveEditorTargetByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: MoveEditorDragOrigin;
  deltaX: number;
  deltaY: number;
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
  } = params;

  const nextX = Math.round((origin.originX + deltaX / camera.zoom) * 100) / 100;
  const nextY = Math.round((origin.originY + deltaY / camera.zoom) * 100) / 100;

  if (origin.kind === "zone") {
    return updateZoneLayout(layoutModel, origin.zoneId, {
      x: nextX,
      y: nextY,
    });
  }

  const componentId = resolvePathNodeLayoutComponentId(layoutModel, origin.pathId);
  if (componentId) {
    const currentRect =
      getPathLayout(layoutModel, origin.pathId)?.componentLayoutsById?.[componentId];

    if (currentRect) {
      return setPathComponentLayout(layoutModel, origin.pathId, componentId, {
        x: nextX,
        y: nextY,
        width: currentRect.width,
        height: currentRect.height,
      });
    }
  }

  return updatePathLayout(layoutModel, origin.pathId, {
    routeOffset: {
      x: nextX,
      y: nextY,
    },
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
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    minWidth = DEFAULT_MIN_ZONE_WIDTH,
    minHeight = DEFAULT_MIN_ZONE_HEIGHT,
  } = params;

  const currentLayout = getZoneLayout(layoutModel, origin.zoneId);
  if (!currentLayout) return layoutModel;

  const nextWidth = Math.max(
    minWidth,
    roundCoordinate(origin.originWidth + deltaX / camera.zoom)
  );
  const nextHeight = Math.max(
    minHeight,
    roundCoordinate(origin.originHeight + deltaY / camera.zoom)
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
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    minWidth = 140,
    minHeight = 32,
  } = params;

  const nextWidth = Math.max(
    minWidth,
    roundCoordinate(origin.originWidth + deltaX / camera.zoom)
  );
  const nextHeight = Math.max(
    minHeight,
    roundCoordinate(origin.originHeight + deltaY / camera.zoom)
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
