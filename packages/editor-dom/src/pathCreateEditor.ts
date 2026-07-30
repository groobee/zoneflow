import {
  addPath,
  createPathId,
  isDescendantZone,
  isZoneInputEnabled,
  isZoneOutputEnabled,
  setPathTarget,
  type AnchorRect,
  updatePathLayout,
  type Path,
  type PathId,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
  type ZoneId,
} from "@zoneflow/core";
import {
  normalizeZoneShape,
  type CameraState,
  type Rect,
  type RendererFrame,
  type ResolveZoneShape,
  type ZoneAnchorRenderMode,
} from "@zoneflow/renderer-dom";
import type { GridSnapOptions } from "./zoneMoveEditor.js";

export type CanConnectPathParams = {
  mode: "create" | "retarget";
  sourceZoneId: ZoneId;
  targetZoneId: ZoneId;
  sourceZone: Zone;
  targetZone: Zone;
  model: UniverseModel;
  pathId?: PathId;
  path?: Path;
};

export type CanConnectPath = (params: CanConnectPathParams) => boolean;

export type CanCreatePathParams = {
  sourceZoneId: ZoneId;
  sourceZone: Zone;
  model: UniverseModel;
};

/**
 * "이 존에서 패스를 뽑아낼 수 있는가"의 사전 판정. `canConnectPath` 는 타깃이
 * 정해져야 판정할 수 있으므로(create/retarget 의 연결 유효성), 출발 자체의
 * 허용 여부는 이 별도 술어가 맡는다 — 앵커 노출/드래그 시작을 함께 게이트한다.
 */
export type CanCreatePath = (params: CanCreatePathParams) => boolean;

function typedValues<TKey extends string, TValue>(
  record: Record<TKey, TValue>
): TValue[] {
  return Object.values(record) as TValue[];
}

/** 슬롯 effects 파생을 위해 capability 검사에 부모 존을 함께 넘긴다. */
function getParentZone(
  model: UniverseModel,
  zone: Pick<Zone, "parentZoneId">
): Zone | undefined {
  return zone.parentZoneId ? model.zonesById[zone.parentZoneId] : undefined;
}

const DEFAULT_PATH_NODE_WIDTH = 120;
const DEFAULT_PATH_NODE_HEIGHT = 32;
const DEFAULT_PATH_NODE_OFFSET_X = 32;
const DEFAULT_PATH_NODE_GAP_Y = 40;
const DEFAULT_ANCHOR_WIDTH = 24;
const DEFAULT_ANCHOR_ATTACH_DEPTH = 10;
// Square hit area for vertex-mode anchors (circle/diamond/…), centered on the
// shape's left/right vertex to match the vertex dot drawn by the renderer.
const VERTEX_ANCHOR_HIT_SIZE = 28;
// 출력 앵커 핸들은 정사각형(= 완전한 원). 라벨 높이에 비례시키지 않고 고정 크기를 써서
// 존 연결 앵커(vertex 모드 dot, drawEngine 의 14px)와 비슷한 크기로 맞춘다. 단, 작은
// 라벨에선 안에 들어가도록 줄인다.
const DEFAULT_PATH_OUTPUT_HANDLE_SIZE = 16;
const DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y = 4;

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveSnapSize(options?: GridSnapOptions): number | null {
  if (!options?.enabled) return null;
  const size = options.size ?? 16;
  if (!Number.isFinite(size) || size <= 0) return null;
  return size;
}

function snapCoordinate(value: number, options?: GridSnapOptions): number {
  const size = resolveSnapSize(options);
  if (!size) return roundCoordinate(value);
  return roundCoordinate(Math.round(value / size) * size);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: roundCoordinate((a.x + b.x) / 2),
    y: roundCoordinate((a.y + b.y) / 2),
  };
}

function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function getRectArea(rect: Rect): number {
  return rect.width * rect.height;
}

function projectWorldRectToScreenRect(
  rect: Rect,
  camera: CameraState
): Rect {
  return {
    x: camera.x + rect.x * camera.zoom,
    y: camera.y + rect.y * camera.zoom,
    width: rect.width * camera.zoom,
    height: rect.height * camera.zoom,
  };
}

