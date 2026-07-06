import type { PathId, Point } from "@zoneflow/core";
import {
  resolveDrawableEdgeSegments,
  sampleEdgePolyline,
  type CameraState,
  type RendererFrame,
  type ResolvePathStyle,
} from "@zoneflow/renderer-dom";

/** 선(엣지) 클릭 판정 거리 — 스크린 px. */
export const DEFAULT_EDGE_HIT_THRESHOLD_PX = 8;

function projectWorldPointToScreen(point: Point, camera: CameraState): Point {
  return {
    x: camera.x + point.x * camera.zoom,
    y: camera.y + point.y * camera.zoom,
  };
}

function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const t =
    lengthSq === 0
      ? 0
      : Math.min(
          1,
          Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq)
        );
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return Math.hypot(p.x - cx, p.y - cy);
}

/**
 * 패스의 **그려지는** 연결선 폴리라인(월드 좌표)들. 렌더러와 같은 규칙 —
 * 라벨 노드가 숨겨진 패스(display "edge"/줌아웃 축약)는 collapse 된 단일
 * 직결선, 그 외에는 존→라벨/라벨→존 두 세그먼트. 곡선 기하도 렌더러의
 * 단일 소스(sampleEdgePolyline)를 그대로 쓴다.
 */
export function samplePathEdgeWorldPolylines(params: {
  frame: RendererFrame;
  pathId: PathId;
  resolvePathStyle?: ResolvePathStyle;
}): Point[][] {
  const { frame, pathId, resolvePathStyle } = params;
  const edges = frame.pipeline.graphLayout.edgesByPathId[pathId];
  if (!edges?.length) return [];
  const visibility = frame.pipeline.visibility.pathVisibilityById[pathId];
  if (!visibility?.shouldRenderEdge) return [];

  const pathVisual = frame.pipeline.graphLayout.pathsById[pathId];
  const lineShape = pathVisual
    ? resolvePathStyle?.(pathVisual.path)?.lineShape
    : undefined;

  return resolveDrawableEdgeSegments({ pathId, edges, visibility }).map(
    ({ edge }) =>
      sampleEdgePolyline({
        source: edge.source,
        target: edge.target,
        lineShape,
        flowDirection: frame.pipeline.flowDirection,
      })
  );
}

/** 폴리라인의 아크 길이 절반 지점 — 라벨 없는 패스의 칩(히트 핸들) 중심. */
export function resolvePolylineMidpoint(points: Point[]): Point | undefined {
  if (points.length === 0) return undefined;
  if (points.length === 1) return points[0];

  let total = 0;
  const lengths: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const length = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
    lengths.push(length);
    total += length;
  }
  if (total === 0) return points[0];

  let remaining = total / 2;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remaining <= lengths[i]) {
      const t = lengths[i] === 0 ? 0 : remaining / lengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}

/**
 * 캔버스 화면 좌표의 점이 어느 패스의 연결선 위(threshold 이내)인지 판정한다.
 * 라벨 유무와 무관하게 모든 패스가 대상 — 빈 캔버스 클릭을 "선 클릭 = 패스
 * 선택"으로 승격시키는 데 쓴다. 여러 선이 겹치면 가장 가까운 패스.
 */
export function resolvePathAtScreenPoint(params: {
  frame: RendererFrame;
  camera: CameraState;
  point: Point;
  thresholdPx?: number;
  resolvePathStyle?: ResolvePathStyle;
}): PathId | null {
  const {
    frame,
    camera,
    point,
    thresholdPx = DEFAULT_EDGE_HIT_THRESHOLD_PX,
    resolvePathStyle,
  } = params;

  let bestPathId: PathId | null = null;
  let bestDistance = thresholdPx;

  for (const pathId of Object.keys(
    frame.pipeline.graphLayout.edgesByPathId
  ) as PathId[]) {
    const polylines = samplePathEdgeWorldPolylines({
      frame,
      pathId,
      resolvePathStyle,
    });

    for (const polyline of polylines) {
      for (let i = 1; i < polyline.length; i += 1) {
        const distance = distancePointToSegment(
          point,
          projectWorldPointToScreen(polyline[i - 1], camera),
          projectWorldPointToScreen(polyline[i], camera)
        );
        if (distance <= bestDistance) {
          bestDistance = distance;
          bestPathId = pathId;
        }
      }
    }
  }

  return bestPathId;
}
