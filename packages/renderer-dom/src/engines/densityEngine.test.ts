import { describe, expect, it } from "vitest";
import { defaultDensityEngine } from "./densityEngine";
import { resolveTheme } from "../themes/defaultTheme";
import type { GraphLayoutResult, RenderViewportInfo } from "../types";

const theme = resolveTheme(undefined);
const viewportInfo: RenderViewportInfo = {
  host: { x: 0, y: 0, width: 1000, height: 1000 },
  effective: { x: 0, y: 0, width: 1000, height: 1000 },
  world: { x: -5000, y: -5000, width: 10000, height: 10000 },
};

function densityForSquares(sizes: Record<string, number>, zoom = 1) {
  const zonesById: GraphLayoutResult["zonesById"] = Object.fromEntries(
    Object.entries(sizes).map(([id, size]) => [
      id,
      {
        universeId: "u",
        zoneId: id,
        zone: {
          id,
          parentZoneId: null,
          name: id,
          zoneType: "action",
          childZoneIds: [],
          pathIds: [],
          pathsById: {},
        },
        rect: { x: 0, y: 0, width: size, height: size },
        anchors: {
          inlet: { point: { x: 0, y: size / 2 } },
          outlet: { point: { x: size, y: size / 2 } },
        },
      },
    ])
  );

  const graphLayout: GraphLayoutResult = {
    zonesById,
    pathsById: {},
    edgesByPathId: {},
  };

  return defaultDensityEngine.compute({
    base: {
      model: { version: "1", universeId: "u", rootZoneIds: [], zonesById: {} },
      layoutModel: {
        version: "1",
        universeId: "u",
        zoneLayoutsById: {},
        pathLayoutsById: {},
      },
      camera: { x: 0, y: 0, zoom },
      viewportInfo,
      theme,
      textScale: "md",
    },
    graphLayout,
  }).zoneDensityById;
}

describe("defaultDensityEngine — zone density levels", () => {
  it("classifies by effective size, with farest below the far threshold", () => {
    // default thresholds: detail 200, near 140, mid 90, far 56
    const d = densityForSquares({
      big: 300,
      near: 160,
      mid: 100,
      far: 70,
      farest: 40,
    });

    expect(d.big).toBe("detail");
    expect(d.near).toBe("near");
    expect(d.mid).toBe("mid");
    expect(d.far).toBe("far");
    expect(d.farest).toBe("farest");
  });

  it("drops a large zone to farest when zoomed far out (size × zoom)", () => {
    // 400 world units at 0.1 zoom → effective 40 → farest
    const d = densityForSquares({ z: 400 }, 0.1);
    expect(d.z).toBe("farest");
  });

  it("keeps the same zone at detail when zoomed in", () => {
    const d = densityForSquares({ z: 400 }, 1);
    expect(d.z).toBe("detail");
  });
});
