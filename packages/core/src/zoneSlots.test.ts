import { describe, expect, it } from "vitest";
import {
  createUniverseLayoutModel,
  createZoneLayout,
  resolveZoneSlotKeyAtPoint,
  resolveZoneSlotRegions,
  updateZoneLayout,
  DEFAULT_ZONE_SLOT_WIDTH,
} from "./layout.js";
import { detachPathsTargetingZone, moveZone } from "./mutation.js";
import {
  getEffectiveZoneSlot,
  isZoneInputEnabled,
  zoneDeclaresSlots,
} from "./zoneCapabilities.js";
import { validateUniverseModel } from "./validation.js";
import type { Path, UniverseModel, Zone, ZoneSlotDef } from "./types.js";

const PARALLEL_SLOT: ZoneSlotDef = {
  key: "parallel",
  label: "∥ PARALLEL",
  effects: { childInput: "disabled" },
};

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

function path(id: string, over: Partial<Path> = {}): Path {
  return { id, key: id, name: id, target: null, rule: null, ...over };
}

function model(
  zones: Zone[],
  over: Partial<UniverseModel> = {}
): UniverseModel {
  return {
    version: "1",
    universeId: "u1",
    rootZoneIds: zones.filter((z) => z.parentZoneId === null).map((z) => z.id),
    zonesById: Object.fromEntries(zones.map((z) => [z.id, z])),
    ...over,
  };
}

const slotContainer = (over: Partial<Zone> = {}) =>
  zone("c", {
    zoneType: "container",
    slots: [PARALLEL_SLOT],
    childZoneIds: ["docked"],
    ...over,
  });

const dockedChild = (over: Partial<Zone> = {}) =>
  zone("docked", { parentZoneId: "c", slotKey: "parallel", ...over });

describe("slot capabilities", () => {
  it("zoneDeclaresSlots requires slots and container type", () => {
    expect(zoneDeclaresSlots(slotContainer())).toBe(true);
    expect(zoneDeclaresSlots(zone("c", { zoneType: "container" }))).toBe(false);
    expect(
      zoneDeclaresSlots(zone("a", { zoneType: "action", slots: [PARALLEL_SLOT] }))
    ).toBe(false);
  });

  it("getEffectiveZoneSlot resolves the child's slotKey against the parent", () => {
    expect(getEffectiveZoneSlot(dockedChild(), slotContainer())).toEqual(
      PARALLEL_SLOT
    );
    expect(getEffectiveZoneSlot(zone("z"), slotContainer())).toBeUndefined();
    expect(
      getEffectiveZoneSlot(dockedChild({ slotKey: "unknown" }), slotContainer())
    ).toBeUndefined();
  });

  it("childInput: disabled derives input capability to false", () => {
    expect(isZoneInputEnabled(dockedChild(), slotContainer())).toBe(false);
    expect(isZoneInputEnabled(zone("z"), slotContainer())).toBe(true);
    expect(isZoneInputEnabled(zone("z", { inputDisabled: true }))).toBe(false);
    // 슬롯에 effects 가 없으면 도킹돼 있어도 input 은 살아 있다
    const neutralParent = slotContainer({ slots: [{ key: "parallel" }] });
    expect(isZoneInputEnabled(dockedChild(), neutralParent)).toBe(true);
  });
});

describe("slot validation", () => {
  it("accepts a docked child under a slot-declaring container", () => {
    expect(validateUniverseModel(model([slotContainer(), dockedChild()]))).toEqual(
      []
    );
  });

  it("rejects slots on a non-container zone", () => {
    const errors = validateUniverseModel(
      model([zone("a", { slots: [PARALLEL_SLOT] })])
    );
    expect(errors.some((e) => e.includes("declares slots"))).toBe(true);
  });

  it("rejects duplicate or empty slot keys", () => {
    const errors = validateUniverseModel(
      model([
        slotContainer({
          childZoneIds: [],
          slots: [PARALLEL_SLOT, { key: "parallel" }, { key: "" }],
        }),
      ])
    );
    expect(errors.some((e) => e.includes("duplicate slot key"))).toBe(true);
    expect(errors.some((e) => e.includes("empty key"))).toBe(true);
  });

  it("rejects slotKey the parent does not declare", () => {
    const errors = validateUniverseModel(
      model([slotContainer(), dockedChild({ slotKey: "unknown" })])
    );
    expect(errors.some((e) => e.includes("not declared by parent"))).toBe(true);

    const noSlotParent = zone("p", {
      zoneType: "container",
      childZoneIds: ["docked"],
    });
    const orphanErrors = validateUniverseModel(
      model([noSlotParent, zone("docked", { parentZoneId: "p", slotKey: "parallel" })])
    );
    expect(orphanErrors.some((e) => e.includes("declares no slots"))).toBe(true);
  });

  it("rejects paths targeting a child docked in a childInput-disabled slot", () => {
    const source = zone("s", {
      pathIds: ["p1"],
      pathsById: {
        p1: path("p1", { target: { universeId: "u1", zoneId: "docked" } }),
      },
    });
    const errors = validateUniverseModel(
      model([slotContainer(), dockedChild(), source])
    );
    expect(errors.some((e) => e.includes("childInput is disabled"))).toBe(true);
  });
});

