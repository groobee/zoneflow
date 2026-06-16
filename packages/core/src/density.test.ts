import { describe, expect, it } from "vitest";
import { scaleLayoutDensity } from "./layout";
import type { UniverseLayoutModel, UniverseModel, Zone } from "./types";

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

describe("scaleLayoutDensity", () => {
  it("returns the input unchanged for the neutral 1/1 transform", () => {
    expect(
      scaleLayoutDensity(model, layoutModel, { sizeScale: 1, spacingScale: 1 })
    ).toBe(layoutModel);
  });

  it("scales every zone's size by sizeScale", () => {
    const out = scaleLayoutDensity(model, layoutModel, { sizeScale: 2 });
    expect(out.zoneLayoutsById.a.width).toBe(400);
    expect(out.zoneLayoutsById.a.height).toBe(200);
    expect(out.zoneLayoutsById.c.width).toBe(160);
    expect(out.zoneLayoutsById.c.height).toBe(80);
    // anchor offsets track the new size
    expect(out.zoneLayoutsById.a.anchors.outlet.point.x).toBe(400);
  });

  it("scales root spacing about the centroid (denser = closer)", () => {
    // roots a(100) and b(500): centroid x = 300. spacingScale 0.5 halves the gap.
    const out = scaleLayoutDensity(model, layoutModel, { spacingScale: 0.5 });
    expect(out.zoneLayoutsById.a.x).toBe(200); // 300 + (100-300)*0.5
    expect(out.zoneLayoutsById.b.x).toBe(400); // 300 + (500-300)*0.5
    // gap 400 → 200
    expect(out.zoneLayoutsById.b.x - out.zoneLayoutsById.a.x).toBe(200);
  });

  it("keeps a child's subtree uniform so containment is preserved", () => {
    // child offset is relative to parent; it scales by sizeScale (not spacing),
    // so the child stays at the same proportional spot inside the grown parent.
    const out = scaleLayoutDensity(model, layoutModel, {
      sizeScale: 2,
      spacingScale: 0.5,
    });
    expect(out.zoneLayoutsById.c.x).toBe(40); // 20 * 2  (sizeScale, not spacing)
    expect(out.zoneLayoutsById.c.y).toBe(40);
    // child right edge 40 + 160 = 200 ≤ parent width 400 → contained
    expect(
      out.zoneLayoutsById.c.x + (out.zoneLayoutsById.c.width ?? 0)
    ).toBeLessThanOrEqual(out.zoneLayoutsById.a.width ?? 0);
  });

  it("scales path routeOffset by spacingScale", () => {
    const out = scaleLayoutDensity(model, layoutModel, { spacingScale: 0.5 });
    expect(out.pathLayoutsById.p1.routeOffset).toEqual({ x: 20, y: 5 });
  });
});
