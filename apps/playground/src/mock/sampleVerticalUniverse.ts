import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";

/**
 * flowDirection: "topToBottom" 데모 — Tiny 샘플과 같은 여정을 세로로 배치한다.
 * 존 앵커가 상(인렛)/하(아웃렛) 중앙에 있고, 레이아웃도 위→아래로 흐른다.
 * 렌더러에 flowDirection="topToBottom" 과 함께 쓴다 (useSampleSwitcher 참고).
 */
export const sampleVerticalUniverse: UniverseModel = {
  version: "2.0.0",
  universeId: "vertical-flow",
  rootZoneIds: ["capture", "qualified", "archive"],
  meta: {
    name: "Vertical Flow",
    description: "Top-to-bottom sample for flowDirection preview.",
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
            universeId: "vertical-flow",
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
            universeId: "vertical-flow",
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
            universeId: "vertical-flow",
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
            universeId: "vertical-flow",
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

// 앵커가 좌/우가 아니라 상/하 중앙에 있다 — createZoneLayout({ flowDirection:
// "topToBottom" }) 이 만들어 주는 것과 같은 형태를 명시적으로 적었다.
export const sampleVerticalUniverseLayout: UniverseLayoutModel = {
  version: "2.0.0",
  universeId: "vertical-flow",
  zoneLayoutsById: {
    capture: {
      x: 300,
      y: 40,
      width: 360,
      height: 400,
      anchors: {
        inlet: {
          point: { x: 180, y: 0 },
        },
        outlet: {
          point: { x: 180, y: 400 },
        },
      },
    },
    scoreLead: {
      x: 105,
      y: 104,
      width: 150,
      height: 90,
      anchors: {
        inlet: {
          point: { x: 75, y: 0 },
        },
        outlet: {
          point: { x: 75, y: 90 },
        },
      },
    },
    sendReminder: {
      x: 90,
      y: 272,
      width: 180,
      height: 90,
      anchors: {
        inlet: {
          point: { x: 90, y: 0 },
        },
        outlet: {
          point: { x: 90, y: 90 },
        },
      },
    },
    qualified: {
      x: 140,
      y: 580,
      width: 220,
      height: 110,
      anchors: {
        inlet: {
          point: { x: 110, y: 0 },
        },
        outlet: {
          point: { x: 110, y: 110 },
        },
      },
    },
    archive: {
      x: 560,
      y: 580,
      width: 220,
      height: 110,
      anchors: {
        inlet: {
          point: { x: 110, y: 0 },
        },
        outlet: {
          point: { x: 110, y: 110 },
        },
      },
    },
  },
  pathLayoutsById: {
    "path-capture-qualified": {
      routeOffset: { x: -140, y: 24 },
    },
    "path-capture-archive": {
      routeOffset: { x: 80, y: 24 },
    },
    "path-scoreLead-reminder": {
      routeOffset: { x: 0, y: 0 },
    },
    "path-reminder-qualified": {
      routeOffset: { x: -150, y: 8 },
    },
  },
};
