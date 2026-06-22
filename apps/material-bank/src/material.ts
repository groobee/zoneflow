import {
  createZoneLayout,
  getZoneLayout,
  importZoneSubgraph,
  setZoneLayout,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";

/**
 * "소재" = 컨테이너 없는 자유 선택(존 여러 개 + 그 사이 패스)의 자기완결 스냅샷.
 * 저장 시점의 model/layout 과 선택한 zoneId 만 들고 있다가, 드롭 때 importZoneSubgraph
 * 로 새 ID 를 발급해 현재 model 에 삽입한다(자손/내부 패스는 import 가 함께 처리).
 */
export type Material = {
  id: string;
  label: string;
  zoneCount: number;
  sourceModel: UniverseModel;
  sourceLayoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  /** 묶음 바운딩 박스(미리보기 비율 + 드롭 센터링용, world units). */
  width: number;
  height: number;
};

/** zone 의 월드 좌상단 — 부모 체인의 상대 layout 을 누적(루트면 자기 x/y). */
function worldOrigin(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId
): Point {
  let x = 0;
  let y = 0;
  let current: ZoneId | null = zoneId;
  const guard = new Set<ZoneId>();
  while (current && !guard.has(current)) {
    guard.add(current);
    const layout = getZoneLayout(layoutModel, current);
    if (layout) {
      x += layout.x;
      y += layout.y;
    }
    current = model.zonesById[current]?.parentZoneId ?? null;
  }
  return { x, y };
}

/** 선택 zone + 모든 자손(importZoneSubgraph 의 수집과 동일). */
function collectIds(
  model: UniverseModel,
  zoneIds: readonly ZoneId[]
): ZoneId[] {
  const out: ZoneId[] = [];
  const seen = new Set<ZoneId>();
  const visit = (id: ZoneId) => {
    if (seen.has(id)) return;
    const zone = model.zonesById[id];
    if (!zone) return;
    seen.add(id);
    out.push(id);
    zone.childZoneIds.forEach(visit);
  };
  zoneIds.forEach(visit);
  return out;
}

/** 현재 선택을 소재로 추출(바운딩 박스 계산). 선택이 비면 null. */
export function extractMaterial(params: {
  id: string;
  label: string;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: readonly ZoneId[];
}): Material | null {
  const { id, label, model, layoutModel, zoneIds } = params;
  const collected = collectIds(model, zoneIds);
  if (collected.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const zoneId of collected) {
    const origin = worldOrigin(model, layoutModel, zoneId);
    const layout = getZoneLayout(layoutModel, zoneId);
    const width = layout?.width ?? 0;
    const height = layout?.height ?? 0;
    minX = Math.min(minX, origin.x);
    minY = Math.min(minY, origin.y);
    maxX = Math.max(maxX, origin.x + width);
    maxY = Math.max(maxY, origin.y + height);
  }

  return {
    id,
    label,
    zoneCount: collected.length,
    sourceModel: model,
    sourceLayoutModel: layoutModel,
    zoneIds: [...zoneIds],
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

/** 소재를 현재 model 에 드롭. worldPoint 에 묶음 중심을 맞춰 배치한다. */
export function dropMaterial(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  material: Material;
  worldPoint: Point;
}): { model: UniverseModel; layoutModel: UniverseLayoutModel } {
  const { model, layoutModel, material, worldPoint } = params;
  const { sourceModel, sourceLayoutModel } = material;

  const collected = collectIds(sourceModel, material.zoneIds);
  if (collected.length === 0) return { model, layoutModel };

  // 1) 모델 삽입 — 새 ID + 내부 패스 통합 리맵 + 외부 타깃 drop, 루트는 최상위에.
  const imported = importZoneSubgraph(model, sourceModel, material.zoneIds, {
    nextParentZoneId: null,
  });
  const rootSet = new Set<ZoneId>(imported.importedRootZoneIds);

  // 2) 묶음 좌상단(world) → 드롭 지점 중심 정렬.
  let minX = Infinity;
  let minY = Infinity;
  for (const zoneId of collected) {
    const origin = worldOrigin(sourceModel, sourceLayoutModel, zoneId);
    minX = Math.min(minX, origin.x);
    minY = Math.min(minY, origin.y);
  }
  const dropLeft = worldPoint.x - material.width / 2;
  const dropTop = worldPoint.y - material.height / 2;

  // 3) 레이아웃 재적용 — 루트는 월드 위치를 드롭 지점으로 오프셋, 자손은 상대 위치 유지.
  let nextLayoutModel = layoutModel;
  for (const sourceId of collected) {
    const newId = imported.zoneIdMap[sourceId];
    const sourceLayout = getZoneLayout(sourceLayoutModel, sourceId);
    if (!newId || !sourceLayout) continue;
    const { width, height } = sourceLayout;
    if (width == null || height == null) continue;

    if (rootSet.has(newId)) {
      const origin = worldOrigin(sourceModel, sourceLayoutModel, sourceId);
      nextLayoutModel = setZoneLayout(
        nextLayoutModel,
        newId,
        createZoneLayout({
          x: origin.x - minX + dropLeft,
          y: origin.y - minY + dropTop,
          width,
          height,
        })
      );
    } else {
      nextLayoutModel = setZoneLayout(
        nextLayoutModel,
        newId,
        createZoneLayout({
          x: sourceLayout.x,
          y: sourceLayout.y,
          width,
          height,
        })
      );
    }
  }

  return { model: imported.model, layoutModel: nextLayoutModel };
}
