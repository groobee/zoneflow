import { describe, expect, it } from "vitest";
import {
  DEFAULT_FLOW_DIRECTION,
  FLOW_DIRECTION_ANGLES,
  flowPointToWorldPoint,
  resolveDefaultZoneAnchorPoint,
  worldPointToFlowPoint,
} from "./flow";
import {
  applyFlowDirectionToZoneAnchors,
  createZoneLayout,
  resizeZoneLayout,
} from "./layout";
import type { UniverseLayoutModel } from "./types";

describe("flow — 흐름 방향의 각도·좌표 규약", () => {
  it("내부 각도는 화면 좌표계(y-down) 기준 0°/90°", () => {
    expect(FLOW_DIRECTION_ANGLES.leftToRight).toBe(0);
    expect(FLOW_DIRECTION_ANGLES.topToBottom).toBe(90);
    expect(DEFAULT_FLOW_DIRECTION).toBe("leftToRight");
  });

  it("leftToRight 변환은 항등, topToBottom 은 x↔y 교환(자기 역원)", () => {
    const p = { x: 3, y: 7 };
    expect(worldPointToFlowPoint(p, "leftToRight")).toEqual(p);
    expect(worldPointToFlowPoint(p, "topToBottom")).toEqual({ x: 7, y: 3 });
    // 왕복하면 원점으로 — 부호 오류가 끼어들 자리가 없다.
    expect(
      flowPointToWorldPoint(worldPointToFlowPoint(p, "topToBottom"), "topToBottom")
    ).toEqual(p);
  });

  it("기본 앵커: leftToRight 는 좌/우 중앙, topToBottom 은 상/하 중앙", () => {
    const size = { width: 200, height: 100 };
    expect(
      resolveDefaultZoneAnchorPoint({ kind: "inlet", ...size })
    ).toEqual({ x: 0, y: 50 });
    expect(
      resolveDefaultZoneAnchorPoint({ kind: "outlet", ...size })
    ).toEqual({ x: 200, y: 50 });
    expect(
      resolveDefaultZoneAnchorPoint({
        kind: "inlet",
        ...size,
        flowDirection: "topToBottom",
      })
    ).toEqual({ x: 100, y: 0 });
    expect(
      resolveDefaultZoneAnchorPoint({
        kind: "outlet",
        ...size,
        flowDirection: "topToBottom",
      })
    ).toEqual({ x: 100, y: 100 });
  });
});

describe("layout × flowDirection", () => {
  function verticalLayoutModel(): UniverseLayoutModel {
    return {
      version: "1",
      universeId: "u1",
      zoneLayoutsById: {
        z1: createZoneLayout({
          x: 100,
          y: 100,
          width: 200,
          height: 100,
          flowDirection: "topToBottom",
        }),
      },
      pathLayoutsById: {},
    };
  }

  it("createZoneLayout(topToBottom)은 상/하 중앙 앵커를 만든다", () => {
    const z = verticalLayoutModel().zoneLayoutsById.z1;
    expect(z.anchors.inlet.point).toEqual({ x: 100, y: 0 });
    expect(z.anchors.outlet.point).toEqual({ x: 100, y: 100 });
  });

  it("resizeZoneLayout(topToBottom)은 앵커를 새 상/하 엣지에 다시 붙인다", () => {
    const out = resizeZoneLayout(
      verticalLayoutModel(),
      "z1",
      { width: 320, height: 208 },
      { flowDirection: "topToBottom" }
    );
    const z = out.zoneLayoutsById.z1;
    expect(z.anchors.inlet.point).toEqual({ x: 160, y: 0 });
    expect(z.anchors.outlet.point).toEqual({ x: 160, y: 208 });
  });

  it("applyFlowDirectionToZoneAnchors 는 가로 문서의 앵커를 세로 기본 위치로 옮긴다", () => {
    const horizontal: UniverseLayoutModel = {
      version: "1",
      universeId: "u1",
      zoneLayoutsById: {
        z1: createZoneLayout({ x: 0, y: 0, width: 200, height: 100 }),
        // 크기를 모르는 존은 건드리지 않는다.
        z2: {
          x: 10,
          y: 10,
          anchors: {
            inlet: { point: { x: 1, y: 2 } },
            outlet: { point: { x: 3, y: 4 } },
          },
        },
      },
      pathLayoutsById: {},
    };
    const out = applyFlowDirectionToZoneAnchors(horizontal, "topToBottom");
    expect(out.zoneLayoutsById.z1.anchors.inlet.point).toEqual({ x: 100, y: 0 });
    expect(out.zoneLayoutsById.z1.anchors.outlet.point).toEqual({
      x: 100,
      y: 100,
    });
    expect(out.zoneLayoutsById.z2.anchors.inlet.point).toEqual({ x: 1, y: 2 });
  });
});