function resolveZoneAnchorRect(params: {
  zoneRect: Rect;
  anchor: { point: Point; rect?: AnchorRect };
  kind: "inlet" | "outlet";
  mode?: ZoneAnchorRenderMode;
}): Rect {
  const { zoneRect, anchor, kind, mode = "edge" } = params;

  if (mode === "vertex") {
    // Non-rectangular zones expose their anchor only at the shape vertex, so
    // the grab/drop hit area is a compact square centered on the anchor point
    // instead of the full-height edge band used for rectangular zones.
    // `anchor.point` is already in world coordinates (zone position + offset),
    // so it is used directly — do NOT add zoneRect again.
    return {
      x: anchor.point.x - VERTEX_ANCHOR_HIT_SIZE / 2,
      y: anchor.point.y - VERTEX_ANCHOR_HIT_SIZE / 2,
      width: VERTEX_ANCHOR_HIT_SIZE,
      height: VERTEX_ANCHOR_HIT_SIZE,
    };
  }

  if (anchor.rect) {
    return {
      x: anchor.rect.x,
      y: anchor.rect.y,
      width: anchor.rect.width ?? DEFAULT_ANCHOR_WIDTH,
      height: anchor.rect.height ?? zoneRect.height,
    };
  }

  return {
    x:
      kind === "inlet"
        ? zoneRect.x - (DEFAULT_ANCHOR_WIDTH - DEFAULT_ANCHOR_ATTACH_DEPTH)
        : zoneRect.x + zoneRect.width - DEFAULT_ANCHOR_ATTACH_DEPTH,
    y: zoneRect.y,
    width: DEFAULT_ANCHOR_WIDTH,
    height: zoneRect.height,
  };
}

export function screenPointToWorldPoint(
  point: Point,
  camera: CameraState
): Point {
  return {
    x: roundCoordinate((point.x - camera.x) / camera.zoom),
    y: roundCoordinate((point.y - camera.y) / camera.zoom),
  };
}

export function resolveZoneAnchorScreenRect(params: {
  frame: RendererFrame;
  camera: CameraState;
  zoneId: ZoneId;
  kind: "inlet" | "outlet";
  resolveZoneShape?: ResolveZoneShape;
}): Rect | undefined {
  const { frame, camera, zoneId, kind, resolveZoneShape } = params;
  const zoneVisual = frame.pipeline.graphLayout.zonesById[zoneId];
  if (!zoneVisual) return undefined;
  const parentVisualZone = zoneVisual.zone.parentZoneId
    ? frame.pipeline.graphLayout.zonesById[zoneVisual.zone.parentZoneId]?.zone
    : undefined;
  if (kind === "inlet" && !isZoneInputEnabled(zoneVisual.zone, parentVisualZone)) {
    return undefined;
  }
  if (kind === "outlet" && !isZoneOutputEnabled(zoneVisual.zone)) return undefined;

  const density = frame.pipeline.density.zoneDensityById[zoneId] ?? "far";
  const mode = normalizeZoneShape(
    resolveZoneShape?.(zoneVisual.zone, { density })
  ).anchors;
  const anchorRect = resolveZoneAnchorRect({
    zoneRect: zoneVisual.rect,
    anchor: zoneVisual.anchors[kind],
    kind,
    mode,
  });

  return projectWorldRectToScreenRect(anchorRect, camera);
}

export function resolveInputAnchorTargetZoneId(params: {
  model: UniverseModel;
  frame: RendererFrame;
  camera: CameraState;
  point: Point;
  excludeZoneIds?: ZoneId[];
  canConnect?: (targetZoneId: ZoneId) => boolean;
  resolveZoneShape?: ResolveZoneShape;
  /**
   * 패스가 출발하는 존. 지정하면 그 존의 **조상 컨테이너**도 target 후보가
   * 된다 — 단 히트 영역이 인렛이 아니라 **아웃렛(탈출 합류, exit)** 쪽이다.
   * 자식 → 조상 연결은 컨테이너 안 흐름이 밖으로 나가는 합류를 뜻하므로
   * (graphLayoutEngine 이 엣지 끝점을 아웃렛 안쪽 면으로 라우팅) 드롭 위치도
   * 그 그림과 일치시킨다.
   */
  sourceZoneId?: ZoneId;
}): ZoneId | null {
  const {
    model,
    frame,
    camera,
    point,
    excludeZoneIds,
    canConnect,
    resolveZoneShape,
    sourceZoneId,
  } = params;
  const excluded = new Set(excludeZoneIds ?? []);
  let bestZoneId: ZoneId | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const zoneVisual of typedValues(frame.pipeline.graphLayout.zonesById)) {
    if (excluded.has(zoneVisual.zoneId)) continue;
    if (!model.zonesById[zoneVisual.zoneId]) continue;

    const isAncestorOfSource = sourceZoneId
      ? isDescendantZone(model, zoneVisual.zoneId, sourceZoneId)
      : false;

    if (
      !isAncestorOfSource &&
      !isZoneInputEnabled(
        zoneVisual.zone,
        getParentZone(model, zoneVisual.zone)
      )
    ) {
      continue;
    }

    const visibility =
      frame.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];
    if (!visibility?.isVisible) continue;

    const rect = resolveZoneAnchorScreenRect({
      frame,
      camera,
      zoneId: zoneVisual.zoneId,
      kind: isAncestorOfSource ? "outlet" : "inlet",
      resolveZoneShape,
    });
    if (!rect || !containsPoint(rect, point)) continue;
    if (canConnect && !canConnect(zoneVisual.zoneId)) continue;

    const area = getRectArea(rect);
    if (area < bestArea) {
      bestZoneId = zoneVisual.zoneId;
      bestArea = area;
    }
  }

  return bestZoneId;
}

