import type {
  Layout,
  PathId,
  PathLayout,
  UniverseId,
  UniverseLayoutModel,
  UniverseModel,
  ZoneId,
  ZoneLayout,
} from "./types";

export type CreateUniverseLayoutModelInput = {
  universeId: UniverseId;
  version?: string;
  zoneLayoutsById?: Record<ZoneId, ZoneLayout>;
  pathLayoutsById?: Record<PathId, PathLayout>;
  meta?: Record<string, unknown>;
};

function createDefaultAnchors(): ZoneLayout["anchors"] {
  return {
    inlet: {
      point: { x: 0, y: 0 },
    },
    outlet: {
      point: { x: 0, y: 0 },
    },
  };
}

function cloneAnchor(
  anchor?: ZoneLayout["anchors"]["inlet"]
): ZoneLayout["anchors"]["inlet"] {
  return {
    point: {
      x: anchor?.point.x ?? 0,
      y: anchor?.point.y ?? 0,
    },
    rect: anchor?.rect ? { ...anchor.rect } : undefined,
  };
}

function cloneAnchors(
  anchors?: ZoneLayout["anchors"]
): ZoneLayout["anchors"] {
  return {
    inlet: cloneAnchor(anchors?.inlet),
    outlet: cloneAnchor(anchors?.outlet),
  };
}

function mergeAnchor(
  current?: ZoneLayout["anchors"]["inlet"],
  patch?: Partial<ZoneLayout["anchors"]["inlet"]>
): ZoneLayout["anchors"]["inlet"] {
  return {
    point: {
      x: patch?.point?.x ?? current?.point.x ?? 0,
      y: patch?.point?.y ?? current?.point.y ?? 0,
    },
    rect:
      patch?.rect !== undefined
        ? patch.rect
          ? { ...patch.rect }
          : undefined
        : current?.rect
          ? { ...current.rect }
          : undefined,
  };
}

function mergeAnchors(
  current?: ZoneLayout["anchors"],
  patch?: Partial<ZoneLayout["anchors"]>
): ZoneLayout["anchors"] {
  return {
    inlet: mergeAnchor(current?.inlet, patch?.inlet),
    outlet: mergeAnchor(current?.outlet, patch?.outlet),
  };
}

export function createUniverseLayoutModel(
  input: CreateUniverseLayoutModelInput
): UniverseLayoutModel {
  return {
    version: input.version ?? "1.0.0",
    universeId: input.universeId,
    zoneLayoutsById: input.zoneLayoutsById ? { ...input.zoneLayoutsById } : {},
    pathLayoutsById: input.pathLayoutsById ? { ...input.pathLayoutsById } : {},
    meta: input.meta ? { ...input.meta } : undefined,
  };
}

export function createZoneLayout(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  zOrder?: number;
}): ZoneLayout {
  const { x, y, width, height, zOrder } = input;

  return {
    x,
    y,
    width,
    height,
    zOrder,
    anchors: {
      inlet: {
        point: {
          x: 0,
          y: height / 2,
        },
      },
      outlet: {
        point: {
          x: width,
          y: height / 2,
        },
      },
    },
  };
}

export function getZoneLayout(
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId
): ZoneLayout | undefined {
  return layoutModel.zoneLayoutsById[zoneId];
}

export function setZoneLayout(
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId,
  layout: ZoneLayout | undefined
): UniverseLayoutModel {
  const nextZoneLayoutsById = { ...layoutModel.zoneLayoutsById };

  if (layout) {
    nextZoneLayoutsById[zoneId] = layout;
  } else {
    delete nextZoneLayoutsById[zoneId];
  }

  return {
    ...layoutModel,
    zoneLayoutsById: nextZoneLayoutsById,
  };
}

export function updateZoneLayout(
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId,
  patch: Partial<ZoneLayout>
): UniverseLayoutModel {
  const currentLayout = layoutModel.zoneLayoutsById[zoneId];

  return setZoneLayout(layoutModel, zoneId, {
    x: patch.x ?? currentLayout?.x ?? 0,
    y: patch.y ?? currentLayout?.y ?? 0,
    width: patch.width ?? currentLayout?.width,
    height: patch.height ?? currentLayout?.height,
    zOrder: patch.zOrder ?? currentLayout?.zOrder,
    anchors: mergeAnchors(currentLayout?.anchors, patch.anchors),
  });
}

export function getPathLayout(
  layoutModel: UniverseLayoutModel,
  pathId: PathId
): PathLayout | undefined {
  return layoutModel.pathLayoutsById[pathId];
}

