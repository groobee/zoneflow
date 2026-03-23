import type {
  ComponentLayoutEngine,
  PathComponentLayout,
  PathVisualMode,
  Rect,
  ZoneComponentLayout,
  DensityLevel,
} from "../types";

const ZONE_PADDING_X = 12;
const ZONE_PADDING_Y = 10;
const ZONE_GAP_Y = 6;

const ZONE_TITLE_HEIGHT = 24;
const ZONE_TYPE_HEIGHT = 18;
const ZONE_BADGE_HEIGHT = 20;
const ZONE_BODY_MIN_HEIGHT = 28;
const ZONE_FOOTER_HEIGHT = 18;

const PATH_PADDING_X = 8;
const PATH_PADDING_Y = 6;
const PATH_GAP_Y = 4;

const PATH_LABEL_HEIGHT = 18;
const PATH_RULE_HEIGHT = 16;
const PATH_TARGET_HEIGHT = 16;
const PATH_BODY_MIN_HEIGHT = 20;

function insetRect(rect: Rect, insetX: number, insetY: number): Rect {
  return {
    x: rect.x + insetX,
    y: rect.y + insetY,
    width: Math.max(0, rect.width - insetX * 2),
    height: Math.max(0, rect.height - insetY * 2),
  };
}

function takeTop(
  rect: Rect,
  height: number
): { slot: Rect; rest: Rect } {
  const safeHeight = Math.max(0, Math.min(height, rect.height));

  return {
    slot: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: safeHeight,
    },
    rest: {
      x: rect.x,
      y: rect.y + safeHeight,
      width: rect.width,
      height: Math.max(0, rect.height - safeHeight),
    },
  };
}

function takeBottom(
  rect: Rect,
  height: number
): { slot: Rect; rest: Rect } {
  const safeHeight = Math.max(0, Math.min(height, rect.height));

  return {
    slot: {
      x: rect.x,
      y: rect.y + rect.height - safeHeight,
      width: rect.width,
      height: safeHeight,
    },
    rest: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: Math.max(0, rect.height - safeHeight),
    },
  };
}

function addTopGap(rect: Rect, gap: number): Rect {
  return {
    x: rect.x,
    y: rect.y + Math.min(gap, rect.height),
    width: rect.width,
    height: Math.max(0, rect.height - gap),
  };
}

function shouldRenderZoneSlot(
  density: DensityLevel,
  slot: "title" | "type" | "badge" | "body" | "footer"
): boolean {
  switch (density) {
    case "detail":
      return true;
    case "near":
      return slot === "title" || slot === "type" || slot === "badge";
    case "mid":
      return slot === "title";
    case "far":
    default:
      return false;
  }
}

function shouldRenderPathSlot(
  density: PathVisualMode,
  slot: "label" | "rule" | "target" | "body"
): boolean {
  switch (density) {
    case "full":
      return true;
    case "chip":
      return slot === "label";
    case "edge-only":
    case "hidden":
    default:
      return false;
  }
}

function computeZoneSlots(params: {
  rect: Rect;
  density: DensityLevel;
}): ZoneComponentLayout["slots"] {
  const { rect, density } = params;
  const slots: ZoneComponentLayout["slots"] = {};

  let content = insetRect(rect, ZONE_PADDING_X, ZONE_PADDING_Y);

  if (shouldRenderZoneSlot(density, "title") && content.height > 0) {
    const { slot, rest } = takeTop(content, ZONE_TITLE_HEIGHT);
    slots.title = slot;
    content = addTopGap(rest, ZONE_GAP_Y);
  }

  if (shouldRenderZoneSlot(density, "type") && content.height > 0) {
    const { slot, rest } = takeTop(content, ZONE_TYPE_HEIGHT);
    slots.type = slot;
    content = addTopGap(rest, ZONE_GAP_Y);
  }

  if (shouldRenderZoneSlot(density, "badge") && content.height > 0) {
    const badgeWidth = Math.min(96, content.width);
    slots.badge = {
      x: content.x,
      y: content.y,
      width: badgeWidth,
      height: Math.min(ZONE_BADGE_HEIGHT, content.height),
    };
    content = addTopGap(
      {
        x: content.x,
        y: content.y + Math.min(ZONE_BADGE_HEIGHT, content.height),
        width: content.width,
        height: Math.max(0, content.height - ZONE_BADGE_HEIGHT),
      },
      ZONE_GAP_Y
    );
  }

  if (shouldRenderZoneSlot(density, "footer") && content.height > 0) {
    const { slot, rest } = takeBottom(content, ZONE_FOOTER_HEIGHT);
    slots.footer = slot;
    content = rest;
  }

  if (
    shouldRenderZoneSlot(density, "body") &&
    content.width > 0 &&
    content.height >= ZONE_BODY_MIN_HEIGHT
  ) {
    slots.body = content;
  }

  return slots;
}

function computePathSlots(params: {
  rect: Rect;
  density: PathVisualMode;
}): PathComponentLayout["slots"] {
  const { rect, density } = params;
  const slots: PathComponentLayout["slots"] = {};

  let content = insetRect(rect, PATH_PADDING_X, PATH_PADDING_Y);

  if (shouldRenderPathSlot(density, "label") && content.height > 0) {
    const { slot, rest } = takeTop(content, PATH_LABEL_HEIGHT);
    slots.label = slot;
    content = addTopGap(rest, PATH_GAP_Y);
  }

  if (shouldRenderPathSlot(density, "rule") && content.height > 0) {
    const { slot, rest } = takeTop(content, PATH_RULE_HEIGHT);
    slots.rule = slot;
    content = addTopGap(rest, PATH_GAP_Y);
  }

  if (shouldRenderPathSlot(density, "target") && content.height > 0) {
    const { slot, rest } = takeBottom(content, PATH_TARGET_HEIGHT);
    slots.target = slot;
    content = rest;
  }

  if (
    shouldRenderPathSlot(density, "body") &&
    content.width > 0 &&
    content.height >= PATH_BODY_MIN_HEIGHT
  ) {
    slots.body = content;
  }

  return slots;
}

export const defaultComponentLayoutEngine: ComponentLayoutEngine = {
  compute(input) {
    const { graphLayout, density, visibility } = input;

    const zonesById = Object.fromEntries(
      Object.values(graphLayout.zonesById).map((zone) => {
        const zoneVisibility = visibility.zoneVisibilityById[zone.zoneId];
        const zoneDensity = density.zoneDensityById[zone.zoneId];

        const slots =
          zoneVisibility?.shouldRenderBody !== false
            ? computeZoneSlots({
              rect: zone.rect,
              density: zoneDensity,
            })
            : {};

        return [
          zone.zoneId,
          {
            zoneId: zone.zoneId,
            slots,
          },
        ];
      })
    );

    const pathsById = Object.fromEntries(
      Object.values(graphLayout.pathsById).map((path) => {
        const pathVisibility = visibility.pathVisibilityById[path.pathId];
        const pathDensity = density.pathDensityById[path.pathId];

        const slots =
          path.rect && pathVisibility?.shouldRenderNode
            ? computePathSlots({
              rect: path.rect,
              density: pathDensity,
            })
            : {};

        return [
          path.pathId,
          {
            pathId: path.pathId,
            slots,
          },
        ];
      })
    );

    return {
      zonesById,
      pathsById,
    };
  },
};