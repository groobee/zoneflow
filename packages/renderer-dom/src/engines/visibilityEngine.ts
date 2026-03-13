import type { VisibilityEngine } from "../types";

export const defaultVisibilityEngine: VisibilityEngine = {
  compute(input) {
    const { graphLayout } = input;

    // TODO:
    // viewport와 rect 교차 여부 계산
    // edge는 source/target/path node 기준으로 가시 여부 계산

    return {
      zoneVisibilityById: Object.fromEntries(
        Object.keys(graphLayout.zonesById).map((zoneId) => [
          zoneId,
          {
            isVisible: true,
            isPartial: false,
            shouldRenderBody: true,
            shouldRenderContent: true,
          },
        ])
      ),
      pathVisibilityById: Object.fromEntries(
        Object.keys(graphLayout.pathsById).map((pathId) => [
          pathId,
          {
            isVisible: true,
            shouldRenderNode: true,
            shouldRenderEdge: true,
            shouldRenderLabel: true,
          },
        ])
      ),
    };
  },
};