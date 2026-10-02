import type { UniverseModel, Zone } from "./types.js";
import { getEffectiveZoneSlot, zoneDeclaresSlots } from "./zoneCapabilities.js";

// Own-property lookup: ids such as "constructor" must not resolve to
// Object.prototype members.
function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function getParentZone(model: UniverseModel, zone: Zone): Zone | undefined {
  return zone.parentZoneId && hasOwn(model.zonesById, zone.parentZoneId)
    ? model.zonesById[zone.parentZoneId]
    : undefined;
}

export function validateUniverseModel(model: UniverseModel): string[] {
  const errors: string[] = [];
  const hasZone = (zoneId: string) => hasOwn(model.zonesById, zoneId);

  const seenRootIds = new Set<string>();
  for (const rootId of model.rootZoneIds) {
    if (!hasZone(rootId)) {
      errors.push(`Root zone not found: ${rootId}`);
    } else if (model.zonesById[rootId].parentZoneId) {
      errors.push(
        `Root zone "${rootId}" has parentZoneId "${model.zonesById[rootId].parentZoneId}"`
      );
    }
    if (seenRootIds.has(rootId)) {
      errors.push(`Root zone "${rootId}" is listed more than once`);
    }
    seenRootIds.add(rootId);
  }

  // Path ids are global: layouts and lookups key on the id alone.
  const pathOwnerById = new Map<string, string>();

  for (const [zoneKey, zone] of Object.entries(model.zonesById)) {
    if (zone.id !== zoneKey) {
      errors.push(`Zone keyed "${zoneKey}" has mismatched id "${zone.id}"`);
    }

    if (zone.parentZoneId) {
      const parent = getParentZone(model, zone);
      if (!parent) {
        errors.push(
          `Zone "${zone.id}" has invalid parentZoneId "${zone.parentZoneId}"`
        );
      } else if (!parent.childZoneIds.includes(zone.id)) {
        errors.push(
          `Zone "${zone.id}" is not listed in childZoneIds of its parent "${parent.id}"`
        );
      }
    } else if (!seenRootIds.has(zone.id)) {
      errors.push(
        `Zone "${zone.id}" has no parent but is not listed in rootZoneIds`
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
      if (!hasZone(childId)) {
        errors.push(
          `Zone "${zone.id}" has invalid childZoneId "${childId}"`
        );
      } else if (model.zonesById[childId].parentZoneId !== zone.id) {
        errors.push(
          `Zone "${zone.id}" lists child "${childId}" whose parentZoneId is "${model.zonesById[childId].parentZoneId}"`
        );
      }
    }

    const seenPathIds = new Set<string>();
    const seenPathKeys = new Set<string>();

    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];

      if (!path || !hasOwn(zone.pathsById, pathId)) {
        errors.push(
          `Zone "${zone.id}" pathIds includes missing path "${pathId}"`
        );
        continue;
      }

      if (path.id !== pathId) {
        errors.push(
          `Zone "${zone.id}" path keyed "${pathId}" has mismatched id "${path.id}"`
        );
      }

      if (seenPathIds.has(path.id)) {
        errors.push(`Zone "${zone.id}" has duplicate path id "${path.id}"`);
      } else {
        const otherOwner = pathOwnerById.get(path.id);
        if (otherOwner !== undefined) {
          errors.push(
            `Path id "${path.id}" is used by both zone "${otherOwner}" and zone "${zone.id}"`
          );
        } else {
          pathOwnerById.set(path.id, zone.id);
        }
      }
      seenPathIds.add(path.id);

      if (seenPathKeys.has(path.key)) {
        errors.push(`Zone "${zone.id}" has duplicate path key "${path.key}"`);
      }
      seenPathKeys.add(path.key);

      if (path.target) {
        if (path.target.universeId === model.universeId) {
          const targetZone = hasZone(path.target.zoneId)
            ? model.zonesById[path.target.zoneId]
            : undefined;
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

    for (const [pathKey, path] of Object.entries(zone.pathsById)) {
      if (!zone.pathIds.includes(pathKey)) {
        errors.push(
          `Zone "${zone.id}" has path "${path.id}" in pathsById but not in pathIds`
        );
      }
    }
  }

  // Every zone must hang off a root: a parent cycle (A → B → A) passes the
  // per-zone checks above yet is unreachable and loops tree walks.
  const reachable = new Set<string>();
  const stack = model.rootZoneIds.filter(hasZone);
  while (stack.length > 0) {
    const zoneId = stack.pop()!;
    if (reachable.has(zoneId)) continue;
    reachable.add(zoneId);
    for (const childId of model.zonesById[zoneId].childZoneIds) {
      if (hasZone(childId)) stack.push(childId);
    }
  }
  for (const zone of Object.values(model.zonesById)) {
    if (zone.parentZoneId && !reachable.has(zone.id)) {
      errors.push(
        `Zone "${zone.id}" is not reachable from any root zone (parent cycle or detached subtree)`
      );
    }
  }

  return errors;
}