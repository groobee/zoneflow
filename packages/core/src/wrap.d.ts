import type { UniverseModel, ZoneAction, ZoneId, ZoneType, Layout } from "./types";
export type CanWrapZonesResult = {
    ok: boolean;
    reason?: "EMPTY_SELECTION" | "DUPLICATE_IDS" | "MISSING_ZONE" | "DIFFERENT_PARENTS";
};
export type WrapZonesWithNewParentInput = {
    zoneIds: ZoneId[];
    name: string;
    zoneType?: ZoneType;
    action?: ZoneAction;
    layout?: Layout;
    meta?: Record<string, unknown>;
    newZoneId?: ZoneId;
};
export type WrapZonesWithNewParentResult = {
    model: UniverseModel;
    wrapperZoneId: ZoneId;
};
export declare function canWrapZones(model: UniverseModel, zoneIds: ZoneId[]): CanWrapZonesResult;
export declare function computeWrapperLayoutFromChildren(model: UniverseModel, zoneIds: ZoneId[], options?: {
    padding?: number;
    minWidth?: number;
    minHeight?: number;
}): Layout | undefined;
export declare function wrapZonesWithNewParent(model: UniverseModel, input: WrapZonesWithNewParentInput): WrapZonesWithNewParentResult;
