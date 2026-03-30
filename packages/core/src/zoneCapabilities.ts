import type { Zone } from "./types";

export function isZoneInputEnabled(
  zone: Pick<Zone, "inputDisabled"> | null | undefined
): boolean {
  return !zone?.inputDisabled;
}

export function isZoneOutputEnabled(
  zone: Pick<Zone, "outputDisabled"> | null | undefined
): boolean {
  return !zone?.outputDisabled;
}