describe("moveZone slotKey invariant", () => {
  it("drops slotKey when the zone leaves the declaring container", () => {
    const before = model([slotContainer(), dockedChild()]);
    const after = moveZone(before, "docked", null);
    expect(after.zonesById["docked"].slotKey).toBeUndefined();
    expect(validateUniverseModel(after)).toEqual([]);
  });

  it("keeps slotKey when the next parent declares the same key", () => {
    const c2 = zone("c2", { zoneType: "container", slots: [PARALLEL_SLOT] });
    const before = model([slotContainer(), c2, dockedChild()]);
    const after = moveZone(before, "docked", "c2");
    expect(after.zonesById["docked"].slotKey).toBe("parallel");
  });
});

describe("detachPathsTargetingZone", () => {
  it("demotes every path targeting the zone to a dangling target", () => {
    const target = zone("t");
    const s1 = zone("s1", {
      pathIds: ["p1"],
      pathsById: {
        p1: path("p1", { target: { universeId: "u1", zoneId: "t" } }),
      },
    });
    const s2 = zone("s2", {
      pathIds: ["p2", "p3"],
      pathsById: {
        p2: path("p2", { target: { universeId: "u1", zoneId: "t" } }),
        p3: path("p3", { target: { universeId: "u1", zoneId: "s1" } }),
      },
    });

    const after = detachPathsTargetingZone(model([target, s1, s2]), "t");
    expect(after.zonesById["s1"].pathsById["p1"].target).toBeNull();
    expect(after.zonesById["s2"].pathsById["p2"].target).toBeNull();
    expect(after.zonesById["s2"].pathsById["p3"].target).toEqual({
      universeId: "u1",
      zoneId: "s1",
    });
  });
});

