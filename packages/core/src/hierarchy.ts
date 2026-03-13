import type { UniverseModel, ZoneId } from "./types";

export function isRootZone(
  model: UniverseModel,
  zoneId: ZoneId
): boolean {
  return model.rootZoneIds.includes(zoneId);
}

export function getAncestorZoneIds(
  model: UniverseModel,
  zoneId: ZoneId
): ZoneId[] {
  const result: ZoneId[] = [];

  let current = model.zonesById[zoneId];

  while (current?.parentZoneId) {
    result.push(current.parentZoneId);
    current = model.zonesById[current.parentZoneId];
  }

  return result;
}

export function getZoneDepth(
  model: UniverseModel,
  zoneId: ZoneId
): number {
  return getAncestorZoneIds(model, zoneId).length;
}

export function isDescendantZone(
  model: UniverseModel,
  parentZoneId: ZoneId,
  childZoneId: ZoneId
): boolean {
  return getAncestorZoneIds(model, childZoneId).includes(parentZoneId);
}