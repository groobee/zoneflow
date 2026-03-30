import type { UniverseModel, ZoneId } from "./types";
export declare function isRootZone(model: UniverseModel, zoneId: ZoneId): boolean;
export declare function getAncestorZoneIds(model: UniverseModel, zoneId: ZoneId): ZoneId[];
export declare function getZoneDepth(model: UniverseModel, zoneId: ZoneId): number;
export declare function isDescendantZone(model: UniverseModel, parentZoneId: ZoneId, childZoneId: ZoneId): boolean;
