import type { Point } from "./types";

/**
 * 존/패스 흐름의 진행 방향. 레이아웃 헬퍼(기본 앵커), 렌더러(엣지 곡선·패스
 * 노드 배치·앵커 밴드), 에디터(히트테스트·기본 배치)가 공유하는 1급 옵션.
 * 기본값은 {@link DEFAULT_FLOW_DIRECTION}(좌→우)이며, 문서 스키마와는 무관한
 * 순수 표현 옵션이다.
 */
export type FlowDirection = "leftToRight" | "topToBottom";

export const DEFAULT_FLOW_DIRECTION: FlowDirection = "leftToRight";

/**
 * 각 흐름 방향의 내부 각도(도) — **화면 좌표계(y-down)** 기준. SVG `rotate`,
 * CSS, `Math.atan2` 와 같은 규약(0° = 동쪽, 시계방향 양수)이라 `topToBottom`
 * 은 90°다. 수학 교과서 좌표계(y-up)의 270°를 쓰지 않는 이유: 렌더링 파이프
 * 라인 전체가 화면 좌표로 계산하므로, 같은 규약을 쓰면 좌표 변환에서 부호
 * 반전이 아예 등장하지 않는다.
 */
export const FLOW_DIRECTION_ANGLES: Record<FlowDirection, 0 | 90> = {
  leftToRight: 0,
  topToBottom: 90,
};

/**
 * 월드 좌표 → 플로우 프레임(x = 흐름 진행축, y = 교차축). 흐름 기하(엣지
 * 곡선, 리드선, 우회 레인)는 이 프레임에서 방향과 무관하게 한 벌로 계산하고
 * {@link flowPointToWorldPoint} 로 되돌린다.
 *
 * 90°(topToBottom)는 회전이 아니라 대각 반사(x↔y 교환)로 구현한다 — 자기
 * 역원이라 왕복 변환이 같은 함수이고 부호 오류 여지가 없다. 흐름 기하는
 * 교차축 부호에 대칭(우회 방향을 데이터로 고르므로)이라 순수 회전과 시각적
 * 으로 동등하다.
 */
export function worldPointToFlowPoint(
  point: Point,
  direction: FlowDirection
): Point {
  return direction === "topToBottom" ? { x: point.y, y: point.x } : point;
}

/** 플로우 프레임 → 월드 좌표. topToBottom 변환은 자기 역원(x↔y 교환). */
export function flowPointToWorldPoint(
  point: Point,
  direction: FlowDirection
): Point {
  return worldPointToFlowPoint(point, direction);
}

/**
 * 주어진 크기의 존에서 기본 엣지-중앙 앵커의 존-로컬 좌표.
 * leftToRight: 인렛 = 왼쪽 중앙, 아웃렛 = 오른쪽 중앙.
 * topToBottom: 인렛 = 상단 중앙, 아웃렛 = 하단 중앙.
 */
export function resolveDefaultZoneAnchorPoint(params: {
  kind: "inlet" | "outlet";
  width: number;
  height: number;
  flowDirection?: FlowDirection;
}): Point {
  const { kind, width, height, flowDirection = DEFAULT_FLOW_DIRECTION } = params;
  if (flowDirection === "topToBottom") {
    return { x: width / 2, y: kind === "inlet" ? 0 : height };
  }
  return { x: kind === "inlet" ? 0 : width, y: height / 2 };
}
