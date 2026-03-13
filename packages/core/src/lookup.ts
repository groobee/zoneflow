import type { UniverseModel, Zone, ZoneId, Path, PathId } from "./types";

export function getZone(
  model: UniverseModel,
  zoneId: ZoneId
): Zone | undefined {
  return model.zonesById[zoneId];
}

export function getRootZones(model: UniverseModel): Zone[] {
  return model.rootZoneIds
    .map((id) => model.zonesById[id])
    .filter((zone): zone is Zone => Boolean(zone));
}

export function getChildZones(
  model: UniverseModel,
  zoneId: ZoneId
): Zone[] {
  const zone = model.zonesById[zoneId];
  if (!zone) return [];

  return zone.childZoneIds
    .map((id) => model.zonesById[id])
    .filter((child): child is Zone => Boolean(child));
}

export function getParentZone(
  model: UniverseModel,
  zoneId: ZoneId
): Zone | undefined {
  const zone = model.zonesById[zoneId];
  if (!zone?.parentZoneId) return undefined;

  return model.zonesById[zone.parentZoneId];
}

export function getPath(
  zone: Zone,
  pathId: PathId
): Path | undefined {
  return zone.pathsById[pathId];
}

export function getPaths(zone: Zone): Path[] {
  return zone.pathIds
    .map((id) => zone.pathsById[id])
    .filter((path): path is Path => Boolean(path));
}

export function getPathByKey(
  zone: Zone,
  key: string
): Path | undefined {
  return getPaths(zone).find((path) => path.key === key);
}