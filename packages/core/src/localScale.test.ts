import { describe, expect, it } from "vitest";
import { applyLocalScale } from "./layout.js";
import type { UniverseLayoutModel, UniverseModel, Zone } from "./types.js";

function zone(id: string, parentZoneId: string | null = null): Zone {
  return {
    id,
    parentZoneId,
    name: id,
    zoneType: "action",
    childZoneIds: [],
    pathIds: [],
    pathsById: {},
  };
}

function zl(
  x: number,
  y: number,
  width: number,
  height: number
): UniverseLayoutModel["zoneLayoutsById"][string] {
  return {
    x,
    y,
    width,
    height,
    anchors: {
      inlet: { point: { x: 0, y: height / 2 } },
      outlet: { point: { x: width, y: height / 2 } },
    },
  };
}

// Two roots + one child of the first root.
const model: UniverseModel = {
  version: "1",
  universeId: "u1",
  rootZoneIds: ["a", "b"],
  zonesById: {
    a: { ...zone("a"), childZoneIds: ["c"] },
    b: zone("b"),
    c: zone("c", "a"),
  },
};

const layoutModel: UniverseLayoutModel = {
  version: "1",
  universeId: "u1",
  zoneLayoutsById: {
    a: zl(100, 100, 200, 100),
    b: zl(500, 100, 200, 100),
    c: zl(20, 20, 80, 40), // relative to parent a
  },
  pathLayoutsById: {
    p1: { routeOffset: { x: 40, y: 10 } },
  },
};

describe("applyLocalScale", () => {
  it("returns the input unchanged for scale 1", () => {
    expect(applyLocalScale(model, layoutModel, 1)).toBe(layoutModel);
  });

  it("scales every zone's size (and anchor offsets) by the factor", () => {
    const out = applyLocalScale(model, layoutModel, 2);
    expect(out.zoneLayoutsById.a.width).toBe(400);
    expect(out.zoneLayoutsById.a.height).toBe(200);
    expect(out.zoneLayoutsById.c.width).toBe(160);
    expect(out.zoneLayoutsById.a.anchors.outlet.point.x).toBe(400);
  });

  it("leaves root positions untouched (no spacing change)", () => {
    const out = applyLocalScale(model, layoutModel, 2);
    expect(out.zoneLayoutsById.a.x).toBe(100);
    expect(out.zoneLayoutsById.a.y).toBe(100);
    expect(out.zoneLayoutsById.b.x).toBe(500);
  });

  it("keeps each subtree uniform so children stay contained", () => {
    const out = applyLocalScale(model, layoutModel, 2);
    // child offset is relative to parent → scales with it
    expect(out.zoneLayoutsById.c.x).toBe(40); // 20 * 2
    expect(out.zoneLayoutsById.c.y).toBe(40);
    // child right edge 40 + 160 = 200 ≤ parent width 400 → contained
    expect(
      out.zoneLayoutsById.c.x + (out.zoneLayoutsById.c.width ?? 0)
    ).toBeLessThanOrEqual(out.zoneLayoutsById.a.width ?? 0);
  });

  it("scales path routeOffset so path nodes track the scaled elements", () => {
    const out = applyLocalScale(model, layoutModel, 0.5);
    expect(out.pathLayoutsById.p1.routeOffset).toEqual({ x: 20, y: 5 });
  });
});
