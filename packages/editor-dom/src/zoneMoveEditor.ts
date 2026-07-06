import {
  collectSubtreeZoneIds,
  getPathLayout,
  getZoneDepth,
  getZoneLayout,
  resolveZoneSlotRegions,
  updateZoneLayout,
  zoneDeclaresSlots,
  type FlowDirection,
  type PathId,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import { resolveContainingParentZoneId } from "./zoneReparent";
import {
  ROOT_WORLD_ORIGIN,
  resolveWorldZoneOrigin,
  resolveWorldZoneRect,
} from "./zoneGeometry";
import type {
  CameraState,
  Rect,
  RendererFrame,
} from "@zoneflow/renderer-dom";
import {
  collectRectObjectSnapGuides,
  projectWorldRectToScreenRect,
  resolveObjectSnappedRectPosition,
  resolveSnappedMove,
  roundCoordinate,
  snapCoordinate,
  typedValues,
  type GridSnapOptions,
  type ObjectSnapOptions,
  type MoveEditorDragOrigin,
  type MoveEditorTarget,
  type MoveEditorTargetOptions,
  type PathMoveOriginSnapshot,
  type ZoneAlignMode,
  type ZoneDistributeMode,
  type ZoneResizeOrigin,
} from "./moveEditorShared";
import {
  applyPathMovePosition,
  resolvePathMoveOriginSnapshot,
} from "./pathMoveEditor";
import {
  resolvePolylineMidpoint,
  samplePathEdgeWorldPolylines,
} from "./pathHitTest";
import {
  applyZoneOriginsDelta,
  resolveZoneGroupOrigins,
} from "./zoneGeometry";

export type {
  GridSnapOptions,
  MoveEditorDragOrigin,
  MoveEditorTarget,
  MoveEditorTargetOptions,
  ObjectSnapOptions,
  PathAlignMode,
  PathDistributeMode,
  PathResizeOrigin,
  ZoneAlignMode,
  ZoneDistributeMode,
  ZoneResizeOrigin,
} from "./moveEditorShared";
export {
  alignPathsByMode,
  distributePathsByMode,
  resolveGroupPathDragOrigin,
  resolvePathResizeOrigin,
  resizePathNodeByScreenDelta,
} from "./pathMoveEditor";
export {
  commitZoneGroupReparentAtCurrentPosition,
  commitZoneReparentAtCurrentPosition,
  commitZoneSlotMembership,
  reparentZoneAtCurrentPosition,
  resolveZoneDropPlacement,
  resolveZonePlacementAtWorldRect,
  resolveZoneReparentCandidate,
} from "./zoneReparent";
export type { CanDropZone, CanDropZoneParams } from "./zoneReparent";

const DEFAULT_MIN_VISIBLE_SIZE = 18;
// 라벨 없는(display "edge") 패스의 선택 칩 — 연결선 중점의 스크린 고정 크기.
const EDGE_CHIP_SCREEN_SIZE = 22;
const DEFAULT_MIN_ZONE_WIDTH = 140;
// Kept below the renderer's chip-layout height threshold (44px) so a normal
// zone can be dragged down into chip size via the resize handle.
const DEFAULT_MIN_ZONE_HEIGHT = 28;

function collectDescendantZoneIds(model: UniverseModel, zoneId: ZoneId): Set<ZoneId> {
  const descendants = new Set<ZoneId>();
  const queue = [...(model.zonesById[zoneId]?.childZoneIds ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || descendants.has(current)) continue;
    descendants.add(current);
    queue.push(...(model.zonesById[current]?.childZoneIds ?? []));
  }

  return descendants;
}

function resolveObjectSnapGuides(params: {
  model: UniverseModel;
  frame?: RendererFrame;
  target: MoveEditorTarget;
}) {
  const { model, frame, target } = params;
  if (!frame) return undefined;

  const excludedZoneIds =
    target.kind === "zone"
      ? new Set<ZoneId>([target.zoneId, ...collectDescendantZoneIds(model, target.zoneId)])
      : new Set<ZoneId>();
  const candidateRects: Rect[] = [];

  for (const zoneVisual of typedValues(frame.pipeline.graphLayout.zonesById)) {
    const visibility = frame.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];
    if (!visibility?.isVisible) continue;
    if (excludedZoneIds.has(zoneVisual.zoneId)) continue;
    candidateRects.push(zoneVisual.rect);
  }

  for (const pathVisual of typedValues(frame.pipeline.graphLayout.pathsById)) {
    const visibility = frame.pipeline.visibility.pathVisibilityById[pathVisual.pathId];
    if (!visibility?.shouldRenderNode || !pathVisual.rect) continue;
    if (target.kind === "path" && pathVisual.pathId === target.pathId) continue;
    if (target.kind === "zone" && excludedZoneIds.has(pathVisual.sourceZoneId)) continue;
    candidateRects.push(pathVisual.rect);
  }

  return candidateRects.length > 0
    ? collectRectObjectSnapGuides(candidateRects)
    : undefined;
}

