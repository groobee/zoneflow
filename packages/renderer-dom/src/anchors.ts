import type { AnchorRect, Point } from "@zoneflow/core";
import type { Rect } from "./types";

export type ZoneAnchorKind = "inlet" | "outlet";

type AnchorGeometry = {
  point: Point;
  rect?: AnchorRect;
};

const DEFAULT_ANCHOR_WIDTH = 18;
const DEFAULT_ANCHOR_MIN_HEIGHT = 36;
const DEFAULT_ANCHOR_MAX_HEIGHT = 72;
const DEFAULT_ANCHOR_MARGIN_Y = 10;
const DEFAULT_ANCHOR_OVERHANG = 9;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveZoneAnchorRect(params: {
  zoneRect: Rect;
  anchor: AnchorGeometry;
  kind: ZoneAnchorKind;
}): Rect {
  const { zoneRect, anchor, kind } = params;

  if (anchor.rect) {
    return {
      x: anchor.rect.x,
      y: anchor.rect.y,
      width: anchor.rect.width ?? DEFAULT_ANCHOR_WIDTH,
      height: anchor.rect.height ?? DEFAULT_ANCHOR_MIN_HEIGHT,
    };
  }

  const availableHeight = Math.max(
    DEFAULT_ANCHOR_MIN_HEIGHT,
    zoneRect.height - DEFAULT_ANCHOR_MARGIN_Y * 2
  );
  const height = clamp(
    zoneRect.height * 0.46,
    DEFAULT_ANCHOR_MIN_HEIGHT,
    Math.min(DEFAULT_ANCHOR_MAX_HEIGHT, availableHeight)
  );
  const minY = zoneRect.y + DEFAULT_ANCHOR_MARGIN_Y;
  const maxY = zoneRect.y + zoneRect.height - DEFAULT_ANCHOR_MARGIN_Y - height;
  const y = clamp(anchor.point.y - height / 2, minY, maxY);
  const x =
    kind === "inlet"
      ? zoneRect.x - DEFAULT_ANCHOR_OVERHANG
      : zoneRect.x + zoneRect.width - (DEFAULT_ANCHOR_WIDTH - DEFAULT_ANCHOR_OVERHANG);

  return {
    x,
    y,
    width: DEFAULT_ANCHOR_WIDTH,
    height,
  };
}
