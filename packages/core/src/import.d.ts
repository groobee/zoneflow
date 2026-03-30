import type { UniverseModel, ZoneId } from "./types";
export type ExternalTargetPolicy = "preserve" | "drop" | "mark-unresolved";
export type ImportZoneSubtreeOptions = {
    nextParentZoneId?: ZoneId | null;
    rename?: (originalName: string) => string;
    externalTargetPolicy?: ExternalTargetPolicy;
};
export type ImportZoneSubtreeResult = {
    model: UniverseModel;
    importedRootZoneId: ZoneId;
    zoneIdMap: Record<ZoneId, ZoneId>;
};
export declare function importZoneSubtree(targetModel: UniverseModel, sourceModel: UniverseModel, sourceRootZoneId: ZoneId, options?: ImportZoneSubtreeOptions): ImportZoneSubtreeResult;