function resolveResizedAnchor(params: {
  kind: "inlet" | "outlet";
  width: number;
  height: number;
  current?: NonNullable<UniverseLayoutModel["zoneLayoutsById"][ZoneId]>["anchors"]["inlet"];
  flowDirection?: FlowDirection;
}) {
  const { kind, width, height, current, flowDirection } = params;
  const rectWidth = current?.rect?.width;
  const rectHeight = current?.rect?.height;

  if (flowDirection === "topToBottom") {
    const nextCenterX = roundCoordinate(width / 2);
    return {
      point: {
        x: nextCenterX,
        y: kind === "inlet" ? 0 : roundCoordinate(height),
      },
      rect: current?.rect
        ? {
            ...current.rect,
            x:
              rectWidth !== undefined
                ? roundCoordinate(nextCenterX - rectWidth / 2)
                : current.rect.x,
            y:
              kind === "inlet"
                ? 0
                : roundCoordinate(
                    height - (rectHeight ?? current.rect.height ?? 0)
                  ),
            width: rectWidth,
            height: rectHeight,
          }
        : undefined,
    };
  }

  const nextCenterY = roundCoordinate(height / 2);
  const nextRectY =
    rectHeight !== undefined
      ? roundCoordinate(nextCenterY - rectHeight / 2)
      : undefined;

  return {
    point: {
      x: kind === "inlet" ? 0 : roundCoordinate(width),
      y: nextCenterY,
    },
    rect: current?.rect
      ? {
          ...current.rect,
          x:
            kind === "inlet"
              ? 0
              : roundCoordinate(width - (rectWidth ?? current.rect.width ?? 0)),
          y: nextRectY ?? current.rect.y,
          width: rectWidth,
          height: rectHeight,
        }
      : undefined,
  };
}

export function getMoveEditorTargets(params: {
  model: UniverseModel;
  layoutModel?: UniverseLayoutModel;
  frame: RendererFrame;
  camera: CameraState;
  options?: MoveEditorTargetOptions;
}): MoveEditorTarget[] {
  const {
    model,
    layoutModel,
    frame,
    camera,
    options,
  } = params;

  const includeRoot = options?.includeRoot ?? true;
  const minVisibleSize = options?.minVisibleSize ?? DEFAULT_MIN_VISIBLE_SIZE;
  const zoneTargets: Array<
    MoveEditorTarget & { kind: "zone"; depth: number; zOrder?: number }
  > = [];
  const pathTargets: Array<MoveEditorTarget & { kind: "path"; zOrder: number }> = [];

  for (const zoneVisual of typedValues(frame.pipeline.graphLayout.zonesById)) {
    const zone = model.zonesById[zoneVisual.zoneId];
    const visibility =
      frame.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];

    if (!zone || !visibility?.isVisible) continue;
    if (!includeRoot && model.rootZoneIds.includes(zone.id)) continue;

    const rect = projectWorldRectToScreenRect(zoneVisual.rect, camera);
    if (rect.width < minVisibleSize || rect.height < minVisibleSize) {
      continue;
    }

    zoneTargets.push({
      key: `zone:${zoneVisual.zoneId}`,
      kind: "zone",
      zoneId: zoneVisual.zoneId,
      label: zone.name,
      rect,
      depth: getZoneDepth(model, zoneVisual.zoneId),
      zOrder: layoutModel?.zoneLayoutsById[zoneVisual.zoneId]?.zOrder,
    });
  }

  for (const [index, pathVisual] of typedValues(frame.pipeline.graphLayout.pathsById).entries()) {
    const visibility =
      frame.pipeline.visibility.pathVisibilityById[pathVisual.pathId];

    if (!visibility?.shouldRenderNode || !pathVisual.rect) {
      // 라벨 노드가 소비자 display "edge" 로 숨겨진 패스 — 연결선 중점에 작은
      // 칩 히트 영역을 만들어 선택 시스템(클릭·마퀴·툴바·삭제)에 합류시킨다.
      // 줌아웃(density edge-only) 축약은 기존대로 타깃에서 제외.
      if (pathVisual.display !== "edge" || !visibility?.shouldRenderEdge) {
        continue;
      }
      const chipCenter = resolvePolylineMidpoint(
        samplePathEdgeWorldPolylines({
          frame,
          pathId: pathVisual.pathId,
          resolvePathStyle: options?.resolvePathStyle,
        })[0] ?? []
      );
      if (!chipCenter) continue;

      const chipScreenCenter = {
        x: camera.x + chipCenter.x * camera.zoom,
        y: camera.y + chipCenter.y * camera.zoom,
      };
      pathTargets.push({
        key: `path:${pathVisual.pathId}`,
        kind: "path",
        pathId: pathVisual.pathId,
        label: pathVisual.path.name,
        rect: {
          x: chipScreenCenter.x - EDGE_CHIP_SCREEN_SIZE / 2,
          y: chipScreenCenter.y - EDGE_CHIP_SCREEN_SIZE / 2,
          width: EDGE_CHIP_SCREEN_SIZE,
          height: EDGE_CHIP_SCREEN_SIZE,
        },
        nodeHidden: true,
        zOrder: layoutModel?.pathLayoutsById[pathVisual.pathId]?.zOrder ?? index,
      });
      continue;
    }

    const rect = projectWorldRectToScreenRect(pathVisual.rect, camera);
    if (rect.width < minVisibleSize || rect.height < minVisibleSize) {
      continue;
    }

    pathTargets.push({
      key: `path:${pathVisual.pathId}`,
      kind: "path",
      pathId: pathVisual.pathId,
      label: pathVisual.path.name,
      rect,
      zOrder: layoutModel?.pathLayoutsById[pathVisual.pathId]?.zOrder ?? index,
    });
  }

  return [
    ...zoneTargets
      .sort((a, b) => {
        const aOrder = a.zOrder ?? 0;
        const bOrder = b.zOrder ?? 0;
        return a.depth - b.depth || aOrder - bOrder;
      })
      .map(({ depth: _depth, zOrder: _zOrder, ...target }) => target),
    ...pathTargets
      .sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0))
      .map(({ zOrder: _zOrder, ...target }) => target),
  ];
}

