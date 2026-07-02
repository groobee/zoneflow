import type {
  UniverseModel,
  Zone,
  ZoneAction,
  ZoneId,
  ZoneSlotDef,
  ZoneType,
  Path,
  PathId,
  ZoneRef,
} from "./types";

export type CreateZoneInput = {
  id: ZoneId;
  name: string;
  parentZoneId?: ZoneId | null;
  zoneType?: ZoneType;
  inputDisabled?: boolean;
  outputDisabled?: boolean;
  fixedWidth?: boolean;
  fixedHeight?: boolean;
  minWidth?: number;
  minHeight?: number;
  slots?: ZoneSlotDef[];
  slotKey?: string;
  action?: ZoneAction;
  meta?: Record<string, unknown>;
};

export type CreatePathInput = {
  id: PathId;
  key: string;
  name: string;
  target?: ZoneRef | null;
  rule: Path["rule"];
  meta?: Record<string, unknown>;
};

export function createZone(
  model: UniverseModel,
  input: CreateZoneInput
): UniverseModel {
  const {
    id,
    name,
    parentZoneId = null,
    zoneType = "container",
    inputDisabled,
    outputDisabled,
    fixedWidth,
    fixedHeight,
    minWidth,
    minHeight,
    slots,
    slotKey,
    action,
    meta,
  } = input;

  if (model.zonesById[id]) return model;

  const newZone: Zone = {
    id,
    parentZoneId,
    name,
    zoneType,
    inputDisabled,
    outputDisabled,
    fixedWidth,
    fixedHeight,
    minWidth,
    minHeight,
    slots,
    slotKey,
    childZoneIds: [],
    pathIds: [],
    pathsById: {},
    action,
    meta,
  };

  const nextZonesById = {
    ...model.zonesById,
    [id]: newZone,
  };

  if (parentZoneId === null) {
    return {
      ...model,
      rootZoneIds: [...model.rootZoneIds, id],
      zonesById: nextZonesById,
    };
  }

  const parent = model.zonesById[parentZoneId];
  if (!parent) return model;

  return {
    ...model,
    zonesById: {
      ...nextZonesById,
      [parentZoneId]: {
        ...parent,
        childZoneIds: [...parent.childZoneIds, id],
      },
    },
  };
}

export function updateZone(
  model: UniverseModel,
  zoneId: ZoneId,
  patch: Partial<Omit<Zone, "id">>
): UniverseModel {
  const zone = model.zonesById[zoneId];
  if (!zone) return model;

  return {
    ...model,
    zonesById: {
      ...model.zonesById,
      [zoneId]: {
        ...zone,
        ...patch,
      },
    },
  };
}

export function moveZone(
  model: UniverseModel,
  zoneId: ZoneId,
  nextParentZoneId: ZoneId | null
): UniverseModel {
  const zone = model.zonesById[zoneId];
  if (!zone) return model;

  const prevParentZoneId = zone.parentZoneId;
  if (prevParentZoneId === nextParentZoneId) return model;

  let nextModel = model;

  if (prevParentZoneId !== null) {
    const prevParent = nextModel.zonesById[prevParentZoneId];
    if (prevParent) {
      nextModel = {
        ...nextModel,
        zonesById: {
          ...nextModel.zonesById,
          [prevParentZoneId]: {
            ...prevParent,
            childZoneIds: prevParent.childZoneIds.filter((id) => id !== zoneId),
          },
        },
      };
    }
  } else {
    nextModel = {
      ...nextModel,
      rootZoneIds: nextModel.rootZoneIds.filter((id) => id !== zoneId),
    };
  }

  if (nextParentZoneId !== null) {
    const nextParent = nextModel.zonesById[nextParentZoneId];
    if (!nextParent) return model;

    nextModel = {
      ...nextModel,
      zonesById: {
        ...nextModel.zonesById,
        [nextParentZoneId]: {
          ...nextParent,
          childZoneIds: [...nextParent.childZoneIds, zoneId],
        },
      },
    };
  } else {
    nextModel = {
      ...nextModel,
      rootZoneIds: [...nextModel.rootZoneIds, zoneId],
    };
  }

  // slotKey only makes sense while the parent declares that slot — leaving
  // for a parent without it (or to root) drops the key so the model never
  // goes invalid.
  const nextParent = nextParentZoneId
    ? nextModel.zonesById[nextParentZoneId]
    : undefined;
  const movedZone = nextModel.zonesById[zoneId];
  const keepsSlotKey = Boolean(
    movedZone.slotKey &&
      nextParent?.zoneType === "container" &&
      nextParent.slots?.some((slot) => slot.key === movedZone.slotKey)
  );

  return {
    ...nextModel,
    zonesById: {
      ...nextModel.zonesById,
      [zoneId]: {
        ...movedZone,
        parentZoneId: nextParentZoneId,
        slotKey: keepsSlotKey ? movedZone.slotKey : undefined,
      },
    },
  };
}

export function collectSubtreeZoneIds(
  model: UniverseModel,
  zoneId: ZoneId
): ZoneId[] {
  const result: ZoneId[] = [];
  const stack: ZoneId[] = [zoneId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    const current = model.zonesById[currentId];
    if (!current) continue;

    result.push(currentId);
    stack.push(...current.childZoneIds);
  }

  return result;
}