export function setPathLayout(
  layoutModel: UniverseLayoutModel,
  pathId: PathId,
  layout: PathLayout | undefined
): UniverseLayoutModel {
  const nextPathLayoutsById = { ...layoutModel.pathLayoutsById };

  if (layout) {
    nextPathLayoutsById[pathId] = layout;
  } else {
    delete nextPathLayoutsById[pathId];
  }

  return {
    ...layoutModel,
    pathLayoutsById: nextPathLayoutsById,
  };
}

export function updatePathLayout(
  layoutModel: UniverseLayoutModel,
  pathId: PathId,
  patch: Partial<PathLayout>
): UniverseLayoutModel {
  const currentLayout = layoutModel.pathLayoutsById[pathId];

  return setPathLayout(layoutModel, pathId, {
    ...currentLayout,
    ...patch,
    zOrder: patch.zOrder ?? currentLayout?.zOrder,
    componentLayoutsById:
      patch.componentLayoutsById ??
      currentLayout?.componentLayoutsById,
  });
}

export function getPathComponentLayout(
  layoutModel: UniverseLayoutModel,
  pathId: PathId,
  componentId: string
): Layout | undefined {
  return layoutModel.pathLayoutsById[pathId]?.componentLayoutsById?.[componentId];
}

export function setPathComponentLayout(
  layoutModel: UniverseLayoutModel,
  pathId: PathId,
  componentId: string,
  layout: Layout | undefined
): UniverseLayoutModel {
  const currentPathLayout = layoutModel.pathLayoutsById[pathId] ?? {};
  const nextComponentLayoutsById = {
    ...(currentPathLayout.componentLayoutsById ?? {}),
  };

  if (layout) {
    nextComponentLayoutsById[componentId] = layout;
  } else {
    delete nextComponentLayoutsById[componentId];
  }

  const hasComponents = Object.keys(nextComponentLayoutsById).length > 0;

  const nextPathLayout: PathLayout = {
    ...currentPathLayout,
    componentLayoutsById: hasComponents
      ? nextComponentLayoutsById
      : undefined,
  };

  if (
    nextPathLayout.zOrder === undefined &&
    !nextPathLayout.routeOffset &&
    !nextPathLayout.componentLayoutsById
  ) {
    return setPathLayout(layoutModel, pathId, undefined);
  }

  return setPathLayout(layoutModel, pathId, nextPathLayout);
}

export function updatePathComponentLayout(
  layoutModel: UniverseLayoutModel,
  pathId: PathId,
  componentId: string,
  patch: Partial<Layout>
): UniverseLayoutModel {
  const currentLayout =
    layoutModel.pathLayoutsById[pathId]?.componentLayoutsById?.[componentId];

  return setPathComponentLayout(layoutModel, pathId, componentId, {
    x: patch.x ?? currentLayout?.x ?? 0,
    y: patch.y ?? currentLayout?.y ?? 0,
    width: patch.width ?? currentLayout?.width,
    height: patch.height ?? currentLayout?.height,
  });
}

export function removeZoneLayouts(
  layoutModel: UniverseLayoutModel,
  zoneIds: ZoneId[]
): UniverseLayoutModel {
  if (zoneIds.length === 0) return layoutModel;

  const zoneIdSet = new Set(zoneIds);
  const nextZoneLayoutsById: Record<ZoneId, ZoneLayout> = {};

  for (const [zoneId, layout] of Object.entries(layoutModel.zoneLayoutsById)) {
    if (!zoneIdSet.has(zoneId as ZoneId)) {
      nextZoneLayoutsById[zoneId as ZoneId] = layout;
    }
  }

  return {
    ...layoutModel,
    zoneLayoutsById: nextZoneLayoutsById,
  };
}

export function removePathLayouts(
  layoutModel: UniverseLayoutModel,
  pathIds: PathId[]
): UniverseLayoutModel {
  if (pathIds.length === 0) return layoutModel;

  const pathIdSet = new Set(pathIds);
  const nextPathLayoutsById: Record<PathId, PathLayout> = {};

  for (const [pathId, layout] of Object.entries(layoutModel.pathLayoutsById)) {
    if (!pathIdSet.has(pathId as PathId)) {
      nextPathLayoutsById[pathId as PathId] = layout;
    }
  }

  return {
    ...layoutModel,
    pathLayoutsById: nextPathLayoutsById,
  };
}

