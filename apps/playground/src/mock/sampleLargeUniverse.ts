import type {
  Path,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneLayout,
} from "@zoneflow/core";

const zoneLayoutsById: Record<string, ZoneLayout> = {};

function createPath(params: {
  id: string;
  key: string;
  name: string;
  targetZoneId: string;
  ruleType: string;
  payload?: Record<string, unknown>;
}): Path {
  return {
    id: params.id,
    key: params.key,
    name: params.name,
    target: {
      universeId: "complex-retention",
      zoneId: params.targetZoneId,
    },
    rule: {
      type: params.ruleType,
      payload: params.payload ?? {},
    },
  };
}

function createActionZone(params: {
  id: string;
  parentZoneId: string | null;
  name: string;
  actionType: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  pathIds?: string[];
  pathsById?: Record<string, Path>;
  payload?: Record<string, unknown>;
}): Zone {
  const width = params.width ?? 190;
  const height = params.height ?? 120;

  zoneLayoutsById[params.id] = {
    x: params.x,
    y: params.y,
    width,
    height,
    anchors: {
      inlet: {
        point: { x: 0, y: height / 2 },
      },
      outlet: {
        point: { x: width, y: height / 2 },
      }
    },
  };

  return {
    id: params.id,
    parentZoneId: params.parentZoneId,
    name: params.name,
    zoneType: "action",
    childZoneIds: [],
    action: {
      type: params.actionType,
      payload: params.payload ?? {},
    },
    pathIds: params.pathIds ?? [],
    pathsById: params.pathsById ?? {},
    meta: {
      color: params.color,
    },
  };
}