export function removeZone(
  model: UniverseModel,
  zoneId: ZoneId
): UniverseModel {
  const zone = model.zonesById[zoneId];
  if (!zone) return model;

  const zoneIdsToDelete = collectSubtreeZoneIds(model, zoneId);
  const nextZonesById = { ...model.zonesById };

  for (const id of zoneIdsToDelete) {
    delete nextZonesById[id];
  }

  const nextRootZoneIds = model.rootZoneIds.filter(
    (id) => !zoneIdsToDelete.includes(id)
  );

  if (zone.parentZoneId && nextZonesById[zone.parentZoneId]) {
    nextZonesById[zone.parentZoneId] = {
      ...nextZonesById[zone.parentZoneId],
      childZoneIds: nextZonesById[zone.parentZoneId].childZoneIds.filter(
        (id) => id !== zoneId
      ),
    };
  }

  return {
    ...model,
    rootZoneIds: nextRootZoneIds,
    zonesById: nextZonesById,
  };
}

export function addPath(
  model: UniverseModel,
  zoneId: ZoneId,
  input: CreatePathInput
): UniverseModel {
  const zone = model.zonesById[zoneId];
  if (!zone) return model;
  if (zone.pathsById[input.id]) return model;

  const newPath: Path = {
    id: input.id,
    key: input.key,
    name: input.name,
    target: input.target,
    rule: input.rule ?? null,
    meta: input.meta,
  };

  return {
    ...model,
    zonesById: {
      ...model.zonesById,
      [zoneId]: {
        ...zone,
        pathIds: [...zone.pathIds, input.id],
        pathsById: {
          ...zone.pathsById,
          [input.id]: newPath,
        },
      },
    },
  };
}

export function updatePath(
  model: UniverseModel,
  zoneId: ZoneId,
  pathId: PathId,
  patch: Partial<Path>
): UniverseModel {
  const zone = model.zonesById[zoneId];
  if (!zone) return model;

  const path = zone.pathsById[pathId];
  if (!path) return model;

  return {
    ...model,
    zonesById: {
      ...model.zonesById,
      [zoneId]: {
        ...zone,
        pathsById: {
          ...zone.pathsById,
          [pathId]: {
            ...path,
            ...patch,
            rule:
              Object.prototype.hasOwnProperty.call(patch, "rule")
                ? (patch.rule ?? null)
                : path.rule,
          },
        },
      },
    },
  };
}

export function removePath(
  model: UniverseModel,
  zoneId: ZoneId,
  pathId: PathId
): UniverseModel {
  const zone = model.zonesById[zoneId];
  if (!zone) return model;
  if (!zone.pathsById[pathId]) return model;

  const nextPathsById = { ...zone.pathsById };
  delete nextPathsById[pathId];

  return {
    ...model,
    zonesById: {
      ...model.zonesById,
      [zoneId]: {
        ...zone,
        pathIds: zone.pathIds.filter((id) => id !== pathId),
        pathsById: nextPathsById,
      },
    },
  };
}

/**
 * Default "empty path" predicate used by {@link removeEmptyPaths}: a path with
 * a blank name and no rule — i.e. the ones the renderer labels `"Empty"`.
 */
export function isEmptyPath(path: Path): boolean {
  return path.name.trim() === "" && path.rule === null;
}

/**
 * Remove every "empty" path across all zones and return a new model. By default
 * a path counts as empty when its name is blank and it has no rule (matching the
 * `"Empty"` label shown in the canvas); pass `options.isEmpty` to use a
 * different rule (e.g. also require `target == null` to keep unconditional
 * fall-through paths). Pure model mutation — pair with {@link pruneLayoutModel}
 * afterwards to drop the now-orphaned path layouts.
 *
 * @example
 * const next = removeEmptyPaths(model);
 * layoutModel = pruneLayoutModel(next, layoutModel);
 */
export function removeEmptyPaths(
  model: UniverseModel,
  options: { isEmpty?: (path: Path) => boolean } = {}
): UniverseModel {
  const isEmpty = options.isEmpty ?? isEmptyPath;

  let next = model;
  for (const zone of Object.values(model.zonesById)) {
    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];
      if (path && isEmpty(path)) {
        next = removePath(next, zone.id, pathId);
      }
    }
  }

  return next;
}

export function setPathTarget(
  model: UniverseModel,
  zoneId: ZoneId,
  pathId: PathId,
  target: ZoneRef | null
): UniverseModel {
  return updatePath(model, zoneId, pathId, { target });
}

/**
 * Demotes the target of every path pointing at `zoneId` to `null` (dangling).
 * Used when a zone stops being connectable — e.g. it just docked into a slot
 * whose childInput is disabled — mirroring how a rejected drop demotes a
 * path's target.
 */
export function detachPathsTargetingZone(
  model: UniverseModel,
  zoneId: ZoneId
): UniverseModel {
  let nextModel = model;

  for (const zone of Object.values(model.zonesById)) {
    for (const path of Object.values(zone.pathsById)) {
      if (
        path.target &&
        path.target.universeId === model.universeId &&
        path.target.zoneId === zoneId
      ) {
        nextModel = updatePath(nextModel, zone.id, path.id, { target: null });
      }
    }
  }

  return nextModel;
}

export function reorderPaths(
  model: UniverseModel,
  zoneId: ZoneId,
  nextPathIds: PathId[]
): UniverseModel {
  const zone = model.zonesById[zoneId];
  if (!zone) return model;

  const sameLength = zone.pathIds.length === nextPathIds.length;
  const allExist = nextPathIds.every((id) => Boolean(zone.pathsById[id]));

  if (!sameLength || !allExist) return model;

  return {
    ...model,
    zonesById: {
      ...model.zonesById,
      [zoneId]: {
        ...zone,
        pathIds: [...nextPathIds],
      },
    },
  };
}