export function pruneLayoutModel(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel
): UniverseLayoutModel {
  const zoneIds = new Set(Object.keys(model.zonesById));
  const pathIds = new Set<PathId>();

  for (const zone of Object.values(model.zonesById)) {
    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];
      if (path) {
        pathIds.add(path.id);
      }
    }
  }

  const nextZoneLayoutsById: Record<ZoneId, ZoneLayout> = {};
  for (const [zoneId, layout] of Object.entries(layoutModel.zoneLayoutsById)) {
    if (zoneIds.has(zoneId)) {
      nextZoneLayoutsById[zoneId as ZoneId] = layout;
    }
  }

  const nextPathLayoutsById: Record<PathId, PathLayout> = {};
  for (const [pathId, layout] of Object.entries(layoutModel.pathLayoutsById)) {
    if (pathIds.has(pathId as PathId)) {
      nextPathLayoutsById[pathId as PathId] = layout;
    }
  }

  return {
    ...layoutModel,
    universeId: model.universeId,
    zoneLayoutsById: nextZoneLayoutsById,
    pathLayoutsById: nextPathLayoutsById,
  };
}

export function computeAutoLayoutForZoneTree(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId,
  options: {
    paddingX?: number;
    paddingY?: number;
    verticalGap?: number;
    defaultWidth?: number;
    defaultHeight?: number;
  } = {}
): ZoneLayout | undefined {
  const {
    paddingX = 32,
    paddingY = 24,
    verticalGap = 24,
    defaultWidth = 160,
    defaultHeight = 100,
  } = options;

  const zone = model.zonesById[zoneId];
  if (!zone) return undefined;

  const ownLayout = layoutModel.zoneLayoutsById[zone.id];

  const childLayouts = zone.childZoneIds
    .map((childId) =>
      computeAutoLayoutForZoneTree(model, layoutModel, childId, options)
    )
    .filter((layout): layout is ZoneLayout => Boolean(layout));

  const ownWidth = ownLayout?.width ?? defaultWidth;
  const ownHeight = ownLayout?.height ?? defaultHeight;

  if (childLayouts.length === 0) {
    return {
      x: ownLayout?.x ?? 0,
      y: ownLayout?.y ?? 0,
      width: ownWidth,
      height: ownHeight,
      anchors: cloneAnchors(ownLayout?.anchors),
    };
  }

  const minChildX = Math.min(...childLayouts.map((layout) => layout.x));
  const minChildY = Math.min(...childLayouts.map((layout) => layout.y));
  const maxChildX = Math.max(
    ...childLayouts.map((layout) => layout.x + (layout.width ?? defaultWidth))
  );
  const maxChildY = Math.max(
    ...childLayouts.map((layout) => layout.y + (layout.height ?? defaultHeight))
  );

  return {
    x: ownLayout?.x ?? minChildX - paddingX,
    y: ownLayout?.y ?? minChildY - (ownHeight + verticalGap / 2),
    width: Math.max(maxChildX - minChildX + paddingX * 2, ownWidth),
    height: Math.max(
      ownHeight + verticalGap + (maxChildY - minChildY) + paddingY * 2,
      ownHeight
    ),
    anchors: cloneAnchors(ownLayout?.anchors),
  };
}

export type LayoutDensityScale = {
  /** Multiplier for every zone's width/height (and its anchor offsets). */
  sizeScale?: number;
  /**
   * Multiplier for the spacing between root zones (their positions are scaled
   * about the roots' centroid) and for path `routeOffset`. Move it opposite to
   * `sizeScale` for the classic "denser = bigger + closer / sparser = smaller +
   * spread" feel.
   */
  spacingScale?: number;
};

function scaleZoneAnchor(
  anchor: ZoneLayout["anchors"]["inlet"],
  sizeScale: number
): ZoneLayout["anchors"]["inlet"] {
  return {
    point: { x: anchor.point.x * sizeScale, y: anchor.point.y * sizeScale },
    rect: anchor.rect
      ? {
          x: anchor.rect.x * sizeScale,
          y: anchor.rect.y * sizeScale,
          width:
            anchor.rect.width != null ? anchor.rect.width * sizeScale : undefined,
          height:
            anchor.rect.height != null
              ? anchor.rect.height * sizeScale
              : undefined,
        }
      : undefined,
  };
}

