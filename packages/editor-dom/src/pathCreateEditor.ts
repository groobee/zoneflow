import {
  addPath,
  createPathId,
  isZoneInputEnabled,
  isZoneOutputEnabled,
  setPathTarget,
  type AnchorRect,
  updatePathLayout,
  type Path,
  type PathId,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
  type ZoneId,
} from "@zoneflow/core";
import {
  type CameraState,
  type Rect,
  type RendererFrame,
} from "@zoneflow/renderer-dom";
import type { GridSnapOptions } from "./zoneMoveEditor";

export type CanConnectPathParams = {
  mode: "create" | "retarget";
  sourceZoneId: ZoneId;
  targetZoneId: ZoneId;
  sourceZone: Zone;
  targetZone: Zone;
  model: UniverseModel;
  pathId?: PathId;
  path?: Path;
};

export type CanConnectPath = (params: CanConnectPathParams) => boolean;

function typedValues<TKey extends string, TValue>(
  record: Record<TKey, TValue>
): TValue[] {
  return Object.values(record) as TValue[];
}

const DEFAULT_PATH_NODE_WIDTH = 120;
const DEFAULT_PATH_NODE_HEIGHT = 32;
const DEFAULT_PATH_NODE_OFFSET_X = 32;
const DEFAULT_PATH_NODE_GAP_Y = 40;
const DEFAULT_ANCHOR_WIDTH = 24;
const DEFAULT_ANCHOR_ATTACH_DEPTH = 10;
const DEFAULT_PATH_OUTPUT_HANDLE_WIDTH = 18;
const DEFAULT_PATH_OUTPUT_HANDLE_MIN_HEIGHT = 22;
const DEFAULT_PATH_OUTPUT_HANDLE_MAX_HEIGHT = 40;
const DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y = 4;
const DEFAULT_PATH_OUTPUT_HANDLE_OVERHANG = 9;

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: roundCoordinate((a.x + b.x) / 2),
    y: roundCoordinate((a.y + b.y) / 2),
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

function resolveZoneAnchorRect(params: {
  zoneRect: Rect;
  anchor: { point: Point; rect?: AnchorRect };
  kind: "inlet" | "outlet";
}): Rect {
  const { zoneRect, anchor, kind } = params;

  if (anchor.rect) {
    return {
      x: anchor.rect.x,
      y: anchor.rect.y,
      width: anchor.rect.width ?? DEFAULT_ANCHOR_WIDTH,
      height: anchor.rect.height ?? zoneRect.height,
    };
  }

  return {
    x:
      kind === "inlet"
        ? zoneRect.x - (DEFAULT_ANCHOR_WIDTH - DEFAULT_ANCHOR_ATTACH_DEPTH)
        : zoneRect.x + zoneRect.width - DEFAULT_ANCHOR_ATTACH_DEPTH,
    y: zoneRect.y,
    width: DEFAULT_ANCHOR_WIDTH,
    height: zoneRect.height,
  };
}

export function screenPointToWorldPoint(
  point: Point,
  camera: CameraState
): Point {
  return {
    x: roundCoordinate((point.x - camera.x) / camera.zoom),
    y: roundCoordinate((point.y - camera.y) / camera.zoom),
  };
}

export function resolveZoneAnchorScreenRect(params: {
  frame: RendererFrame;
  camera: CameraState;
  zoneId: ZoneId;
  kind: "inlet" | "outlet";
}): Rect | undefined {
  const { frame, camera, zoneId, kind } = params;
  const zoneVisual = frame.pipeline.graphLayout.zonesById[zoneId];
  if (!zoneVisual) return undefined;
  if (kind === "inlet" && !isZoneInputEnabled(zoneVisual.zone)) return undefined;
  if (kind === "outlet" && !isZoneOutputEnabled(zoneVisual.zone)) return undefined;

  const anchorRect = resolveZoneAnchorRect({
    zoneRect: zoneVisual.rect,
    anchor: zoneVisual.anchors[kind],
    kind,
  });

  return projectWorldRectToScreenRect(anchorRect, camera);
}

export function resolveInputAnchorTargetZoneId(params: {
  model: UniverseModel;
  frame: RendererFrame;
  camera: CameraState;
  point: Point;
  excludeZoneIds?: ZoneId[];
  canConnect?: (targetZoneId: ZoneId) => boolean;
}): ZoneId | null {
  const { model, frame, camera, point, excludeZoneIds, canConnect } = params;
  const excluded = new Set(excludeZoneIds ?? []);
  let bestZoneId: ZoneId | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const zoneVisual of typedValues(frame.pipeline.graphLayout.zonesById)) {
    if (excluded.has(zoneVisual.zoneId)) continue;
    if (!model.zonesById[zoneVisual.zoneId]) continue;
    if (!isZoneInputEnabled(zoneVisual.zone)) continue;

    const visibility =
      frame.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];
    if (!visibility?.isVisible) continue;

    const rect = resolveZoneAnchorScreenRect({
      frame,
      camera,
      zoneId: zoneVisual.zoneId,
      kind: "inlet",
    });
    if (!rect || !containsPoint(rect, point)) continue;
    if (canConnect && !canConnect(zoneVisual.zoneId)) continue;

    const area = getRectArea(rect);
    if (area < bestArea) {
      bestZoneId = zoneVisual.zoneId;
      bestArea = area;
    }
  }

  return bestZoneId;
}

