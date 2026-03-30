export function getZone(model, zoneId) {
    return model.zonesById[zoneId];
}
export function getRootZones(model) {
    return model.rootZoneIds
        .map((id) => model.zonesById[id])
        .filter((zone) => Boolean(zone));
}
export function getChildZones(model, zoneId) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return [];
    return zone.childZoneIds
        .map((id) => model.zonesById[id])
        .filter((child) => Boolean(child));
}
export function getParentZone(model, zoneId) {
    const zone = model.zonesById[zoneId];
    if (!zone?.parentZoneId)
        return undefined;
    return model.zonesById[zone.parentZoneId];
}
export function getPath(zone, pathId) {
    return zone.pathsById[pathId];
}
export function getPaths(zone) {
    return zone.pathIds
        .map((id) => zone.pathsById[id])
        .filter((path) => Boolean(path));
}
export function getPathByKey(zone, key) {
    return getPaths(zone).find((path) => path.key === key);
}
