import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";

export const sampleNoSelfLoopUniverse: UniverseModel = {
  version: "2.0.0",
  universeId: "no-self-loop",
  rootZoneIds: ["input", "validate", "retry", "dispatch"],
  meta: {
    name: "No Self-Loop",
    description:
      "canConnectPath 가 자기 자신으로의 연결만 막는 샘플. retry → input 처럼 다른 존으로 돌아가는 loop-back 은 허용.",
  },
  zonesById: {
    input: {
      id: "input",
      parentZoneId: null,
      name: "Receive Event",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "receiveEvent", payload: {} },
      pathIds: ["path-input-validate"],
      pathsById: {
        "path-input-validate": {
          id: "path-input-validate",
          key: "to_validate",
          name: "→ Validate",
          target: { universeId: "no-self-loop", zoneId: "validate" },
          rule: null,
        },
      },
    },
    validate: {
      id: "validate",
      parentZoneId: null,
      name: "Validate Payload",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "validatePayload", payload: {} },
      pathIds: ["path-validate-dispatch", "path-validate-retry"],
      pathsById: {
        "path-validate-dispatch": {
          id: "path-validate-dispatch",
          key: "valid",
          name: "Valid",
          target: { universeId: "no-self-loop", zoneId: "dispatch" },
          rule: null,
        },
        "path-validate-retry": {
          id: "path-validate-retry",
          key: "invalid",
          name: "Invalid",
          target: { universeId: "no-self-loop", zoneId: "retry" },
          rule: null,
        },
      },
    },
    retry: {
      id: "retry",
      parentZoneId: null,
      name: "Retry",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "retry", payload: {} },
      pathIds: ["path-retry-input"],
      pathsById: {
        "path-retry-input": {
          id: "path-retry-input",
          key: "back_to_input",
          name: "↺ Back to Input",
          target: { universeId: "no-self-loop", zoneId: "input" },
          rule: null,
        },
      },
    },
    dispatch: {
      id: "dispatch",
      parentZoneId: null,
      name: "Dispatch",
      zoneType: "action",
      childZoneIds: [],
      action: { type: "dispatch", payload: {} },
      pathIds: [],
      pathsById: {},
    },
  },
};

export const sampleNoSelfLoopUniverseLayout: UniverseLayoutModel = {
  version: "2.0.0",
  universeId: "no-self-loop",
  zoneLayoutsById: {
    input: {
      x: 80,
      y: 220,
      width: 200,
      height: 100,
      anchors: {
        inlet: { point: { x: 0, y: 50 } },
        outlet: { point: { x: 200, y: 50 } },
      },
    },
    validate: {
      x: 400,
      y: 220,
      width: 200,
      height: 100,
      anchors: {
        inlet: { point: { x: 0, y: 50 } },
        outlet: { point: { x: 200, y: 50 } },
      },
    },
    retry: {
      x: 400,
      y: 60,
      width: 200,
      height: 100,
      anchors: {
        inlet: { point: { x: 0, y: 50 } },
        outlet: { point: { x: 200, y: 50 } },
      },
    },
    dispatch: {
      x: 720,
      y: 220,
      width: 200,
      height: 100,
      anchors: {
        inlet: { point: { x: 0, y: 50 } },
        outlet: { point: { x: 200, y: 50 } },
      },
    },
  },
  pathLayoutsById: {
    "path-input-validate": { routeOffset: { x: 12, y: 0 } },
    "path-validate-dispatch": { routeOffset: { x: 12, y: 0 } },
    "path-validate-retry": { routeOffset: { x: 12, y: -90 } },
    "path-retry-input": { routeOffset: { x: -180, y: 90 } },
  },
};
