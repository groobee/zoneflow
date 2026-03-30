import type {
  UniverseModel,
  Zone,
  ZoneAction,
  ZoneId,
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

  return {
    ...nextModel,
    zonesById: {
      ...nextModel.zonesById,
      [zoneId]: {
        ...nextModel.zonesById[zoneId],
        parentZoneId: nextParentZoneId,
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

export function setPathTarget(
  model: UniverseModel,
  zoneId: ZoneId,
  pathId: PathId,
  target: ZoneRef | null
): UniverseModel {
  return updatePath(model, zoneId, pathId, { target });
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
