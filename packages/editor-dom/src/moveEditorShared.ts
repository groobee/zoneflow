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

export type ObjectSnapGuides = {
  x: number[];
  y: number[];
};

export type ObjectSnapAxisMatch = {
  guide: number;
  align: "start" | "center" | "end";
  snappedStart: number;
};

export type MoveEditorDragOrigin =
  | {
      kind: "zone";
      zoneId: ZoneId;
      originX: number;
      originY: number;
      width: number;
      height: number;
      objectSnapGuides?: ObjectSnapGuides;
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
      objectSnapGuides?: ObjectSnapGuides;
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

export type ObjectSnapOptions = {
  enabled?: boolean;
  threshold?: number;
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

export function collectRectObjectSnapGuides(rects: Rect[]): ObjectSnapGuides {
  const x = new Set<number>();
  const y = new Set<number>();

  for (const rect of rects) {
    x.add(roundCoordinate(rect.x));
    x.add(roundCoordinate(rect.x + rect.width / 2));
    x.add(roundCoordinate(rect.x + rect.width));
    y.add(roundCoordinate(rect.y));
    y.add(roundCoordinate(rect.y + rect.height / 2));
    y.add(roundCoordinate(rect.y + rect.height));
  }

  return {
    x: Array.from(x).sort((a, b) => a - b),
    y: Array.from(y).sort((a, b) => a - b),
  };
}

function resolveAxisObjectSnap(params: {
  start: number;
  size: number;
  guides: number[];
  threshold: number;
}) {
  const { start, size, guides, threshold } = params;
  const candidates = [
    { coordinate: start, align: "start" as const },
    { coordinate: start + size / 2, align: "center" as const },
    { coordinate: start + size, align: "end" as const },
  ];

  let best:
    | {
        distance: number;
        match: ObjectSnapAxisMatch;
      }
    | undefined;

  for (const guide of guides) {
    for (const candidate of candidates) {
      const distance = Math.abs(guide - candidate.coordinate);
      if (distance > threshold) continue;

      const snappedStart =
        candidate.align === "start"
          ? guide
          : candidate.align === "center"
            ? guide - size / 2
            : guide - size;

      if (!best || distance < best.distance) {
        best = {
          distance,
          match: {
            guide: roundCoordinate(guide),
            align: candidate.align,
            snappedStart: roundCoordinate(snappedStart),
          },
        };
      }
    }
  }

  return best?.match;
}

export function resolveObjectSnappedRectPosition(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  camera: CameraState;
  guides?: ObjectSnapGuides;
  objectSnap?: ObjectSnapOptions;
}) {
  const { x, y, width, height, camera, guides, objectSnap } = params;
  if (!guides || !objectSnap?.enabled) {
    return {
      x: roundCoordinate(x),
      y: roundCoordinate(y),
      guideX: undefined,
      guideY: undefined,
    };
  }

  const threshold = objectSnap.threshold ?? 8;
  const worldThreshold = threshold / camera.zoom;
  const xMatch = resolveAxisObjectSnap({
    start: x,
    size: width,
    guides: guides.x,
    threshold: worldThreshold,
  });
  const yMatch = resolveAxisObjectSnap({
    start: y,
    size: height,
    guides: guides.y,
    threshold: worldThreshold,
  });

  return {
    x: xMatch?.snappedStart ?? roundCoordinate(x),
    y: yMatch?.snappedStart ?? roundCoordinate(y),
    guideX: xMatch?.guide,
    guideY: yMatch?.guide,
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
