import { describe, expect, it } from "vitest";
import { resizeZoneLayout } from "./layout.js";
import type { UniverseLayoutModel } from "./types.js";

function layoutModel(): UniverseLayoutModel {
  return {
    version: "1",
    universeId: "u1",
    zoneLayoutsById: {
      z1: {
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        anchors: {
          inlet: { point: { x: 0, y: 50 } },
          outlet: { point: { x: 200, y: 50 } },
        },
      },
    },
    pathLayoutsById: {},
  };
}

describe("resizeZoneLayout", () => {
  it("moves the anchors onto the new edges", () => {
    const out = resizeZoneLayout(layoutModel(), "z1", {
      width: 320,
      height: 208,
    });
    const z = out.zoneLayoutsById.z1;
    expect(z.width).toBe(320);
    expect(z.height).toBe(208);
    // outlet stays on the right edge, both anchors re-center vertically
    expect(z.anchors.outlet.point).toEqual({ x: 320, y: 104 });
    expect(z.anchors.inlet.point).toEqual({ x: 0, y: 104 });
  });

  it("shrinking keeps the outlet glued to the (smaller) right edge", () => {
    const out = resizeZoneLayout(layoutModel(), "z1", { width: 46, height: 44 });
    expect(out.zoneLayoutsById.z1.anchors.outlet.point).toEqual({ x: 46, y: 22 });
  });

  it("repositions a custom anchor rect to the new edge", () => {
    const lm = layoutModel();
    lm.zoneLayoutsById.z1.anchors.outlet = {
      point: { x: 200, y: 50 },
      rect: { x: 188, y: 38, width: 12, height: 24 },
    };
    const out = resizeZoneLayout(lm, "z1", { width: 320, height: 100 });
    const rect = out.zoneLayoutsById.z1.anchors.outlet.rect!;
    expect(rect.x).toBe(308); // 320 - 12, flush to right edge
  });

  it("no-ops when size is unchanged", () => {
    const lm = layoutModel();
    expect(resizeZoneLayout(lm, "z1", { width: 200, height: 100 })).toBe(lm);
  });
});
