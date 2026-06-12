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

/**
 * 정리 미리보기 데모 — diffUniverseModels + 렌더러 데코레이션 훅 사용 예제.
 *
 * "정리" 규칙은 앱(consumer)이 정하는 도메인 로직입니다. 여기서는:
 * 1. 빈 패스 제거 (core 의 removeEmptyPaths)
 * 2. 고아 leaf 존 제거 — 루트가 아니고, 자식/패스가 없고,
 *    어떤 패스의 target 으로도 참조되지 않는 존
 *
 * 적용 전에 diff 를 계산해 두고, 캔버스 데코레이션은 renderer-dom 의
 * createDiffDecorations 가 diff 로부터 만들어 줍니다 (CanvasHost 참고).
 */

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
  /** 패널 표시용 — label 은 "존 이름 › 패스 이름", sourceZoneId 는 점프 대상. */
  removedPaths: { pathId: PathId; sourceZoneId: ZoneId; label: string }[];
  removedZones: { zoneId: ZoneId; label: string }[];
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
        sourceZoneId: ref.sourceZoneId,
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
  };
}
