import type { AnchorRect, FlowDirection, Point } from "@zoneflow/core";
import type { Rect } from "./types";

export type ZoneAnchorKind = "inlet" | "outlet";

type AnchorGeometry = {
  point: Point;
  rect?: AnchorRect;
};

const DEFAULT_ANCHOR_WIDTH = 24;
const DEFAULT_ANCHOR_ATTACH_DEPTH = 10;

/**
 * 존 앵커 밴드의 월드 사각형. 흐름 진입/탈출 엣지에 걸친 밴드 —
 * leftToRight 는 좌/우 엣지의 세로 밴드, topToBottom 은 상/하 엣지의 가로
 * 밴드. 커스텀 `anchor.rect` 가 있으면 그대로 쓴다(방향 무관, 소비자 소관).
 */
export function resolveZoneAnchorRect(params: {
  zoneRect: Rect;
  anchor: AnchorGeometry;
  kind: ZoneAnchorKind;
  flowDirection?: FlowDirection;
}): Rect {
  const { zoneRect, anchor, kind, flowDirection } = params;
  const vertical = flowDirection === "topToBottom";

  if (anchor.rect) {
    return {
      x: anchor.rect.x,
      y: anchor.rect.y,
      width:
        anchor.rect.width ?? (vertical ? zoneRect.width : DEFAULT_ANCHOR_WIDTH),
      height:
        anchor.rect.height ??
        (vertical ? DEFAULT_ANCHOR_WIDTH : zoneRect.height),
    };
  }

  if (vertical) {
    const y =
      kind === "inlet"
        ? zoneRect.y - (DEFAULT_ANCHOR_WIDTH - DEFAULT_ANCHOR_ATTACH_DEPTH)
        : zoneRect.y + zoneRect.height - DEFAULT_ANCHOR_ATTACH_DEPTH;

    return {
      x: zoneRect.x,
      y,
      width: zoneRect.width,
      height: DEFAULT_ANCHOR_WIDTH,
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
