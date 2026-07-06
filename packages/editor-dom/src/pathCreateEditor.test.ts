import { describe, expect, it } from "vitest";
import type { UniverseModel, Zone } from "@zoneflow/core";
import type { RendererFrame } from "@zoneflow/renderer-dom";
import {
  createPathFromOutputAnchorDrag,
  createPathFromZone,
} from "./pathCreateEditor";

const NODE_W = 120;
const NODE_H = 32;
const NODE_OFFSET_X = 32;

function zone(id: string, over: Partial<Zone> = {}): Zone {
  return {
    id,
    parentZoneId: null,
    name: id,
    zoneType: "action",
    childZoneIds: [],
    pathIds: [],
    pathsById: {},
    ...over,
  };
}

// 컨테이너 c: 월드 (100, 50) 600×300. 자식 child: 월드 (140, 90) 160×80.
// 외부 존 outside: 월드 (900, 100) 160×80.
const model: UniverseModel = {
  version: "1",
  universeId: "u1",
  rootZoneIds: ["c", "outside"],
  zonesById: {
    c: zone("c", { zoneType: "container", childZoneIds: ["child"] }),
    child: zone("child", { parentZoneId: "c" }),
    outside: zone("outside"),
  },
};

const layoutModel = {
  version: "1",
  universeId: "u1",
  zoneLayoutsById: {},
  pathLayoutsById: {},
};

// createPathFromOutputAnchorDrag 는 frame.pipeline.graphLayout.zonesById 의
// 앵커(월드 좌표)만 읽는다 — 그 최소 형태만 mock 한다.
const frame = {
  pipeline: {
    graphLayout: {
      zonesById: {
        c: {
          zoneId: "c",
          zone: model.zonesById["c"],
          rect: { x: 100, y: 50, width: 600, height: 300 },
          anchors: {
            inlet: { point: { x: 100, y: 200 } },
            outlet: { point: { x: 700, y: 200 } },
          },
        },
        child: {
          zoneId: "child",
          zone: model.zonesById["child"],
          rect: { x: 140, y: 90, width: 160, height: 80 },
          anchors: {
            inlet: { point: { x: 140, y: 130 } },
            outlet: { point: { x: 300, y: 130 } },
          },
        },
        outside: {
          zoneId: "outside",
          zone: model.zonesById["outside"],
          rect: { x: 900, y: 100, width: 160, height: 80 },
          anchors: {
            inlet: { point: { x: 900, y: 140 } },
            outlet: { point: { x: 1060, y: 140 } },
          },
        },
      },
    },
  },
} as unknown as RendererFrame;

/** routeOffset → 라벨 노드 중앙 복원 (graphLayoutEngine.resolvePathNodeRect 규칙). */
function nodeCenterFromRouteOffset(
  sourceOutlet: { x: number; y: number },
  routeOffset: { x: number; y: number }
) {
  return {
    x: sourceOutlet.x + NODE_OFFSET_X + routeOffset.x + NODE_W / 2,
    y: sourceOutlet.y - NODE_H / 2 + routeOffset.y + NODE_H / 2,
  };
}

describe("createPathFromOutputAnchorDrag — 라벨 위치", () => {
  it("자식 → 조상 컨테이너(exit) 연결은 소스 아웃렛과 컨테이너 아웃렛 사이에 라벨을 놓는다", () => {
    const result = createPathFromOutputAnchorDrag({
      model,
      layoutModel,
      frame,
      sourceZoneId: "child",
      dropWorldPoint: { x: 695, y: 200 },
      targetZoneId: "c",
    })!;
    expect(result).toBeTruthy();

    const routeOffset = result.layoutModel.pathLayoutsById[result.pathId]!.routeOffset!;
    const center = nodeCenterFromRouteOffset({ x: 300, y: 130 }, routeOffset);
    // midpoint(자식 아웃렛 (300,130), 컨테이너 아웃렛 (700,200)) = (500, 165)
    expect(center).toEqual({ x: 500, y: 165 });
    // 라벨 전체가 자식 오른쪽 끝과 컨테이너 오른쪽 끝 사이(컨테이너 안)
    expect(center.x - NODE_W / 2).toBeGreaterThan(300);
    expect(center.x + NODE_W / 2).toBeLessThan(700);
  });

  it("일반 연결은 기존대로 소스 아웃렛과 타깃 인렛 사이에 라벨을 놓는다", () => {
    const result = createPathFromOutputAnchorDrag({
      model,
      layoutModel,
      frame,
      sourceZoneId: "c",
      dropWorldPoint: { x: 905, y: 140 },
      targetZoneId: "outside",
    })!;
    expect(result).toBeTruthy();

    const routeOffset = result.layoutModel.pathLayoutsById[result.pathId]!.routeOffset!;
    const center = nodeCenterFromRouteOffset({ x: 700, y: 200 }, routeOffset);
    // midpoint(컨테이너 아웃렛 (700,200), outside 인렛 (900,140)) = (800, 170)
    expect(center).toEqual({ x: 800, y: 170 });
  });
});

describe("createPathFromZone — 프로그래매틱(앵커 클릭) 생성", () => {
  it("타깃·labelWorldPoint 없이 만들면 레이아웃을 기록하지 않아 기본 스택 배치가 적용된다", () => {
    const result = createPathFromZone({
      model,
      layoutModel,
      sourceZoneId: "outside",
    })!;
    expect(result).toBeTruthy();

    // layout 미기록 → graphLayoutEngine 이 아웃렛 우측 기본 위치에 라벨을 놓는다.
    expect(result.layoutModel.pathLayoutsById[result.pathId]).toBeUndefined();
    const created =
      result.model.zonesById["outside"]!.pathsById[result.pathId]!;
    expect(created.key).toBe("condition_1");
    expect(created.name).toBe("Empty");
    expect(created.rule).toBeNull();
    expect(created.target).toBeNull();
  });

  it("path 오버라이드(name/rule/meta)가 초기값 대신 쓰인다", () => {
    const result = createPathFromZone({
      model,
      layoutModel,
      sourceZoneId: "outside",
      path: {
        name: "허용",
        rule: { type: "allow" },
        meta: { origin: "anchor-click" },
      },
    })!;

    const created =
      result.model.zonesById["outside"]!.pathsById[result.pathId]!;
    expect(created.name).toBe("허용");
    expect(created.rule).toEqual({ type: "allow" });
    expect(created.meta).toEqual({ origin: "anchor-click" });
  });

  it("타깃과 frame 이 있으면 드래그와 같은 규칙(연결점 중간)으로 라벨을 놓는다", () => {
    const result = createPathFromZone({
      model,
      layoutModel,
      frame,
      sourceZoneId: "c",
      targetZoneId: "outside",
    })!;

    const routeOffset = result.layoutModel.pathLayoutsById[result.pathId]!.routeOffset!;
    const center = nodeCenterFromRouteOffset({ x: 700, y: 200 }, routeOffset);
    expect(center).toEqual({ x: 800, y: 170 });
    expect(result.model.zonesById["c"]!.pathsById[result.pathId]!.target).toEqual({
      universeId: "u1",
      zoneId: "outside",
    });
  });

  it("canConnect 가 거부하면 타깃이 null 로 강등된 dangling 패스가 된다", () => {
    const result = createPathFromZone({
      model,
      layoutModel,
      sourceZoneId: "outside",
      targetZoneId: "c",
      canConnect: () => false,
    })!;

    expect(result.model.zonesById["outside"]!.pathsById[result.pathId]!.target).toBeNull();
  });
});
