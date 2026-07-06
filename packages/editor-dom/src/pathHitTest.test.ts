import { describe, expect, it } from "vitest";
import type { RendererFrame } from "@zoneflow/renderer-dom";
import {
  resolvePathAtScreenPoint,
  resolvePolylineMidpoint,
} from "./pathHitTest";

const CAMERA = { x: 0, y: 0, zoom: 1 };

/**
 * 라벨 노드가 있는 패스(p1: (0,100)→(60,100) 근접 직선 두 세그먼트)와
 * 라벨 없는 display "edge" 패스(p2: (0,300)→(60,300) collapse 단일 직선).
 * 끝점을 72×48 이내로 둬 곡선 규칙이 직선을 그리게 해서 기대 좌표를 단순화.
 */
const frame = {
  pipeline: {
    graphLayout: {
      pathsById: {
        p1: { pathId: "p1", path: { id: "p1" }, rect: { x: 20, y: 90, width: 20, height: 20 } },
        p2: { pathId: "p2", path: { id: "p2" }, display: "edge" },
      },
      edgesByPathId: {
        p1: [
          { id: "p1:z2p", pathId: "p1", kind: "zone-to-path", source: { x: 0, y: 100 }, target: { x: 20, y: 100 } },
          { id: "p1:p2z", pathId: "p1", kind: "path-to-zone", source: { x: 40, y: 100 }, target: { x: 60, y: 100 } },
        ],
        p2: [
          { id: "p2:z2p", pathId: "p2", kind: "zone-to-path", source: { x: 0, y: 300 }, target: { x: 30, y: 300 } },
          { id: "p2:p2z", pathId: "p2", kind: "path-to-zone", source: { x: 30, y: 300 }, target: { x: 60, y: 300 } },
        ],
      },
    },
    visibility: {
      pathVisibilityById: {
        p1: { shouldRenderNode: true, shouldRenderEdge: true },
        p2: { shouldRenderNode: false, shouldRenderEdge: true },
      },
    },
  },
} as unknown as RendererFrame;

describe("resolvePathAtScreenPoint — 선 클릭 판정", () => {
  it("선 근처(threshold 이내) 클릭은 해당 패스를 반환한다", () => {
    expect(
      resolvePathAtScreenPoint({
        frame,
        camera: CAMERA,
        point: { x: 10, y: 105 },
      })
    ).toBe("p1");
  });

  it("라벨 없는(collapse) 패스의 직결선도 잡힌다", () => {
    expect(
      resolvePathAtScreenPoint({
        frame,
        camera: CAMERA,
        point: { x: 45, y: 303 },
      })
    ).toBe("p2");
  });

  it("threshold 밖이면 null", () => {
    expect(
      resolvePathAtScreenPoint({
        frame,
        camera: CAMERA,
        point: { x: 30, y: 200 },
      })
    ).toBeNull();
  });

  it("줌을 반영해 스크린 좌표로 판정한다", () => {
    expect(
      resolvePathAtScreenPoint({
        frame,
        camera: { x: 0, y: 0, zoom: 2 },
        point: { x: 20, y: 605 }, // 월드 (10, 302.5) 근처
      })
    ).toBe("p2");
  });
});

describe("resolvePolylineMidpoint — 아크 길이 절반 지점", () => {
  it("직선 폴리라인의 중점", () => {
    expect(
      resolvePolylineMidpoint([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])
    ).toEqual({ x: 50, y: 0 });
  });

  it("꺾인 폴리라인은 좌표 평균이 아니라 경로 위의 중간", () => {
    const mid = resolvePolylineMidpoint([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(mid).toEqual({ x: 100, y: 0 });
  });
});
