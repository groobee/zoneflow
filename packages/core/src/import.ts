import type {
  UniverseModel,
  Zone,
  ZoneId,
  Path,
} from "./types.js";
import { createPathId, createZoneId } from "./ids.js";
import { flattenSubtree } from "./traversal.js";

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

export type ImportZoneSubgraphOptions = {
  /** 선택 밖에 부모가 있던(=묶음의 루트) zone 들을 붙일 부모. null 이면 최상위. */
  nextParentZoneId?: ZoneId | null;
  rename?: (originalName: string) => string;
  /** 선택 밖을 가리키는 패스 타깃 처리. 자기완결 소재는 보통 "drop". */
  externalTargetPolicy?: ExternalTargetPolicy;
};

export type ImportZoneSubgraphResult = {
  model: UniverseModel;
  /** 가져온 루트(선택 밖에 부모가 있던 zone)들의 새 ID. 레이아웃 적용 시 쓴다. */
  importedRootZoneIds: ZoneId[];
  /** 원본 zone ID → 새 zone ID. 레이아웃/후처리 매핑용. */
  zoneIdMap: Record<ZoneId, ZoneId>;
};

/**
 * 여러 zone(컨테이너 없는 자유 선택)과 그 사이 패스를 한 번에 가져온다.
 * {@link importZoneSubtree} 의 다중 루트판 — 묶음(소재) 삽입에 쓴다.
 *
 * - 선택한 zone + 그 모든 자손을 모은다(컨테이너를 고르면 자식까지 포함).
 * - 모인 집합 안에서 zone/path ID 를 **통합 리맵**한다 — 루트끼리 잇는 패스도 보존된다
 *   (서브트리를 루트별로 따로 가져오면 끊기는 부분).
 * - 집합 밖에 부모가 있던 zone 은 묶음의 루트가 되어 `nextParentZoneId` 에 붙는다.
 * - 집합 밖을 가리키는 패스 타깃은 `externalTargetPolicy` 로 처리(기본 `drop`).
 *
 * 위치/크기(layoutModel)는 다루지 않는다 — 반환된 `zoneIdMap` 으로 호출 측에서
 * 레이아웃을 재적용한다(드롭 지점으로 오프셋). createZoneFromDropTemplate 와 같은 분담.
 */
export function importZoneSubgraph(
  targetModel: UniverseModel,
  sourceModel: UniverseModel,
  sourceZoneIds: readonly ZoneId[],
  options: ImportZoneSubgraphOptions = {}
): ImportZoneSubgraphResult {
  const {
    nextParentZoneId = null,
    rename = (name) => name,
    externalTargetPolicy = "drop",
  } = options;

  // 1) 선택 + 모든 자손 수집(중복 제거)
  const sourceZones: Zone[] = [];
  const seen = new Set<ZoneId>();
  const collect = (zoneId: ZoneId) => {
    if (seen.has(zoneId)) return;
    const zone = sourceModel.zonesById[zoneId];
    if (!zone) return;
    seen.add(zoneId);
    sourceZones.push(zone);
    for (const childId of zone.childZoneIds) collect(childId);
  };
  for (const zoneId of sourceZoneIds) collect(zoneId);

  if (sourceZones.length === 0) {
    return { model: targetModel, importedRootZoneIds: [], zoneIdMap: {} };
  }

  // 2) Zone/Path ID 재발급
  const zoneIdMap: Record<ZoneId, ZoneId> = {};
  const pathIdMap: Record<string, string> = {};
  for (const zone of sourceZones) zoneIdMap[zone.id] = createZoneId();
  for (const zone of sourceZones) {
    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];
      if (path) pathIdMap[path.id] = createPathId();
    }
  }

  // 3) Zone clone + 내부 참조 재작성
  const importedZonesById: Record<ZoneId, Zone> = {};
  const importedRootZoneIds: ZoneId[] = [];

  for (const sourceZone of sourceZones) {
    const nextZoneId = zoneIdMap[sourceZone.id];
    const remappedParent =
      sourceZone.parentZoneId != null
        ? zoneIdMap[sourceZone.parentZoneId]
        : undefined;
    const isRoot = !remappedParent;

    const nextChildZoneIds = sourceZone.childZoneIds
      .map((childId) => zoneIdMap[childId])
      .filter((id): id is ZoneId => Boolean(id));

    const nextPathIds = sourceZone.pathIds
      .map((pathId) => {
        const path = sourceZone.pathsById[pathId];
        return path ? pathIdMap[path.id] : undefined;
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
        if (isSameSourceUniverse && isInternalTarget) {
          nextTarget = {
            universeId: targetModel.universeId,
            zoneId: zoneIdMap[nextTarget.zoneId],
          };
        } else if (externalTargetPolicy === "drop") {
          nextTarget = null;
        } else if (externalTargetPolicy === "mark-unresolved") {
          nextMeta = {
            ...nextMeta,
            unresolvedTarget: true,
            originalTarget: oldPath.target,
          };
        }
        // preserve: 그대로 둔다
      }

      nextPathsById[nextPathId] = {
        ...oldPath,
        id: nextPathId,
        target: nextTarget,
        meta: nextMeta,
      };
    }

    if (isRoot) importedRootZoneIds.push(nextZoneId);

    importedZonesById[nextZoneId] = {
      ...sourceZone,
      id: nextZoneId,
      name: rename(sourceZone.name),
      parentZoneId: remappedParent ?? nextParentZoneId,
      childZoneIds: nextChildZoneIds,
      pathIds: nextPathIds,
      pathsById: nextPathsById,
    };
  }

  // 4) targetModel 병합 + 루트 부착
  const nextZonesById: Record<ZoneId, Zone> = {
    ...targetModel.zonesById,
    ...importedZonesById,
  };
  let nextRootZoneIds = [...targetModel.rootZoneIds];

  if (nextParentZoneId === null) {
    nextRootZoneIds = [...nextRootZoneIds, ...importedRootZoneIds];
  } else {
    const parent = nextZonesById[nextParentZoneId];
    if (parent) {
      nextZonesById[nextParentZoneId] = {
        ...parent,
        childZoneIds: [...parent.childZoneIds, ...importedRootZoneIds],
      };
    }
  }

  return {
    model: {
      ...targetModel,
      rootZoneIds: nextRootZoneIds,
      zonesById: nextZonesById,
    },
    importedRootZoneIds,
    zoneIdMap,
  };
}