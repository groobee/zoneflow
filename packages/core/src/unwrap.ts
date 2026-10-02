import type { UniverseModel, ZoneId } from "./types.js";
import { getParentZone, getZone } from "./lookup.js";
import { detachPathsTargetingZones } from "./mutation.js";
import { getEffectiveZoneSlot } from "./zoneCapabilities.js";

export type UnwrapZoneResult = {
  model: UniverseModel;
  unwrappedZoneId: ZoneId;
  movedChildZoneIds: ZoneId[];
};

export type CanUnwrapZoneResult = {
  ok: boolean;
  reason?:
    | "MISSING_ZONE"
    | "HAS_NO_CHILDREN"
    | "MISSING_PARENT"
    | "ROOT_WITHOUT_CHILDREN";
};

export function canUnwrapZone(
  model: UniverseModel,
  zoneId: ZoneId
): CanUnwrapZoneResult {
  const zone = getZone(model, zoneId);
  if (!zone) {
    return { ok: false, reason: "MISSING_ZONE" };
  }

  if (zone.childZoneIds.length === 0) {
    return {
      ok: false,
      reason: zone.parentZoneId === null ? "ROOT_WITHOUT_CHILDREN" : "HAS_NO_CHILDREN",
    };
  }

  if (zone.parentZoneId !== null && !getParentZone(model, zoneId)) {
    return { ok: false, reason: "MISSING_PARENT" };
  }

  return { ok: true };
}

export function unwrapZone(
  model: UniverseModel,
  zoneId: ZoneId
): UnwrapZoneResult {
  const canUnwrap = canUnwrapZone(model, zoneId);
  if (!canUnwrap.ok) {
    return {
      model,
      unwrappedZoneId: zoneId,
      movedChildZoneIds: [],
    };
  }

  const zone = getZone(model, zoneId)!;

  const parentZoneId = zone.parentZoneId;
  const movedChildZoneIds = [...zone.childZoneIds];

  let nextZonesById = { ...model.zonesById };
  let nextRootZoneIds = [...model.rootZoneIds];

  // 1) 자식들의 parent를 wrapper의 parent로 변경
  //    wrapper 의 슬롯에 도킹돼 있던 키는 새 부모가 같은 슬롯을 선언할 때만 유지
  const nextParent =
    parentZoneId !== null ? nextZonesById[parentZoneId] : undefined;
  for (const childZoneId of movedChildZoneIds) {
    const child = nextZonesById[childZoneId];
    if (!child) continue;

    nextZonesById[childZoneId] = {
      ...child,
      parentZoneId,
      slotKey: getEffectiveZoneSlot(child, nextParent)?.key,
    };
  }

  // 2) 부모가 있으면 부모 childZoneIds에서 wrapper 제거하고 자식들 삽입
  if (parentZoneId !== null) {
    const parent = nextZonesById[parentZoneId];

    if (parent) {
      const wrapperIndex = parent.childZoneIds.indexOf(zoneId);

      const before =
        wrapperIndex >= 0
          ? parent.childZoneIds.slice(0, wrapperIndex)
          : parent.childZoneIds;

      const after =
        wrapperIndex >= 0
          ? parent.childZoneIds.slice(wrapperIndex + 1)
          : [];

      nextZonesById[parentZoneId] = {
        ...parent,
        childZoneIds: [...before, ...movedChildZoneIds, ...after],
      };
    }
  } else {
    // 3) 루트 wrapper면 rootZoneIds에서 wrapper 제거하고 자식들 삽입
    const wrapperIndex = nextRootZoneIds.indexOf(zoneId);

    const before =
      wrapperIndex >= 0
        ? nextRootZoneIds.slice(0, wrapperIndex)
        : nextRootZoneIds;

    const after =
      wrapperIndex >= 0
        ? nextRootZoneIds.slice(wrapperIndex + 1)
        : [];

    nextRootZoneIds = [...before, ...movedChildZoneIds, ...after];
  }

  // 4) wrapper 제거 — wrapper 를 가리키던 패스는 dangling 으로
  delete nextZonesById[zoneId];

  return {
    model: detachPathsTargetingZones(
      {
        ...model,
        rootZoneIds: nextRootZoneIds,
        zonesById: nextZonesById,
      },
      new Set([zoneId])
    ),
    unwrappedZoneId: zoneId,
    movedChildZoneIds,
  };
}