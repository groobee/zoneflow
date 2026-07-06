import {
  DEFAULT_FLOW_DIRECTION,
  isDescendantZone,
  resolveZoneSlotRegions,
  type AnchorLayout,
  type FlowDirection,
  type PathId,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
  type ZoneId,
  type AnchorRect,
} from "@zoneflow/core";
import type {
  EdgeVisual,
  GraphLayoutEngine,
  GraphLayoutResult,
  PathDisplayMode,
  PathVisualNode,
  Rect,
  ResolvePathDisplay,
  ZoneVisualNode,
} from "../types";

export const DEFAULT_PATH_NODE_WIDTH = 120;
export const DEFAULT_PATH_NODE_HEIGHT = 32;
/** 소스 아웃렛에서 흐름 진행 방향으로 띄우는 기본 거리(가로·세로 공통). */
export const DEFAULT_PATH_NODE_OFFSET_X = 32;
/** leftToRight 에서 형제 패스 노드를 세로로 펼치는 간격(높이 32 + 여유 8). */
export const DEFAULT_PATH_NODE_GAP_Y = 40;
/** topToBottom 에서 형제 패스 노드를 가로로 펼치는 간격(폭 120 + 여유 8). */
export const DEFAULT_PATH_NODE_GAP_X = 128;

/**
 * 커스텀 배치(routeOffset·컴포넌트 레이아웃)가 없을 때의 패스 노드 기본 위치.
 * 소스 아웃렛에서 흐름 방향으로 오프셋을 두고, 형제들은 교차축으로 펼친다.
 * 에디터(pathCreateEditor)가 드롭 위치 → routeOffset 역산에 같은 공식을 쓴다.
 */
export function resolveDefaultPathNodeBaseRect(params: {
  sourceOutlet: Point;
  fallbackIndex: number;
  flowDirection?: FlowDirection;
}): Rect {
  const { sourceOutlet, fallbackIndex } = params;
  const flowDirection = params.flowDirection ?? DEFAULT_FLOW_DIRECTION;

  if (flowDirection === "topToBottom") {
    return {
      x:
        sourceOutlet.x -
        DEFAULT_PATH_NODE_WIDTH / 2 +
        fallbackIndex * DEFAULT_PATH_NODE_GAP_X,
      y: sourceOutlet.y + DEFAULT_PATH_NODE_OFFSET_X,
      width: DEFAULT_PATH_NODE_WIDTH,
      height: DEFAULT_PATH_NODE_HEIGHT,
    };
  }

  return {
    x: sourceOutlet.x + DEFAULT_PATH_NODE_OFFSET_X,
    y:
      sourceOutlet.y -
      DEFAULT_PATH_NODE_HEIGHT / 2 +
      fallbackIndex * DEFAULT_PATH_NODE_GAP_Y,
    width: DEFAULT_PATH_NODE_WIDTH,
    height: DEFAULT_PATH_NODE_HEIGHT,
  };
}

function rectFromLayout(layout: {
  x: number;
  y: number;
  width?: number;
  height?: number;
}): Rect {
  return {
    x: layout.x,
    y: layout.y,
    width: layout.width ?? 0,
    height: layout.height ?? 0,
  };
}

