import type { UniverseModel, Zone } from "./types";
import { getEffectiveZoneSlot, zoneDeclaresSlots } from "./zoneCapabilities";

function getParentZone(model: UniverseModel, zone: Zone): Zone | undefined {
  return zone.parentZoneId ? model.zonesById[zone.parentZoneId] : undefined;
}

export function validateUniverseModel(model: UniverseModel): string[] {
  const errors: string[] = [];

  for (const rootId of model.rootZoneIds) {
    if (!model.zonesById[rootId]) {
      errors.push(`Root zone not found: ${rootId}`);
    }
  }

  for (const zone of Object.values(model.zonesById)) {
    if (zone.parentZoneId && !model.zonesById[zone.parentZoneId]) {
      errors.push(
        `Zone "${zone.id}" has invalid parentZoneId "${zone.parentZoneId}"`
      );
    }

    if ((zone.slots?.length ?? 0) > 0) {
      if (zone.zoneType !== "container") {
        errors.push(
          `Zone "${zone.id}" declares slots but is not a container (zoneType "${zone.zoneType}")`
        );
      }

      const seenSlotKeys = new Set<string>();
      for (const slot of zone.slots ?? []) {
        if (!slot.key) {
          errors.push(`Zone "${zone.id}" has a slot with an empty key`);
          continue;
        }
        if (seenSlotKeys.has(slot.key)) {
          errors.push(`Zone "${zone.id}" has duplicate slot key "${slot.key}"`);
        }
        seenSlotKeys.add(slot.key);
      }
    }

    if (zone.slotKey) {
      const parent = getParentZone(model, zone);
      if (!parent || !zoneDeclaresSlots(parent)) {
        errors.push(
          `Zone "${zone.id}" has slotKey "${zone.slotKey}" but its parent declares no slots`
        );
      } else if (!parent.slots?.some((slot) => slot.key === zone.slotKey)) {
        errors.push(
          `Zone "${zone.id}" has slotKey "${zone.slotKey}" not declared by parent "${parent.id}"`
        );
      }
    }

    for (const childId of zone.childZoneIds) {
      if (!model.zonesById[childId]) {
        errors.push(
          `Zone "${zone.id}" has invalid childZoneId "${childId}"`
        );
      }
    }

    const seenPathIds = new Set<string>();
    const seenPathKeys = new Set<string>();

    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];

      if (!path) {
        errors.push(
          `Zone "${zone.id}" pathIds includes missing path "${pathId}"`
        );
        continue;
      }

      if (seenPathIds.has(path.id)) {
        errors.push(`Zone "${zone.id}" has duplicate path id "${path.id}"`);
      }
      seenPathIds.add(path.id);

      if (seenPathKeys.has(path.key)) {
        errors.push(`Zone "${zone.id}" has duplicate path key "${path.key}"`);
      }
      seenPathKeys.add(path.key);

      if (path.target) {
        if (path.target.universeId === model.universeId) {
          const targetZone = model.zonesById[path.target.zoneId];
          if (!targetZone) {
            errors.push(
              `Path "${path.id}" in zone "${zone.id}" points to missing zone "${path.target.zoneId}"`
            );
          } else if (
            getEffectiveZoneSlot(targetZone, getParentZone(model, targetZone))
              ?.effects?.childInput === "disabled"
          ) {
            errors.push(
              `Path "${path.id}" in zone "${zone.id}" targets zone "${targetZone.id}" docked in slot "${targetZone.slotKey}" whose childInput is disabled`
            );
          }
        }
      }
    }

    for (const path of Object.values(zone.pathsById)) {
      if (!zone.pathIds.includes(path.id)) {
        errors.push(
          `Zone "${zone.id}" has path "${path.id}" in pathsById but not in pathIds`
        );
      }
    }
  }

  return errors;
}