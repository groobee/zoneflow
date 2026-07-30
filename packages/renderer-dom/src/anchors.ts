import type { AnchorRect, Point } from "@zoneflow/core";
import type { Rect } from "./types.js";

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
  /**
   * 슬래브 가로폭 오버라이드(px, 테마 `surface.anchor.width`). 미지정 시 기본 24.
   * 폭이 줄면 존 안쪽으로 겹치는 attach 깊이도 함께 줄여(최소 2px) 튀어나온 부분을 유지한다.
   */
  width?: number;
}): Rect {
  const { zoneRect, anchor, kind } = params;
  const anchorWidth = Math.max(params.width ?? DEFAULT_ANCHOR_WIDTH, 6);
  const attachDepth = Math.min(
    DEFAULT_ANCHOR_ATTACH_DEPTH,
    Math.max(anchorWidth - 4, 2)
  );

  if (anchor.rect) {
    return {
      x: anchor.rect.x,
      y: anchor.rect.y,
      width: anchor.rect.width ?? anchorWidth,
      height: anchor.rect.height ?? zoneRect.height,
    };
  }

  const x =
    kind === "inlet"
      ? zoneRect.x - (anchorWidth - attachDepth)
      : zoneRect.x + zoneRect.width - attachDepth;

  return {
    x,
    y: zoneRect.y,
    width: anchorWidth,
    height: zoneRect.height,
  };
}