function centerOfRect(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function resolveAnchorRect(
  worldPos: { x: number; y: number },
  rect?: AnchorRect
): AnchorRect | undefined {
  if (!rect) return undefined;

  return {
    ...rect,
    x: worldPos.x + rect.x,
    y: worldPos.y + rect.y,
  };
}

/**
 * relative layout -> absolute layout
 */
function resolveLayout(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel
): UniverseLayoutModel {
  const resolvedZoneLayouts: UniverseLayoutModel["zoneLayoutsById"] = {};
  const resolvedPathLayouts: UniverseLayoutModel["pathLayoutsById"] = {};

  const zoneCache = new Map<ZoneId, { x: number; y: number }>();

  function resolveZonePosition(zoneId: ZoneId): { x: number; y: number } {
    if (zoneCache.has(zoneId)) {
      return zoneCache.get(zoneId)!;
    }

    const zone = model.zonesById[zoneId];
    const layout = layoutModel.zoneLayoutsById[zoneId];

    if (!zone || !layout) {
      const fallback = { x: 0, y: 0 };
      zoneCache.set(zoneId, fallback);
      return fallback;
    }

    if (!zone.parentZoneId) {
      const rootPos = { x: layout.x, y: layout.y };
      zoneCache.set(zoneId, rootPos);
      return rootPos;
    }

    const parentPos = resolveZonePosition(zone.parentZoneId);

    const worldPos = {
      x: parentPos.x + layout.x,
      y: parentPos.y + layout.y,
    };

    zoneCache.set(zoneId, worldPos);
    return worldPos;
  }

  const zoneLayoutIds = Object.keys(layoutModel.zoneLayoutsById) as ZoneId[];

  for (const typedZoneId of zoneLayoutIds) {
    const layout = layoutModel.zoneLayoutsById[typedZoneId];
    const worldPos = resolveZonePosition(typedZoneId);
    const anchors = layout.anchors as Record<"inlet" | "outlet", AnchorLayout>;
    const resolvedAnchors = {
      inlet: {
        point: {
          x: worldPos.x + anchors.inlet.point.x,
          y: worldPos.y + anchors.inlet.point.y,
        },
        rect: resolveAnchorRect(worldPos, anchors.inlet.rect),
      },
      outlet: {
        point: {
          x: worldPos.x + anchors.outlet.point.x,
          y: worldPos.y + anchors.outlet.point.y,
        },
        rect: resolveAnchorRect(worldPos, anchors.outlet.rect),
      },
    };

    resolvedZoneLayouts[typedZoneId] = {
      ...layout,
      x: worldPos.x,
      y: worldPos.y,
      anchors: resolvedAnchors,
    };
  }

  const pathLayoutIds = Object.keys(layoutModel.pathLayoutsById) as PathId[];

  for (const pathId of pathLayoutIds) {
    const pathLayout = layoutModel.pathLayoutsById[pathId];
    resolvedPathLayouts[pathId] = {
      ...pathLayout,
    };
  }

  return {
    ...layoutModel,
    zoneLayoutsById: resolvedZoneLayouts,
    pathLayoutsById: resolvedPathLayouts,
  };
}

function resolvePathNodeRect(params: {
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
  sourceOutlet: Point;
  fallbackIndex: number;
  flowDirection?: FlowDirection;
}): Rect {
  const { layoutModel, pathId, sourceOutlet, fallbackIndex, flowDirection } =
    params;
  const pathLayout = layoutModel.pathLayoutsById[pathId];

  const preferredComponentLayout =
    pathLayout?.componentLayoutsById?.body ??
    pathLayout?.componentLayoutsById?.label;

  if (preferredComponentLayout) {
    return rectFromLayout(preferredComponentLayout);
  }

  const routeOffset = pathLayout?.routeOffset;
  const base = resolveDefaultPathNodeBaseRect({
    sourceOutlet,
    fallbackIndex,
    flowDirection,
  });

  return {
    ...base,
    x: base.x + (routeOffset?.x ?? 0),
    y: base.y + (routeOffset?.y ?? 0),
  };
}

function resolvePathNodeAnchors(rect: Rect, flowDirection?: FlowDirection) {
  if (flowDirection === "topToBottom") {
    return {
      inlet: {
        x: rect.x + rect.width / 2,
        y: rect.y,
      },
      outlet: {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height,
      },
    };
  }
  return {
    inlet: {
      x: rect.x,
      y: rect.y + rect.height / 2,
    },
    outlet: {
      x: rect.x + rect.width,
      y: rect.y + rect.height / 2,
    },
  };
}

function createZoneVisualNodes(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
}): Record<ZoneId, ZoneVisualNode> {
  const { model, layoutModel } = params;
  const result: Record<ZoneId, ZoneVisualNode> = {};

  const zoneIds = Object.keys(model.zonesById) as ZoneId[];

  for (const typedZoneId of zoneIds) {
    const zone = model.zonesById[typedZoneId];
    const zoneLayout = layoutModel.zoneLayoutsById[typedZoneId];
    if (!zoneLayout) continue;

    const rect = rectFromLayout(zoneLayout);
    // 도킹 슬롯 레인을 월드 좌표로 함께 실어 보낸다 — 렌더러(기본 레인 드로우),
    // 외부 드로어(renderZone/오버레이/커스텀 DrawEngine)가 같은 기하를 본다.
    const slotRegions = resolveZoneSlotRegions(zone, zoneLayout).map(
      (region) => ({
        key: region.key,
        rect: {
          x: rect.x + region.x,
          y: rect.y + region.y,
          width: region.width,
          height: region.height,
        },
        snapPoints: region.snapPoints?.map((point) => ({
          x: rect.x + point.x,
          y: rect.y + point.y,
        })),
      })
    );

    result[typedZoneId] = {
      universeId: model.universeId,
      zoneId: typedZoneId,
      zone,
      rect,
      anchors: zoneLayout.anchors,
      slotRegions: slotRegions.length > 0 ? slotRegions : undefined,
    };
  }

  return result;
}

