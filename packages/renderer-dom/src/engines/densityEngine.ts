import type {
  DensityEngine,
  DensityLevel,
  PathVisualMode,
} from "../types";

function getZoneDensity(
  size: number,
  thresholds: { detail: number; near: number; mid: number }
): DensityLevel {
  if (size >= thresholds.detail) return "detail";
  if (size >= thresholds.near) return "near";
  if (size >= thresholds.mid) return "mid";
  return "far";
}

function getPathDensity(
  size: number,
  thresholds: { full: number; chip: number }
): PathVisualMode {
  if (size >= thresholds.full) return "full";
  if (size >= thresholds.chip) return "chip";
  return "edge-only";
}

export const defaultDensityEngine: DensityEngine = {
  compute(input) {
    const { graphLayout, base } = input;
    const zoom = base.camera.zoom;
    const theme = base.theme;

    const zoneDensityById: Record<string, DensityLevel> = {};
    const pathDensityById: Record<string, PathVisualMode> = {};

    const zoneThresholds = theme.density.zone;
    const pathThresholds = theme.density.path;

    // --- zone ---
    Object.values(graphLayout.zonesById).forEach((zone) => {
      const rect = zone.rect;

      const size = Math.max(rect.width, rect.height) * zoom;

      zoneDensityById[zone.zoneId] = getZoneDensity(
        size,
        zoneThresholds
      );
    });

    // --- path ---
    Object.values(graphLayout.pathsById).forEach((path) => {
      const rect = path.rect;

      if (!rect) {
        pathDensityById[path.pathId] = "edge-only";
        return;
      }

      const size = Math.max(rect.width, rect.height) * zoom;

      pathDensityById[path.pathId] = getPathDensity(
        size,
        pathThresholds
      );
    });

    return {
      zoneDensityById,
      pathDensityById,
    };
  },
};
