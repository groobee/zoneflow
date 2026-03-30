import type { Layout, UniverseModel, Zone, ZoneId } from "./types";
export declare function walkZonesDepthFirst(model: UniverseModel, zoneId: ZoneId, visit: (zone: Zone) => void): void;
export declare function flattenSubtree(model: UniverseModel, zoneId: ZoneId): Zone[];
export declare function computeAutoLayoutForZoneTree(model: UniverseModel, zoneId: ZoneId, options?: {
    paddingX?: number;
    paddingY?: number;
    verticalGap?: number;
    defaultWidth?: number;
    defaultHeight?: number;
}): Layout | undefined;
