import type {
  AnchorLayout,
  PathId,
  Point,
  UniverseLayoutModel,
  UniverseModel,
  ZoneId,
  AnchorRect,
} from "@zoneflow/core";
import type {
  EdgeVisual,
  GraphLayoutEngine,
  GraphLayoutResult,
  PathVisualNode,
  Rect,
  ZoneVisualNode,
} from "../types";

export const DEFAULT_PATH_NODE_WIDTH = 120;
export const DEFAULT_PATH_NODE_HEIGHT = 32;
export const DEFAULT_PATH_NODE_OFFSET_X = 32;
export const DEFAULT_PATH_NODE_GAP_Y = 40;

function typedEntries<TKey extends string, TValue>(
  record: Record<TKey, TValue>
): Array<[TKey, TValue]> {
  return Object.entries(record) as Array<[TKey, TValue]>;
}

function typedValues<TKey extends string, TValue>(
  record: Record<TKey, TValue>
): TValue[] {
  return Object.values(record) as TValue[];
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

  for (const [typedZoneId, layout] of typedEntries(layoutModel.zoneLayoutsById)) {
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

  for (const [pathId, pathLayout] of typedEntries(layoutModel.pathLayoutsById)) {
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

function createZoneVisualNodes(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
}): Record<ZoneId, ZoneVisualNode> {
  const { model, layoutModel } = params;
  const result: Record<ZoneId, ZoneVisualNode> = {};

  for (const [typedZoneId, zone] of typedEntries(model.zonesById)) {
    const zoneLayout = layoutModel.zoneLayoutsById[typedZoneId];
    if (!zoneLayout) continue;

    result[typedZoneId] = {
      universeId: model.universeId,
      zoneId: typedZoneId,
      zone,
      rect: rectFromLayout(zoneLayout),
      anchors: zoneLayout.anchors,
    };
  }

  return result;
}

function createPathVisualNodes(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zonesById: Record<ZoneId, ZoneVisualNode>;
}): Record<PathId, PathVisualNode> {
  const { model, layoutModel, zonesById } = params;
  const result: Record<PathId, PathVisualNode> = {};

  for (const zone of typedValues(model.zonesById)) {
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

function createEdgeVisuals(params: {
  model: UniverseModel;
  zonesById: Record<ZoneId, ZoneVisualNode>;
  pathsById: Record<PathId, PathVisualNode>;
}): Record<PathId, EdgeVisual[]> {
  const { model, zonesById, pathsById } = params;
  const result: Record<PathId, EdgeVisual[]> = {};

  for (const zone of typedValues(model.zonesById)) {
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

      const targetInlet = targetZoneVisual
        ? (
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
