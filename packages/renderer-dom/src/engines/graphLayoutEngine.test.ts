import { describe, expect, it, vi } from "vitest";
import type {
  UniverseLayoutModel,
  UniverseModel,
  Zone,
} from "@zoneflow/core";
import { defaultGraphLayoutEngine } from "./graphLayoutEngine";
import { defaultVisibilityEngine } from "./visibilityEngine";

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

// 컨테이너 (0,0) 600×300, 자식 (40,40) 160×80, 외부 존 (800,100) 160×80.
const layoutModel: UniverseLayoutModel = {
  version: "1",
  universeId: "u1",
  zoneLayoutsById: {
    c: {
      x: 0,
      y: 0,
      width: 600,
      height: 300,
      anchors: {
        inlet: { point: { x: 0, y: 150 } },
        outlet: { point: { x: 600, y: 150 } },
      },
    },
    child: {
      x: 40,
      y: 40,
      width: 160,
      height: 80,
      anchors: {
        inlet: { point: { x: 0, y: 40 } },
        outlet: { point: { x: 160, y: 40 } },
      },
    },
    outside: {
      x: 800,
      y: 100,
      width: 160,
      height: 80,
      anchors: {
        inlet: { point: { x: 0, y: 40 } },
        outlet: { point: { x: 160, y: 40 } },
      },
    },
  },
  pathLayoutsById: {},
};

function modelWithPath(sourceId: string, targetId: string): UniverseModel {
  const zones: Record<string, Zone> = {
    c: zone("c", { zoneType: "container", childZoneIds: ["child"] }),
    child: zone("child", { parentZoneId: "c" }),
    outside: zone("outside"),
  };
  zones[sourceId] = {
    ...zones[sourceId],
    pathIds: ["p1"],
    pathsById: {
      p1: {
        id: "p1",
        key: "p1",
        name: "p1",
        target: { universeId: "u1", zoneId: targetId },
        rule: null,
      },
    },
  };
  return {
    version: "1",
    universeId: "u1",
    rootZoneIds: ["c", "outside"],
    zonesById: zones,
  };
}

describe("graph layout edge endpoints", () => {
  it("routes child → ancestor container edges to the ancestor OUTLET (exit)", () => {
    const result = defaultGraphLayoutEngine.compute({
      model: modelWithPath("child", "c"),
      layoutModel,
    });
    const p2z = result.edgesByPathId["p1"].find((e) => e.kind === "path-to-zone")!;
    // 컨테이너 아웃렛 (월드 600, 150) — 인렛 (0,150)이 아니라.
    expect(p2z.target).toEqual({ x: 600, y: 150 });
  });

  it("keeps normal edges at the target INLET", () => {
    const result = defaultGraphLayoutEngine.compute({
      model: modelWithPath("outside", "c"),
      layoutModel,
    });
    const p2z = result.edgesByPathId["p1"].find((e) => e.kind === "path-to-zone")!;
    expect(p2z.target).toEqual({ x: 0, y: 150 });
  });
});

function modelWithDanglingPath(sourceId: string): UniverseModel {
  const model = modelWithPath(sourceId, "c");
  const source = model.zonesById[sourceId];
  return {
    ...model,
    zonesById: {
      ...model.zonesById,
      [sourceId]: {
        ...source,
        pathsById: {
          p1: { ...source.pathsById["p1"], target: null },
        },
      },
    },
  };
}

describe("resolvePathDisplay — 패스 표시 형태", () => {
  it('리졸버가 "edge" 를 반환하면 PathVisualNode.display 에 찍힌다', () => {
    const result = defaultGraphLayoutEngine.compute({
      model: modelWithPath("outside", "c"),
      layoutModel,
      resolvePathDisplay: () => "edge",
    });
    expect(result.pathsById["p1"].display).toBe("edge");
  });

  it('dangling 패스는 "edge" 를 반환해도 무시된다 (노드 강제 유지)', () => {
    const result = defaultGraphLayoutEngine.compute({
      model: modelWithDanglingPath("outside"),
      layoutModel,
      resolvePathDisplay: () => "edge",
    });
    expect(result.pathsById["p1"].display).toBeUndefined();
  });

  it("리졸버가 throw 하면 기본(undefined)으로 처리된다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = defaultGraphLayoutEngine.compute({
      model: modelWithPath("outside", "c"),
      layoutModel,
      resolvePathDisplay: () => {
        throw new Error("boom");
      },
    });
    expect(result.pathsById["p1"].display).toBeUndefined();
    errorSpy.mockRestore();
  });

  it('display "edge" 패스는 visibility 에서 노드/라벨 렌더가 꺼진다', () => {
    const graphLayout = defaultGraphLayoutEngine.compute({
      model: modelWithPath("outside", "c"),
      layoutModel,
      resolvePathDisplay: () => "edge",
    });
    const visibility = defaultVisibilityEngine.compute({
      base: {
        viewportInfo: {
          world: { x: -1000, y: -1000, width: 4000, height: 4000 },
        },
      },
      graphLayout,
      density: { zoneDensityById: {}, pathDensityById: { p1: "full" } },
    } as never);

    const pathVisibility = visibility.pathVisibilityById["p1"];
    expect(pathVisibility.shouldRenderNode).toBe(false);
    expect(pathVisibility.shouldRenderLabel).toBe(false);
    expect(pathVisibility.shouldRenderEdge).toBe(true);
  });
});
