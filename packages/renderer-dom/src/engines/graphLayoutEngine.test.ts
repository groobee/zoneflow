import { describe, expect, it } from "vitest";
import type {
  UniverseLayoutModel,
  UniverseModel,
  Zone,
} from "@zoneflow/core";
import { defaultGraphLayoutEngine } from "./graphLayoutEngine";

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
