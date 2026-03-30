import type { UniverseModel } from "./types";
import { getPaths } from "./lookup";

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
          if (!model.zonesById[path.target.zoneId]) {
            errors.push(
              `Path "${path.id}" in zone "${zone.id}" points to missing zone "${path.target.zoneId}"`
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