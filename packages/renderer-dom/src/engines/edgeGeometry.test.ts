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

  describe("forwardStraight — 전방은 직선, 역방향은 곡선", () => {
    it("전방 주행은 리드선 + 직선 + 도착선(큐빅 없음)", () => {
      const source = { x: 0, y: 0 };
      const target = { x: 400, y: 120 };
      const segments = getEdgeSegments({
        source,
        target,
        lineShape: "forwardStraight",
      });

      expect(segments.map((s) => s.kind)).toEqual(["line", "line", "line"]);
      expect(edgeSegmentsToPathD(source, segments)).not.toContain("C ");
      expect(segments[segments.length - 1]).toEqual({
        kind: "line",
        to: target,
      });
    });

    it("리드선은 curved 와 같은 지점에서 꺾인다 — 앵커 진입감이 유지된다", () => {
      const source = { x: 0, y: 0 };
      const target = { x: 400, y: 120 };
      const curved = getEdgeSegments({ source, target });
      const forward = getEdgeSegments({
        source,
        target,
        lineShape: "forwardStraight",
      });

      // 첫 리드선의 도착점과 마지막 도착선의 시작점(=중간 세그먼트 끝)이 같아야
      // 두 모양이 같은 자리에서 앵커에 붙는다.
      expect(forward[0]).toEqual(curved[0]);
      expect(forward[1].to).toEqual(
        (curved[1] as Extract<typeof curved[1], { kind: "cubic" }>).to
      );
    });

    it("역방향은 curved 와 완전히 동일한 우회 레인", () => {
      const source = { x: 0, y: 0 };
      const target = { x: -300, y: 40 };

      expect(
        getEdgeSegments({ source, target, lineShape: "forwardStraight" })
      ).toEqual(getEdgeSegments({ source, target }));
    });

    it("단차가 없으면 curved 와 시각적으로 같은 직선이 된다", () => {
      const source = { x: 0, y: 0 };
      const target = { x: 400, y: 0 };
      const curved = getEdgeSegments({ source, target });
      const forward = getEdgeSegments({
        source,
        target,
        lineShape: "forwardStraight",
      });

      // curved 의 큐빅은 제어점이 전부 y=0 이라 이미 직선이다.
      const cubic = curved[1] as Extract<typeof curved[1], { kind: "cubic" }>;
      expect(cubic.c1.y).toBe(0);
      expect(cubic.c2.y).toBe(0);

      // 두 모양의 통과 지점이 같은 직선 위에 있다.
      for (const points of [
        sampleEdgePolyline({ source, target }),
        sampleEdgePolyline({ source, target, lineShape: "forwardStraight" }),
      ]) {
        for (const point of points) expect(point.y).toBe(0);
      }
      expect(forward.map((s) => s.kind)).toEqual(["line", "line", "line"]);
    });

    it("가까운 끝점은 curved 와 같이 단일 직선", () => {
      const segments = getEdgeSegments({
        source: { x: 0, y: 0 },
        target: { x: 60, y: 30 },
        lineShape: "forwardStraight",
      });
      expect(segments).toEqual([{ kind: "line", to: { x: 60, y: 30 } }]);
    });

    it("히트테스트 샘플도 같은 직선을 따른다 — 그린 선과 클릭 판정이 일치", () => {
      const source = { x: 0, y: 0 };
      const target = { x: 400, y: 120 };
      const points = sampleEdgePolyline({
        source,
        target,
        lineShape: "forwardStraight",
      });

      expect(points[0]).toEqual(source);
      expect(points[points.length - 1]).toEqual(target);
      // 큐빅이 없으므로 꺾임점만 남는다(source + 세그먼트 3개).
      expect(points).toHaveLength(4);
    });
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