function createContainerZone(params: {
  id: string;
  parentZoneId: string | null;
  name: string;
  childZoneIds: string[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  pathIds: string[];
  pathsById: Record<string, Path>;
}): Zone {
  const width = params.width ?? 760;
  const height = params.height ?? 320;

  zoneLayoutsById[params.id] = {
    x: params.x,
    y: params.y,
    width,
    height,
    anchors: {
      inlet: {
        point: { x: 0, y: height / 2 },
      },
      outlet: {
        point: { x: width, y: height / 2 },
      }
    },
  };

  return {
    id: params.id,
    parentZoneId: params.parentZoneId,
    name: params.name,
    zoneType: "container",
    childZoneIds: params.childZoneIds,
    pathIds: params.pathIds,
    pathsById: params.pathsById,
    meta: {
      color: params.color,
    },
  };
}

const zonesById: Record<string, Zone> = {};

const containerColors = ["#2563eb", "#7c3aed", "#0f766e"];
const actionColors = [
  "#60a5fa",
  "#93c5fd",
  "#c4b5fd",
  "#5eead4",
  "#fcd34d",
  "#fca5a5",
  "#86efac",
  "#fdba74",
  "#f9a8d4",
  "#67e8f9",
];

const containerConfigs = [
  {
    id: "container-1",
    name: "Acquisition Journey",
    x: 120,
    y: 120,
    color: containerColors[0],
    childZoneIds: ["action-1", "action-2", "action-3"],
    pathTargets: [
      "action-1",
      "action-2",
      "action-3",
      "action-4",
      "action-terminal-1",
      "action-terminal-2",
    ],
  },
  {
    id: "container-2",
    name: "Retention Journey",
    x: 980,
    y: 120,
    color: containerColors[1],
    childZoneIds: ["action-4", "action-5", "action-6"],
    pathTargets: [
      "action-4",
      "action-5",
      "action-6",
      "action-7",
      "action-terminal-2",
      "action-terminal-3",
    ],
  },
  {
    id: "container-3",
    name: "Recovery Journey",
    x: 120,
    y: 560,
    color: containerColors[2],
    childZoneIds: ["action-7", "action-8", "action-9", "action-10"],
    pathTargets: [
      "action-5",
      "action-7",
      "action-8",
      "action-9",
      "action-terminal-3",
      "action-terminal-4",
    ],
  },
];

containerConfigs.forEach((container, containerIndex) => {
  const containerPathDefs = [
    {
      suffix: "purchase",
      key: "purchase",
      name: "Purchase",
      targetZoneId: container.pathTargets[0],
      ruleType: "event",
      payload: { eventName: "purchase" },
    },
    {
      suffix: "opened",
      key: "opened",
      name: "Opened Push",
      targetZoneId: container.pathTargets[1],
      ruleType: "event",
      payload: { eventName: "push_open" },
    },
    {
      suffix: "clicked",
      key: "clicked",
      name: "Clicked CTA",
      targetZoneId: container.pathTargets[2],
      ruleType: "event",
      payload: { eventName: "click_cta" },
    },
    {
      suffix: "timeout",
      key: "timeout",
      name: "Timeout",
      targetZoneId: container.pathTargets[3],
      ruleType: "timeout",
      payload: { seconds: 3600 * (containerIndex + 1) },
    },
    {
      suffix: "fallback",
      key: "fallback",
      name: "Fallback",
      targetZoneId: container.pathTargets[4],
      ruleType: "segment",
      payload: { segment: "cold-user" },
    },
    {
      suffix: "vip",
      key: "vip",
      name: "VIP Route",
      targetZoneId: container.pathTargets[5],
      ruleType: "segment",
      payload: { segment: "vip-user" },
    },
  ];

  const pathsById: Record<string, Path> = {};
  const pathIds: string[] = [];

  containerPathDefs.forEach((def, idx) => {
    const id = `path-${container.id}-${def.suffix}`;
    pathIds.push(id);
    pathsById[id] = createPath({
      id,
      key: def.key,
      name: def.name,
      targetZoneId: def.targetZoneId,
      ruleType: def.ruleType,
      payload: def.payload,
    });
  });

  zonesById[container.id] = createContainerZone({
    id: container.id,
    parentZoneId: null,
    name: container.name,
    childZoneIds: container.childZoneIds,
    x: container.x,
    y: container.y,
    width: 720,
    height: 280,
    color: container.color,
    pathIds,
    pathsById,
  });
});

const actionConfigs = [
  {
    id: "action-1",
    parentZoneId: "container-1",
    name: "Send Push A",
    actionType: "sendPush",
    x: 28,
    y: 34,
    color: actionColors[0],
    next: "action-2",
  },
  {
    id: "action-2",
    parentZoneId: "container-1",
    name: "Wait Response A",
    actionType: "wait",
    x: 248,
    y: 34,
    color: actionColors[1],
    next: "action-3",
  },
  {
    id: "action-3",
    parentZoneId: "container-1",
    name: "Send Email A",
    actionType: "sendEmail",
    x: 468,
    y: 34,
    color: actionColors[2],
    next: "container-2",
  },

  {
    id: "action-4",
    parentZoneId: "container-2",
    name: "Send Push B",
    actionType: "sendPush",
    x: 28,
    y: 34,
    color: actionColors[3],
    next: "action-5",
  },
  {
    id: "action-5",
    parentZoneId: "container-2",
    name: "Wait Response B",
    actionType: "wait",
    x: 248,
    y: 34,
    color: actionColors[4],
    next: "action-6",
  },
  {
    id: "action-6",
    parentZoneId: "container-2",
    name: "Send Coupon B",
    actionType: "sendCoupon",
    x: 468,
    y: 34,
    color: actionColors[5],
    next: "container-3",
  },

  {
    id: "action-7",
    parentZoneId: "container-3",
    name: "Send Push C",
    actionType: "sendPush",
    x: 28,
    y: 34,
    color: actionColors[6],
    next: "action-8",
  },
  {
    id: "action-8",
    parentZoneId: "container-3",
    name: "Wait Response C",
    actionType: "wait",
    x: 248,
    y: 34,
    color: actionColors[7],
    next: "action-9",
  },
  {
    id: "action-9",
    parentZoneId: "container-3",
    name: "Send Email C",
    actionType: "sendEmail",
    x: 468,
    y: 34,
    color: actionColors[8],
    next: "action-10",
  },
  {
    id: "action-10",
    parentZoneId: "container-3",
    name: "Assign Segment C",
    actionType: "assignSegment",
    x: 248,
    y: 150,
    color: actionColors[9],
    next: "action-terminal-1",
  },
];

actionConfigs.forEach((action, idx) => {
  const actionPaths: Record<string, Path> = {};
  const pathIds: string[] = [];

  const nextPathId = `path-${action.id}-next`;
  pathIds.push(nextPathId);
  actionPaths[nextPathId] = createPath({
    id: nextPathId,
    key: "next",
    name: "Next",
    targetZoneId: action.next,
    ruleType: "next",
    payload: { order: idx + 1 },
  });

  if (idx % 2 === 1) {
    const purchasePathId = `path-${action.id}-purchase`;
    pathIds.push(purchasePathId);
    actionPaths[purchasePathId] = createPath({
      id: purchasePathId,
      key: "purchase",
      name: "Purchase Exit",
      targetZoneId: "action-terminal-1",
      ruleType: "event",
      payload: { eventName: "purchase" },
    });
  }

  zonesById[action.id] = createActionZone({
    id: action.id,
    parentZoneId: action.parentZoneId,
    name: action.name,
    actionType: action.actionType,
    x: action.x,
    y: action.y,
    width: 190,
    height: 110,
    color: action.color,
    pathIds,
    pathsById: actionPaths,
    payload:
      action.actionType === "sendPush"
        ? { templateId: `${action.id}-push-template` }
        : action.actionType === "wait"
          ? { seconds: 1800 }
          : action.actionType === "sendEmail"
            ? { templateId: `${action.id}-email-template` }
            : action.actionType === "sendCoupon"
              ? { couponId: `${action.id}-coupon` }
              : { segment: `${action.id}-segment` },
  });
});

zonesById["action-terminal-1"] = createActionZone({
  id: "action-terminal-1",
  parentZoneId: null,
  name: "Purchase Terminal",
  actionType: "markCompleted",
  x: 1850,
  y: 180,
  width: 260,
  height: 130,
  color: "#16a34a",
  payload: { status: "purchased" },
});

zonesById["action-terminal-2"] = createActionZone({
  id: "action-terminal-2",
  parentZoneId: null,
  name: "Fallback Terminal",
  actionType: "sendCoupon",
  x: 1850,
  y: 360,
  width: 260,
  height: 130,
  color: "#f59e0b",
  payload: { couponId: "fallback-coupon" },
});

zonesById["action-terminal-3"] = createActionZone({
  id: "action-terminal-3",
  parentZoneId: null,
  name: "Hot Lead Terminal",
  actionType: "assignSegment",
  x: 1850,
  y: 540,
  width: 260,
  height: 130,
  color: "#ec4899",
  payload: { segment: "hot-lead" },
});

zonesById["action-terminal-4"] = createActionZone({
  id: "action-terminal-4",
  parentZoneId: null,
  name: "VIP Terminal",
  actionType: "assignSegment",
  x: 1850,
  y: 720,
  width: 260,
  height: 130,
  color: "#8b5cf6",
  payload: { segment: "vip" },
});

function createSampleLargePathLayouts(): UniverseLayoutModel["pathLayoutsById"] {
  const pathLayoutsById: UniverseLayoutModel["pathLayoutsById"] = {};

  for (const sourceZone of Object.values(zonesById)) {
    const sourceLayout = zoneLayoutsById[sourceZone.id];
    if (!sourceLayout) continue;

    const total = sourceZone.pathIds.length;
    if (total === 0) continue;

    sourceZone.pathIds.forEach((pathId, index) => {
      const path = sourceZone.pathsById[pathId];
      if (!path?.target) return;

      const targetLayout = zoneLayoutsById[path.target.zoneId];
      if (!targetLayout) return;

      const spread = index - (total - 1) / 2;
      const horizontalDirection = targetLayout.x >= sourceLayout.x ? 1 : -1;
      const verticalDirection = targetLayout.y >= sourceLayout.y ? 1 : -1;

      const yStep = sourceZone.zoneType === "container" ? 22 : 14;
      const xStep = sourceZone.zoneType === "container" ? 10 : 6;

      const routeOffset = {
        x: Math.round(horizontalDirection * Math.abs(spread) * xStep),
        y: Math.round(spread * yStep + verticalDirection * Math.abs(spread) * 2),
      };

      pathLayoutsById[pathId] = { routeOffset };
    });
  }

  return pathLayoutsById;
}

const sampleLargePathLayouts = createSampleLargePathLayouts();

export const sampleLargeUniverse: UniverseModel = {
  version: "2.0.0",
  universeId: "complex-retention",
  rootZoneIds: [
    "container-1",
    "container-2",
    "container-3",
    "action-terminal-1",
    "action-terminal-2",
    "action-terminal-3",
    "action-terminal-4",
  ],
  meta: {
    name: "Complex Retention Universe",
    description:
      "3 containers, 10 actions, each container connected to 6 action-level routes.",
  },
  zonesById,
};

export const sampleLargeUniverseLayout: UniverseLayoutModel = {
  version: "1.0.0",
  universeId: sampleLargeUniverse.universeId,
  zoneLayoutsById,
  pathLayoutsById: sampleLargePathLayouts,
};