/**
 * 소비자 리졸버로 패스 표시 형태를 판정한다. `"edge"` 는 연결이 실제로 그려질
 * 수 있을 때만(타깃 존 비주얼 존재) 유효 — dangling 패스가 라벨마저 잃으면
 * 화면에서 완전히 사라지므로 노드를 강제 유지한다. throw 는 기본(undefined).
 */
function resolvePathDisplayMode(params: {
  resolvePathDisplay?: ResolvePathDisplay;
  model: UniverseModel;
  path: PathVisualNode["path"];
  sourceZone: Zone;
  targetZoneId: ZoneId | null;
  zonesById: Record<ZoneId, ZoneVisualNode>;
}): PathDisplayMode | undefined {
  const { resolvePathDisplay, model, path, sourceZone, targetZoneId, zonesById } =
    params;
  if (!resolvePathDisplay) return undefined;

  let resolved: PathDisplayMode | null | undefined;
  try {
    resolved = resolvePathDisplay(path, {
      sourceZone,
      targetZone: targetZoneId ? model.zonesById[targetZoneId] : undefined,
    });
  } catch (err) {
    console.error("[zoneflow] resolvePathDisplay threw:", err);
    return undefined;
  }

  if (resolved === "edge") {
    const hasDrawableTarget = targetZoneId != null && !!zonesById[targetZoneId];
    return hasDrawableTarget ? "edge" : undefined;
  }
  return resolved ?? undefined;
}

function createPathVisualNodes(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zonesById: Record<ZoneId, ZoneVisualNode>;
  resolvePathDisplay?: ResolvePathDisplay;
  flowDirection?: FlowDirection;
}): Record<PathId, PathVisualNode> {
  const { model, layoutModel, zonesById, resolvePathDisplay, flowDirection } =
    params;
  const result: Record<PathId, PathVisualNode> = {};

  const zoneIds = Object.keys(model.zonesById) as ZoneId[];

  for (const zoneId of zoneIds) {
    const zone = model.zonesById[zoneId];
    const sourceZoneVisual = zonesById[zone.id];
    if (!sourceZoneVisual) continue;

    zone.pathIds.forEach((pathId: PathId, index: number) => {
      const path = zone.pathsById[pathId];
      if (!path) return;

      const targetZoneId =
        path.target?.universeId === model.universeId
          ? path.target.zoneId
          : null;

      const sourceOutlet =
        sourceZoneVisual.anchors.outlet?.point ??
        centerOfRect(sourceZoneVisual.rect);

      const rect = resolvePathNodeRect({
        layoutModel,
        pathId,
        sourceOutlet,
        fallbackIndex: index,
        flowDirection,
      });

      const anchors = resolvePathNodeAnchors(rect, flowDirection);

      const display = resolvePathDisplayMode({
        resolvePathDisplay,
        model,
        path,
        sourceZone: zone,
        targetZoneId,
        zonesById,
      });

      result[pathId] = {
        universeId: model.universeId,
        pathId,
        sourceZoneId: zone.id,
        targetZoneId,
        path,
        rect,
        inlet: anchors.inlet,
        outlet: anchors.outlet,
        display,
      };
    });
  }

  return result;
}

