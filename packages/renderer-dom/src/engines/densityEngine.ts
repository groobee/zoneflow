import type { DensityEngine } from "../types";

function getZoneDensity(
  size: number,
  thresholds: { detail: number; simple: number }
): "detail" | "simple" | "minimal" {
  if (size >= thresholds.detail) return "detail";
  if (size >= thresholds.simple) return "simple";
  return "minimal";
}

function getPathDensity(
  size: number,
  thresholds: { full: number; chip: number }
): "full" | "chip" | "edge-only" {
  if (size >= thresholds.full) return "full";
  if (size >= thresholds.chip) return "chip";
  return "edge-only";
}

export const defaultDensityEngine: DensityEngine = {
  compute(input) {
    const { graphLayout, base } = input;
    const zoom = base.camera.zoom;
    const theme = base.theme;

    const zoneDensityById: Record<string, any> = {};
    const pathDensityById: Record<string, any> = {};

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