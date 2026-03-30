export function isRootZone(model, zoneId) {
    return model.rootZoneIds.includes(zoneId);
}
export function getAncestorZoneIds(model, zoneId) {
    const result = [];
    let current = model.zonesById[zoneId];
    while (current?.parentZoneId) {
        result.push(current.parentZoneId);
        current = model.zonesById[current.parentZoneId];
    }
    return result;
}
export function getZoneDepth(model, zoneId) {
    return getAncestorZoneIds(model, zoneId).length;
}
export function isDescendantZone(model, parentZoneId, childZoneId) {
    return getAncestorZoneIds(model, childZoneId).includes(parentZoneId);
}
