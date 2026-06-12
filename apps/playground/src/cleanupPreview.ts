import {
  diffUniverseModels,
  pruneLayoutModel,
  removeEmptyPaths,
  removeZone,
  type PathId,
  type UniverseLayoutModel,
  type UniverseModel,
  type UniverseModelDiff,
  type ZoneId,
} from "@zoneflow/core";
import type {
  ResolvePathColor,
  ResolvePathLineColor,
  ResolveZoneStyle,
} from "@zoneflow/renderer-dom";

/**
 * 정리 미리보기 데모 — diffUniverseModels + 렌더러 데코레이션 훅 사용 예제.
 *
 * "정리" 규칙은 앱(consumer)이 정하는 도메인 로직입니다. 여기서는:
 * 1. 빈 패스 제거 (core 의 removeEmptyPaths)
 * 2. 고아 leaf 존 제거 — 루트가 아니고, 자식/패스가 없고,
 *    어떤 패스의 target 으로도 참조되지 않는 존
 *
 * 적용 전에 diff 를 계산해 두고, 캔버스에는 "무엇이 사라질지"를
 * resolvePathLineColor / resolveZoneStyle 로 표시합니다.
 */

export const CLEANUP_REMOVED_COLOR = "#dc2626";

export function cleanupUniverse(model: UniverseModel): UniverseModel {
  let next = removeEmptyPaths(model);

  // 빈 패스가 사라진 뒤를 기준으로 고아 존을 판정한다 — 빈 패스로만
  // 연결돼 있던 존도 함께 정리 대상이 되도록.
  const targetedZoneIds = new Set<ZoneId>();
  for (const zone of Object.values(next.zonesById)) {
    for (const pathId of zone.pathIds) {
      const target = zone.pathsById[pathId]?.target;
      if (target && target.universeId === next.universeId) {
        targetedZoneIds.add(target.zoneId);
      }
    }
  }

  const rootZoneIds = new Set(next.rootZoneIds);
  for (const zone of Object.values(next.zonesById)) {
    if (rootZoneIds.has(zone.id)) continue;
    if (zone.childZoneIds.length > 0) continue;
    if (zone.pathIds.length > 0) continue;
    if (targetedZoneIds.has(zone.id)) continue;
    next = removeZone(next, zone.id);
  }

  return next;
}

export type CleanupPreviewData = {
  nextModel: UniverseModel;
  nextLayoutModel: UniverseLayoutModel;
  diff: UniverseModelDiff;
  /** 패널 표시용 라벨: "존 이름 › 패스 이름" */
  removedPaths: { pathId: PathId; label: string }[];
  removedZones: { zoneId: ZoneId; label: string }[];
  removedPathIds: Set<PathId>;
  removedZoneIds: Set<ZoneId>;
};

export function buildCleanupPreview(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel
): CleanupPreviewData | null {
  const nextModel = cleanupUniverse(model);
  const diff = diffUniverseModels(model, nextModel);
  if (diff.isEmpty) return null;

  const removedZoneIds = new Set(diff.zones.removed);
  const removedPaths = diff.paths.removed
    // 존이 통째로 사라지면서 같이 사라지는 패스는 존 항목으로 요약되므로
    // 패스 목록에서는 숨긴다 (sourceZoneId 를 zones.removed 와 대조).
    .filter((ref) => !removedZoneIds.has(ref.sourceZoneId))
    .map((ref) => {
      const zone = model.zonesById[ref.sourceZoneId];
      const path = zone?.pathsById[ref.pathId];
      const pathName = path?.name?.trim() ? path.name : "Empty";
      return {
        pathId: ref.pathId,
        label: `${zone?.name ?? ref.sourceZoneId} › ${pathName}`,
      };
    });
  const removedZones = diff.zones.removed.map((zoneId) => ({
    zoneId,
    label: model.zonesById[zoneId]?.name ?? zoneId,
  }));

  return {
    nextModel,
    nextLayoutModel: pruneLayoutModel(nextModel, layoutModel),
    diff,
    removedPaths,
    removedZones,
    removedPathIds: new Set(diff.paths.removed.map((ref) => ref.pathId)),
    removedZoneIds,
  };
}

/**
 * 미리보기 중 캔버스에 끼울 데코레이션 리졸버들.
 * - 제거될 패스: 연결선 + 라벨을 빨간색으로
 * - 제거될 존: 점선 테두리 + 반투명 ghost
 * 미리보기 대상이 아닌 요소는 base 리졸버(meta.color 등)로 폴백합니다.
 */
export function makeCleanupResolvers(
  preview: CleanupPreviewData,
  basePathColor: ResolvePathColor
): {
  resolveZoneStyle: ResolveZoneStyle;
  resolvePathColor: ResolvePathColor;
  resolvePathLineColor: ResolvePathLineColor;
} {
  return {
    resolveZoneStyle: (zone) =>
      preview.removedZoneIds.has(zone.id)
        ? { borderStyle: "dashed", opacity: 0.45 }
        : undefined,
    resolvePathColor: (path) =>
      preview.removedPathIds.has(path.id)
        ? CLEANUP_REMOVED_COLOR
        : basePathColor(path),
    resolvePathLineColor: (path) =>
      preview.removedPathIds.has(path.id) ? CLEANUP_REMOVED_COLOR : undefined,
  };
}