export function resolvePathOutputAnchorScreenRect(params: {
  frame: RendererFrame;
  camera: CameraState;
  pathId: PathId;
}): Rect | undefined {
  const { frame, camera, pathId } = params;
  const pathVisual = frame.pipeline.graphLayout.pathsById[pathId];
  if (!pathVisual?.rect) return undefined;

  const outlet = pathVisual.outlet ?? {
    x: pathVisual.rect.x + pathVisual.rect.width,
    y: pathVisual.rect.y + pathVisual.rect.height / 2,
  };
  // 완전한 원이 되도록 정사각형 핸들(borderRadius:999 + w===h). 고정 크기를 써서 존 연결
  // 앵커와 비슷한 크기로 맞추되, 라벨이 작으면 안에 들어가게 줄인다. outlet 점을 중심에 둔다.
  const size = Math.min(
    DEFAULT_PATH_OUTPUT_HANDLE_SIZE,
    pathVisual.rect.height - DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y * 2
  );
  const minY = pathVisual.rect.y + DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y;
  const maxY =
    pathVisual.rect.y +
    pathVisual.rect.height -
    DEFAULT_PATH_OUTPUT_HANDLE_MARGIN_Y -
    size;

  return projectWorldRectToScreenRect(
    {
      x: outlet.x - size / 2,
      y: clamp(outlet.y - size / 2, minY, maxY),
      width: size,
      height: size,
    },
    camera
  );
}

export type CreatePathFromAnchorDragResult = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
};

export function retargetPathFromOutputAnchorDrag(params: {
  model: UniverseModel;
  sourceZoneId: ZoneId;
  pathId: PathId;
  targetZoneId?: ZoneId | null;
  canConnect?: CanConnectPath;
}): UniverseModel | undefined {
  const {
    model,
    sourceZoneId,
    pathId,
    targetZoneId,
    canConnect,
  } = params;

  const sourceZone = model.zonesById[sourceZoneId];
  const path = sourceZone?.pathsById[pathId];
  if (!sourceZone || !path) return undefined;

  let resolvedTargetZoneId: ZoneId | null = targetZoneId ?? null;
  if (resolvedTargetZoneId) {
    const targetZone = model.zonesById[resolvedTargetZoneId];
    if (
      !targetZone ||
      !isZoneInputEnabled(targetZone, getParentZone(model, targetZone))
    ) {
      return undefined;
    }
    if (
      canConnect &&
      !canConnect({
        mode: "retarget",
        sourceZoneId,
        targetZoneId: resolvedTargetZoneId,
        sourceZone,
        targetZone,
        model,
        pathId,
        path,
      })
    ) {
      resolvedTargetZoneId = null;
    }
  }

  return setPathTarget(
    model,
    sourceZoneId,
    pathId,
    resolvedTargetZoneId
      ? {
          universeId: model.universeId,
          zoneId: resolvedTargetZoneId,
        }
      : null
  );
}

/**
 * 존에서 새 패스를 만들어내는 공용 코어 — 드래그 드롭(아래
 * {@link createPathFromOutputAnchorDrag})과 앵커 클릭(프로그래매틱 생성) 양쪽이
 * 이 함수를 쓴다.
 *
 * 라벨 배치:
 * - 타깃이 있고 `frame` 이 있으면 소스 아웃렛과 연결점의 중간.
 * - 타깃이 없으면 `labelWorldPoint` (드래그 드롭 좌표 등).
 * - 둘 다 없으면 layout 을 건드리지 않는다 — graphLayoutEngine 의 기본 배치
 *   (아웃렛 우측, 패스 순서대로 세로 스택)가 그대로 적용된다. 앵커 클릭 생성이
 *   "존 우측에 라벨 자동 생성"이 되는 것은 이 기본 배치 덕분이다.
 */
