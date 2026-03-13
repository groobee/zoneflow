import type { UniverseModel, Path, Zone, ZoneId } from "./types";
import { getPaths } from "./lookup";

export function resolvePathTarget(
  model: UniverseModel,
  path: Path
): Zone | undefined {
  if (!path.target) return undefined;
  if (path.target.universeId !== model.universeId) return undefined;

  return model.zonesById[path.target.zoneId];
}

export function getOutgoingZones(
  model: UniverseModel,
  zoneId: ZoneId
): Zone[] {
  const zone = model.zonesById[zoneId];
  if (!zone) return [];

  return getPaths(zone)
    .map((path) => resolvePathTarget(model, path))
    .filter((target): target is Zone => Boolean(target));
}

export function getIncomingPaths(
  model: UniverseModel,
  zoneId: ZoneId
): Path[] {
  const result: Path[] = [];

  for (const zone of Object.values(model.zonesById)) {
    for (const path of getPaths(zone)) {
      if (
        path.target &&
        path.target.universeId === model.universeId &&
        path.target.zoneId === zoneId
      ) {
        result.push(path);
      }
    }
  }

  return result;
}