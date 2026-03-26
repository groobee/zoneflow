import {
  addPath,
  createPathId,
  type AnchorRect,
  updatePathLayout,
  type PathId,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import {
  type CameraState,
  type Rect,
  type RendererFrame,
} from "@zoneflow/renderer-dom";

function typedValues<TKey extends string, TValue>(
  record: Record<TKey, TValue>
): TValue[] {
  return Object.values(record) as TValue[];
}

const DEFAULT_PATH_NODE_WIDTH = 120;
const DEFAULT_PATH_NODE_HEIGHT = 32;
const DEFAULT_PATH_NODE_OFFSET_X = 32;
const DEFAULT_PATH_NODE_GAP_Y = 40;
const DEFAULT_ANCHOR_WIDTH = 18;
const DEFAULT_ANCHOR_MIN_HEIGHT = 36;
const DEFAULT_ANCHOR_MAX_HEIGHT = 72;
const DEFAULT_ANCHOR_MARGIN_Y = 10;
const DEFAULT_ANCHOR_OVERHANG = 9;

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
      height: anchor.rect.height ?? DEFAULT_ANCHOR_MIN_HEIGHT,
    };
  }

  const availableHeight = Math.max(
    DEFAULT_ANCHOR_MIN_HEIGHT,
    zoneRect.height - DEFAULT_ANCHOR_MARGIN_Y * 2
  );
  const height = clamp(
    zoneRect.height * 0.46,
    DEFAULT_ANCHOR_MIN_HEIGHT,
    Math.min(DEFAULT_ANCHOR_MAX_HEIGHT, availableHeight)
  );
  const minY = zoneRect.y + DEFAULT_ANCHOR_MARGIN_Y;
  const maxY = zoneRect.y + zoneRect.height - DEFAULT_ANCHOR_MARGIN_Y - height;

  return {
    x:
      kind === "inlet"
        ? zoneRect.x - DEFAULT_ANCHOR_OVERHANG
        : zoneRect.x + zoneRect.width - (DEFAULT_ANCHOR_WIDTH - DEFAULT_ANCHOR_OVERHANG),
    y: clamp(anchor.point.y - height / 2, minY, maxY),
    width: DEFAULT_ANCHOR_WIDTH,
    height,
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
}): ZoneId | null {
  const { model, frame, camera, point, excludeZoneIds } = params;
  const excluded = new Set(excludeZoneIds ?? []);
  let bestZoneId: ZoneId | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const zoneVisual of typedValues(frame.pipeline.graphLayout.zonesById)) {
    if (excluded.has(zoneVisual.zoneId)) continue;
    if (!model.zonesById[zoneVisual.zoneId]) continue;

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

    const area = getRectArea(rect);
    if (area < bestArea) {
      bestZoneId = zoneVisual.zoneId;
      bestArea = area;
    }
  }

  return bestZoneId;
}

export type CreatePathFromAnchorDragResult = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
};

export function createPathFromOutputAnchorDrag(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  frame: RendererFrame;
  sourceZoneId: ZoneId;
  dropWorldPoint: Point;
  targetZoneId?: ZoneId | null;
}): CreatePathFromAnchorDragResult | undefined {
  const {
    model,
    layoutModel,
    frame,
    sourceZoneId,
    dropWorldPoint,
    targetZoneId,
  } = params;

  const sourceZone = model.zonesById[sourceZoneId];
  const sourceVisual = frame.pipeline.graphLayout.zonesById[sourceZoneId];
  if (!sourceZone || !sourceVisual) return undefined;

  const pathId = createPathId();
  const nextPathIndex = sourceZone.pathIds.length;
  const sourceOutlet = sourceVisual.anchors.outlet.point;
  const desiredRect = {
    x: roundCoordinate(dropWorldPoint.x - DEFAULT_PATH_NODE_WIDTH / 2),
    y: roundCoordinate(dropWorldPoint.y - DEFAULT_PATH_NODE_HEIGHT / 2),
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
    name: `Condition ${ordinal}`,
    target: targetZoneId
      ? {
          universeId: model.universeId,
          zoneId: targetZoneId,
        }
      : null,
    rule: {
      type: "manual",
      payload: {},
    },
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
