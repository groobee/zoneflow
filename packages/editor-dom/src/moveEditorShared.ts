import type {
  PathId,
  Point,
  ZoneId,
} from "@zoneflow/core";
import type {
  CameraState,
  Rect,
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

export type PathMoveCoordinateSpace = "route-offset" | "component-layout";
export type PathMoveOriginSnapshot = {
  x: number;
  y: number;
  width: number;
  height: number;
  componentId: "body" | "label" | null;
  coordinateSpace: PathMoveCoordinateSpace;
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
      origin: PathMoveOriginSnapshot;
    }
  | {
      kind: "path-group";
      primaryPathId: PathId;
      originsByPathId: Record<PathId, PathMoveOriginSnapshot>;
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

export function typedValues<TKey extends string, TValue>(
  record: Record<TKey, TValue>
): TValue[] {
  return Object.values(record) as TValue[];
}

export function projectWorldRectToScreenRect(
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

export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveSnapSize(options?: GridSnapOptions): number | null {
  if (!options?.enabled) return null;
  const size = options.size ?? 16;
  if (!Number.isFinite(size) || size <= 0) return null;
  return size;
}

export function snapCoordinate(value: number, options?: GridSnapOptions): number {
  const size = resolveSnapSize(options);
  if (!size) return roundCoordinate(value);
  return roundCoordinate(Math.round(value / size) * size);
}

export function resolveSnappedMove(params: {
  originX: number;
  originY: number;
  deltaX: number;
  deltaY: number;
  camera: CameraState;
  gridSnap?: GridSnapOptions;
}) {
  const { originX, originY, deltaX, deltaY, camera, gridSnap } = params;
  const nextX = snapCoordinate(originX + deltaX / camera.zoom, gridSnap);
  const nextY = snapCoordinate(originY + deltaY / camera.zoom, gridSnap);

  return {
    nextX,
    nextY,
    effectiveDeltaX: nextX - originX,
    effectiveDeltaY: nextY - originY,
  };
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function getRectArea(rect: Rect): number {
  return rect.width * rect.height;
}
