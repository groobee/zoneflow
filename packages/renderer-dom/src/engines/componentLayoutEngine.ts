import type { ComponentLayoutEngine } from "../types";

export const defaultComponentLayoutEngine: ComponentLayoutEngine = {
  compute(input) {
    const { graphLayout } = input;

    // TODO:
    // zone density에 따라 title/type/badge/footer slot 계산
    // path density에 따라 label/rule/target/body slot 계산

    return {
      zonesById: Object.fromEntries(
        Object.keys(graphLayout.zonesById).map((zoneId) => [
          zoneId,
          { zoneId, slots: {} },
        ])
      ),
      pathsById: Object.fromEntries(
        Object.keys(graphLayout.pathsById).map((pathId) => [
          pathId,
          { pathId, slots: {} },
        ])
      ),
    };
  },
};