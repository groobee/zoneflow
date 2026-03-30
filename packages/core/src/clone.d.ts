import type { UniverseModel, ZoneId } from "./types";
export type CloneZoneSubtreeOptions = {
    nextParentZoneId?: ZoneId | null;
    rename?: (originalName: string) => string;
};
export type CloneZoneSubtreeResult = {
    model: UniverseModel;
    clonedRootZoneId: ZoneId;
    zoneIdMap: Record<ZoneId, ZoneId>;
};
export declare function cloneZoneSubtree(model: UniverseModel, sourceRootZoneId: ZoneId, options?: CloneZoneSubtreeOptions): CloneZoneSubtreeResult;
export type DuplicateZoneSubtreeOptions = CloneZoneSubtreeOptions;
export type DuplicateZoneSubtreeResult = CloneZoneSubtreeResult;
export declare function duplicateZoneSubtree(model: UniverseModel, sourceRootZoneId: ZoneId, options?: DuplicateZoneSubtreeOptions): DuplicateZoneSubtreeResult;
