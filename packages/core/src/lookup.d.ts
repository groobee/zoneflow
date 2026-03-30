import type { UniverseModel, Zone, ZoneId, Path, PathId } from "./types";
export declare function getZone(model: UniverseModel, zoneId: ZoneId): Zone | undefined;
export declare function getRootZones(model: UniverseModel): Zone[];
export declare function getChildZones(model: UniverseModel, zoneId: ZoneId): Zone[];
export declare function getParentZone(model: UniverseModel, zoneId: ZoneId): Zone | undefined;
export declare function getPath(zone: Zone, pathId: PathId): Path | undefined;
export declare function getPaths(zone: Zone): Path[];
export declare function getPathByKey(zone: Zone, key: string): Path | undefined;
