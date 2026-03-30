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
  name?: string;
  targetZoneId?: string | null;
  ruleType?: string | null;
  payload?: Record<string, unknown>;
}): Path {
  return {
    id: params.id,
    key: params.key,
    name: params.name ?? "",
    target: params.targetZoneId
      ? {
          universeId: "complex-retention",
          zoneId: params.targetZoneId,
        }
      : null,
    rule:
      params.ruleType === undefined || params.ruleType === null
        ? null
        : {
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
  inputDisabled?: boolean;
  outputDisabled?: boolean;
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
      },
    },
  };

  return {
    id: params.id,
    parentZoneId: params.parentZoneId,
    name: params.name,
    zoneType: "action",
    inputDisabled: params.inputDisabled,
    outputDisabled: params.outputDisabled,
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
      },
    },
  };

  return {
    id: params.id,
    parentZoneId: params.parentZoneId,
    name: params.name,
    zoneType: "container",
    inputDisabled: true,
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
    x: 60,
    y: 80,
    color: containerColors[0],
    childZoneIds: ["container-1-engage", "action-3"],
    pathTargets: [
      "action-1",
      "action-2",
      "action-3",
      "action-4",
      "action-terminal-1",
      "action-terminal-2",
      "action-terminal-3",
    ],
  },
  {
    id: "container-2",
    name: "Retention Journey",
    x: 60,
    y: 430,
    color: containerColors[1],
    childZoneIds: ["container-2-offers", "action-6"],
    pathTargets: [
      "action-4",
      "action-5",
      "action-6",
      "action-7",
      "action-terminal-2",
      "action-terminal-3",
      "action-terminal-4",
    ],
  },
  {
    id: "container-3",
    name: "Recovery Journey",
    x: 60,
    y: 780,
    color: containerColors[2],
    childZoneIds: ["action-7", "action-8", "action-9", "action-10"],
    pathTargets: [
      "action-5",
      "action-7",
      "action-8",
      "action-9",
      "action-terminal-1",
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
    {
      suffix: "draft",
      key: "draft",
      name: "",
      targetZoneId: container.pathTargets[6],
      ruleType: null,
    },
  ];

  const pathsById: Record<string, Path> = {};
  const pathIds: string[] = [];

  containerPathDefs.forEach((def) => {
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
    width: 980,
    height: 320,
    color: container.color,
    pathIds,
    pathsById,
  });
});

zonesById["container-1-engage"] = createContainerZone({
  id: "container-1-engage",
  parentZoneId: "container-1",
  name: "Engagement Cluster",
  childZoneIds: ["action-1", "action-2"],
  x: 24,
  y: 24,
  width: 600,
  height: 160,
  color: "#60a5fa",
  pathIds: ["path-container-1-engage-draft"],
  pathsById: {
    "path-container-1-engage-draft": createPath({
      id: "path-container-1-engage-draft",
      key: "draft",
      name: "",
      targetZoneId: "action-3",
      ruleType: null,
    }),
  },
});

zonesById["container-2-offers"] = createContainerZone({
  id: "container-2-offers",
  parentZoneId: "container-2",
  name: "Offer Cluster",
  childZoneIds: ["action-4", "action-5"],
  x: 24,
  y: 24,
  width: 600,
  height: 160,
  color: "#a78bfa",
  pathIds: ["path-container-2-offers-ready"],
  pathsById: {
    "path-container-2-offers-ready": createPath({
      id: "path-container-2-offers-ready",
      key: "ready",
      name: "Offer Ready",
      targetZoneId: "action-6",
      ruleType: "segment",
      payload: { segment: "offer-qualified" },
    }),
  },
});

