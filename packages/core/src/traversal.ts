import type { UniverseModel, Zone, ZoneId } from "./types.js";

export function walkZonesDepthFirst(
  model: UniverseModel,
  zoneId: ZoneId,
  visit: (zone: Zone) => void
): void {
  walkZonesDepthFirstOnce(model, zoneId, visit, new Set());
}

// Each zone is visited once, so a malformed model with a child cycle (which
// validateUniverseModel reports) cannot recurse forever.
function walkZonesDepthFirstOnce(
  model: UniverseModel,
  zoneId: ZoneId,
  visit: (zone: Zone) => void,
  seen: Set<ZoneId>
): void {
  const zone = model.zonesById[zoneId];
  if (!zone || seen.has(zoneId)) return;
  seen.add(zoneId);

  visit(zone);

  for (const childId of zone.childZoneIds) {
    walkZonesDepthFirstOnce(model, childId, visit, seen);
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
