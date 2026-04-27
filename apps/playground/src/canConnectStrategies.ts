import type { PathId, UniverseModel, ZoneId } from "@zoneflow/core";
import type { CanConnectPath } from "@zoneflow/react";

export const noSelfLoopCanConnectPath: CanConnectPath = ({
  sourceZoneId,
  targetZoneId,
}) => sourceZoneId !== targetZoneId;

function canReachZone(
  model: UniverseModel,
  fromZoneId: ZoneId,
  toZoneId: ZoneId,
  excludePathId?: PathId
): boolean {
  const visited = new Set<ZoneId>();
  const queue: ZoneId[] = [fromZoneId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toZoneId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const zone = model.zonesById[current];
    if (!zone) continue;

    for (const pathId of zone.pathIds) {
      if (excludePathId && pathId === excludePathId) continue;
      const nextZoneId = zone.pathsById[pathId]?.target?.zoneId;
      if (nextZoneId) {
        queue.push(nextZoneId);
      }
    }
  }

  return false;
}

export const dagCanConnectPath: CanConnectPath = ({
  mode,
  sourceZoneId,
  targetZoneId,
  model,
  pathId,
}) => {
  if (sourceZoneId === targetZoneId) return false;
  const excludePathId = mode === "retarget" ? pathId : undefined;
  return !canReachZone(model, targetZoneId, sourceZoneId, excludePathId);
};
