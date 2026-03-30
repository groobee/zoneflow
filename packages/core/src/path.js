import { getPaths } from "./lookup";
export function resolvePathTarget(model, path) {
    if (!path.target)
        return undefined;
    if (path.target.universeId !== model.universeId)
        return undefined;
    return model.zonesById[path.target.zoneId];
}
export function getOutgoingZones(model, zoneId) {
    const zone = model.zonesById[zoneId];
    if (!zone)
        return [];
    return getPaths(zone)
        .map((path) => resolvePathTarget(model, path))
        .filter((target) => Boolean(target));
}
export function getIncomingPaths(model, zoneId) {
    const result = [];
    for (const zone of Object.values(model.zonesById)) {
        for (const path of getPaths(zone)) {
            if (path.target &&
                path.target.universeId === model.universeId &&
                path.target.zoneId === zoneId) {
                result.push(path);
            }
        }
    }
    return result;
}
