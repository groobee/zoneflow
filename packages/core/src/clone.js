import { getZone } from "./lookup";
import { remapSubtreeIds } from "./remap";
export function cloneZoneSubtree(model, sourceRootZoneId, options = {}) {
    const sourceRootZone = getZone(model, sourceRootZoneId);
    if (!sourceRootZone) {
        return {
            model,
            clonedRootZoneId: sourceRootZoneId,
            zoneIdMap: {},
        };
    }
    const { nextParentZoneId = sourceRootZone.parentZoneId, rename = (name) => `${name} Copy`, } = options;
    const remapped = remapSubtreeIds(model, sourceRootZoneId);
    const clonedRootZoneId = remapped.rootZoneIds[0];
    const nextZonesById = {
        ...model.zonesById,
        ...remapped.zonesById,
    };
    // 복제 루트의 parent 재설정 + 이름 변경
    nextZonesById[clonedRootZoneId] = {
        ...nextZonesById[clonedRootZoneId],
        parentZoneId: nextParentZoneId,
        name: rename(sourceRootZone.name),
    };
    let nextRootZoneIds = [...model.rootZoneIds];
    // 루트에 붙이는 경우
    if (nextParentZoneId === null) {
        nextRootZoneIds.push(clonedRootZoneId);
    }
    else {
        const parent = nextZonesById[nextParentZoneId];
        if (parent) {
            nextZonesById[nextParentZoneId] = {
                ...parent,
                childZoneIds: [...parent.childZoneIds, clonedRootZoneId],
            };
        }
    }
    return {
        model: {
            ...model,
            rootZoneIds: nextRootZoneIds,
            zonesById: nextZonesById,
        },
        clonedRootZoneId,
        zoneIdMap: remapped.zoneIdMap,
    };
}
export function duplicateZoneSubtree(model, sourceRootZoneId, options = {}) {
    return cloneZoneSubtree(model, sourceRootZoneId, {
        rename: options.rename ?? ((name) => `${name} Copy`),
        nextParentZoneId: options.nextParentZoneId,
    });
}
