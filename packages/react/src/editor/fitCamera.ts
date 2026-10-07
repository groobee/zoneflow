import type { CameraState, Rect } from "@zoneflow/renderer-dom";

export const FIT_MIN_ZOOM = 0.25;
export const FIT_ABSOLUTE_MAX_ZOOM = 3;
export const FIT_TO_VIEW_PADDING = 64;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 월드 사각형이 뷰포트 안에 (패딩 포함) 들어오도록 가운데 정렬한 카메라.
 * 배율은 `[0.25, maxZoom]` 로 제한 — `maxZoom` 은 수동 줌 상한(3)을 넘지 못한다.
 */
export function fitCameraToWorldRect(params: {
  rect: Rect;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
  maxZoom?: number;
}): CameraState {
  const {
    rect,
    viewportWidth,
    viewportHeight,
    padding = FIT_TO_VIEW_PADDING,
    maxZoom = FIT_ABSOLUTE_MAX_ZOOM,
  } = params;
  const availableWidth = Math.max(viewportWidth - padding * 2, 1);
  const availableHeight = Math.max(viewportHeight - padding * 2, 1);
  const zoom = clamp(
    Math.min(availableWidth / rect.width, availableHeight / rect.height),
    FIT_MIN_ZOOM,
    clamp(maxZoom, FIT_MIN_ZOOM, FIT_ABSOLUTE_MAX_ZOOM)
  );
  const contentWidth = rect.width * zoom;
  const contentHeight = rect.height * zoom;

  return {
    x: padding + (availableWidth - contentWidth) / 2 - rect.x * zoom,
    y: padding + (availableHeight - contentHeight) / 2 - rect.y * zoom,
    zoom,
  };
}

