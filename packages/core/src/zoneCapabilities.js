export function canZoneContainChildren(zone) {
    return zone?.zoneType === "container";
}
export function isZoneInputEnabled(zone) {
    return !zone?.inputDisabled;
}
export function isZoneOutputEnabled(zone) {
    return !zone?.outputDisabled;
}