describe("resolveZoneSlotRegions", () => {
  const container = slotContainer({ childZoneIds: [] });

  it("stacks lanes from the left edge with default widths", () => {
    const regions = resolveZoneSlotRegions(container, {
      width: 1000,
      height: 400,
    });
    expect(regions).toEqual([
      {
        key: "parallel",
        x: 0,
        y: 0,
        width: DEFAULT_ZONE_SLOT_WIDTH,
        height: 400,
      },
    ]);
  });

  it("uses per-slot widths and stacks multiple slots in order", () => {
    const twoSlots = slotContainer({
      childZoneIds: [],
      slots: [PARALLEL_SLOT, { key: "onExit" }],
    });
    const regions = resolveZoneSlotRegions(twoSlots, {
      width: 1000,
      height: 300,
      slotLayoutsByKey: { parallel: { width: 200 }, onExit: { width: 100 } },
    });
    expect(regions.map((r) => [r.key, r.x, r.width])).toEqual([
      ["parallel", 0, 200],
      ["onExit", 200, 100],
    ]);
  });

  it("places a slot with a rect override freely, clamped to the container", () => {
    const twoSlots = slotContainer({
      childZoneIds: [],
      slots: [PARALLEL_SLOT, { key: "onExit" }],
    });
    const regions = resolveZoneSlotRegions(twoSlots, {
      width: 1000,
      height: 400,
      slotLayoutsByKey: {
        parallel: { width: 200 },
        // 우하단 자유 배치 — 스택(좌측)과 무관, 일부러 경계 밖으로 넘겨 클램프 확인
        onExit: { rect: { x: 700, y: 300, width: 400, height: 200 } },
      },
    });
    expect(regions).toEqual([
      { key: "parallel", x: 0, y: 0, width: 200, height: 400 },
      { key: "onExit", x: 700, y: 300, width: 300, height: 100 },
    ]);
  });

  it("excludes free-rect slots from the stacked 70% budget", () => {
    const twoSlots = slotContainer({
      childZoneIds: [],
      slots: [PARALLEL_SLOT, { key: "onExit" }],
    });
    // 스택 슬롯 하나(600)만으로 70%(210)를 넘음 → 스택만 축소, 자유 슬롯은 그대로
    const regions = resolveZoneSlotRegions(twoSlots, {
      width: 300,
      height: 200,
      slotLayoutsByKey: {
        parallel: { width: 600 },
        onExit: { rect: { x: 250, y: 0, width: 50, height: 200 } },
      },
    });
    expect(regions[0].width).toBe(210);
    expect(regions[1]).toEqual({
      key: "onExit",
      x: 250,
      y: 0,
      width: 50,
      height: 200,
    });
  });

  it("prefers the topmost (later-declared) lane when free rects overlap", () => {
    const overlapping = slotContainer({
      childZoneIds: [],
      slots: [{ key: "under" }, { key: "over" }],
    });
    const layout = {
      width: 1000,
      height: 400,
      slotLayoutsByKey: {
        under: { rect: { x: 0, y: 0, width: 300, height: 400 } },
        over: { rect: { x: 200, y: 100, width: 300, height: 200 } },
      },
    };
    expect(
      resolveZoneSlotKeyAtPoint(overlapping, layout, { x: 250, y: 200 })
    ).toBe("over");
    expect(
      resolveZoneSlotKeyAtPoint(overlapping, layout, { x: 250, y: 50 })
    ).toBe("under");
  });

  it("scales lanes down proportionally past 70% of the container width", () => {
    const regions = resolveZoneSlotRegions(container, {
      width: 300,
      height: 200,
      slotLayoutsByKey: { parallel: { width: 280 } },
    });
    expect(regions[0].width).toBe(210);
  });

  it("returns nothing for non-containers or zones without slots", () => {
    expect(
      resolveZoneSlotRegions(zone("a", { slots: [PARALLEL_SLOT] }), {
        width: 100,
        height: 100,
      })
    ).toEqual([]);
    expect(
      resolveZoneSlotRegions(zone("c", { zoneType: "container" }), {
        width: 100,
        height: 100,
      })
    ).toEqual([]);
  });

  it("translates slot-local snapPoints to container-local coordinates", () => {
    const twoSlots = slotContainer({
      childZoneIds: [],
      slots: [PARALLEL_SLOT, { key: "onExit" }],
    });
    const regions = resolveZoneSlotRegions(twoSlots, {
      width: 1000,
      height: 400,
      slotLayoutsByKey: {
        parallel: { width: 200, snapPoints: [{ x: 100, y: 80 }] },
        onExit: {
          rect: { x: 600, y: 250, width: 300, height: 120 },
          snapPoints: [{ x: 150, y: 60 }],
        },
      },
    });
    // 스택 레인: 원점 (0,0) → 그대로
    expect(regions[0].snapPoints).toEqual([{ x: 100, y: 80 }]);
    // 자유 rect: 원점 (600,250) 오프셋
    expect(regions[1].snapPoints).toEqual([{ x: 750, y: 310 }]);
  });

  it("resolveZoneSlotKeyAtPoint finds the lane containing a local point", () => {
    const layout = { width: 1000, height: 400 };
    expect(
      resolveZoneSlotKeyAtPoint(container, layout, { x: 100, y: 200 })
    ).toBe("parallel");
    expect(
      resolveZoneSlotKeyAtPoint(container, layout, { x: 500, y: 200 })
    ).toBeUndefined();
  });

  it("slotLayoutsByKey survives updateZoneLayout position patches", () => {
    let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
    layoutModel = updateZoneLayout(layoutModel, "c", {
      ...createZoneLayout({ x: 0, y: 0, width: 600, height: 300 }),
      slotLayoutsByKey: { parallel: { width: 220 } },
    });
    layoutModel = updateZoneLayout(layoutModel, "c", { x: 40, y: 40 });
    expect(layoutModel.zoneLayoutsById["c"].slotLayoutsByKey).toEqual({
      parallel: { width: 220 },
    });
  });
});
