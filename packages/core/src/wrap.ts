import type {
  UniverseModel,
  Zone,
  ZoneAction,
  ZoneId,
  ZoneType,
} from "./types";
import { createZoneId } from "./ids";

export type CanWrapZonesResult = {
  ok: boolean;
  reason?:
    | "EMPTY_SELECTION"
    | "DUPLICATE_IDS"
    | "MISSING_ZONE"
    | "DIFFERENT_PARENTS";
};

export type WrapZonesWithNewParentInput = {
  zoneIds: ZoneId[];
  name: string;
  zoneType?: ZoneType;
  action?: ZoneAction;
  meta?: Record<string, unknown>;
  newZoneId?: ZoneId;
};

export type WrapZonesWithNewParentResult = {
  model: UniverseModel;
  wrapperZoneId: ZoneId;
};

export function canWrapZones(
  model: UniverseModel,
  zoneIds: ZoneId[]
): CanWrapZonesResult {
  if (zoneIds.length === 0) {
    return { ok: false, reason: "EMPTY_SELECTION" };
  }

  const uniqueZoneIds = new Set(zoneIds);
  if (uniqueZoneIds.size !== zoneIds.length) {
    return { ok: false, reason: "DUPLICATE_IDS" };
  }

  const zones = zoneIds.map((zoneId) => model.zonesById[zoneId]);
  if (zones.some((zone) => !zone)) {
    return { ok: false, reason: "MISSING_ZONE" };
  }

  const firstParentZoneId = zones[0]!.parentZoneId;
  const sameParent = zones.every(
    (zone) => zone!.parentZoneId === firstParentZoneId
  );

  if (!sameParent) {
    return { ok: false, reason: "DIFFERENT_PARENTS" };
  }

  return { ok: true };
}

export function wrapZonesWithNewParent(
  model: UniverseModel,
  input: WrapZonesWithNewParentInput
): WrapZonesWithNewParentResult {
  const {
    zoneIds,
    name,
    zoneType = "container",
    action,
    meta,
    newZoneId = createZoneId(),
  } = input;

  const check = canWrapZones(model, zoneIds);
  if (!check.ok) {
    return {
      model,
      wrapperZoneId: newZoneId,
    };
  }

  const uniqueZoneIds = [...new Set(zoneIds)];
  const firstZone = model.zonesById[uniqueZoneIds[0]];
  const parentZoneId = firstZone.parentZoneId;

  if (model.zonesById[newZoneId]) {
    return {
      model,
      wrapperZoneId: newZoneId,
    };
  }

  const wrapperZone: Zone = {
    id: newZoneId,
    parentZoneId,
    name,
    zoneType,
    childZoneIds: [...uniqueZoneIds],
    pathIds: [],
    pathsById: {},
    action,
    meta,
  };

  let nextZonesById: Record<ZoneId, Zone> = {
    ...model.zonesById,
    [newZoneId]: wrapperZone,
  };

  for (const zoneId of uniqueZoneIds) {
    const zone = nextZonesById[zoneId];
    if (!zone) continue;

    nextZonesById[zoneId] = {
      ...zone,
      parentZoneId: newZoneId,
    };
  }

  let nextRootZoneIds = [...model.rootZoneIds];

  if (parentZoneId !== null) {
    const parent = nextZonesById[parentZoneId];

    if (parent) {
      const selectedSet = new Set(uniqueZoneIds);
      const originalChildren = parent.childZoneIds;

      const firstSelectedIndex = originalChildren.findIndex((id) =>
        selectedSet.has(id)
      );

      const remainingChildren = originalChildren.filter(
        (id) => !selectedSet.has(id)
      );

      const insertIndex =
        firstSelectedIndex >= 0 ? firstSelectedIndex : remainingChildren.length;

      const nextChildZoneIds = [
        ...remainingChildren.slice(0, insertIndex),
        newZoneId,
        ...remainingChildren.slice(insertIndex),
      ];

      nextZonesById[parentZoneId] = {
        ...parent,
        childZoneIds: nextChildZoneIds,
      };
    }
  } else {
    const selectedSet = new Set(uniqueZoneIds);
    const originalRoots = model.rootZoneIds;

    const firstSelectedIndex = originalRoots.findIndex((id) =>
      selectedSet.has(id)
    );

    const remainingRoots = originalRoots.filter((id) => !selectedSet.has(id));

    const insertIndex =
      firstSelectedIndex >= 0 ? firstSelectedIndex : remainingRoots.length;

    nextRootZoneIds = [
      ...remainingRoots.slice(0, insertIndex),
      newZoneId,
      ...remainingRoots.slice(insertIndex),
    ];
  }

  return {
    model: {
      ...model,
      rootZoneIds: nextRootZoneIds,
      zonesById: nextZonesById,
    },
    wrapperZoneId: newZoneId,
  };
}
