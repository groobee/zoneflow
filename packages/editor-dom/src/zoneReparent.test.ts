import { describe, expect, it } from "vitest";
import {
  createUniverseLayoutModel,
  createZoneLayout,
  updateZoneLayout,
  type Path,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
  type ZoneSlotDef,
} from "@zoneflow/core";
import { commitZoneSlotMembership } from "./zoneReparent";

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

function model(zones: Zone[]): UniverseModel {
  return {
    version: "1",
    universeId: "u1",
    rootZoneIds: zones.filter((z) => z.parentZoneId === null).map((z) => z.id),
    zonesById: Object.fromEntries(zones.map((z) => [z.id, z])),
  };
}

// 컨테이너 600×300, parallel 레인 폭 220. 자식 160×80.
function layoutWithChildAt(childX: number): UniverseLayoutModel {
  let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
  layoutModel = updateZoneLayout(layoutModel, "c", {
    ...createZoneLayout({ x: 0, y: 0, width: 600, height: 300 }),
    slotLayoutsByKey: { parallel: { width: 220 } },
  });
  layoutModel = updateZoneLayout(
    layoutModel,
    "child",
    createZoneLayout({ x: childX, y: 40, width: 160, height: 80 })
  );
  return layoutModel;
}

const slotContainer = () =>
  zone("c", {
    zoneType: "container",
    slots: [PARALLEL_SLOT],
    childZoneIds: ["child"],
  });

describe("commitZoneSlotMembership", () => {
  it("sets slotKey when the child center lands inside a lane", () => {
    const before = model([slotContainer(), zone("child", { parentZoneId: "c" })]);

    // center x = 40 + 80 = 120 ≤ 220 → parallel 레인
    const result = commitZoneSlotMembership({
      model: before,
      layoutModel: layoutWithChildAt(40),
      zoneIds: ["child"],
    });

    expect(result.didChange).toBe(true);
    expect(result.model.zonesById["child"].slotKey).toBe("parallel");
  });

  it("clears slotKey when the child center leaves every lane", () => {
    const before = model([
      slotContainer(),
      zone("child", { parentZoneId: "c", slotKey: "parallel" }),
    ]);

    // center x = 400 + 80 = 480 > 220 → 일반 영역
    const result = commitZoneSlotMembership({
      model: before,
      layoutModel: layoutWithChildAt(400),
      zoneIds: ["child"],
    });

    expect(result.didChange).toBe(true);
    expect(result.model.zonesById["child"].slotKey).toBeUndefined();
  });

  it("demotes incoming paths when docking disables the child's input", () => {
    const source = zone("s", {
      pathIds: ["p1"],
      pathsById: {
        p1: path("p1", { target: { universeId: "u1", zoneId: "child" } }),
      },
    });
    const before = model([
      slotContainer(),
      zone("child", { parentZoneId: "c" }),
      source,
    ]);

    const result = commitZoneSlotMembership({
      model: before,
      layoutModel: layoutWithChildAt(40),
      zoneIds: ["child"],
    });

    expect(result.model.zonesById["s"].pathsById["p1"].target).toBeNull();
  });

  it("keeps incoming paths when the slot has no childInput effect", () => {
    const neutralContainer = zone("c", {
      zoneType: "container",
      slots: [{ key: "stage" }],
      childZoneIds: ["child"],
    });
    const source = zone("s", {
      pathIds: ["p1"],
      pathsById: {
        p1: path("p1", { target: { universeId: "u1", zoneId: "child" } }),
      },
    });
    let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
    layoutModel = updateZoneLayout(layoutModel, "c", {
      ...createZoneLayout({ x: 0, y: 0, width: 600, height: 300 }),
      slotLayoutsByKey: { stage: { width: 220 } },
    });
    layoutModel = updateZoneLayout(
      layoutModel,
      "child",
      createZoneLayout({ x: 40, y: 40, width: 160, height: 80 })
    );

    const result = commitZoneSlotMembership({
      model: model([neutralContainer, zone("child", { parentZoneId: "c" }), source]),
      layoutModel,
      zoneIds: ["child"],
    });

    expect(result.model.zonesById["child"].slotKey).toBe("stage");
    expect(result.model.zonesById["s"].pathsById["p1"].target).toEqual({
      universeId: "u1",
      zoneId: "child",
    });
  });

  it("no-ops when membership is unchanged or the parent declares no slots", () => {
    const unchanged = commitZoneSlotMembership({
      model: model([
        slotContainer(),
        zone("child", { parentZoneId: "c", slotKey: "parallel" }),
      ]),
      layoutModel: layoutWithChildAt(40),
      zoneIds: ["child"],
    });
    expect(unchanged.didChange).toBe(false);

    const noSlots = commitZoneSlotMembership({
      model: model([
        zone("c", { zoneType: "container", childZoneIds: ["child"] }),
        zone("child", { parentZoneId: "c" }),
      ]),
      layoutModel: layoutWithChildAt(40),
      zoneIds: ["child"],
    });
    expect(noSlots.didChange).toBe(false);
    expect(noSlots.model.zonesById["child"].slotKey).toBeUndefined();
  });
});