export function resolveMoveEditorDragOrigin(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  target: MoveEditorTarget;
  frame?: RendererFrame;
}): MoveEditorDragOrigin | undefined {
  const { model, layoutModel, target, frame } = params;
  if (target.kind === "zone") {
    const zoneLayout = getZoneLayout(layoutModel, target.zoneId);
    if (!zoneLayout) return undefined;
    const zoneRect =
      frame?.pipeline.graphLayout.zonesById[target.zoneId]?.rect ??
      getZoneLayout(layoutModel, target.zoneId);
    const width = zoneRect?.width ?? 0;
    const height = zoneRect?.height ?? 0;

    return {
      kind: "zone",
      zoneId: target.zoneId,
      originX: zoneLayout.x,
      originY: zoneLayout.y,
      width,
      height,
      objectSnapGuides: resolveObjectSnapGuides({
        model,
        frame,
        target,
      }),
    };
  }

  return {
    kind: "path",
    pathId: target.pathId,
    origin: resolvePathMoveOriginSnapshot({
      frame,
      layoutModel,
      pathId: target.pathId,
    }),
    objectSnapGuides: resolveObjectSnapGuides({
      model,
      frame,
      target,
    }),
  };
}

export function resolveGroupZoneDragOrigin(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  primaryZoneId: ZoneId;
}): MoveEditorDragOrigin | undefined {
  const resolved = resolveZoneGroupOrigins(params);
  if (!resolved) return undefined;

  return {
    kind: "zone-group",
    primaryZoneId: resolved.primaryZoneId,
    originsByZoneId: resolved.originsByZoneId,
  };
}

export function moveEditorTargetByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: MoveEditorDragOrigin;
  deltaX: number;
  deltaY: number;
  gridSnap?: GridSnapOptions;
  objectSnap?: ObjectSnapOptions;
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    gridSnap,
    objectSnap,
  } = params;

  if (origin.kind === "zone") {
    const { nextX, nextY } = resolveSnappedMove({
      originX: origin.originX,
      originY: origin.originY,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });
    const snapped = resolveObjectSnappedRectPosition({
      x: nextX,
      y: nextY,
      width: origin.width,
      height: origin.height,
      camera,
      guides: origin.objectSnapGuides,
      objectSnap,
    });
    return updateZoneLayout(layoutModel, origin.zoneId, {
      x: snapped.x,
      y: snapped.y,
    });
  }

  if (origin.kind === "zone-group") {
    const primaryOrigin = origin.originsByZoneId[origin.primaryZoneId];
    if (!primaryOrigin) return layoutModel;

    const { effectiveDeltaX, effectiveDeltaY } = resolveSnappedMove({
      originX: primaryOrigin.x,
      originY: primaryOrigin.y,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });

    return applyZoneOriginsDelta({
      layoutModel,
      originsByZoneId: origin.originsByZoneId,
      deltaX: effectiveDeltaX,
      deltaY: effectiveDeltaY,
    });
  }

  if (origin.kind === "path-group") {
    const primaryOrigin = origin.originsByPathId[origin.primaryPathId];
    if (!primaryOrigin) return layoutModel;

    const { effectiveDeltaX, effectiveDeltaY } = resolveSnappedMove({
      originX: primaryOrigin.x,
      originY: primaryOrigin.y,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });

    let nextLayoutModel = layoutModel;
    for (const [pathId, pathOrigin] of Object.entries(origin.originsByPathId) as Array<
      [PathId, typeof primaryOrigin]
    >) {
      nextLayoutModel = applyPathMovePosition({
        layoutModel: nextLayoutModel,
        pathId,
        origin: pathOrigin,
        x: roundCoordinate(pathOrigin.x + effectiveDeltaX),
        y: roundCoordinate(pathOrigin.y + effectiveDeltaY),
      });
    }

    return nextLayoutModel;
  }

  const { nextX, nextY } = resolveSnappedMove({
    originX: origin.origin.x,
    originY: origin.origin.y,
    deltaX,
    deltaY,
    camera,
    gridSnap,
  });
  const snapped = resolveObjectSnappedRectPosition({
    x: nextX,
    y: nextY,
    width: origin.origin.width,
    height: origin.origin.height,
    camera,
    guides: origin.objectSnapGuides,
    objectSnap,
  });
  return applyPathMovePosition({
    layoutModel,
    pathId: origin.pathId,
    origin: origin.origin,
    x: snapped.x,
    y: snapped.y,
  });
}

