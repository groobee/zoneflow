import { v7 as uuidv7 } from "uuid";
export function createZoneId() {
    return `zone_${uuidv7()}`;
}
export function createPathId() {
    return `path_${uuidv7()}`;
}
