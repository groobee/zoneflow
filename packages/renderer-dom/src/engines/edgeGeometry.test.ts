import { describe, expect, it } from "vitest";
import {
  edgeSegmentsToPathD,
  getEdgeSegments,
  sampleEdgePolyline,
} from "./edgeGeometry";

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

  describe("flowDirection: topToBottom — 가로 기하의 정확한 x↔y 미러", () => {
    const swap = (p: { x: number; y: number }) => ({ x: p.y, y: p.x });

    it("세로 곡선은 가로 곡선을 대각 반사한 것과 좌표까지 동일", () => {
      const source = { x: 50, y: 20 };
      const target = { x: 130, y: 420 };
      const vertical = getEdgeSegments({
        source,
        target,
        flowDirection: "topToBottom",
      });
      const horizontalMirror = getEdgeSegments({
        source: swap(source),
        target: swap(target),
      });

      expect(vertical.length).toBe(horizontalMirror.length);
      vertical.forEach((segment, i) => {
        const mirror = horizontalMirror[i];
        expect(segment.kind).toBe(mirror.kind);
        expect(segment.to).toEqual(swap(mirror.to));
        if (segment.kind === "cubic" && mirror.kind === "cubic") {
          expect(segment.c1).toEqual(swap(mirror.c1));
          expect(segment.c2).toEqual(swap(mirror.c2));
        }
      });
    });

    it("세로 일반 곡선의 리드선은 아래(+y)로 나간다", () => {
      const source = { x: 100, y: 0 };
      const target = { x: 140, y: 400 };
      const segments = getEdgeSegments({
        source,
        target,
        flowDirection: "topToBottom",
      });
      expect(segments[0].kind).toBe("line");
      // 리드선: x 고정, y 만 전진
      expect(segments[0].to.x).toBe(source.x);
      expect(segments[0].to.y).toBeGreaterThan(source.y);
    });

    it("역방향(위로 거슬러 오르는) 연결은 우회 레인을 탄다", () => {
      const source = { x: 0, y: 0 };
      const target = { x: 10, y: -200 };
      const points = sampleEdgePolyline({
        source,
        target,
        flowDirection: "topToBottom",
      });
      expect(points[0]).toEqual(source);
      expect(points[points.length - 1]).toEqual(target);
      expect(points.length).toBeGreaterThan(10);
    });

    it("leftToRight(기본)는 flowDirection 미지정과 동일", () => {
      const source = { x: 0, y: 0 };
      const target = { x: 400, y: 120 };
      expect(
        getEdgeSegments({ source, target, flowDirection: "leftToRight" })
      ).toEqual(getEdgeSegments({ source, target }));
    });
  });
});