function createEdgeVisuals(params: {
  model: UniverseModel;
  zonesById: Record<ZoneId, ZoneVisualNode>;
  pathsById: Record<PathId, PathVisualNode>;
}): Record<PathId, EdgeVisual[]> {
  const { model, zonesById, pathsById } = params;
  const result: Record<PathId, EdgeVisual[]> = {};

  const zoneIds = Object.keys(model.zonesById) as ZoneId[];

  for (const zoneId of zoneIds) {
    const zone = model.zonesById[zoneId];
    const sourceZoneVisual = zonesById[zone.id];
    if (!sourceZoneVisual) continue;

    zone.pathIds.forEach((pathId: PathId) => {
      const pathVisual = pathsById[pathId];
      if (!pathVisual) return;

      const targetZoneVisual = pathVisual.targetZoneId
        ? zonesById[pathVisual.targetZoneId]
        : undefined;

      const zoneOutlet =
        sourceZoneVisual.anchors.outlet?.point ??
        centerOfRect(sourceZoneVisual.rect);

      const pathInlet =
        pathVisual.inlet ??
        (pathVisual.rect ? centerOfRect(pathVisual.rect) : zoneOutlet);

      const pathOutlet =
        pathVisual.outlet ??
        (pathVisual.rect ? centerOfRect(pathVisual.rect) : zoneOutlet);

      // 자식 → 조상 컨테이너 연결은 "탈출 합류": 조상의 인렛(왼쪽 바깥 면)이
      // 아니라 **아웃렛의 안쪽 면**에서 만난다 — 컨테이너 안에서 흐름이 모여
      // 밖으로 나가는 그림. 그 외에는 기존대로 타깃 인렛.
      const targetIsAncestor =
        pathVisual.targetZoneId != null &&
        isDescendantZone(model, pathVisual.targetZoneId, zone.id);

      const targetInlet = targetZoneVisual
        ? targetIsAncestor
          ? (
            targetZoneVisual.anchors.outlet?.point ??
            centerOfRect(targetZoneVisual.rect)
          )
          : (
            targetZoneVisual.anchors.inlet?.point ??
            centerOfRect(targetZoneVisual.rect)
          )
        : pathOutlet;

      result[pathId] = [
        {
          id: `${pathId}:z2p`,
          pathId,
          kind: "zone-to-path",
          source: zoneOutlet,
          target: pathInlet,
        },
        {
          id: `${pathId}:p2z`,
          pathId,
          kind: "path-to-zone",
          source: pathOutlet,
          target: targetInlet,
        },
      ];
    });
  }

  return result;
}

export const defaultGraphLayoutEngine: GraphLayoutEngine = {
  compute(input): GraphLayoutResult {
    const { model, layoutModel } = input;

    const resolvedLayout = resolveLayout(model, layoutModel);

    const zonesById = createZoneVisualNodes({
      model,
      layoutModel: resolvedLayout,
    });

    const pathsById = createPathVisualNodes({
      model,
      layoutModel: resolvedLayout,
      zonesById,
      resolvePathDisplay: input.resolvePathDisplay,
      flowDirection: input.flowDirection,
    });

    const edgesByPathId = createEdgeVisuals({
      model,
      zonesById,
      pathsById,
    });

    return {
      zonesById,
      pathsById,
      edgesByPathId,
    };
  },
};