/**
 * 주어진 존들이 각자의 부모 컨테이너 박스 밖으로 나가지 않게 위치를 클램프한다.
 * 자식 layout (x,y) 는 부모 좌상단 기준 상대좌표이므로, 부모/자식 크기를 알면
 * 월드 변환 없이 `[0, pw-cw] × [0, ph-ch]` 로 가둘 수 있다. 부모가 없거나(루트)
 * 부모·자식 크기를 모르면 해당 존은 건너뛴다. (드래그 중 호출되는 순수 함수)
 */
export function confineZonesWithinParents(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
}): UniverseLayoutModel {
  const { model, zoneIds } = params;
  let layoutModel = params.layoutModel;

  for (const zoneId of zoneIds) {
    const parentZoneId = model.zonesById[zoneId]?.parentZoneId;
    if (!parentZoneId) continue;

    const child = getZoneLayout(layoutModel, zoneId);
    const parent = getZoneLayout(layoutModel, parentZoneId);
    if (
      !child ||
      !parent ||
      parent.width == null ||
      parent.height == null ||
      child.width == null ||
      child.height == null
    ) {
      continue;
    }

    const maxX = Math.max(0, parent.width - child.width);
    const maxY = Math.max(0, parent.height - child.height);
    const x = Math.min(Math.max(child.x, 0), maxX);
    const y = Math.min(Math.max(child.y, 0), maxY);

    if (x !== child.x || y !== child.y) {
      layoutModel = updateZoneLayout(layoutModel, zoneId, { x, y });
    }
  }

  return layoutModel;
}

/** 스냅 포인트 점유 판정 반경(world units) — 스냅된 존은 포인트 위에 정확히
 * 앉지만, roundCoordinate(소수 2자리) 오차를 흡수할 여유를 둔다. */
const SLOT_SNAP_OCCUPANCY_EPSILON = 1;

/**
 * 도킹 슬롯의 스냅 포인트로 존 **중앙**을 맞춘다(드래그 중 호출되는 순수 함수,
 * `snapZonesToCells` 의 슬롯판). 스냅 기준은 현재 부모가 아니라 **그 자리에
 * 드롭하면 부모가 될 컨테이너**(reparent 후보)다 — 컨테이너 바깥에 있던 존도
 * 레인 위로 끌려오면 한 모션으로 진입하며 스냅된다. **한 포인트는 한 존만** —
 * 미래 형제 존이 이미 앉아 있는 포인트는 후보에서 제외하고 가장 가까운 빈
 * 포인트로 스냅하며, 그룹 드래그도 순차 배정으로 같은 포인트를 나눠 갖지
 * 않는다. 빈 포인트가 없으면 위치를 건드리지 않는다(자유 배치 — 슬롯
 * 멤버십에는 영향 없음).
 */
