import {
  updatePathLayout,
  updateZoneLayout,
  type PathId,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";

export type ZOrderMode =
  | "send-to-back"
  | "send-backward"
  | "bring-forward"
  | "bring-to-front";

function reorderIds(params: {
  orderedIds: string[];
  selectedIds: Set<string>;
  mode: ZOrderMode;
}): string[] {
  const { orderedIds, selectedIds, mode } = params;
  if (orderedIds.length < 2 || selectedIds.size === 0) return orderedIds;

  if (mode === "send-to-back") {
    return [
      ...orderedIds.filter((id) => selectedIds.has(id)),
      ...orderedIds.filter((id) => !selectedIds.has(id)),
    ];
  }

  if (mode === "bring-to-front") {
    return [
      ...orderedIds.filter((id) => !selectedIds.has(id)),
      ...orderedIds.filter((id) => selectedIds.has(id)),
    ];
  }

  const nextIds = [...orderedIds];

  if (mode === "send-backward") {
    for (let index = 1; index < nextIds.length; index += 1) {
      const currentId = nextIds[index];
      const previousId = nextIds[index - 1];
      if (!currentId || !previousId) continue;
      if (!selectedIds.has(currentId) || selectedIds.has(previousId)) continue;
      nextIds[index - 1] = currentId;
      nextIds[index] = previousId;
    }
    return nextIds;
  }

  for (let index = nextIds.length - 2; index >= 0; index -= 1) {
    const currentId = nextIds[index];
    const nextId = nextIds[index + 1];
    if (!currentId || !nextId) continue;
    if (!selectedIds.has(currentId) || selectedIds.has(nextId)) continue;
    nextIds[index] = nextId;
    nextIds[index + 1] = currentId;
  }

  return nextIds;
}

function sortByCurrentZOrder<TId extends string>(params: {
  ids: TId[];
  getZOrder: (id: TId) => number | undefined;
}): TId[] {
  const { ids, getZOrder } = params;
  return [...ids]
    .map((id, index) => ({
      id,
      index,
      zOrder: getZOrder(id) ?? index,
    }))
    .sort((a, b) => a.zOrder - b.zOrder || a.index - b.index)
    .map((entry) => entry.id);
}

export function reorderZonesByZOrderMode(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  mode: ZOrderMode;
}): UniverseLayoutModel {
  const { model, layoutModel, zoneIds, mode } = params;
  const selectedIds = new Set(zoneIds);
  if (selectedIds.size === 0) return layoutModel;

  const selectedIdsByParent = new Map<ZoneId | null, Set<ZoneId>>();
  for (const zoneId of selectedIds) {
    const zone = model.zonesById[zoneId];
    if (!zone) continue;
    const parentZoneId = zone.parentZoneId;
    const current = selectedIdsByParent.get(parentZoneId) ?? new Set<ZoneId>();
    current.add(zoneId);
    selectedIdsByParent.set(parentZoneId, current);
  }

  let nextLayoutModel = layoutModel;

  for (const [parentZoneId, selectedSiblingIds] of selectedIdsByParent) {
    const siblingIds =
      parentZoneId === null
        ? model.rootZoneIds
        : model.zonesById[parentZoneId]?.childZoneIds ?? [];
    const orderedSiblingIds = sortByCurrentZOrder({
      ids: siblingIds.filter((zoneId) => Boolean(model.zonesById[zoneId])),
      getZOrder: (zoneId) => layoutModel.zoneLayoutsById[zoneId]?.zOrder,
    });
    const reorderedSiblingIds = reorderIds({
      orderedIds: orderedSiblingIds,
      selectedIds: selectedSiblingIds,
      mode,
    }) as ZoneId[];

    reorderedSiblingIds.forEach((zoneId, zOrder) => {
      if (!nextLayoutModel.zoneLayoutsById[zoneId]) return;
      nextLayoutModel = updateZoneLayout(nextLayoutModel, zoneId, {
        zOrder,
      });
    });
  }

  return nextLayoutModel;
}

function getAllPathIds(model: UniverseModel): PathId[] {
  const pathIds: PathId[] = [];
  const zoneIds = Object.keys(model.zonesById) as ZoneId[];

  for (const zoneId of zoneIds) {
    const zone = model.zonesById[zoneId];
    if (!zone) continue;
    pathIds.push(...zone.pathIds.filter((pathId) => Boolean(zone.pathsById[pathId])));
  }

  return pathIds;
}

export function reorderPathsByZOrderMode(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  pathIds: PathId[];
  mode: ZOrderMode;
}): UniverseLayoutModel {
  const { model, layoutModel, pathIds, mode } = params;
  const selectedIds = new Set(pathIds);
  if (selectedIds.size === 0) return layoutModel;

  const orderedPathIds = sortByCurrentZOrder({
    ids: getAllPathIds(model),
    getZOrder: (pathId) => layoutModel.pathLayoutsById[pathId]?.zOrder,
  });
  const reorderedPathIds = reorderIds({
    orderedIds: orderedPathIds,
    selectedIds,
    mode,
  }) as PathId[];

  let nextLayoutModel = layoutModel;
  reorderedPathIds.forEach((pathId, zOrder) => {
    nextLayoutModel = updatePathLayout(nextLayoutModel, pathId, {
      zOrder,
    });
  });

  return nextLayoutModel;
}
