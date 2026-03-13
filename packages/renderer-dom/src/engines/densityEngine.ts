import type { DensityEngine } from "../types";

export const defaultDensityEngine: DensityEngine = {
  compute(input) {
    const { graphLayout } = input;

    // TODO:
    // zone rect size * camera.zoom 기준 density 계산
    // path는 chip/full/edge-only 같은 표현레벨 결정

    return {
      zoneDensityById: Object.fromEntries(
        Object.keys(graphLayout.zonesById).map((zoneId) => [zoneId, "detail"])
      ),
      pathDensityById: Object.fromEntries(
        Object.keys(graphLayout.pathsById).map((pathId) => [pathId, "full"])
      ),
    };
  },
};