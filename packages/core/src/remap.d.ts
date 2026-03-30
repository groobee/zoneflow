import type { UniverseModel, Zone, ZoneId, PathId } from "./types";
export type RemapResult = {
    zonesById: Record<ZoneId, Zone>;
    rootZoneIds: ZoneId[];
    zoneIdMap: Record<ZoneId, ZoneId>;
    pathIdMap: Record<PathId, PathId>;
};
export declare function remapSubtreeIds(model: UniverseModel, sourceRootZoneId: ZoneId): RemapResult;