const actionConfigs = [
  {
    id: "action-1",
    parentZoneId: "container-1-engage",
    name: "Send Push A",
    actionType: "sendPush",
    x: 24,
    y: 24,
    color: actionColors[0],
    next: "action-2",
  },
  {
    id: "action-2",
    parentZoneId: "container-1-engage",
    name: "Wait Response A",
    actionType: "wait",
    x: 386,
    y: 24,
    color: actionColors[1],
    next: "action-3",
  },
  {
    id: "action-3",
    parentZoneId: "container-1",
    name: "Send Email A",
    actionType: "sendEmail",
    x: 780,
    y: 88,
    color: actionColors[2],
    next: "action-4",
  },
  {
    id: "action-4",
    parentZoneId: "container-2-offers",
    name: "Send Push B",
    actionType: "sendPush",
    x: 24,
    y: 24,
    color: actionColors[3],
    next: "action-5",
  },
  {
    id: "action-5",
    parentZoneId: "container-2-offers",
    name: "Wait Response B",
    actionType: "wait",
    x: 386,
    y: 24,
    color: actionColors[4],
    next: "action-6",
  },
  {
    id: "action-6",
    parentZoneId: "container-2",
    name: "Send Coupon B",
    actionType: "sendCoupon",
    x: 780,
    y: 88,
    color: actionColors[5],
    next: "action-7",
  },
  {
    id: "action-7",
    parentZoneId: "container-3",
    name: "Send Push C",
    actionType: "sendPush",
    x: 36,
    y: 28,
    color: actionColors[6],
    next: "action-8",
  },
  {
    id: "action-8",
    parentZoneId: "container-3",
    name: "Wait Response C",
    actionType: "wait",
    x: 382,
    y: 28,
    color: actionColors[7],
    next: "action-9",
  },
  {
    id: "action-9",
    parentZoneId: "container-3",
    name: "Send Email C",
    actionType: "sendEmail",
    x: 36,
    y: 164,
    color: actionColors[8],
    next: "action-10",
  },
  {
    id: "action-10",
    parentZoneId: "container-3",
    name: "Assign Segment C",
    actionType: "assignSegment",
    x: 382,
    y: 164,
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

  if (idx === 2 || idx === 7) {
    const draftPathId = `path-${action.id}-draft`;
    pathIds.push(draftPathId);
    actionPaths[draftPathId] = createPath({
      id: draftPathId,
      key: "draft",
      name: "",
      targetZoneId: idx === 2 ? "action-terminal-2" : "action-terminal-4",
      ruleType: null,
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
  x: 1280,
  y: 110,
  width: 260,
  height: 130,
  color: "#16a34a",
  outputDisabled: true,
  payload: { status: "purchased" },
});

zonesById["action-terminal-2"] = createActionZone({
  id: "action-terminal-2",
  parentZoneId: null,
  name: "Fallback Terminal",
  actionType: "sendCoupon",
  x: 1280,
  y: 300,
  width: 260,
  height: 130,
  color: "#f59e0b",
  outputDisabled: true,
  payload: { couponId: "fallback-coupon" },
});

zonesById["action-terminal-3"] = createActionZone({
  id: "action-terminal-3",
  parentZoneId: null,
  name: "Hot Lead Terminal",
  actionType: "assignSegment",
  x: 1280,
  y: 560,
  width: 260,
  height: 130,
  color: "#ec4899",
  outputDisabled: true,
  payload: { segment: "hot-lead" },
});

zonesById["action-terminal-4"] = createActionZone({
  id: "action-terminal-4",
  parentZoneId: null,
  name: "VIP Terminal",
  actionType: "assignSegment",
  x: 1280,
  y: 750,
  width: 260,
  height: 130,
  color: "#8b5cf6",
  outputDisabled: true,
  payload: { segment: "vip" },
});

function createSampleLargePathLayouts(): UniverseLayoutModel["pathLayoutsById"] {
  const pathLayoutsById: UniverseLayoutModel["pathLayoutsById"] = {};
  const worldPositionCache = new Map<string, { x: number; y: number }>();

  const resolveWorldPosition = (zoneId: string): { x: number; y: number } => {
    const cached = worldPositionCache.get(zoneId);
    if (cached) return cached;

    const zone = zonesById[zoneId];
    const layout = zoneLayoutsById[zoneId];
    if (!zone || !layout) {
      return { x: 0, y: 0 };
    }

    if (!zone.parentZoneId) {
      const rootPosition = { x: layout.x, y: layout.y };
      worldPositionCache.set(zoneId, rootPosition);
      return rootPosition;
    }

    const parentPosition = resolveWorldPosition(zone.parentZoneId);
    const nextPosition = {
      x: parentPosition.x + layout.x,
      y: parentPosition.y + layout.y,
    };
    worldPositionCache.set(zoneId, nextPosition);
    return nextPosition;
  };

  for (const sourceZone of Object.values(zonesById)) {
    const sourceLayout = zoneLayoutsById[sourceZone.id];
    if (!sourceLayout) continue;
    const sourceWorldPosition = resolveWorldPosition(sourceZone.id);

    const total = sourceZone.pathIds.length;
    if (total === 0) continue;

    sourceZone.pathIds.forEach((pathId, index) => {
      const path = sourceZone.pathsById[pathId];
      if (!path?.target) return;

      const targetLayout = zoneLayoutsById[path.target.zoneId];
      if (!targetLayout) return;
      const targetWorldPosition = resolveWorldPosition(path.target.zoneId);

      const spread = index - (total - 1) / 2;
      const horizontalDirection =
        targetWorldPosition.x >= sourceWorldPosition.x ? 1 : -1;
      const yStep = sourceZone.zoneType === "container" ? 16 : 10;
      const xStep = sourceZone.zoneType === "container" ? 8 : 4;

      const routeOffset = {
        x: Math.round(horizontalDirection * Math.abs(spread) * xStep),
        y: Math.round(spread * yStep),
      };

      pathLayoutsById[pathId] = { routeOffset };
    });
  }

  return pathLayoutsById;
}

const sampleLargePathLayouts = createSampleLargePathLayouts();

export const sampleLargeUniverse: UniverseModel = {
  version: "2.1.0",
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
      "Large sample with nested containers, draft paths, disabled terminal outputs, and cross-journey routing.",
  },
  zonesById,
};

export const sampleLargeUniverseLayout: UniverseLayoutModel = {
  version: "2.1.0",
  universeId: sampleLargeUniverse.universeId,
  zoneLayoutsById,
  pathLayoutsById: sampleLargePathLayouts,
};
