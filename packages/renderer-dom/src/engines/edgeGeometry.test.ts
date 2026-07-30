import { describe, expect, it } from "vitest";
import {
  edgeSegmentsToPathD,
  getEdgeSegments,
  sampleEdgePolyline,
} from "./edgeGeometry.js";

describe("edgeGeometry — 연결선 기하 단일 소스", () => {
  it("straight 는 단일 직선 세그먼트", () => {
    const segments = getEdgeSegments({
      source: { x: 0, y: 0 },
      target: { x: 300, y: 100 },
      lineShape: "straight",
    });
    expect(segments).toEqual([{ kind: "line", to: { x: 300, y: 100 } }]);
  });

  it("가까운 끝점(72×48 이내)은 곡선 없이 직선", () => {
    const segments = getEdgeSegments({
      source: { x: 0, y: 0 },
      target: { x: 60, y: 30 },
    });
    expect(segments).toEqual([{ kind: "line", to: { x: 60, y: 30 } }]);
  });

  it("일반 곡선은 리드선 + 큐빅 + 도착선, d 문자열도 동일 구조", () => {
    const source = { x: 0, y: 0 };
    const target = { x: 400, y: 120 };
    const segments = getEdgeSegments({ source, target });
    expect(segments.map((s) => s.kind)).toEqual(["line", "cubic", "line"]);

    const d = edgeSegmentsToPathD(source, segments);
    expect(d.startsWith("M 0 0 L ")).toBe(true);
    expect(d).toContain("C ");
    expect(d.endsWith("L 400 120")).toBe(true);
  });

  it("샘플 폴리라인은 source 에서 시작해 target 에서 끝난다 (우회 레인 포함)", () => {
    const source = { x: 0, y: 0 };
    // targetApproachX - leadSourceX < 36 → 우회(route-around) 케이스
    const target = { x: -200, y: 10 };
    const points = sampleEdgePolyline({ source, target });

    expect(points[0]).toEqual(source);
    expect(points[points.length - 1]).toEqual(target);
    // 큐빅 2개가 샘플링되어 충분한 중간점이 있어야 한다.
    expect(points.length).toBeGreaterThan(10);
  });
});