export function snapZonesToSlotPoints(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
}): UniverseLayoutModel {
  const { model, zoneIds } = params;
  let layoutModel = params.layoutModel;
  const draggedZoneIds = new Set(zoneIds);
  // 이번 호출에서 배정한 포인트(월드 좌표)도 점유로 취급 — 그룹 드래그 중복 방지.
  const claimedWorldPoints: Point[] = [];

  const isNear = (a: Point, b: Point) =>
    Math.abs(a.x - b.x) <= SLOT_SNAP_OCCUPANCY_EPSILON &&
    Math.abs(a.y - b.y) <= SLOT_SNAP_OCCUPANCY_EPSILON;

  const worldCenterOf = (id: ZoneId, cache: Map<ZoneId, Point>) => {
    const rect = resolveWorldZoneRect({ model, layoutModel, zoneId: id, cache });
    if (!rect) return undefined;
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  };

  for (const zoneId of zoneIds) {
    const zone = model.zonesById[zoneId];
    const childLayout = getZoneLayout(layoutModel, zoneId);
    if (
      !zone ||
      !childLayout ||
      childLayout.width == null ||
      childLayout.height == null
    ) {
      continue;
    }

    const cache = new Map<ZoneId, Point>();
    const worldCenter = worldCenterOf(zoneId, cache);
    if (!worldCenter) continue;

    // 드롭 시 부모가 될 컨테이너 — reparent 판정과 같은 규칙(자기 서브트리 제외).
    const candidateParentZoneId = resolveContainingParentZoneId({
      model,
      layoutModel,
      centerPoint: worldCenter,
      cache,
      invalidZoneIds: new Set(collectSubtreeZoneIds(model, zoneId)),
    });
    const candidate = candidateParentZoneId
      ? model.zonesById[candidateParentZoneId]
      : undefined;
    if (!candidate || !zoneDeclaresSlots(candidate)) continue;

    const candidateLayout = getZoneLayout(layoutModel, candidate.id);
    if (!candidateLayout) continue;
    const candidateOrigin = resolveWorldZoneOrigin({
      model,
      layoutModel,
      zoneId: candidate.id,
    });
    const localCenter = {
      x: worldCenter.x - candidateOrigin.x,
      y: worldCenter.y - candidateOrigin.y,
    };

    // 존 중앙을 품는 레인(겹치면 나중 선언 = 위에 그려진 쪽) 중 스냅 포인트가
    // 있는 것을 찾는다.
    const regions = resolveZoneSlotRegions(candidate, candidateLayout);
    let snapPoints: Point[] | undefined;
    for (let i = regions.length - 1; i >= 0; i--) {
      const region = regions[i];
      if (
        localCenter.x >= region.x &&
        localCenter.x <= region.x + region.width &&
        localCenter.y >= region.y &&
        localCenter.y <= region.y + region.height
      ) {
        snapPoints = region.snapPoints;
        break;
      }
    }
    if (!snapPoints?.length) continue;

    // 점유 포인트 수집(월드 좌표): 드래그 중이 아닌 미래-형제 존들의 중앙 +
    // 이번에 배정한 포인트.
    const occupiedWorldCenters: Point[] = [...claimedWorldPoints];
    for (const siblingId of candidate.childZoneIds) {
      if (siblingId === zoneId || draggedZoneIds.has(siblingId)) continue;
      const siblingCenter = worldCenterOf(siblingId, cache);
      if (siblingCenter) occupiedWorldCenters.push(siblingCenter);
    }

    let best: Point | undefined; // 월드 좌표
    let bestDist = Infinity;
    for (const point of snapPoints) {
      const worldPoint = {
        x: candidateOrigin.x + point.x,
        y: candidateOrigin.y + point.y,
      };
      if (occupiedWorldCenters.some((occupied) => isNear(worldPoint, occupied))) {
        continue;
      }
      const dist = Math.hypot(
        worldPoint.x - worldCenter.x,
        worldPoint.y - worldCenter.y
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = worldPoint;
      }
    }
    if (!best) continue;

    claimedWorldPoints.push(best);
    // 레이아웃 좌표는 "현재 부모" 기준 상대값 — 아직 reparent 전이어도 월드
    // 위치가 포인트에 오도록 현재 부모 원점 기준으로 역산한다. 드롭 시
    // reparent 가 월드 위치를 보존하며 좌표계를 새 부모로 옮긴다.
    const currentParentOrigin = zone.parentZoneId
      ? resolveWorldZoneOrigin({ model, layoutModel, zoneId: zone.parentZoneId })
      : ROOT_WORLD_ORIGIN;
    const x = roundCoordinate(
      best.x - currentParentOrigin.x - childLayout.width / 2
    );
    const y = roundCoordinate(
      best.y - currentParentOrigin.y - childLayout.height / 2
    );
    if (x !== childLayout.x || y !== childLayout.y) {
      layoutModel = updateZoneLayout(layoutModel, zoneId, { x, y });
    }
  }

  return layoutModel;
}

/**
 * 컨테이너 리사이즈 후 스냅 포인트 추종 — 존은 컨테이너가 아니라 **자기 스냅
 * 포인트를 따라간다**. 리사이즈 전 크기의 레인 기하로 "어느 존이 어느 슬롯의
 * 몇 번째 포인트에 앉아 있었나"를 복원한 뒤, 리사이즈 후 기하에서 같은
 * 슬롯·같은 인덱스 포인트의 새 위치로 존을 옮긴다 (70% 클램프·free-rect 경계
 * 클램프로 포인트가 움직인 경우에만 실제 이동이 발생). 포인트가 사라졌으면
 * 그대로 둔다 — 이후 멤버십 재평가(commitZoneSlotMembership)가 정리한다.
 */
export function followSlotSnapPointsAfterResize(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneId: ZoneId;
  previousSize: { width?: number; height?: number };
}): UniverseLayoutModel {
  const { model, zoneId, previousSize } = params;
  let layoutModel = params.layoutModel;

  const zone = model.zonesById[zoneId];
  const currentLayout = getZoneLayout(layoutModel, zoneId);
  if (!zone || !currentLayout || !zoneDeclaresSlots(zone)) return layoutModel;

  const prevRegions = resolveZoneSlotRegions(zone, {
    width: previousSize.width,
    height: previousSize.height,
    slotLayoutsByKey: currentLayout.slotLayoutsByKey,
  });
  const nextRegions = resolveZoneSlotRegions(zone, currentLayout);
  const nextRegionsByKey = new Map(nextRegions.map((r) => [r.key, r]));

  for (const childId of zone.childZoneIds) {
    const childLayout = getZoneLayout(layoutModel, childId);
    if (!childLayout || childLayout.width == null || childLayout.height == null) {
      continue;
    }
    const center = {
      x: childLayout.x + childLayout.width / 2,
      y: childLayout.y + childLayout.height / 2,
    };

    // 리사이즈 전 기하에서 이 존이 앉아 있던 포인트(슬롯 key + 인덱스)를 찾는다.
    let seated: { key: string; index: number } | undefined;
    for (let i = prevRegions.length - 1; i >= 0 && !seated; i--) {
      const points = prevRegions[i].snapPoints ?? [];
      for (let p = 0; p < points.length; p++) {
        if (
          Math.abs(points[p].x - center.x) <= SLOT_SNAP_OCCUPANCY_EPSILON &&
          Math.abs(points[p].y - center.y) <= SLOT_SNAP_OCCUPANCY_EPSILON
        ) {
          seated = { key: prevRegions[i].key, index: p };
          break;
        }
      }
    }
    if (!seated) continue;

    const nextPoint = nextRegionsByKey.get(seated.key)?.snapPoints?.[seated.index];
    if (!nextPoint) continue;

    const x = roundCoordinate(nextPoint.x - childLayout.width / 2);
    const y = roundCoordinate(nextPoint.y - childLayout.height / 2);
    if (x !== childLayout.x || y !== childLayout.y) {
      layoutModel = updateZoneLayout(layoutModel, childId, { x, y });
    }
  }

  return layoutModel;
}

