export function createZone(model, input) {
    const { id, name, parentZoneId = null, zoneType = "container", action, layout, meta, } = input;
    if (model.zonesById[id])
        return model;
    const newZone = {
        id,
        parentZoneId,
        name,
        zoneType,
        childZoneIds: [],
        pathIds: [],
        pathsById: {},
        action,
        layout,
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
    if (!parent)
        return model;
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
export function updateZone(model, zoneId, patch) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
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
export function updateZoneLayout(model, zoneId, patch) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    return updateZone(model, zoneId, {
        layout: {
            ...(zone.layout ?? { x: 0, y: 0 }),
            ...patch,
        },
    });
}
export function moveZone(model, zoneId, nextParentZoneId) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    const prevParentZoneId = zone.parentZoneId;
    if (prevParentZoneId === nextParentZoneId)
        return model;
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
    }
    else {
        nextModel = {
            ...nextModel,
            rootZoneIds: nextModel.rootZoneIds.filter((id) => id !== zoneId),
        };
    }
    if (nextParentZoneId !== null) {
        const nextParent = nextModel.zonesById[nextParentZoneId];
        if (!nextParent)
            return model;
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
    }
    else {
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
export function collectSubtreeZoneIds(model, zoneId) {
    const result = [];
    const stack = [zoneId];
    while (stack.length > 0) {
        const currentId = stack.pop();
        const current = model.zonesById[currentId];
        if (!current)
            continue;
        result.push(currentId);
        stack.push(...current.childZoneIds);
    }
    return result;
}
export function removeZone(model, zoneId) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    const zoneIdsToDelete = collectSubtreeZoneIds(model, zoneId);
    const nextZonesById = { ...model.zonesById };
    for (const id of zoneIdsToDelete) {
        delete nextZonesById[id];
    }
    const nextRootZoneIds = model.rootZoneIds.filter((id) => !zoneIdsToDelete.includes(id));
    if (zone.parentZoneId && nextZonesById[zone.parentZoneId]) {
        nextZonesById[zone.parentZoneId] = {
            ...nextZonesById[zone.parentZoneId],
            childZoneIds: nextZonesById[zone.parentZoneId].childZoneIds.filter((id) => id !== zoneId),
        };
    }
    return {
        ...model,
        rootZoneIds: nextRootZoneIds,
        zonesById: nextZonesById,
    };
}
export function addPath(model, zoneId, input) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    if (zone.pathsById[input.id])
        return model;
    const newPath = {
        id: input.id,
        key: input.key,
        name: input.name,
        target: input.target,
        rule: input.rule,
        layout: input.layout,
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
export function updatePath(model, zoneId, pathId, patch) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    const path = zone.pathsById[pathId];
    if (!path)
        return model;
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
                    },
                },
            },
        },
    };
}
export function updatePathLayout(model, zoneId, pathId, patch) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    const path = zone.pathsById[pathId];
    if (!path)
        return model;
    return updatePath(model, zoneId, pathId, {
        layout: {
            ...(path.layout ?? { x: 0, y: 0 }),
            ...patch,
        },
    });
}
export function removePath(model, zoneId, pathId) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    if (!zone.pathsById[pathId])
        return model;
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
export function setPathTarget(model, zoneId, pathId, target) {
    return updatePath(model, zoneId, pathId, { target });
}
export function reorderPaths(model, zoneId, nextPathIds) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return model;
    const sameLength = zone.pathIds.length === nextPathIds.length;
    const allExist = nextPathIds.every((id) => Boolean(zone.pathsById[id]));
    if (!sameLength || !allExist)
        return model;
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
