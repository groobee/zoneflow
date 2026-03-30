import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";

export const sampleUniverse: UniverseModel = {
  version: "2.0.0",
  universeId: "retention",
  rootZoneIds: ["offsite", "purchase", "fallback", "reviewQueue"],
  meta: {
    name: "Retention Universe",
    description:
      "Nested container sample with empty paths, disabled anchors, and terminal actions.",
  },
  zonesById: {
    offsite: {
      id: "offsite",
      parentZoneId: null,
      name: "Offsite Journey",
      zoneType: "container",
      inputDisabled: true,
      childZoneIds: ["engagement", "offerNudge"],
      pathIds: [
        "path-offsite-purchase",
        "path-offsite-timeout",
        "path-offsite-review",
      ],
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
        "path-offsite-review": {
          id: "path-offsite-review",
          key: "draft-review",
          name: "",
          target: {
            universeId: "retention",
            zoneId: "reviewQueue",
          },
          rule: null,
        },
      },
      meta: {
        color: "#2563eb",
      },
    },
    engagement: {
      id: "engagement",
      parentZoneId: "offsite",
      name: "Engagement Lane",
      zoneType: "container",
      inputDisabled: true,
      childZoneIds: ["sendPush", "waitResponse"],
      pathIds: ["path-engagement-offer"],
      pathsById: {
        "path-engagement-offer": {
          id: "path-engagement-offer",
          key: "draft-offer",
          name: "",
          target: {
            universeId: "retention",
            zoneId: "offerNudge",
          },
          rule: null,
        },
      },
      meta: {
        color: "#60a5fa",
      },
    },
    sendPush: {
      id: "sendPush",
      parentZoneId: "engagement",
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
              seconds: 1800,
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
      parentZoneId: "engagement",
      name: "Wait Response",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "wait",
        payload: {
          seconds: 3600,
        },
      },
      pathIds: ["path-waitResponse-success", "path-waitResponse-fallback"],
      pathsById: {
        "path-waitResponse-success": {
          id: "path-waitResponse-success",
          key: "purchase",
          name: "Purchase Exit",
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
        "path-waitResponse-fallback": {
          id: "path-waitResponse-fallback",
          key: "fallback",
          name: "",
          target: {
            universeId: "retention",
            zoneId: "offerNudge",
          },
          rule: null,
        },
      },
      meta: {
        color: "#93c5fd",
      },
    },
    offerNudge: {
      id: "offerNudge",
      parentZoneId: "offsite",
      name: "Offer Nudge",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "sendCoupon",
        payload: {
          couponId: "winback-offer",
        },
      },
      pathIds: ["path-offerNudge-fallback"],
      pathsById: {
        "path-offerNudge-fallback": {
          id: "path-offerNudge-fallback",
          key: "timeout",
          name: "Escalate",
          target: {
            universeId: "retention",
            zoneId: "fallback",
          },
          rule: {
            type: "timeout",
            payload: {
              seconds: 7200,
            },
          },
        },
      },
      meta: {
        color: "#38bdf8",
      },
    },
    purchase: {
      id: "purchase",
      parentZoneId: null,
      name: "Purchase Terminal",
      zoneType: "action",
      outputDisabled: true,
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
      parentZoneId: null,
      name: "Fallback Terminal",
      zoneType: "action",
      outputDisabled: true,
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
    reviewQueue: {
      id: "reviewQueue",
      parentZoneId: null,
      name: "Review Queue",
      zoneType: "action",
      outputDisabled: true,
      childZoneIds: [],
      action: {
        type: "assignSegment",
        payload: {
          segment: "manual-review",
        },
      },
      pathIds: [],
      pathsById: {},
      meta: {
        color: "#a855f7",
      },
    },
  },
};

export const sampleUniverseLayout: UniverseLayoutModel = {
  version: "2.0.0",
  universeId: "retention",
  zoneLayoutsById: {
    offsite: {
      x: 80,
      y: 140,
      width: 820,
      height: 380,
      anchors: {
        inlet: {
          point: { x: 0, y: 190 },
        },
        outlet: {
          point: { x: 820, y: 190 },
        },
      },
    },
    engagement: {
      x: 28,
      y: 32,
      width: 460,
      height: 172,
      anchors: {
        inlet: {
          point: { x: 0, y: 86 },
        },
        outlet: {
          point: { x: 460, y: 86 },
        },
      },
    },
    sendPush: {
      x: 18,
      y: 22,
      width: 134,
      height: 88,
      anchors: {
        inlet: {
          point: { x: 0, y: 44 },
        },
        outlet: {
          point: { x: 134, y: 44 },
        },
      },
    },
    waitResponse: {
      x: 294,
      y: 22,
      width: 142,
      height: 88,
      anchors: {
        inlet: {
          point: { x: 0, y: 44 },
        },
        outlet: {
          point: { x: 142, y: 44 },
        },
      },
    },
    offerNudge: {
      x: 596,
      y: 214,
      width: 190,
      height: 104,
      anchors: {
        inlet: {
          point: { x: 0, y: 52 },
        },
        outlet: {
          point: { x: 190, y: 52 },
        },
      },
    },
    purchase: {
      x: 1140,
      y: 144,
      width: 240,
      height: 124,
      anchors: {
        inlet: {
          point: { x: 0, y: 62 },
        },
        outlet: {
          point: { x: 240, y: 62 },
        },
      },
    },
    fallback: {
      x: 1140,
      y: 320,
      width: 240,
      height: 124,
      anchors: {
        inlet: {
          point: { x: 0, y: 62 },
        },
        outlet: {
          point: { x: 240, y: 62 },
        },
      },
    },
    reviewQueue: {
      x: 1140,
      y: 496,
      width: 240,
      height: 124,
      anchors: {
        inlet: {
          point: { x: 0, y: 62 },
        },
        outlet: {
          point: { x: 240, y: 62 },
        },
      },
    },
  },
  pathLayoutsById: {
    "path-offsite-purchase": {
      routeOffset: { x: 22, y: -66 },
    },
    "path-offsite-timeout": {
      routeOffset: { x: 14, y: -2 },
    },
    "path-offsite-review": {
      routeOffset: { x: 16, y: 56 },
    },
    "path-engagement-offer": {
      routeOffset: { x: 26, y: 18 },
    },
    "path-sendPush-wait": {
      routeOffset: { x: 10, y: -4 },
    },
    "path-waitResponse-success": {
      routeOffset: { x: 20, y: -30 },
    },
    "path-waitResponse-fallback": {
      routeOffset: { x: 18, y: 34 },
    },
    "path-offerNudge-fallback": {
      routeOffset: { x: 12, y: 6 },
    },
  },
};
