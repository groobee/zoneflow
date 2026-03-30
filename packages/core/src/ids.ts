import type { ZoneId, PathId } from "./types";
import { v7 as uuidv7 } from "uuid";

export function createZoneId(): ZoneId {
  return `zone_${uuidv7()}`;
}

export function createPathId(): PathId {
  return `path_${uuidv7()}`;
}