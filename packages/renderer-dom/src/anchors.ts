import type { AnchorRect, Point } from "@zoneflow/core";
import type { Rect } from "./types";

export type ZoneAnchorKind = "inlet" | "outlet";

type AnchorGeometry = {
  point: Point;
  rect?: AnchorRect;
};

const DEFAULT_ANCHOR_WIDTH = 24;
const DEFAULT_ANCHOR_ATTACH_DEPTH = 10;

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
      height: anchor.rect.height ?? zoneRect.height,
    };
  }

  const x =
    kind === "inlet"
      ? zoneRect.x - (DEFAULT_ANCHOR_WIDTH - DEFAULT_ANCHOR_ATTACH_DEPTH)
      : zoneRect.x + zoneRect.width - DEFAULT_ANCHOR_ATTACH_DEPTH;

  return {
    x,
    y: zoneRect.y,
    width: DEFAULT_ANCHOR_WIDTH,
    height: zoneRect.height,
  };
}
