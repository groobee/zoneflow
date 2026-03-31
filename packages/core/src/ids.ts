import type { UniverseId, ZoneId, PathId } from "./types";
import { v7 as uuidv7 } from "uuid";

export function createUniverseId(): UniverseId {
  return `universe_${uuidv7()}`;
}

export function createZoneId(): ZoneId {
  return `zone_${uuidv7()}`;
}

export function createPathId(): PathId {
  return `path_${uuidv7()}`;
}
