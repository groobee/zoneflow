import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";

export const sampleDagUniverse: UniverseModel = {
  version: "2.0.0",
  universeId: "dag-flow",
  rootZoneIds: ["source", "branchA", "branchB", "merge", "sink"],
  meta: {
    name: "DAG",
    description:
      "canConnectPath 가 사이클 연결을 모두 차단하는 샘플. sink → source 처럼 사이클이 생기는 연결은 hover 단계에서 후보에서 제외됨.",
  },
  zonesById: {
    source: {
      id: "source",
      parentZoneId: null,
      name: "Source",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "source", payload: {} },
      pathIds: ["path-source-a", "path-source-b"],
      pathsById: {
        "path-source-a": {
          id: "path-source-a",
          key: "to_a",
          name: "→ A",
          target: { universeId: "dag-flow", zoneId: "branchA" },
          rule: null,
        },
        "path-source-b": {
          id: "path-source-b",
          key: "to_b",
          name: "→ B",
          target: { universeId: "dag-flow", zoneId: "branchB" },
          rule: null,
        },
      },
    },
    branchA: {
      id: "branchA",
      parentZoneId: null,
      name: "Branch A",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "branchA", payload: {} },
      pathIds: ["path-a-merge"],
      pathsById: {
        "path-a-merge": {
          id: "path-a-merge",
          key: "to_merge",
          name: "→ Merge",
          target: { universeId: "dag-flow", zoneId: "merge" },
          rule: null,
        },
      },
    },
    branchB: {
      id: "branchB",
      parentZoneId: null,
      name: "Branch B",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "branchB", payload: {} },
      pathIds: ["path-b-merge"],
      pathsById: {
        "path-b-merge": {
          id: "path-b-merge",
          key: "to_merge",
          name: "→ Merge",
          target: { universeId: "dag-flow", zoneId: "merge" },
          rule: null,
        },
      },
    },
    merge: {
      id: "merge",
      parentZoneId: null,
      name: "Merge",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "merge", payload: {} },
      pathIds: ["path-merge-sink"],
      pathsById: {
        "path-merge-sink": {
          id: "path-merge-sink",
          key: "to_sink",
          name: "→ Sink",
          target: { universeId: "dag-flow", zoneId: "sink" },
          rule: null,
        },
      },
    },
    sink: {
      id: "sink",
      parentZoneId: null,
      name: "Sink",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "sink", payload: {} },
      pathIds: [],
      pathsById: {},
    },
  },
};

export const sampleDagUniverseLayout: UniverseLayoutModel = {
  version: "2.0.0",
  universeId: "dag-flow",
  zoneLayoutsById: {
    source: {
      x: 80,
      y: 240,
      width: 180,
      height: 90,
      anchors: {
        inlet: { point: { x: 0, y: 45 } },
        outlet: { point: { x: 180, y: 45 } },
      },
    },
    branchA: {
      x: 380,
      y: 120,
      width: 180,
      height: 90,
      anchors: {
        inlet: { point: { x: 0, y: 45 } },
        outlet: { point: { x: 180, y: 45 } },
      },
    },
    branchB: {
      x: 380,
      y: 360,
      width: 180,
      height: 90,
      anchors: {
        inlet: { point: { x: 0, y: 45 } },
        outlet: { point: { x: 180, y: 45 } },
      },
    },
    merge: {
      x: 680,
      y: 240,
      width: 180,
      height: 90,
      anchors: {
        inlet: { point: { x: 0, y: 45 } },
        outlet: { point: { x: 180, y: 45 } },
      },
    },
    sink: {
      x: 980,
      y: 240,
      width: 180,
      height: 90,
      anchors: {
        inlet: { point: { x: 0, y: 45 } },
        outlet: { point: { x: 180, y: 45 } },
      },
    },
  },
  pathLayoutsById: {
    "path-source-a": { routeOffset: { x: 12, y: -60 } },
    "path-source-b": { routeOffset: { x: 12, y: 60 } },
    "path-a-merge": { routeOffset: { x: 12, y: 60 } },
    "path-b-merge": { routeOffset: { x: 12, y: -60 } },
    "path-merge-sink": { routeOffset: { x: 12, y: 0 } },
  },
};