/**
 * "셀 스냅(Cell Snap)" 옵션. 캔버스를 **반복되는 트랙 패턴**의 모듈러 그리드로 보고
 * (모눈종이에 트랙 경계마다 굵은 선), 콘텐츠를 그 셀에 맞춰 배치하기 위한 설정. 축별
 * 트랙 패턴은 origin 부터 무한 반복하며, **짝수 인덱스 트랙(0,2,…)이 "셀", 홀수(1,3,…)가
 * "거터"** 다 — 존은 셀 중앙에만 스냅하고 거터는 비워둔다. 트랙 크기는 소비자가 지정한다
 * (보통 그리드 칸 수 × gridSnapSize).
 */
export type CellSnapOptions = {
  enabled?: boolean;
  /**
   * 가로/세로 트랙 패턴(world units), 반복. 짝수 인덱스=셀, 홀수=거터.
   * 예: `[256, 80]` → 256짜리 셀과 80짜리 거터가 번갈아 반복. `[256]` → 거터 없는 균일 셀.
   */
  columns: number[];
  rows: number[];
  /** 트랙 패턴 시작 좌표(world units). 기본 0. */
  originX?: number;
  originY?: number;
};

/**
 * 좌표를 트랙 패턴에서 가장 가까운 "셀(짝수 트랙) 중앙"에 스냅한다. 패턴은 origin 부터
 * 무한 반복하며 짝수 인덱스 트랙이 셀·홀수가 거터다. 패턴 합이 0이거나 셀이 하나도 없으면
 * 원좌표를 그대로 돌려준다.
 */
