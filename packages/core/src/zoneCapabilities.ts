import type { Zone, ZoneSlotDef } from "./types.js";

export function canZoneContainChildren(
  zone: Pick<Zone, "zoneType"> | null | undefined
): boolean {
  return zone?.zoneType === "container";
}

/** Container that declares docking slots (see {@link Zone.slots}). */
export function zoneDeclaresSlots(
  zone: Pick<Zone, "zoneType" | "slots"> | null | undefined
): boolean {
  return (zone?.slots?.length ?? 0) > 0 && canZoneContainChildren(zone);
}

/**
 * The slot definition a child zone is docked into: the child's `slotKey`
 * resolved against its parent's declared `slots`. Undefined when not docked,
 * the parent is missing, or the key is not declared (stale key).
 */
export function getEffectiveZoneSlot(
  zone: Pick<Zone, "slotKey"> | null | undefined,
  parent: Pick<Zone, "zoneType" | "slots"> | null | undefined
): ZoneSlotDef | undefined {
  if (!zone?.slotKey || !zoneDeclaresSlots(parent)) return undefined;
  return parent?.slots?.find((slot) => slot.key === zone.slotKey);
}

/**
 * Input capability. Pass the zone's parent when available — a child docked
 * into a slot with `effects.childInput: "disabled"` derives to false, the
 * single source of truth that hides the inlet anchor, excludes the zone from
 * connection drop targets, and fails validation on incoming paths. Without
 * the parent argument only the zone's own `inputDisabled` is considered.
 */
export function isZoneInputEnabled(
  zone: Pick<Zone, "inputDisabled" | "slotKey"> | null | undefined,
  parent?: Pick<Zone, "zoneType" | "slots"> | null
): boolean {
  if (zone?.inputDisabled) return false;
  return getEffectiveZoneSlot(zone, parent)?.effects?.childInput !== "disabled";
}

export function isZoneOutputEnabled(
  zone: Pick<Zone, "outputDisabled"> | null | undefined
): boolean {
  return !zone?.outputDisabled;
}
