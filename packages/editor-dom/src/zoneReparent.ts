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
  type Zone,
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

/**
 * 주어진 월드 포인트를 품는 가장 깊은 컨테이너(= 그 자리에 드롭하면 부모가
 * 될 존). reparent 판정과 슬롯 스냅(snapZonesToSlotPoints — 바깥 존이 레인
 * 위로 끌려올 때 "드롭 시 부모" 기준으로 스냅)이 공유한다.
 */
export function resolveContainingParentZoneId(params: {
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

export type CanDropZoneParams = {
  zoneId: ZoneId;
  zone: Zone;
  /** 드롭 시 새 부모가 될 존 (`null` = 루트 캔버스). */
  targetParentZoneId: ZoneId | null;
  targetParentZone: Zone | null;
  /** 드롭 시 앉게 될 도킹 슬롯 키 (레인 밖이거나 부모가 슬롯 미선언이면 `null`). */
  slotKey: string | null;
  /** 드래그 중인 존의 중앙 (월드 좌표) — 좌표 기반 금지 구역 판정용. */
  worldPoint: Point;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
};

/**
 * 존 드롭 허용 여부를 외부(도메인)에서 판정하는 콜백. `canConnectPath` 와 대칭 —
 * hover 단계에선 불가 마커 표시, drop 단계에선 원위치 복원(커밋/히스토리 없음)에
 * 쓰인다. pointermove 마다 호출되므로 동기적이고 가벼워야 하며, throw 는 `false`
 * 로 처리된다.
 */
export type CanDropZone = (params: CanDropZoneParams) => boolean;

/**
 * 드래그 중인 존의 현재 위치가 "지금 드롭되면 어디에 앉는가"를 계산한다 —
 * 새 부모 후보(중앙 포함 최심 컨테이너, 자기 서브트리 제외), 그 부모 기준
 * 도킹 슬롯 키, 존 중앙(월드). `canDropZone` 판정 입력의 단일 소스로,
 * 에디터의 hover 마커와 drop 판정이 공유한다.
 */
export function resolveZoneDropPlacement(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneId: ZoneId;
}): {
  targetParentZoneId: ZoneId | null;
  slotKey: string | null;
  worldPoint: Point;
} | null {
  const { model, layoutModel, zoneId } = params;

  const resolved = resolveZoneReparentCandidate({
    model,
    layoutModel,
    zoneId,
  });
  if (!resolved.worldRect) return null;

  const worldPoint = {
    x: resolved.worldRect.x + resolved.worldRect.width / 2,
    y: resolved.worldRect.y + resolved.worldRect.height / 2,
  };

  const targetParentZoneId = resolved.candidateParentZoneId;
  let slotKey: string | null = null;
  const targetParent = targetParentZoneId
    ? model.zonesById[targetParentZoneId]
    : undefined;
  if (targetParent && zoneDeclaresSlots(targetParent)) {
    const parentLayout = getZoneLayout(layoutModel, targetParent.id);
    if (parentLayout) {
      const parentOrigin = resolveWorldZoneOrigin({
        model,
        layoutModel,
        zoneId: targetParent.id,
      });
      slotKey =
        resolveZoneSlotKeyAtPoint(targetParent, parentLayout, {
          x: worldPoint.x - parentOrigin.x,
          y: worldPoint.y - parentOrigin.y,
        }) ?? null;
    }
  }

  return { targetParentZoneId, slotKey, worldPoint };
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
