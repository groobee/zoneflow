import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";

export const sampleTinyUniverse: UniverseModel = {
  version: "2.0.0",
  universeId: "tiny-flow",
  rootZoneIds: ["capture", "qualified", "archive"],
  meta: {
    name: "Tiny Flow",
    description: "Compact sample for quick theme preview.",
  },
  zonesById: {
    capture: {
      id: "capture",
      parentZoneId: null,
      name: "Lead Capture",
      zoneType: "container",
      inputDisabled: true,
      childZoneIds: ["scoreLead", "sendReminder"],
      pathIds: ["path-capture-qualified", "path-capture-archive"],
      pathsById: {
        "path-capture-qualified": {
          id: "path-capture-qualified",
          key: "qualified",
          name: "Qualified",
          target: {
            universeId: "tiny-flow",
            zoneId: "qualified",
          },
          rule: {
            type: "score",
            payload: {
              threshold: 80,
            },
          },
        },
        "path-capture-archive": {
          id: "path-capture-archive",
          key: "archive",
          name: "",
          target: {
            universeId: "tiny-flow",
            zoneId: "archive",
          },
          rule: null,
        },
      },
    },
    scoreLead: {
      id: "scoreLead",
      parentZoneId: "capture",
      name: "Score Lead",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "scoreLead",
        payload: {
          model: "basic-score-v1",
        },
      },
      pathIds: ["path-scoreLead-reminder"],
      pathsById: {
        "path-scoreLead-reminder": {
          id: "path-scoreLead-reminder",
          key: "next",
          name: "Next",
          target: {
            universeId: "tiny-flow",
            zoneId: "sendReminder",
          },
          rule: {
            type: "next",
            payload: {},
          },
        },
      },
    },
    sendReminder: {
      id: "sendReminder",
      parentZoneId: "capture",
      name: "Send Reminder",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "sendEmail",
        payload: {
          templateId: "nudge-1",
        },
      },
      pathIds: ["path-reminder-qualified"],
      pathsById: {
        "path-reminder-qualified": {
          id: "path-reminder-qualified",
          key: "reply",
          name: "Reply",
          target: {
            universeId: "tiny-flow",
            zoneId: "qualified",
          },
          rule: {
            type: "event",
            payload: {
              eventName: "reply",
            },
          },
        },
      },
    },
    qualified: {
      id: "qualified",
      parentZoneId: null,
      name: "Qualified",
      zoneType: "action",
      outputDisabled: true,
      childZoneIds: [],
      action: {
        type: "handoffSales",
        payload: {
          queue: "sales",
        },
      },
      pathIds: [],
      pathsById: {},
    },
    archive: {
      id: "archive",
      parentZoneId: null,
      name: "Archive",
      zoneType: "action",
      outputDisabled: true,
      childZoneIds: [],
      action: {
        type: "archiveLead",
        payload: {
          reason: "low-score",
        },
      },
      pathIds: [],
      pathsById: {},
    },
  },
};

export const sampleTinyUniverseLayout: UniverseLayoutModel = {
  version: "2.0.0",
  universeId: "tiny-flow",
  zoneLayoutsById: {
    capture: {
      x: 88,
      y: 140,
      width: 560,
      height: 260,
      anchors: {
        inlet: {
          point: { x: 0, y: 130 },
        },
        outlet: {
          point: { x: 560, y: 130 },
        },
      },
    },
    scoreLead: {
      x: 28,
      y: 40,
      width: 150,
      height: 90,
      anchors: {
        inlet: {
          point: { x: 0, y: 45 },
        },
        outlet: {
          point: { x: 150, y: 45 },
        },
      },
    },
    sendReminder: {
      x: 280,
      y: 40,
      width: 180,
      height: 90,
      anchors: {
        inlet: {
          point: { x: 0, y: 45 },
        },
        outlet: {
          point: { x: 180, y: 45 },
        },
      },
    },
    qualified: {
      x: 860,
      y: 154,
      width: 220,
      height: 110,
      anchors: {
        inlet: {
          point: { x: 0, y: 55 },
        },
        outlet: {
          point: { x: 220, y: 55 },
        },
      },
    },
    archive: {
      x: 860,
      y: 314,
      width: 220,
      height: 110,
      anchors: {
        inlet: {
          point: { x: 0, y: 55 },
        },
        outlet: {
          point: { x: 220, y: 55 },
        },
      },
    },
  },
  pathLayoutsById: {
    "path-capture-qualified": {
      routeOffset: { x: 18, y: -34 },
    },
    "path-capture-archive": {
      routeOffset: { x: 18, y: 34 },
    },
    "path-scoreLead-reminder": {
      routeOffset: { x: 10, y: -2 },
    },
    "path-reminder-qualified": {
      routeOffset: { x: 12, y: 10 },
    },
  },
};
