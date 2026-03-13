import type {
  Layout,
  PathId,
  PathLayout,
  UniverseLayoutModel,
  UniverseModel,
  UniverseId,
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
    z: patch.z ?? currentLayout?.z,
    width: patch.width ?? currentLayout?.width,
    height: patch.height ?? currentLayout?.height,
    anchors: {
      inlet:
        patch.anchors?.inlet ??
        currentLayout?.anchors.inlet ??
        { x: 0, y: 0 },
      outlet:
        patch.anchors?.outlet ??
        currentLayout?.anchors.outlet ??
        { x: 0, y: 0 },
    },
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
    z: patch.z ?? currentLayout?.z,
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
    if (!zoneIdSet.has(zoneId)) {
      nextZoneLayoutsById[zoneId] = layout;
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
    if (!pathIdSet.has(pathId)) {
      nextPathLayoutsById[pathId] = layout;
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
      nextZoneLayoutsById[zoneId] = layout;
    }
  }

  const nextPathLayoutsById: Record<PathId, PathLayout> = {};
  for (const [pathId, layout] of Object.entries(layoutModel.pathLayoutsById)) {
    if (pathIds.has(pathId)) {
      nextPathLayoutsById[pathId] = layout;
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
      z: ownLayout?.z,
      width: ownWidth,
      height: ownHeight,
      anchors: ownLayout?.anchors ?? { inlet: { x: 0, y: 0 }, outlet: { x: 0, y: 0 } },
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

  const width = Math.max(maxChildX - minChildX + paddingX * 2, ownWidth);
  const height = Math.max(
    ownHeight + verticalGap + (maxChildY - minChildY) + paddingY * 2,
    ownHeight
  );

  return {
    x: ownLayout?.x ?? minChildX - paddingX,
    y: ownLayout?.y ?? minChildY - (ownHeight + verticalGap / 2),
    z: ownLayout?.z,
    width,
    height,
    anchors: ownLayout?.anchors ?? { inlet: { x: 0, y: 0 }, outlet: { x: 0, y: 0 } },
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

  const zValues = layouts
    .map((layout) => layout.z)
    .filter((z): z is number => typeof z === "number");

  const wrapperLayout: ZoneLayout = {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(maxX - minX + padding * 2, minWidth),
    height: Math.max(maxY - minY + padding * 2, minHeight),
    anchors: {
      inlet: { x: minX - padding, y: minY - padding },
      outlet: { x: minX - padding, y: minY - padding },
    },
  };

  if (zValues.length > 0) {
    wrapperLayout.z = Math.min(...zValues);
  }

  return wrapperLayout;
}