function snapToNearestCellCenterInPattern(
  center: number,
  pattern: number[],
  origin: number
): number {
  const period = pattern.reduce((sum, n) => sum + (n > 0 ? n : 0), 0);
  if (!(period > 0)) return center;

  // 한 주기 안에서의 셀(짝수 트랙) 중앙 오프셋들.
  const cellCenters: number[] = [];
  let pos = 0;
  for (let i = 0; i < pattern.length; i++) {
    const size = pattern[i] > 0 ? pattern[i] : 0;
    if (i % 2 === 0 && size > 0) cellCenters.push(pos + size / 2);
    pos += size;
  }
  if (cellCenters.length === 0) return center;

  // center 를 origin 기준 가장 가까운 주기로 줄여, 이웃 주기까지 후보를 비교.
  const base = Math.floor((center - origin) / period) * period;
  let best = center;
  let bestDist = Infinity;
  for (const cellCenter of cellCenters) {
    for (const k of [base - period, base, base + period]) {
      const candidate = origin + k + cellCenter;
      const dist = Math.abs(candidate - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
}

/**
 * 주어진 존들의 **중앙**을 가장 가까운 셀 중앙에 맞춘다(중앙↔중앙 스냅, 셀 스냅 모드의
 * 기본 동작). 트랙 패턴의 짝수 트랙(셀)에만 들어가고 홀수(거터)는 건너뛴다. 존 크기는
 * 그대로 두고 위치만 옮긴다 — 셀보다 작으면 셀 안에 가운데 정렬되고, 크면 셀 중앙 기준으로
 * 걸쳐진다. 크기 미상 존은 건너뛴다.
 */
export function snapZonesToCells(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  cells: CellSnapOptions;
}): UniverseLayoutModel {
  const { zoneIds, cells } = params;
  let layoutModel = params.layoutModel;
  const { columns, rows, originX = 0, originY = 0 } = cells;
  if (!columns?.length || !rows?.length) return layoutModel;

  for (const zoneId of zoneIds) {
    const layout = getZoneLayout(layoutModel, zoneId);
    if (!layout || layout.width == null || layout.height == null) continue;

    const centerX = layout.x + layout.width / 2;
    const centerY = layout.y + layout.height / 2;
    const x =
      snapToNearestCellCenterInPattern(centerX, columns, originX) -
      layout.width / 2;
    const y =
      snapToNearestCellCenterInPattern(centerY, rows, originY) -
      layout.height / 2;

    if (x !== layout.x || y !== layout.y) {
      layoutModel = updateZoneLayout(layoutModel, zoneId, { x, y });
    }
  }

  return layoutModel;
}

/**
 * 패스 라벨(노드)들의 **절대 월드 중앙**을 가장 가까운 셀 중앙에 맞춘다(존 셀 스냅의
 * 패스판). 드래그 origin 스냅샷에 담긴 시작 중앙(`absCenterX/Y`)과 이동 후 위치 변화량으로
 * 현재 절대 중앙을 복원해 스냅하므로, route-offset(경로 기준 오프셋)·component-layout(절대)
 * 두 좌표공간 모두에서 월드 그리드에 정렬된다. 시작 중앙 미상(프레임 없이 시작)이면 건너뛴다.
 */
export function snapPathsToCells(params: {
  layoutModel: UniverseLayoutModel;
  /** 드래그 중인 패스들의 시작 origin 스냅샷(절대 중앙 포함). */
  origins: Record<PathId, PathMoveOriginSnapshot>;
  cells: CellSnapOptions;
}): UniverseLayoutModel {
  const { origins, cells } = params;
  let layoutModel = params.layoutModel;
  const { columns, rows, originX = 0, originY = 0 } = cells;
  if (!columns?.length || !rows?.length) return layoutModel;

  for (const [pathId, origin] of Object.entries(origins) as Array<
    [PathId, PathMoveOriginSnapshot]
  >) {
    if (origin.absCenterX == null || origin.absCenterY == null) continue;
    const layout = getPathLayout(layoutModel, pathId);
    if (!layout) continue;

    // 이동 후 현재 위치를 origin 좌표공간에서 읽는다.
    let curPosX: number;
    let curPosY: number;
    if (origin.coordinateSpace === "route-offset") {
      curPosX = layout.routeOffset?.x ?? 0;
      curPosY = layout.routeOffset?.y ?? 0;
    } else {
      const component =
        layout.componentLayoutsById?.[origin.componentId ?? "body"];
      curPosX = component?.x ?? origin.x;
      curPosY = component?.y ?? origin.y;
    }

    // 시작 중앙 + (현재 위치 − 시작 위치) = 현재 절대 중앙.
    const curCenterX = origin.absCenterX + (curPosX - origin.x);
    const curCenterY = origin.absCenterY + (curPosY - origin.y);
    const targetCenterX = snapToNearestCellCenterInPattern(
      curCenterX,
      columns,
      originX
    );
    const targetCenterY = snapToNearestCellCenterInPattern(
      curCenterY,
      rows,
      originY
    );

    // 목표 절대 중앙이 되도록 origin 좌표공간 위치를 역산.
    const nextPosX = origin.x + (targetCenterX - origin.absCenterX);
    const nextPosY = origin.y + (targetCenterY - origin.absCenterY);

    if (nextPosX !== curPosX || nextPosY !== curPosY) {
      layoutModel = applyPathMovePosition({
        layoutModel,
        pathId,
        origin,
        x: nextPosX,
        y: nextPosY,
      });
    }
  }

  return layoutModel;
}

export function resolveMoveEditorObjectSnapGuides(params: {
  camera: CameraState;
  origin: MoveEditorDragOrigin;
  deltaX: number;
  deltaY: number;
  gridSnap?: GridSnapOptions;
  objectSnap?: ObjectSnapOptions;
}) {
  const { camera, origin, deltaX, deltaY, gridSnap, objectSnap } = params;

  if (origin.kind === "zone") {
    const { nextX, nextY } = resolveSnappedMove({
      originX: origin.originX,
      originY: origin.originY,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });
    const snapped = resolveObjectSnappedRectPosition({
      x: nextX,
      y: nextY,
      width: origin.width,
      height: origin.height,
      camera,
      guides: origin.objectSnapGuides,
      objectSnap,
    });

    return {
      guideX: snapped.guideX,
      guideY: snapped.guideY,
    };
  }

  if (origin.kind === "path") {
    const { nextX, nextY } = resolveSnappedMove({
      originX: origin.origin.x,
      originY: origin.origin.y,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });
    const snapped = resolveObjectSnappedRectPosition({
      x: nextX,
      y: nextY,
      width: origin.origin.width,
      height: origin.origin.height,
      camera,
      guides: origin.objectSnapGuides,
      objectSnap,
    });

    return {
      guideX: snapped.guideX,
      guideY: snapped.guideY,
    };
  }

  return {
    guideX: undefined,
    guideY: undefined,
  };
}

export function resolveZoneResizeOrigin(
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId
): ZoneResizeOrigin | undefined {
  const zoneLayout = getZoneLayout(layoutModel, zoneId);
  if (!zoneLayout) return undefined;

  return {
    zoneId,
    originWidth: zoneLayout.width ?? 0,
    originHeight: zoneLayout.height ?? 0,
  };
}

export function resizeZoneByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: ZoneResizeOrigin;
  deltaX: number;
  deltaY: number;
  minWidth?: number;
  minHeight?: number;
  /** Largest width the zone may grow to (world units). Omit = no upper bound. */
  maxWidth?: number;
  /** Largest height the zone may grow to (world units). Omit = no upper bound. */
  maxHeight?: number;
  /**
   * When true, the width is locked to its origin value and deltaX is ignored.
   */
  lockWidth?: boolean;
  /**
   * When true, the height is locked to its origin value and deltaY is ignored.
   */
  lockHeight?: boolean;
  gridSnap?: GridSnapOptions;
  /** 리사이즈 후 앵커가 다시 붙을 흐름 방향(기본 leftToRight). */
  flowDirection?: FlowDirection;
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    minWidth = DEFAULT_MIN_ZONE_WIDTH,
    minHeight = DEFAULT_MIN_ZONE_HEIGHT,
    maxWidth,
    maxHeight,
    lockWidth = false,
    lockHeight = false,
    gridSnap,
    flowDirection,
  } = params;

  const currentLayout = getZoneLayout(layoutModel, origin.zoneId);
  if (!currentLayout) return layoutModel;

  const nextWidth = lockWidth
    ? origin.originWidth
    : Math.min(
        maxWidth ?? Infinity,
        Math.max(
          minWidth,
          snapCoordinate(origin.originWidth + deltaX / camera.zoom, gridSnap)
        )
      );
  const nextHeight = lockHeight
    ? origin.originHeight
    : Math.min(
        maxHeight ?? Infinity,
        Math.max(
          minHeight,
          snapCoordinate(origin.originHeight + deltaY / camera.zoom, gridSnap)
        )
      );

  return updateZoneLayout(layoutModel, origin.zoneId, {
    width: nextWidth,
    height: nextHeight,
    anchors: {
      inlet: resolveResizedAnchor({
        kind: "inlet",
        width: nextWidth,
        height: nextHeight,
        current: currentLayout.anchors.inlet,
        flowDirection,
      }),
      outlet: resolveResizedAnchor({
        kind: "outlet",
        width: nextWidth,
        height: nextHeight,
        current: currentLayout.anchors.outlet,
        flowDirection,
      }),
    },
  });
}

