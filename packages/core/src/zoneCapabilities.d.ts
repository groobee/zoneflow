import type { Zone } from "./types";
export declare function canZoneContainChildren(zone: Pick<Zone, "zoneType"> | null | undefined): boolean;
export declare function isZoneInputEnabled(zone: Pick<Zone, "inputDisabled"> | null | undefined): boolean;
export declare function isZoneOutputEnabled(zone: Pick<Zone, "outputDisabled"> | null | undefined): boolean;
