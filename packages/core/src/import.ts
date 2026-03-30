import type {
  UniverseModel,
  Zone,
  ZoneId,
  Path,
  ZoneRef,
} from "./types";
import { createPathId, createZoneId } from "./ids";
import { flattenSubtree } from "./traversal";

export type ExternalTargetPolicy =
  | "preserve"
  | "drop"
  | "mark-unresolved";

export type ImportZoneSubtreeOptions = {
  nextParentZoneId?: ZoneId | null;
  rename?: (originalName: string) => string;
  externalTargetPolicy?: ExternalTargetPolicy;
};

export type ImportZoneSubtreeResult = {
  model: UniverseModel;
  importedRootZoneId: ZoneId;
  zoneIdMap: Record<ZoneId, ZoneId>;
};

export function importZoneSubtree(
  targetModel: UniverseModel,
  sourceModel: UniverseModel,
  sourceRootZoneId: ZoneId,
  options: ImportZoneSubtreeOptions = {}
): ImportZoneSubtreeResult {
  const {
    nextParentZoneId = null,
    rename = (name) => name,
    externalTargetPolicy = "preserve",
  } = options;

  const sourceRootZone = sourceModel.zonesById[sourceRootZoneId];
  if (!sourceRootZone) {
    return {
      model: targetModel,
      importedRootZoneId: sourceRootZoneId,
      zoneIdMap: {},
    };
  }

  const sourceZones = flattenSubtree(sourceModel, sourceRootZoneId);

  const zoneIdMap: Record<ZoneId, ZoneId> = {};
  const pathIdMap: Record<string, string> = {};

  // 1) Zone ID 재발급
  for (const zone of sourceZones) {
    zoneIdMap[zone.id] = createZoneId();
  }

  // 2) Path ID 재발급
  for (const zone of sourceZones) {
    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];
      if (!path) continue;
      pathIdMap[path.id] = createPathId();
    }
  }

  // 3) Zone clone + 내부 참조 재작성
  const importedZonesById: Record<ZoneId, Zone> = {};

  for (const sourceZone of sourceZones) {
    const nextZoneId = zoneIdMap[sourceZone.id];

    const nextChildZoneIds = sourceZone.childZoneIds
      .map((childId) => zoneIdMap[childId])
      .filter((id): id is ZoneId => Boolean(id));

    const nextPathIds = sourceZone.pathIds
      .map((pathId) => {
        const path = sourceZone.pathsById[pathId];
        if (!path) return undefined;
        return pathIdMap[path.id];
      })
      .filter((id): id is string => Boolean(id));

    const nextPathsById: Record<string, Path> = {};

    for (const oldPathId of sourceZone.pathIds) {
      const oldPath = sourceZone.pathsById[oldPathId];
      if (!oldPath) continue;

      const nextPathId = pathIdMap[oldPath.id];
      let nextTarget = oldPath.target ?? null;
      let nextMeta = oldPath.meta ? { ...oldPath.meta } : undefined;

      if (nextTarget) {
        const isSameSourceUniverse =
          nextTarget.universeId === sourceModel.universeId;

        const isInternalTarget = Boolean(zoneIdMap[nextTarget.zoneId]);

        // source subtree 내부 참조면 새 ID로 교체
        if (isSameSourceUniverse && isInternalTarget) {
          nextTarget = {
            universeId: targetModel.universeId,
            zoneId: zoneIdMap[nextTarget.zoneId],
          };
        } else {
          // 외부 참조 정책 적용
          if (externalTargetPolicy === "drop") {
            nextTarget = null;
          } else if (externalTargetPolicy === "mark-unresolved") {
            nextMeta = {
              ...nextMeta,
              unresolvedTarget: true,
              originalTarget: oldPath.target,
            };
          }
          // preserve는 그대로 둠
        }
      }

      nextPathsById[nextPathId] = {
        ...oldPath,
        id: nextPathId,
        target: nextTarget,
        meta: nextMeta,
      };
    }

    importedZonesById[nextZoneId] = {
      ...sourceZone,
      id: nextZoneId,
      parentZoneId: sourceZone.parentZoneId
        ? zoneIdMap[sourceZone.parentZoneId] ?? null
        : null,
      childZoneIds: nextChildZoneIds,
      pathIds: nextPathIds,
      pathsById: nextPathsById,
    };
  }

  const importedRootZoneId = zoneIdMap[sourceRootZoneId];

  // 4) 가져온 루트 zone 이름/부모 수정
  importedZonesById[importedRootZoneId] = {
    ...importedZonesById[importedRootZoneId],
    parentZoneId: nextParentZoneId,
    name: rename(sourceRootZone.name),
  };

  // 5) targetModel에 병합
  const nextZonesById: Record<ZoneId, Zone> = {
    ...targetModel.zonesById,
    ...importedZonesById,
  };

  let nextRootZoneIds = [...targetModel.rootZoneIds];

  if (nextParentZoneId === null) {
    nextRootZoneIds.push(importedRootZoneId);
  } else {
    const parent = nextZonesById[nextParentZoneId];
    if (parent) {
      nextZonesById[nextParentZoneId] = {
        ...parent,
        childZoneIds: [...parent.childZoneIds, importedRootZoneId],
      };
    }
  }

  return {
    model: {
      ...targetModel,
      rootZoneIds: nextRootZoneIds,
      zonesById: nextZonesById,
    },
    importedRootZoneId,
    zoneIdMap,
  };
}