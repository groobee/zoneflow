import {
  canZoneContainChildren,
  collectSubtreeZoneIds,
  getZoneDepth,
  getZoneLayout,
  moveZone,
  updateZoneLayout,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import type { Rect } from "@zoneflow/renderer-dom";
import {
  containsPoint,
  getRectArea,
  roundCoordinate,
  typedValues,
} from "./moveEditorShared";
import {
  ROOT_WORLD_ORIGIN,
  resolveWorldZoneOrigin,
  resolveWorldZoneRect,
} from "./zoneGeometry";

function resolveContainingParentZoneId(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  centerPoint: Point;
  cache?: Map<ZoneId, Point>;
  invalidZoneIds?: ReadonlySet<ZoneId>;
}): ZoneId | null {
  const {
    model,
    layoutModel,
    centerPoint,
    cache,
    invalidZoneIds,
  } = params;

  let parentZoneId: ZoneId | null = null;
  let bestDepth = -1;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const candidateZone of typedValues(model.zonesById)) {
    if (invalidZoneIds?.has(candidateZone.id)) continue;
    if (!canZoneContainChildren(candidateZone)) continue;

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
      parentZoneId = candidateZone.id;
      bestDepth = candidateDepth;
      bestArea = candidateArea;
    }
  }

  return parentZoneId;
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
  const nextParentZoneId = resolveContainingParentZoneId({
    model,
    layoutModel,
    centerPoint,
    cache,
    invalidZoneIds,
  });

  return {
    candidateParentZoneId: nextParentZoneId,
    currentParentZoneId: zone.parentZoneId,
    worldRect,
  };
}

export function resolveZonePlacementAtWorldRect(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  worldRect: Rect;
}): {
  parentZoneId: ZoneId | null;
  x: number;
  y: number;
  worldRect: Rect;
} {
  const { model, layoutModel, worldRect } = params;
  const centerPoint = {
    x: worldRect.x + worldRect.width / 2,
    y: worldRect.y + worldRect.height / 2,
  };
  const cache = new Map<ZoneId, Point>();
  const parentZoneId = resolveContainingParentZoneId({
    model,
    layoutModel,
    centerPoint,
    cache,
  });

  const parentOrigin = parentZoneId
    ? resolveWorldZoneOrigin({
        model,
        layoutModel,
        zoneId: parentZoneId,
      })
    : ROOT_WORLD_ORIGIN;

  return {
    parentZoneId,
    x: roundCoordinate(worldRect.x - parentOrigin.x),
    y: roundCoordinate(worldRect.y - parentOrigin.y),
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

export function commitZoneGroupReparentAtCurrentPosition(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
}): {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  reparentedZoneIds: ZoneId[];
  didReparent: boolean;
} {
  const { model, layoutModel, zoneIds } = params;
  const uniqueZoneIds = Array.from(new Set(zoneIds)).filter((zoneId) =>
    Boolean(model.zonesById[zoneId])
  );

  if (uniqueZoneIds.length === 0) {
    return {
      model,
      layoutModel,
      reparentedZoneIds: [],
      didReparent: false,
    };
  }

  const sortedZoneIds = [...uniqueZoneIds].sort(
    (a, b) => getZoneDepth(model, a) - getZoneDepth(model, b)
  );

  let nextModel = model;
  let nextLayoutModel = layoutModel;
  const reparentedZoneIds: ZoneId[] = [];

  for (const zoneId of sortedZoneIds) {
    const result = commitZoneReparentAtCurrentPosition({
      model: nextModel,
      layoutModel: nextLayoutModel,
      zoneId,
    });

    nextModel = result.model;
    nextLayoutModel = result.layoutModel;

    if (result.didReparent) {
      reparentedZoneIds.push(zoneId);
    }
  }

  return {
    model: nextModel,
    layoutModel: nextLayoutModel,
    reparentedZoneIds,
    didReparent: reparentedZoneIds.length > 0,
  };
}