export function createPathFromZone(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  sourceZoneId: ZoneId;
  /** 라벨 배치 계산에만 쓰인다. 없으면 기본 배치(레이아웃 미기록). */
  frame?: RendererFrame;
  targetZoneId?: ZoneId | null;
  /** 타깃 없이 라벨 중심을 놓을 월드 좌표(드래그 드롭 지점 등). */
  labelWorldPoint?: Point;
  /** 생성될 패스의 초기 필드 오버라이드. 미지정 필드는 기본값(key=condition_N, name=Empty, rule=null). */
  path?: Partial<Pick<Path, "key" | "name" | "rule" | "meta">>;
  gridSnap?: GridSnapOptions;
  canConnect?: CanConnectPath;
}): CreatePathFromAnchorDragResult | undefined {
  const {
    model,
    layoutModel,
    frame,
    sourceZoneId,
    targetZoneId,
    labelWorldPoint,
    path,
    gridSnap,
    canConnect,
  } = params;

  const sourceZone = model.zonesById[sourceZoneId];
  if (!sourceZone) return undefined;
  if (!isZoneOutputEnabled(sourceZone)) return undefined;

  let resolvedTargetZoneId: ZoneId | null = targetZoneId ?? null;
  if (resolvedTargetZoneId) {
    const targetZone = model.zonesById[resolvedTargetZoneId];
    if (
      !targetZone ||
      !isZoneInputEnabled(targetZone, getParentZone(model, targetZone))
    ) {
      return undefined;
    }
    if (
      canConnect &&
      !canConnect({
        mode: "create",
        sourceZoneId,
        targetZoneId: resolvedTargetZoneId,
        sourceZone,
        targetZone,
        model,
      })
    ) {
      resolvedTargetZoneId = null;
    }
  }

  const pathId = createPathId();
  const nextPathIndex = sourceZone.pathIds.length;
  const ordinal = nextPathIndex + 1;

  const nextModel = addPath(model, sourceZoneId, {
    id: pathId,
    key: path?.key ?? `condition_${ordinal}`,
    name: path?.name ?? "Empty",
    target: resolvedTargetZoneId
      ? {
          universeId: model.universeId,
          zoneId: resolvedTargetZoneId,
        }
      : null,
    rule: path?.rule ?? null,
    meta: path?.meta,
  });

  const sourceVisual = frame?.pipeline.graphLayout.zonesById[sourceZoneId];
  let nextLayoutModel = layoutModel;
  if (sourceVisual) {
    const targetVisual = resolvedTargetZoneId
      ? frame!.pipeline.graphLayout.zonesById[resolvedTargetZoneId]
      : undefined;
    const sourceOutlet = sourceVisual.anchors.outlet.point;
    // 조상 컨테이너(exit) 타깃은 연결점이 인렛(왼쪽 바깥 면)이 아니라 아웃렛
    // 안쪽 면이다 — 엣지 라우팅과 같은 규칙. 라벨도 소스 아웃렛과 그 연결점
    // 사이(컨테이너 안)에 놓는다.
    const targetIsAncestor =
      resolvedTargetZoneId != null &&
      isDescendantZone(model, resolvedTargetZoneId, sourceZoneId);
    const targetConnectPoint = targetIsAncestor
      ? targetVisual?.anchors.outlet?.point
      : targetVisual?.anchors.inlet?.point;
    const desiredCenter = targetConnectPoint
      ? midpoint(sourceOutlet, targetConnectPoint)
      : labelWorldPoint;
    if (desiredCenter) {
      const desiredRect = {
        x: snapCoordinate(desiredCenter.x - DEFAULT_PATH_NODE_WIDTH / 2, gridSnap),
        y: snapCoordinate(desiredCenter.y - DEFAULT_PATH_NODE_HEIGHT / 2, gridSnap),
      };
      const routeOffset = {
        x: roundCoordinate(desiredRect.x - (sourceOutlet.x + DEFAULT_PATH_NODE_OFFSET_X)),
        y: roundCoordinate(
          desiredRect.y -
          (sourceOutlet.y - DEFAULT_PATH_NODE_HEIGHT / 2 + nextPathIndex * DEFAULT_PATH_NODE_GAP_Y)
        ),
      };
      nextLayoutModel = updatePathLayout(layoutModel, pathId, {
        routeOffset,
      });
    }
  }

  return {
    model: nextModel,
    layoutModel: nextLayoutModel,
    pathId,
  };
}

export function createPathFromOutputAnchorDrag(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  frame: RendererFrame;
  sourceZoneId: ZoneId;
  dropWorldPoint: Point;
  targetZoneId?: ZoneId | null;
  gridSnap?: GridSnapOptions;
  canConnect?: CanConnectPath;
}): CreatePathFromAnchorDragResult | undefined {
  const { frame, sourceZoneId } = params;
  // 드래그 흐름은 비주얼 앵커가 필수 — 없으면 라벨을 놓을 기준이 없다.
  if (!frame.pipeline.graphLayout.zonesById[sourceZoneId]) return undefined;
  return createPathFromZone({
    model: params.model,
    layoutModel: params.layoutModel,
    frame,
    sourceZoneId,
    targetZoneId: params.targetZoneId,
    labelWorldPoint: params.dropWorldPoint,
    gridSnap: params.gridSnap,
    canConnect: params.canConnect,
  });
}
