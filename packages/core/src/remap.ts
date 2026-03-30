import type {
  UniverseModel,
  Zone,
  ZoneId,
  PathId,
  Path,
} from "./types";
import { createPathId, createZoneId } from "./ids";
import { flattenSubtree } from "./traversal";

export type RemapResult = {
  zonesById: Record<ZoneId, Zone>;
  rootZoneIds: ZoneId[];
  zoneIdMap: Record<ZoneId, ZoneId>;
  pathIdMap: Record<PathId, PathId>;
};

export function remapSubtreeIds(
  model: UniverseModel,
  sourceRootZoneId: ZoneId
): RemapResult {
  const sourceZones = flattenSubtree(model, sourceRootZoneId);

  const zoneIdMap: Record<ZoneId, ZoneId> = {};
  const pathIdMap: Record<PathId, PathId> = {};

  // 1) zone id 재발급
  for (const zone of sourceZones) {
    zoneIdMap[zone.id] = createZoneId();
  }

  // 2) path id 재발급
  for (const zone of sourceZones) {
    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];
      if (!path) continue;
      pathIdMap[path.id] = createPathId();
    }
  }

  // 3) zone clone + 참조 재작성
  const nextZonesById: Record<ZoneId, Zone> = {};

  for (const zone of sourceZones) {
    const nextZoneId = zoneIdMap[zone.id];

    const nextChildZoneIds = zone.childZoneIds
      .map((childId) => zoneIdMap[childId])
      .filter((id): id is ZoneId => Boolean(id));

    const nextPathIds = zone.pathIds
      .map((pathId) => {
        const path = zone.pathsById[pathId];
        if (!path) return undefined;
        return pathIdMap[path.id];
      })
      .filter((id): id is PathId => Boolean(id));

    const nextPathsById: Record<PathId, Path> = {};

    for (const oldPathId of zone.pathIds) {
      const oldPath = zone.pathsById[oldPathId];
      if (!oldPath) continue;

      const nextPathId = pathIdMap[oldPath.id];

      let nextTarget = oldPath.target ?? null;

      // 내부 참조면 zoneId 재작성
      if (
        nextTarget &&
        nextTarget.universeId === model.universeId &&
        zoneIdMap[nextTarget.zoneId]
      ) {
        nextTarget = {
          ...nextTarget,
          zoneId: zoneIdMap[nextTarget.zoneId],
        };
      }

      nextPathsById[nextPathId] = {
        ...oldPath,
        id: nextPathId,
        target: nextTarget,
      };
    }

    nextZonesById[nextZoneId] = {
      ...zone,
      id: nextZoneId,
      parentZoneId: zone.parentZoneId ? zoneIdMap[zone.parentZoneId] ?? null : null,
      childZoneIds: nextChildZoneIds,
      pathIds: nextPathIds,
      pathsById: nextPathsById,
    };
  }

  return {
    zonesById: nextZonesById,
    rootZoneIds: [zoneIdMap[sourceRootZoneId]],
    zoneIdMap,
    pathIdMap,
  };
}