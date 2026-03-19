import type {
  PathId,
  Point,
  UniverseLayoutModel,
  UniverseModel,
  ZoneId,
} from "@zoneflow/core";
import type {
  EdgeVisual,
  GraphLayoutEngine,
  GraphLayoutResult,
  PathVisualNode,
  Rect,
  ZoneVisualNode,
} from "../types";

const DEFAULT_PATH_NODE_WIDTH = 120;
const DEFAULT_PATH_NODE_HEIGHT = 32;
const DEFAULT_PATH_NODE_OFFSET_X = 32;
const DEFAULT_PATH_NODE_GAP_Y = 40;

/**
 * - 지금은 그대로 사용
 * - 나중에 relative → absolute 변환 or auto layout 여기서 처리
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

  for (const [zoneId, layout] of Object.entries(layoutModel.zoneLayoutsById)) {
    const typedZoneId = zoneId as ZoneId;
    const worldPos = resolveZonePosition(typedZoneId);

    resolvedZoneLayouts[typedZoneId] = {
      ...layout,
      x: worldPos.x,
      y: worldPos.y,
      anchors: {
        inlet: {
          x: worldPos.x + layout.anchors.inlet.x,
          y: worldPos.y + layout.anchors.inlet.y,
        },
        outlet: {
          x: worldPos.x + layout.anchors.outlet.x,
          y: worldPos.y + layout.anchors.outlet.y,
        },
      },
    };
  }

  for (const [pathId, pathLayout] of Object.entries(layoutModel.pathLayoutsById)) {
    resolvedPathLayouts[pathId as PathId] = {
      ...pathLayout,
      // componentLayoutsById는 여기서 건드리지 않는다.
    };
  }

  return {
    ...layoutModel,
    zoneLayoutsById: resolvedZoneLayouts,
    pathLayoutsById: resolvedPathLayouts,
  };
}

/**
 * ========================
 * 기본 유틸
 * ========================
 */

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

function resolvePathNodeRect(params: {
  layoutModel: UniverseLayoutModel;
  pathId: PathId;
  sourceOutlet: Point;
  fallbackIndex: number;
}): Rect {
  const { layoutModel, pathId, sourceOutlet, fallbackIndex } = params;
  const pathLayout = layoutModel.pathLayoutsById[pathId];

  const preferredComponentLayout =
    pathLayout?.componentLayoutsById?.body ??
    pathLayout?.componentLayoutsById?.label;

  if (preferredComponentLayout) {
    return rectFromLayout(preferredComponentLayout);
  }

  const routeOffset = pathLayout?.routeOffset;

  return {
    x: sourceOutlet.x + DEFAULT_PATH_NODE_OFFSET_X + (routeOffset?.x ?? 0),
    y:
      sourceOutlet.y -
      DEFAULT_PATH_NODE_HEIGHT / 2 +
      fallbackIndex * DEFAULT_PATH_NODE_GAP_Y +
      (routeOffset?.y ?? 0),
    width: DEFAULT_PATH_NODE_WIDTH,
    height: DEFAULT_PATH_NODE_HEIGHT,
  };
}

function resolvePathNodeAnchors(rect: Rect) {
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

/**
 * ========================
 * Zone
 * ========================
 */

function createZoneVisualNodes(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
}): Record<ZoneId, ZoneVisualNode> {
  const { model, layoutModel } = params;

  const result: Record<ZoneId, ZoneVisualNode> = {};

  for (const [zoneId, zone] of Object.entries(model.zonesById)) {
    const zoneLayout = layoutModel.zoneLayoutsById[zoneId];
    if (!zoneLayout) continue;

    const rect = rectFromLayout(zoneLayout);

    result[zoneId] = {
      universeId: model.universeId,
      zoneId,
      zone,
      rect,
      inlet: zoneLayout.anchors.inlet,
      outlet: zoneLayout.anchors.outlet,
    };
  }

  return result;
}

/**
 * ========================
 * Path
 * ========================
 */

function createPathVisualNodes(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zonesById: Record<ZoneId, ZoneVisualNode>;
}): Record<PathId, PathVisualNode> {
  const { model, layoutModel, zonesById } = params;

  const result: Record<PathId, PathVisualNode> = {};

  for (const zone of Object.values(model.zonesById)) {
    const sourceZoneVisual = zonesById[zone.id];
    if (!sourceZoneVisual) continue;

    zone.pathIds.forEach((pathId, index) => {
      const path = zone.pathsById[pathId];
      if (!path) return;

      const targetZoneId =
        path.target?.universeId === model.universeId
          ? path.target.zoneId
          : null;

      const rect = resolvePathNodeRect({
        layoutModel,
        pathId,
        sourceOutlet: sourceZoneVisual.outlet,
        fallbackIndex: index,
      });

      const anchors = resolvePathNodeAnchors(rect);

      result[pathId] = {
        universeId: model.universeId,
        pathId,
        sourceZoneId: zone.id,
        targetZoneId,
        path,
        rect,
        inlet: anchors.inlet,
        outlet: anchors.outlet,
      };
    });
  }

  return result;
}

/**
 * ========================
 * Edge
 * ========================
 */

function createEdgeVisuals(params: {
  model: UniverseModel;
  zonesById: Record<ZoneId, ZoneVisualNode>;
  pathsById: Record<PathId, PathVisualNode>;
}): Record<PathId, EdgeVisual> {
  const { model, zonesById, pathsById } = params;

  const result: Record<PathId, EdgeVisual> = {};

  for (const zone of Object.values(model.zonesById)) {
    const sourceZoneVisual = zonesById[zone.id];
    if (!sourceZoneVisual) continue;

    zone.pathIds.forEach((pathId) => {
      const pathVisual = pathsById[pathId];
      if (!pathVisual) return;

      const targetZoneVisual = pathVisual.targetZoneId
        ? zonesById[pathVisual.targetZoneId]
        : undefined;

      const source = pathVisual.outlet ?? sourceZoneVisual.outlet;

      const target = targetZoneVisual
        ? targetZoneVisual.inlet
        : pathVisual.rect
          ? centerOfRect(pathVisual.rect)
          : source;

      result[pathId] = {
        pathId,
        source,
        target,
      };
    });
  }

  return result;
}

/**
 * ========================
 * Engine
 * ========================
 */

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