/**
 * Density transform: a non-destructive view-scale on the layout, distinct from
 * camera zoom (which scales everything uniformly). `sizeScale` grows/shrinks
 * zones; `spacingScale` independently widens/tightens the gaps between root
 * zones — so a consumer can offer a "density" control where raising it makes
 * zones bigger AND closer, lowering it makes them smaller AND spread out.
 *
 * Because bigger zones cross the size-based density thresholds, this also walks
 * the rendered level from `farest` toward `nearest` automatically. Pure: pass
 * the result as the rendered `layoutModel`; keep your base layout for editing
 * (apply this only as a view, not while resizing/dragging).
 *
 * Containment is preserved: child offsets/sizes scale by `sizeScale` (each
 * subtree scales uniformly), only root positions take `spacingScale`. Returns
 * the input unchanged when both factors are 1.
 */
export function scaleLayoutDensity(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel,
  options: LayoutDensityScale
): UniverseLayoutModel {
  const sizeScale = options.sizeScale ?? 1;
  const spacingScale = options.spacingScale ?? 1;
  if (sizeScale === 1 && spacingScale === 1) return layoutModel;

  // Centroid of root zone positions — the fixed point the root spacing scales
  // about, so the graph doesn't drift when spacing changes.
  let sumX = 0;
  let sumY = 0;
  let rootCount = 0;
  for (const rootId of model.rootZoneIds) {
    const layout = layoutModel.zoneLayoutsById[rootId];
    if (!layout) continue;
    sumX += layout.x;
    sumY += layout.y;
    rootCount += 1;
  }
  const centroidX = rootCount > 0 ? sumX / rootCount : 0;
  const centroidY = rootCount > 0 ? sumY / rootCount : 0;

  const nextZoneLayoutsById: Record<ZoneId, ZoneLayout> = {};
  for (const [zoneId, layout] of Object.entries(layoutModel.zoneLayoutsById)) {
    const isRoot = !model.zonesById[zoneId]?.parentZoneId;
    // Roots: reposition by spacing about the centroid. Children: their offset
    // is relative to the parent, so scale by sizeScale to keep the subtree
    // uniform (and thus contained).
    const positionScale = isRoot ? spacingScale : sizeScale;
    const baseX = isRoot ? centroidX : 0;
    const baseY = isRoot ? centroidY : 0;

    nextZoneLayoutsById[zoneId as ZoneId] = {
      ...layout,
      x: baseX + (layout.x - baseX) * positionScale,
      y: baseY + (layout.y - baseY) * positionScale,
      width: layout.width != null ? layout.width * sizeScale : layout.width,
      height: layout.height != null ? layout.height * sizeScale : layout.height,
      anchors: {
        inlet: scaleZoneAnchor(layout.anchors.inlet, sizeScale),
        outlet: scaleZoneAnchor(layout.anchors.outlet, sizeScale),
      },
    };
  }

  const nextPathLayoutsById: Record<PathId, PathLayout> = {};
  for (const [pathId, pathLayout] of Object.entries(
    layoutModel.pathLayoutsById
  )) {
    nextPathLayoutsById[pathId as PathId] = {
      ...pathLayout,
      routeOffset: pathLayout.routeOffset
        ? {
            x: pathLayout.routeOffset.x * spacingScale,
            y: pathLayout.routeOffset.y * spacingScale,
          }
        : pathLayout.routeOffset,
    };
  }

  return {
    ...layoutModel,
    zoneLayoutsById: nextZoneLayoutsById,
    pathLayoutsById: nextPathLayoutsById,
  };
}

export function computeWrapperLayoutFromChildren(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel,
  zoneIds: ZoneId[],
  options: {
    padding?: number;
    minWidth?: number;
    minHeight?: number;
  } = {}
): ZoneLayout | undefined {
  const { padding = 32, minWidth = 160, minHeight = 120 } = options;

  const layouts = zoneIds
    .map((zoneId) => {
      if (!model.zonesById[zoneId]) return undefined;
      return layoutModel.zoneLayoutsById[zoneId];
    })
    .filter((layout): layout is ZoneLayout => Boolean(layout));

  if (layouts.length === 0) return undefined;

  const minX = Math.min(...layouts.map((layout) => layout.x));
  const minY = Math.min(...layouts.map((layout) => layout.y));
  const maxX = Math.max(...layouts.map((layout) => layout.x + (layout.width ?? 0)));
  const maxY = Math.max(...layouts.map((layout) => layout.y + (layout.height ?? 0)));

  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(maxX - minX + padding * 2, minWidth),
    height: Math.max(maxY - minY + padding * 2, minHeight),
    anchors: createDefaultAnchors(),
  };
}