export function resolvePathOutputAnchorScreenRect(params: {
  frame: RendererFrame;
  camera: CameraState;
  pathId: PathId;
}): Rect | undefined {
  const { frame, camera, pathId } = params;
  const pathVisual = frame.pipeline.graphLayout.pathsById[pathId];
  if (!pathVisual?.rect) return undefined;

  const outlet = pathVisual.outlet ?? {
    x: pathVisual.rect.x + pathVisual.rect.width,
    y: pathVisual.rect.y + pathVisual.rect.height / 2,
  };
  const height = clamp(
    pathVisual.rect.height * 0.72,
    DEFAULT_PATH_OUTPUT_HANDLE_MIN_HEIGHT,
    Math.min(
      DEFAULT_PATH_OUTPUT_HANDLE_MAX_HEIGHT,
      Math.max(
        DEFAULT_PATH_OUTPUT_HANDLE_MIN_HEIGHT,
        pathVisual.rect.height - DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y * 2
      )
    )
  );
  const minY = pathVisual.rect.y + DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y;
  const maxY =
    pathVisual.rect.y +
    pathVisual.rect.height -
    DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y -
    height;

  return projectWorldRectToScreenRect(
    {
      x:
        outlet.x -
        (DEFAULT_PATH_OUTPUT_HANDLE_WIDTH - DEFAULT_PATH_OUTPUT_HANDLE_OVERHANG),
      y: clamp(outlet.y - height / 2, minY, maxY),
      width: DEFAULT_PATH_OUTPUT_HANDLE_WIDTH,
      height,
    },
    camera
  );
}

export type CreatePathFromAnchorDragResult = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
};

export function retargetPathFromOutputAnchorDrag(params: {
  model: UniverseModel;
  sourceZoneId: ZoneId;
  pathId: PathId;
  targetZoneId?: ZoneId | null;
  canConnect?: CanConnectPath;
}): UniverseModel | undefined {
  const {
    model,
    sourceZoneId,
    pathId,
    targetZoneId,
    canConnect,
  } = params;

  const sourceZone = model.zonesById[sourceZoneId];
  const path = sourceZone?.pathsById[pathId];
  if (!sourceZone || !path) return undefined;

  let resolvedTargetZoneId: ZoneId | null = targetZoneId ?? null;
  if (resolvedTargetZoneId) {
    const targetZone = model.zonesById[resolvedTargetZoneId];
    if (!targetZone || !isZoneInputEnabled(targetZone)) {
      return undefined;
    }
    if (
      canConnect &&
      !canConnect({
        mode: "retarget",
        sourceZoneId,
        targetZoneId: resolvedTargetZoneId,
        sourceZone,
        targetZone,
        model,
        pathId,
        path,
      })
    ) {
      resolvedTargetZoneId = null;
    }
  }

  return setPathTarget(
    model,
    sourceZoneId,
    pathId,
    resolvedTargetZoneId
      ? {
          universeId: model.universeId,
          zoneId: resolvedTargetZoneId,
        }
      : null
  );
}

export function createPathFromOutputAnchorDrag(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  frame: RendererFrame;
  sourceZoneId: ZoneId;
  dropWorldPoint: Point;
  targetZoneId?: ZoneId | null;
  gridSnap?: GridSnapOptions;
  canConnect?: CanConnectPath;
}): CreatePathFromAnchorDragResult | undefined {
  const {
    model,
    layoutModel,
    frame,
    sourceZoneId,
    dropWorldPoint,
    targetZoneId,
    gridSnap,
    canConnect,
  } = params;

  const sourceZone = model.zonesById[sourceZoneId];
  const sourceVisual = frame.pipeline.graphLayout.zonesById[sourceZoneId];
  if (!sourceZone || !sourceVisual) return undefined;
  if (!isZoneOutputEnabled(sourceZone)) return undefined;

  let resolvedTargetZoneId: ZoneId | null = targetZoneId ?? null;
  if (resolvedTargetZoneId) {
    const targetZone = model.zonesById[resolvedTargetZoneId];
    if (!targetZone || !isZoneInputEnabled(targetZone)) {
      return undefined;
    }
    if (
      canConnect &&
      !canConnect({
        mode: "create",
        sourceZoneId,
        targetZoneId: resolvedTargetZoneId,
        sourceZone,
        targetZone,
        model,
      })
    ) {
      resolvedTargetZoneId = null;
    }
  }
  const targetVisual = resolvedTargetZoneId
    ? frame.pipeline.graphLayout.zonesById[resolvedTargetZoneId]
    : undefined;

  const pathId = createPathId();
  const nextPathIndex = sourceZone.pathIds.length;
  const sourceOutlet = sourceVisual.anchors.outlet.point;
  const targetInlet = targetVisual?.anchors.inlet?.point;
  const desiredCenter = targetInlet
    ? midpoint(sourceOutlet, targetInlet)
    : dropWorldPoint;
  const desiredRect = {
    x: snapCoordinate(desiredCenter.x - DEFAULT_PATH_NODE_WIDTH / 2, gridSnap),
    y: snapCoordinate(desiredCenter.y - DEFAULT_PATH_NODE_HEIGHT / 2, gridSnap),
  };
  const routeOffset = {
    x: roundCoordinate(desiredRect.x - (sourceOutlet.x + DEFAULT_PATH_NODE_OFFSET_X)),
    y: roundCoordinate(
      desiredRect.y -
      (sourceOutlet.y - DEFAULT_PATH_NODE_HEIGHT / 2 + nextPathIndex * DEFAULT_PATH_NODE_GAP_Y)
    ),
  };
  const ordinal = nextPathIndex + 1;

  const nextModel = addPath(model, sourceZoneId, {
    id: pathId,
    key: `condition_${ordinal}`,
    name: "Empty",
    target: resolvedTargetZoneId
      ? {
          universeId: model.universeId,
          zoneId: resolvedTargetZoneId,
        }
      : null,
    rule: null,
  });
  const nextLayoutModel = updatePathLayout(layoutModel, pathId, {
    routeOffset,
  });

  return {
    model: nextModel,
    layoutModel: nextLayoutModel,
    pathId,
  };
}
