import type { UniverseModel, ZoneId } from "./types";
export type UnwrapZoneResult = {
    model: UniverseModel;
    unwrappedZoneId: ZoneId;
    movedChildZoneIds: ZoneId[];
};
export type CanUnwrapZoneResult = {
    ok: boolean;
    reason?: "MISSING_ZONE" | "HAS_NO_CHILDREN" | "MISSING_PARENT" | "ROOT_WITHOUT_CHILDREN";
};
export declare function canUnwrapZone(model: UniverseModel, zoneId: ZoneId): CanUnwrapZoneResult;
export declare function unwrapZone(model: UniverseModel, zoneId: ZoneId): UnwrapZoneResult;
