import {
  createUniverseLayoutModel,
  createZoneLayout,
  type UniverseLayoutModel,
  type UniverseModel,
} from "@zoneflow/core";

export const starterModel: UniverseModel = {
  version: "2.0.0",
  universeId: "starter-demo",
  meta: {
    name: "Starter Demo",
  },
  rootZoneIds: ["journey", "converted", "fallback"],
  zonesById: {
    journey: {
      id: "journey",
      parentZoneId: null,
      name: "Starter Journey",
      zoneType: "container",
      inputDisabled: true,
      childZoneIds: ["sendMessage", "waitWindow"],
      pathIds: ["journey-converted", "journey-fallback"],
      pathsById: {
        "journey-converted": {
          id: "journey-converted",
          key: "converted",
          name: "Converted",
          target: {
            universeId: "starter-demo",
            zoneId: "converted",
          },
          rule: {
            type: "event",
            payload: {
              eventName: "purchase",
            },
          },
        },
        "journey-fallback": {
          id: "journey-fallback",
          key: "fallback",
          name: "",
          target: {
            universeId: "starter-demo",
            zoneId: "fallback",
          },
          rule: null,
        },
      },
    },
    sendMessage: {
      id: "sendMessage",
      parentZoneId: "journey",
      name: "Send Message",
      zoneType: "action",
      childZoneIds: [],
      pathIds: ["sendMessage-next"],
      pathsById: {
        "sendMessage-next": {
          id: "sendMessage-next",
          key: "next",
          name: "Next",
          target: {
            universeId: "starter-demo",
            zoneId: "waitWindow",
          },
          rule: {
            type: "step",
            payload: {
              order: 1,
            },
          },
        },
      },
      action: {
        type: "sendEmail",
        payload: {
          templateId: "welcome",
        },
      },
    },
    waitWindow: {
      id: "waitWindow",
      parentZoneId: "journey",
      name: "Wait Window",
      zoneType: "action",
      childZoneIds: [],
      pathIds: [],
      pathsById: {},
      action: {
        type: "wait",
        payload: {
          seconds: 86400,
        },
      },
    },
    converted: {
      id: "converted",
      parentZoneId: null,
      name: "Converted",
      zoneType: "action",
      outputDisabled: true,
      childZoneIds: [],
      pathIds: [],
      pathsById: {},
      action: {
        type: "markCompleted",
      },
    },
    fallback: {
      id: "fallback",
      parentZoneId: null,
      name: "Follow-up",
      zoneType: "action",
      outputDisabled: true,
      childZoneIds: [],
      pathIds: [],
      pathsById: {},
      action: {
        type: "createTask",
      },
    },
  },
};

export const starterLayoutModel: UniverseLayoutModel = createUniverseLayoutModel({
  universeId: starterModel.universeId,
  version: starterModel.version,
  zoneLayoutsById: {
    journey: createZoneLayout({ x: 40, y: 56, width: 540, height: 260 }),
    sendMessage: createZoneLayout({ x: 36, y: 44, width: 180, height: 120 }),
    waitWindow: createZoneLayout({ x: 268, y: 44, width: 180, height: 120 }),
    converted: createZoneLayout({ x: 700, y: 72, width: 210, height: 112 }),
    fallback: createZoneLayout({ x: 700, y: 220, width: 210, height: 112 }),
  },
  pathLayoutsById: {
    "journey-converted": {
      routeOffset: { x: 0, y: -28 },
    },
    "journey-fallback": {
      routeOffset: { x: 0, y: 36 },
    },
    "sendMessage-next": {
      routeOffset: { x: 0, y: -8 },
    },
  },
});
