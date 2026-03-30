import type { UniverseModel, Path, Zone, ZoneId } from "./types";
export declare function resolvePathTarget(model: UniverseModel, path: Path): Zone | undefined;
export declare function getOutgoingZones(model: UniverseModel, zoneId: ZoneId): Zone[];
export declare function getIncomingPaths(model: UniverseModel, zoneId: ZoneId): Path[];
