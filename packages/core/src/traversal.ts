import type { UniverseModel, Zone, ZoneId } from "./types";

export function walkZonesDepthFirst(
  model: UniverseModel,
  zoneId: ZoneId,
  visit: (zone: Zone) => void
): void {
  const zone = model.zonesById[zoneId];
  if (!zone) return;

  visit(zone);

  for (const childId of zone.childZoneIds) {
    walkZonesDepthFirst(model, childId, visit);
  }
}

export function flattenSubtree(
  model: UniverseModel,
  zoneId: ZoneId
): Zone[] {
  const result: Zone[] = [];

  walkZonesDepthFirst(model, zoneId, (zone) => {
    result.push(zone);
  });

  return result;
}
