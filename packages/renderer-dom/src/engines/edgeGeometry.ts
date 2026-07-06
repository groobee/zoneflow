import {
  DEFAULT_FLOW_DIRECTION,
  flowPointToWorldPoint,
  worldPointToFlowPoint,
  type FlowDirection,
  type Point,
} from "@zoneflow/core";
import type { PathLineShape } from "../types";

/**
 * 연결선(엣지) 기하의 단일 소스. drawEngine 이 그리는 SVG path 와 에디터의
 * 히트테스트(선 클릭 판정)가 **같은 곡선**을 봐야 하므로, 세그먼트 계산을
 * 여기로 모으고 양쪽이 이 모듈을 쓴다 — "두 엔진이 합의해야 하는 사실은
 * 라이브러리의 단일 리졸버" 원칙.
 */
export type EdgeGeometrySegment =
  | { kind: "line"; to: Point }
  | { kind: "cubic"; c1: Point; c2: Point; to: Point };

/**
 * source→target 연결선의 세그먼트 목록(시작점 제외). lineShape "straight" 는
 * 단일 직선, "curved"(기본)는 drawEngine 의 기존 규칙 그대로 — 가까우면 직선,
 * 역방향/근접이면 우회 레인, 그 외 리드선 + 큐빅. flowDirection(기본 좌→우)이
 * topToBottom 이면 같은 규칙을 플로우 프레임(x↔y 교환)에서 계산해 되돌린다.
 */
export function getEdgeSegments(params: {
  source: Point;
  target: Point;
  lineShape?: PathLineShape;
  flowDirection?: FlowDirection;
}): EdgeGeometrySegment[] {
  const { source, target, lineShape } = params;
  const flowDirection = params.flowDirection ?? DEFAULT_FLOW_DIRECTION;

  if (lineShape === "straight") {
    return [{ kind: "line", to: target }];
  }

  const segments = getEdgeSegmentsInFlowFrame(
    worldPointToFlowPoint(source, flowDirection),
    worldPointToFlowPoint(target, flowDirection)
  );
  if (flowDirection === DEFAULT_FLOW_DIRECTION) return segments;

  return segments.map((segment) =>
    segment.kind === "line"
      ? { kind: "line", to: flowPointToWorldPoint(segment.to, flowDirection) }
      : {
          kind: "cubic",
          c1: flowPointToWorldPoint(segment.c1, flowDirection),
          c2: flowPointToWorldPoint(segment.c2, flowDirection),
          to: flowPointToWorldPoint(segment.to, flowDirection),
        }
  );
}

/**
 * 곡선 규칙 본체 — 플로우 프레임(x = 흐름 진행축, y = 교차축) 좌표를 받는다.
 * leftToRight 에서는 월드 좌표 그대로라 기존 동작과 동일하다.
 */
function getEdgeSegmentsInFlowFrame(
  source: Point,
  target: Point
): EdgeGeometrySegment[] {
  const distanceX = Math.abs(target.x - source.x);
  const distanceY = Math.abs(target.y - source.y);

  if (distanceX <= 72 && distanceY <= 48) {
    return [{ kind: "line", to: target }];
  }

  const sourceLead = Math.min(Math.max(Math.abs(target.x - source.x) * 0.18, 18), 42);
  const leadSourceX = source.x + sourceLead;
  const targetLead = Math.min(Math.max(Math.abs(target.x - source.x) * 0.16, 18), 42);
  const targetApproachX = target.x - targetLead;
  const shouldRouteAround = targetApproachX - leadSourceX < 36;

  if (shouldRouteAround) {
    const bridgeDistance = Math.abs(leadSourceX - targetApproachX);
    const midX = (leadSourceX + targetApproachX) / 2;
    const sourceBendX =
      leadSourceX + Math.min(Math.max(bridgeDistance * 0.22, 28), 72);
    const targetBendX =
      targetApproachX - Math.min(Math.max(bridgeDistance * 0.22, 28), 72);
    const verticalGap = Math.abs(target.y - source.y);
    const verticalDirection = target.y >= source.y ? 1 : -1;
    const laneOffset = Math.min(
      Math.max(Math.abs(target.x - source.x) * 0.22 + 48, 56),
      144
    );
    const laneY =
      (source.y + target.y) / 2 +
      (verticalGap < 36 ? verticalDirection * laneOffset : 0);

    return [
      { kind: "line", to: { x: leadSourceX, y: source.y } },
      {
        kind: "cubic",
        c1: { x: sourceBendX, y: source.y },
        c2: { x: sourceBendX, y: laneY },
        to: { x: midX, y: laneY },
      },
      {
        kind: "cubic",
        c1: { x: targetBendX, y: laneY },
        c2: { x: targetBendX, y: target.y },
        to: { x: targetApproachX, y: target.y },
      },
      { kind: "line", to: target },
    ];
  }

  const dx = targetApproachX - leadSourceX;
  const handle = Math.min(Math.max(Math.abs(dx) * 0.45, 28), 104);

  return [
    { kind: "line", to: { x: leadSourceX, y: source.y } },
    {
      kind: "cubic",
      c1: { x: leadSourceX + handle, y: source.y },
      c2: { x: targetApproachX - handle, y: target.y },
      to: { x: targetApproachX, y: target.y },
    },
    { kind: "line", to: target },
  ];
}

/** 세그먼트 목록 → SVG path `d`. drawEngine 이 사용. */
export function edgeSegmentsToPathD(
  source: Point,
  segments: EdgeGeometrySegment[]
): string {
  const parts = [`M ${source.x} ${source.y}`];
  for (const segment of segments) {
    if (segment.kind === "line") {
      parts.push(`L ${segment.to.x} ${segment.to.y}`);
    } else {
      parts.push(
        `C ${segment.c1.x} ${segment.c1.y}, ${segment.c2.x} ${segment.c2.y}, ${segment.to.x} ${segment.to.y}`
      );
    }
  }
  return parts.join(" ");
}

function evaluateCubic(
  from: Point,
  segment: Extract<EdgeGeometrySegment, { kind: "cubic" }>,
  t: number
): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * from.x + b * segment.c1.x + c * segment.c2.x + d * segment.to.x,
    y: a * from.y + b * segment.c1.y + c * segment.c2.y + d * segment.to.y,
  };
}

/**
 * 연결선을 월드 좌표 폴리라인으로 샘플링한다 — 에디터의 "선 클릭" 히트테스트용.
 * 직선 구간은 끝점만, 큐빅 구간은 `curveSamples` 등분으로 샘플. 반환 배열은
 * source 를 포함한 경로 위의 순차 점들.
 */
export function sampleEdgePolyline(params: {
  source: Point;
  target: Point;
  lineShape?: PathLineShape;
  flowDirection?: FlowDirection;
  curveSamples?: number;
}): Point[] {
  const { source, target, lineShape, flowDirection, curveSamples = 12 } = params;
  const segments = getEdgeSegments({ source, target, lineShape, flowDirection });
  const points: Point[] = [source];
  let cursor = source;

  for (const segment of segments) {
    if (segment.kind === "line") {
      points.push(segment.to);
    } else {
      for (let step = 1; step <= curveSamples; step += 1) {
        points.push(evaluateCubic(cursor, segment, step / curveSamples));
      }
    }
    cursor = segment.to;
  }

  return points;
}
