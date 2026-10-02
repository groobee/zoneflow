import type {
  PathId,
  UniverseModel,
  ZoneId,
} from "./types.js";
import { getZone } from "./lookup.js";
import { remapSubtreeIds } from "./remap.js";
import { getEffectiveZoneSlot } from "./zoneCapabilities.js";

export type CloneZoneSubtreeOptions = {
  nextParentZoneId?: ZoneId | null;
  rename?: (originalName: string) => string;
};

export type CloneZoneSubtreeResult = {
  model: UniverseModel;
  clonedRootZoneId: ZoneId;
  zoneIdMap: Record<ZoneId, ZoneId>;
  /** 원본 path ID → 새 path ID. 패스 레이아웃(routeOffset 등) 복제용. */
  pathIdMap: Record<PathId, PathId>;
};

export function cloneZoneSubtree(
  model: UniverseModel,
  sourceRootZoneId: ZoneId,
  options: CloneZoneSubtreeOptions = {}
): CloneZoneSubtreeResult {
  const sourceRootZone = getZone(model, sourceRootZoneId);
  const {
    nextParentZoneId = sourceRootZone?.parentZoneId ?? null,
    rename = (name) => `${name} Copy`,
  } = options;
  const nextParent =
    nextParentZoneId !== null ? model.zonesById[nextParentZoneId] : undefined;

  // 원본이 없거나 붙일 부모가 없으면 no-op (고아 zone 을 만들지 않는다)
  if (!sourceRootZone || (nextParentZoneId !== null && !nextParent)) {
    return {
      model,
      clonedRootZoneId: sourceRootZoneId,
      zoneIdMap: {},
      pathIdMap: {},
    };
  }

  const remapped = remapSubtreeIds(model, sourceRootZoneId);
  const clonedRootZoneId = remapped.rootZoneIds[0];

  const nextZonesById = {
    ...model.zonesById,
    ...remapped.zonesById,
  };

  // 복제 루트의 parent 재설정 + 이름 변경 (새 부모가 선언하지 않은 슬롯 키는 뗀다)
  nextZonesById[clonedRootZoneId] = {
    ...nextZonesById[clonedRootZoneId],
    parentZoneId: nextParentZoneId,
    slotKey: getEffectiveZoneSlot(sourceRootZone, nextParent)?.key,
    name: rename(sourceRootZone.name),
  };

  let nextRootZoneIds = [...model.rootZoneIds];

  // 루트에 붙이는 경우
  if (nextParentZoneId === null) {
    nextRootZoneIds.push(clonedRootZoneId);
  } else {
    const parent = nextZonesById[nextParentZoneId];
    nextZonesById[nextParentZoneId] = {
      ...parent,
      childZoneIds: [...parent.childZoneIds, clonedRootZoneId],
    };
  }

  return {
    model: {
      ...model,
      rootZoneIds: nextRootZoneIds,
      zonesById: nextZonesById,
    },
    clonedRootZoneId,
    zoneIdMap: remapped.zoneIdMap,
    pathIdMap: remapped.pathIdMap,
  };
}

export type DuplicateZoneSubtreeOptions = CloneZoneSubtreeOptions;
export type DuplicateZoneSubtreeResult = CloneZoneSubtreeResult;

export function duplicateZoneSubtree(
  model: UniverseModel,
  sourceRootZoneId: ZoneId,
  options: DuplicateZoneSubtreeOptions = {}
): DuplicateZoneSubtreeResult {
  return cloneZoneSubtree(model, sourceRootZoneId, {
    rename: options.rename ?? ((name) => `${name} Copy`),
    nextParentZoneId: options.nextParentZoneId,
  });
}