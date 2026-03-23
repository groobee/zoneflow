import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";

export const sampleUniverse: UniverseModel = {
  version: "1.0.0",
  universeId: "retention",
  rootZoneIds: ["root"],
  meta: {
    name: "Retention Universe",
    description: "Sample universe for playground",
  },
  zonesById: {
    root: {
      id: "root",
      parentZoneId: null,
      name: "Root Zone",
      zoneType: "container",
      childZoneIds: ["offsite", "purchase", "fallback"],
      pathIds: [],
      pathsById: {},
      meta: {
        color: "#1f2937",
      },
    },

    offsite: {
      id: "offsite",
      parentZoneId: "root",
      name: "Offsite Zone",
      zoneType: "container",
      childZoneIds: ["sendPush", "waitResponse"],
      pathIds: ["path-offsite-purchase", "path-offsite-timeout"],
      pathsById: {
        "path-offsite-purchase": {
          id: "path-offsite-purchase",
          key: "purchase",
          name: "Purchase",
          target: {
            universeId: "retention",
            zoneId: "purchase",
          },
          rule: {
            type: "event",
            payload: {
              eventName: "purchase",
            },
          },
        },
        "path-offsite-timeout": {
          id: "path-offsite-timeout",
          key: "timeout",
          name: "Timeout",
          target: {
            universeId: "retention",
            zoneId: "fallback",
          },
          rule: {
            type: "timeout",
            payload: {
              seconds: 86400,
            },
          },
        },
      },
      meta: {
        color: "#2563eb",
      },
    },

    sendPush: {
      id: "sendPush",
      parentZoneId: "offsite",
      name: "Send Push",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "sendPush",
        payload: {
          templateId: "welcome-push",
        },
      },
      pathIds: ["path-sendPush-wait"],
      pathsById: {
        "path-sendPush-wait": {
          id: "path-sendPush-wait",
          key: "next",
          name: "Next",
          target: {
            universeId: "retention",
            zoneId: "waitResponse",
          },
          rule: {
            type: "wait",
            payload: {
              seconds: 86400,
            },
          },
        },
      },
      meta: {
        color: "#60a5fa",
      },
    },

    waitResponse: {
      id: "waitResponse",
      parentZoneId: "offsite",
      name: "Wait Response",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "wait",
        payload: {
          seconds: 3600,
        },
      },
      pathIds: [],
      pathsById: {},
      meta: {
        color: "#93c5fd",
      },
    },

    purchase: {
      id: "purchase",
      parentZoneId: "root",
      name: "Purchase Zone",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "markCompleted",
        payload: {
          status: "purchased",
        },
      },
      pathIds: [],
      pathsById: {},
      meta: {
        color: "#16a34a",
      },
    },

    fallback: {
      id: "fallback",
      parentZoneId: "root",
      name: "Fallback Zone",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "sendEmail",
        payload: {
          templateId: "fallback-email",
        },
      },
      pathIds: [],
      pathsById: {},
      meta: {
        color: "#f59e0b",
      },
    },
  },
};

export const sampleUniverseLayout: UniverseLayoutModel = {
  version: "1.0.0",
  universeId: "retention",
  zoneLayoutsById: {
    root: {
      x: 0,
      y: 0,
      width: 1400,
      height: 900,
      anchors: {
        inlet: {
          point: { x: 0, y: 450 },
        },
        outlet: {
          point: { x: 1400, y: 450 },
        },
      },
    },
    offsite: {
      x: 120,
      y: 120,
      width: 520,
      height: 340,
      anchors: {
        inlet: {
          point: { x: 0, y: 170 },
        },
        outlet: {
          point: { x: 520, y: 170 },
        },
      },
    },
    sendPush: {
      x: 40,
      y: 40,
      width: 160,
      height: 100,
      anchors: {
        inlet: {
          point: { x: 0, y: 50 },
        },
        outlet: {
          point: { x: 160, y: 50 },
        },
      },
    },
    waitResponse: {
      x: 260,
      y: 40,
      width: 180,
      height: 100,
      anchors: {
        inlet: {
          point: { x: 0, y: 50 },
        },
        outlet: {
          point: { x: 180, y: 50 },
        },
      },
    },
    purchase: {
      x: 760,
      y: 180,
      width: 220,
      height: 120,
      anchors: {
        inlet: {
          point: { x: 0, y: 60 },
        },
        outlet: {
          point: { x: 220, y: 60 },
        },
      },
    },
    fallback: {
      x: 760,
      y: 360,
      width: 220,
      height: 120,
      anchors: {
        inlet: {
          point: { x: 0, y: 60 },
        },
        outlet: {
          point: { x: 220, y: 60 },
        },
      },
    },
  },
  pathLayoutsById: {
    "path-offsite-purchase": {
      routeOffset: { x: 8, y: -24 },
    },
    "path-offsite-timeout": {
      routeOffset: { x: 8, y: 24 },
    },
    "path-sendPush-wait": {
      routeOffset: { x: 0, y: -10 },
    },
  },
};
