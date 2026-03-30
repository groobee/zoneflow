import { createZoneId } from "./ids";
export function canWrapZones(model, zoneIds) {
    if (zoneIds.length === 0) {
        return { ok: false, reason: "EMPTY_SELECTION" };
    }
    const uniqueZoneIds = new Set(zoneIds);
    if (uniqueZoneIds.size !== zoneIds.length) {
        return { ok: false, reason: "DUPLICATE_IDS" };
    }
    const zones = zoneIds.map((zoneId) => model.zonesById[zoneId]);
    if (zones.some((zone) => !zone)) {
        return { ok: false, reason: "MISSING_ZONE" };
    }
    const firstParentZoneId = zones[0].parentZoneId;
    const sameParent = zones.every((zone) => zone.parentZoneId === firstParentZoneId);
    if (!sameParent) {
        return { ok: false, reason: "DIFFERENT_PARENTS" };
    }
    return { ok: true };
}
export function computeWrapperLayoutFromChildren(model, zoneIds, options = {}) {
    const { padding = 32, minWidth = 160, minHeight = 120 } = options;
    const zones = zoneIds
        .map((zoneId) => model.zonesById[zoneId])
        .filter((zone) => Boolean(zone));
    if (zones.length === 0)
        return undefined;
    const zonesWithLayout = zones.filter((zone) => Boolean(zone.layout));
    if (zonesWithLayout.length === 0)
        return undefined;
    const minX = Math.min(...zonesWithLayout.map((zone) => zone.layout.x));
    const minY = Math.min(...zonesWithLayout.map((zone) => zone.layout.y));
    const maxX = Math.max(...zonesWithLayout.map((zone) => zone.layout.x + (zone.layout.width ?? 0)));
    const maxY = Math.max(...zonesWithLayout.map((zone) => zone.layout.y + (zone.layout.height ?? 0)));
    const zValues = zonesWithLayout
        .map((zone) => zone.layout?.z)
        .filter((z) => typeof z === "number");
    const layout = {
        x: minX - padding,
        y: minY - padding,
        width: Math.max(maxX - minX + padding * 2, minWidth),
        height: Math.max(maxY - minY + padding * 2, minHeight),
    };
    if (zValues.length > 0) {
        layout.z = Math.min(...zValues);
    }
    return layout;
}
export function wrapZonesWithNewParent(model, input) {
    const { zoneIds, name, zoneType = "container", action, layout, meta, newZoneId = createZoneId(), } = input;
    const check = canWrapZones(model, zoneIds);
    if (!check.ok) {
        return {
            model,
            wrapperZoneId: newZoneId,
        };
    }
    const uniqueZoneIds = [...new Set(zoneIds)];
    const firstZone = model.zonesById[uniqueZoneIds[0]];
    const parentZoneId = firstZone.parentZoneId;
    if (model.zonesById[newZoneId]) {
        return {
            model,
            wrapperZoneId: newZoneId,
        };
    }
    const wrapperZone = {
        id: newZoneId,
        parentZoneId,
        name,
        zoneType,
        childZoneIds: [...uniqueZoneIds],
        pathIds: [],
        pathsById: {},
        action,
        layout: layout ?? computeWrapperLayoutFromChildren(model, uniqueZoneIds),
        meta,
    };
    let nextZonesById = {
        ...model.zonesById,
        [newZoneId]: wrapperZone,
    };
    for (const zoneId of uniqueZoneIds) {
        const zone = nextZonesById[zoneId];
        if (!zone)
            continue;
        nextZonesById[zoneId] = {
            ...zone,
            parentZoneId: newZoneId,
        };
    }
    let nextRootZoneIds = [...model.rootZoneIds];
    if (parentZoneId !== null) {
        const parent = nextZonesById[parentZoneId];
        if (parent) {
            const selectedSet = new Set(uniqueZoneIds);
            const originalChildren = parent.childZoneIds;
            const firstSelectedIndex = originalChildren.findIndex((id) => selectedSet.has(id));
            const remainingChildren = originalChildren.filter((id) => !selectedSet.has(id));
            const insertIndex = firstSelectedIndex >= 0 ? firstSelectedIndex : remainingChildren.length;
            const nextChildZoneIds = [
                ...remainingChildren.slice(0, insertIndex),
                newZoneId,
                ...remainingChildren.slice(insertIndex),
            ];
            nextZonesById[parentZoneId] = {
                ...parent,
                childZoneIds: nextChildZoneIds,
            };
        }
    }
    else {
        const selectedSet = new Set(uniqueZoneIds);
        const originalRoots = model.rootZoneIds;
        const firstSelectedIndex = originalRoots.findIndex((id) => selectedSet.has(id));
        const remainingRoots = originalRoots.filter((id) => !selectedSet.has(id));
        const insertIndex = firstSelectedIndex >= 0 ? firstSelectedIndex : remainingRoots.length;
        nextRootZoneIds = [
            ...remainingRoots.slice(0, insertIndex),
            newZoneId,
            ...remainingRoots.slice(insertIndex),
        ];
    }
    return {
        model: {
            ...model,
            rootZoneIds: nextRootZoneIds,
            zonesById: nextZonesById,
        },
        wrapperZoneId: newZoneId,
    };
}
