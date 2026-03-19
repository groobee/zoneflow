import type {
  PathVisibility,
  Rect,
  VisibilityEmphasis,
  VisibilityEngine,
  ZoneVisibility,
} from "../types";

function intersects(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function containsFully(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function resolveZoneEmphasis(
  isVisible: boolean,
  isPartial: boolean
): VisibilityEmphasis {
  if (!isVisible) return "hidden";
  if (isPartial) return "dim";
  return "strong";
}

function resolvePathEmphasis(
  isVisible: boolean,
  isPartial: boolean
): VisibilityEmphasis {
  if (!isVisible) return "hidden";
  if (isPartial) return "dim";
  return "normal";
}

export const defaultVisibilityEngine: VisibilityEngine = {
  compute(input) {
    const { base, graphLayout, density } = input;
    const worldViewport = base.viewportInfo.world;

    const zoneVisibilityById: Record<string, ZoneVisibility> = {};
    const pathVisibilityById: Record<string, PathVisibility> = {};

    Object.values(graphLayout.zonesById).forEach((zone) => {
      const isVisible = intersects(worldViewport, zone.rect);
      const isPartial =
        isVisible && !containsFully(worldViewport, zone.rect);
      const emphasis = resolveZoneEmphasis(isVisible, isPartial);

      zoneVisibilityById[zone.zoneId] = {
        isVisible,
        isPartial,
        shouldRenderBody: isVisible,
        shouldRenderContent: isVisible && zone.rect.width > 0 && zone.rect.height > 0,
        emphasis,
      };
    });

    Object.values(graphLayout.pathsById).forEach((path) => {
      const rect = path.rect;

      if (!rect) {
        pathVisibilityById[path.pathId] = {
          isVisible: false,
          isPartial: false,
          shouldRenderNode: false,
          shouldRenderEdge: true,
          shouldRenderLabel: false,
          emphasis: "hidden",
        };
        return;
      }

      const isVisible = intersects(worldViewport, rect);
      const isPartial =
        isVisible && !containsFully(worldViewport, rect);
      const emphasis = resolvePathEmphasis(isVisible, isPartial);
      const densityMode = density.pathDensityById[path.pathId];

      pathVisibilityById[path.pathId] = {
        isVisible,
        isPartial,
        shouldRenderNode: isVisible && densityMode !== "edge-only",
        shouldRenderEdge: true,
        shouldRenderLabel: isVisible && densityMode !== "edge-only",
        emphasis,
      };
    });

    return {
      zoneVisibilityById,
      pathVisibilityById,
    };
  },
};