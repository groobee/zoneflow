import type { GraphLayoutEngine } from "../types";

export const defaultGraphLayoutEngine: GraphLayoutEngine = {
  compute(input) {
    const { model, layoutModel } = input;

    // TODO:
    // 1. zoneLayoutsById 기반으로 ZoneVisualNode 만들기
    // 2. pathLayoutsById 기반으로 PathVisualNode 만들기
    // 3. path source/target 기준 기본 edge 만들기

    return {
      zonesById: {},
      pathsById: {},
      edgesByPathId: {},
    };
  },
};