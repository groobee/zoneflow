import type { PathLineShape } from "@zoneflow/renderer-dom";

/**
 * 상단 툴바에서 순환시키는 연결선 모양. 라이브러리의 `PathLineShape` 전체를
 * 그대로 쓴다 — 데모가 값 하나를 빠뜨리면 그 모양은 아무도 눈으로 못 본다.
 */
export type PlaygroundPathLineShape = PathLineShape;

const CYCLE: readonly PlaygroundPathLineShape[] = [
  "curved",
  "forwardStraight",
  "straight",
];

export const playgroundPathLineShapeLabel: Record<
  PlaygroundPathLineShape,
  string
> = {
  curved: "곡선",
  forwardStraight: "전방직선",
  straight: "직선",
};

export const playgroundPathLineShapeHint: Record<
  PlaygroundPathLineShape,
  string
> = {
  curved: "기본 — 단차가 있으면 큐빅 S, 역방향은 레인 우회.",
  forwardStraight:
    "전방은 리드선 + 직선(큐빅 없음), 역방향은 곡선 그대로. 단차 없으면 곡선과 동일.",
  straight: "앵커 방향 무시하고 outlet→inlet 을 한 직선으로.",
};

export function nextPlaygroundPathLineShape(
  current: PlaygroundPathLineShape
): PlaygroundPathLineShape {
  const index = CYCLE.indexOf(current);
  return CYCLE[(index + 1) % CYCLE.length];
}