export function alignZonesByMode(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  mode: ZoneAlignMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { layoutModel, zoneIds, mode, gridSnap } = params;
  const entries = zoneIds
    .map((zoneId) => ({
      zoneId,
      layout: getZoneLayout(layoutModel, zoneId),
    }))
    .filter(
      (
        entry
      ): entry is {
        zoneId: ZoneId;
        layout: NonNullable<ReturnType<typeof getZoneLayout>>;
      } => Boolean(entry.layout)
    );

  if (entries.length < 2) return layoutModel;

  const reference =
    mode === "left"
      ? Math.min(...entries.map((entry) => entry.layout.x))
      : mode === "right"
        ? Math.max(
            ...entries.map((entry) => entry.layout.x + (entry.layout.width ?? 0))
          )
        : mode === "top"
          ? Math.min(...entries.map((entry) => entry.layout.y))
          : mode === "bottom"
            ? Math.max(
                ...entries.map((entry) => entry.layout.y + (entry.layout.height ?? 0))
              )
            : mode === "center-horizontal"
              ? entries.reduce(
                  (sum, entry) => sum + entry.layout.x + (entry.layout.width ?? 0) / 2,
                  0
                ) / entries.length
              : entries.reduce(
                  (sum, entry) => sum + entry.layout.y + (entry.layout.height ?? 0) / 2,
                  0
                ) / entries.length;
  const snappedReference = snapCoordinate(reference, gridSnap);

  let nextLayoutModel = layoutModel;
  for (const entry of entries) {
    nextLayoutModel = updateZoneLayout(nextLayoutModel, entry.zoneId, {
      x:
        mode === "left"
          ? snappedReference
          : mode === "right"
            ? snapCoordinate(
                snappedReference - (entry.layout.width ?? 0),
                gridSnap
              )
            : mode === "center-horizontal"
              ? snapCoordinate(
                  snappedReference - (entry.layout.width ?? 0) / 2,
                  gridSnap
                )
              : entry.layout.x,
      y:
        mode === "top"
          ? snappedReference
          : mode === "bottom"
            ? snapCoordinate(
                snappedReference - (entry.layout.height ?? 0),
                gridSnap
              )
            : mode === "center-vertical"
              ? snapCoordinate(
                  snappedReference - (entry.layout.height ?? 0) / 2,
                  gridSnap
                )
              : entry.layout.y,
    });
  }

  return nextLayoutModel;
}

export function distributeZonesByMode(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  mode: ZoneDistributeMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { layoutModel, zoneIds, mode, gridSnap } = params;
  const axis = mode === "horizontal" ? "x" : "y";
  const sizeKey = mode === "horizontal" ? "width" : "height";
  const entries = zoneIds
    .map((zoneId) => ({
      zoneId,
      layout: getZoneLayout(layoutModel, zoneId),
    }))
    .filter(
      (
        entry
      ): entry is {
        zoneId: ZoneId;
        layout: NonNullable<ReturnType<typeof getZoneLayout>>;
      } => Boolean(entry.layout)
    )
    .sort((a, b) => a.layout[axis] - b.layout[axis]);

  if (entries.length < 3) return layoutModel;

  const first = entries[0];
  const last = entries[entries.length - 1];
  const span =
    last.layout[axis] + (last.layout[sizeKey] ?? 0) - first.layout[axis];
  const occupied = entries.reduce(
    (sum, entry) => sum + (entry.layout[sizeKey] ?? 0),
    0
  );
  const gap = (span - occupied) / (entries.length - 1);

  let cursor = first.layout[axis] + (first.layout[sizeKey] ?? 0) + gap;
  let nextLayoutModel = layoutModel;

  for (const entry of entries.slice(1, -1)) {
    const snapped = snapCoordinate(cursor, gridSnap);
    nextLayoutModel = updateZoneLayout(nextLayoutModel, entry.zoneId, {
      x: mode === "horizontal" ? snapped : entry.layout.x,
      y: mode === "vertical" ? snapped : entry.layout.y,
    });
    cursor += (entry.layout[sizeKey] ?? 0) + gap;
  }

  return nextLayoutModel;
}
