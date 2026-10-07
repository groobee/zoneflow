import { describe, expect, it } from "vitest";
import { fitCameraToWorldRect } from "./fitCamera.js";

const rect = { x: 100, y: 50, width: 400, height: 200 };

describe("fitCameraToWorldRect", () => {
  it("작은 장면은 maxZoom 에서 멈추고 가운데 정렬한다", () => {
    const camera = fitCameraToWorldRect({
      rect,
      viewportWidth: 1600,
      viewportHeight: 900,
      maxZoom: 1,
    });
    expect(camera.zoom).toBe(1);
    // 장면 중심이 뷰포트 중심(800, 450)에 온다.
    expect(camera.x + (rect.x + rect.width / 2) * camera.zoom).toBeCloseTo(800);
    expect(camera.y + (rect.y + rect.height / 2) * camera.zoom).toBeCloseTo(450);
  });

  it("maxZoom 미지정이면 수동 줌 상한(3)까지 확대된다", () => {
    const camera = fitCameraToWorldRect({
      rect,
      viewportWidth: 1600,
      viewportHeight: 900,
    });
    expect(camera.zoom).toBe(3);
  });

  it("maxZoom 이 수동 줌 상한을 넘어도 3 으로 제한된다", () => {
    const camera = fitCameraToWorldRect({
      rect,
      viewportWidth: 1600,
      viewportHeight: 900,
      maxZoom: 10,
    });
    expect(camera.zoom).toBe(3);
  });

  it("큰 장면은 maxZoom 과 무관하게 뷰포트에 맞춰 축소된다", () => {
    const camera = fitCameraToWorldRect({
      rect: { x: 0, y: 0, width: 2000, height: 1000 },
      viewportWidth: 1128,
      viewportHeight: 664,
      maxZoom: 1,
    });
    expect(camera.zoom).toBeCloseTo(0.5);
  });
});
