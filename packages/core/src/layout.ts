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

  if (!nextPathLayout.routeOffset && !nextPathLayout.componentLayoutsById) {
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