import {
  getZoneLayout,
  updateZoneLayout,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import type { Rect } from "@zoneflow/renderer-dom";
import { roundCoordinate } from "./moveEditorShared";

export const ROOT_WORLD_ORIGIN: Point = { x: 0, y: 0 };

export function resolveWorldZoneOrigin(params: {
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

export function resolveWorldZoneRect(params: {
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

export function resolveTopSelectedZoneId(params: {
  model: UniverseModel;
  selectedZoneIds: Set<ZoneId>;
  zoneId: ZoneId;
}): ZoneId {
  const { model, selectedZoneIds, zoneId } = params;

  let currentZoneId = zoneId;
  let currentZone = model.zonesById[currentZoneId];

  while (currentZone?.parentZoneId && selectedZoneIds.has(currentZone.parentZoneId)) {
    currentZoneId = currentZone.parentZoneId;
    currentZone = model.zonesById[currentZoneId];
  }

  return currentZoneId;
}

export function resolveZoneGroupOrigins(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  primaryZoneId: ZoneId;
}):
  | {
      primaryZoneId: ZoneId;
      originsByZoneId: Record<ZoneId, Point>;
    }
  | undefined {
  const { model, layoutModel, zoneIds, primaryZoneId } = params;
  const selectedZoneIds = new Set(zoneIds);
  const effectiveZoneIds = zoneIds.filter(
    (zoneId) =>
      resolveTopSelectedZoneId({
        model,
        selectedZoneIds,
        zoneId,
      }) === zoneId
  );
  const effectivePrimaryZoneId = resolveTopSelectedZoneId({
    model,
    selectedZoneIds,
    zoneId: primaryZoneId,
  });
  const originsByZoneId: Record<ZoneId, Point> = {} as Record<ZoneId, Point>;

  for (const zoneId of effectiveZoneIds) {
    const zoneLayout = getZoneLayout(layoutModel, zoneId);
    if (!zoneLayout) continue;
    originsByZoneId[zoneId] = {
      x: zoneLayout.x,
      y: zoneLayout.y,
    };
  }

  if (!originsByZoneId[effectivePrimaryZoneId]) {
    return undefined;
  }

  return {
    primaryZoneId: effectivePrimaryZoneId,
    originsByZoneId,
  };
}

export function applyZoneOriginsDelta(params: {
  layoutModel: UniverseLayoutModel;
  originsByZoneId: Record<ZoneId, Point>;
  deltaX: number;
  deltaY: number;
}): UniverseLayoutModel {
  const { layoutModel, originsByZoneId, deltaX, deltaY } = params;
  let nextLayoutModel = layoutModel;

  for (const [zoneId, point] of Object.entries(originsByZoneId) as Array<
    [ZoneId, Point]
  >) {
    nextLayoutModel = updateZoneLayout(nextLayoutModel, zoneId, {
      x: roundCoordinate(point.x + deltaX),
      y: roundCoordinate(point.y + deltaY),
    });
  }

  return nextLayoutModel;
}
