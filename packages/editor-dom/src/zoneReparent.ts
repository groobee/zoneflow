import {
  canZoneContainChildren,
  collectSubtreeZoneIds,
  detachPathsTargetingZone,
  getEffectiveZoneSlot,
  getZoneDepth,
  getZoneLayout,
  moveZone,
  resolveZoneSlotKeyAtPoint,
  updateZone,
  updateZoneLayout,
  zoneDeclaresSlots,
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

/**
 * 드롭 제스처 → 도킹 슬롯 멤버십 커밋. 부모가 슬롯을 선언한 컨테이너면 존
 * 중앙이 어느 레인 안인지로 `slotKey` 를 세팅/해제하고, childInput 이 막히는
 * 슬롯에 도킹되는 순간 그 존을 target 으로 하던 패스들은 target 을 `null` 로
 * 강등한다(연결 불가 존 — 거부된 drop 과 같은 관례). 기하는 판정 입력일 뿐,
 * 의미는 모델 필드가 갖는다 — reparent 의 "드롭한 위치가 곧 새 부모" 철학과
 * 동일. reparent commit 뒤(같은 부모 안에서의 드래그 포함) 드래그가 끝날
 * 때마다 호출한다.
 */
export function commitZoneSlotMembership(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
}): {
  model: UniverseModel;
  didChange: boolean;
} {
  const { layoutModel, zoneIds } = params;
  let model = params.model;
  let didChange = false;

  for (const zoneId of zoneIds) {
    const zone = model.zonesById[zoneId];
    if (!zone) continue;

    const parent = zone.parentZoneId
      ? model.zonesById[zone.parentZoneId]
      : undefined;

    let nextSlotKey: string | undefined;
    if (parent && zoneDeclaresSlots(parent)) {
      const parentLayout = getZoneLayout(layoutModel, parent.id);
      const childLayout = getZoneLayout(layoutModel, zoneId);
      if (parentLayout && childLayout) {
        nextSlotKey = resolveZoneSlotKeyAtPoint(parent, parentLayout, {
          x: childLayout.x + (childLayout.width ?? 0) / 2,
          y: childLayout.y + (childLayout.height ?? 0) / 2,
        });
      }
    }

    if ((nextSlotKey ?? null) === (zone.slotKey ?? null)) continue;

    model = updateZone(model, zoneId, { slotKey: nextSlotKey });
    const nextZone = model.zonesById[zoneId];
    if (
      getEffectiveZoneSlot(nextZone, parent)?.effects?.childInput === "disabled"
    ) {
      model = detachPathsTargetingZone(model, zoneId);
    }
    didChange = true;
  }

  return { model, didChange };
}
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
