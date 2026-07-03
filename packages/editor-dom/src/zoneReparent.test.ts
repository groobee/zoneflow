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
import {
  commitZoneSlotMembership,
  resolveZoneDropPlacement,
} from "./zoneReparent";
import {
  followSlotSnapPointsAfterResize,
  snapZonesToSlotPoints,
} from "./zoneMoveEditor";

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

// 컨테이너 600×300, parallel 레인 폭 220, 스냅 포인트 2개 (110,75)/(110,225).
function slotLayoutWithSnapPoints(children: Array<[string, number, number]>) {
  let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
  layoutModel = updateZoneLayout(layoutModel, "c", {
    ...createZoneLayout({ x: 0, y: 0, width: 600, height: 300 }),
    slotLayoutsByKey: {
      parallel: {
        width: 220,
        snapPoints: [
          { x: 110, y: 75 },
          { x: 110, y: 225 },
        ],
      },
    },
  });
  for (const [id, x, y] of children) {
    layoutModel = updateZoneLayout(
      layoutModel,
      id,
      createZoneLayout({ x, y, width: 160, height: 80 })
    );
  }
  return layoutModel;
}

describe("snapZonesToSlotPoints", () => {
  const container = (childIds: string[]) =>
    zone("c", {
      zoneType: "container",
      slots: [PARALLEL_SLOT],
      childZoneIds: childIds,
    });

  it("snaps the dragged zone's center to the nearest free point", () => {
    const m = model([container(["child"]), zone("child", { parentZoneId: "c" })]);
    // center (110, 100) → 가까운 포인트 (110, 75)
    const layoutModel = snapZonesToSlotPoints({
      model: m,
      layoutModel: slotLayoutWithSnapPoints([["child", 30, 60]]),
      zoneIds: ["child"],
    });
    const child = layoutModel.zoneLayoutsById["child"];
    expect([child.x, child.y]).toEqual([30, 35]); // center (110, 75)
  });

  it("skips points occupied by a sibling and takes the next free one", () => {
    const m = model([
      container(["child", "sibling"]),
      zone("child", { parentZoneId: "c" }),
      zone("sibling", { parentZoneId: "c", slotKey: "parallel" }),
    ]);
    // sibling center = (110, 75) → 첫 포인트 점유. child center (110,100)는
    // (110,75)가 더 가깝지만 점유돼 있으므로 (110,225)로.
    const layoutModel = snapZonesToSlotPoints({
      model: m,
      layoutModel: slotLayoutWithSnapPoints([
        ["child", 30, 60],
        ["sibling", 30, 35],
      ]),
      zoneIds: ["child"],
    });
    const child = layoutModel.zoneLayoutsById["child"];
    expect([child.x, child.y]).toEqual([30, 185]); // center (110, 225)
  });

  it("leaves the zone free when every point is occupied", () => {
    const m = model([
      container(["child", "s1", "s2"]),
      zone("child", { parentZoneId: "c" }),
      zone("s1", { parentZoneId: "c", slotKey: "parallel" }),
      zone("s2", { parentZoneId: "c", slotKey: "parallel" }),
    ]);
    const layoutModel = snapZonesToSlotPoints({
      model: m,
      layoutModel: slotLayoutWithSnapPoints([
        ["child", 30, 60],
        ["s1", 30, 35],
        ["s2", 30, 185],
      ]),
      zoneIds: ["child"],
    });
    const child = layoutModel.zoneLayoutsById["child"];
    expect([child.x, child.y]).toEqual([30, 60]); // 변경 없음
  });

  it("assigns distinct points to a group drag", () => {
    const m = model([
      container(["a", "b"]),
      zone("a", { parentZoneId: "c" }),
      zone("b", { parentZoneId: "c" }),
    ]);
    // 둘 다 첫 포인트가 최근접이지만 순차 배정으로 서로 다른 포인트에 앉는다.
    const layoutModel = snapZonesToSlotPoints({
      model: m,
      layoutModel: slotLayoutWithSnapPoints([
        ["a", 30, 40],
        ["b", 30, 70],
      ]),
      zoneIds: ["a", "b"],
    });
    const a = layoutModel.zoneLayoutsById["a"];
    const b = layoutModel.zoneLayoutsById["b"];
    expect([a.x, a.y]).toEqual([30, 35]); // (110, 75)
    expect([b.x, b.y]).toEqual([30, 185]); // (110, 225)
  });

  it("ignores zones whose center is outside every snap lane", () => {
    const m = model([container(["child"]), zone("child", { parentZoneId: "c" })]);
    const layoutModel = snapZonesToSlotPoints({
      model: m,
      layoutModel: slotLayoutWithSnapPoints([["child", 400, 60]]), // center x 480 > 220
      zoneIds: ["child"],
    });
    const child = layoutModel.zoneLayoutsById["child"];
    expect([child.x, child.y]).toEqual([400, 60]);
  });
});

describe("followSlotSnapPointsAfterResize", () => {
  it("moves seated zones to their point's new position when lanes rescale", () => {
    // 리사이즈 전 600 폭: 스택 클램프 없음(220 ≤ 420). 포인트 (110, 75).
    // 리사이즈 후 300 폭: 70% 클램프 → 레인 220→210, 포인트 x 110→105.
    const m = model([
      zone("c", {
        zoneType: "container",
        slots: [PARALLEL_SLOT],
        childZoneIds: ["child"],
      }),
      zone("child", { parentZoneId: "c", slotKey: "parallel" }),
    ]);

    let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
    layoutModel = updateZoneLayout(layoutModel, "c", {
      ...createZoneLayout({ x: 0, y: 0, width: 300, height: 300 }), // 리사이즈 후
      slotLayoutsByKey: {
        parallel: { width: 220, snapPoints: [{ x: 110, y: 75 }] },
      },
    });
    // 리사이즈 전(600 폭) 포인트 (110,75)에 앉아 있던 존: center (110,75)
    layoutModel = updateZoneLayout(
      layoutModel,
      "child",
      createZoneLayout({ x: 30, y: 35, width: 160, height: 80 })
    );

    const next = followSlotSnapPointsAfterResize({
      model: m,
      layoutModel,
      zoneId: "c",
      previousSize: { width: 600, height: 300 },
    });

    const child = next.zoneLayoutsById["child"];
    // 클램프된 레인의 포인트: x = 110 * (210/220) = 105 → 존 x = 105-80 = 25
    expect([child.x, child.y]).toEqual([25, 35]);
  });

  it("does not touch zones that were not seated on a point", () => {
    const m = model([
      zone("c", {
        zoneType: "container",
        slots: [PARALLEL_SLOT],
        childZoneIds: ["free"],
      }),
      zone("free", { parentZoneId: "c" }),
    ]);
    let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
    layoutModel = updateZoneLayout(layoutModel, "c", {
      ...createZoneLayout({ x: 0, y: 0, width: 300, height: 300 }),
      slotLayoutsByKey: {
        parallel: { width: 220, snapPoints: [{ x: 110, y: 75 }] },
      },
    });
    layoutModel = updateZoneLayout(
      layoutModel,
      "free",
      createZoneLayout({ x: 240, y: 100, width: 40, height: 40 }) // 포인트 밖
    );

    const next = followSlotSnapPointsAfterResize({
      model: m,
      layoutModel,
      zoneId: "c",
      previousSize: { width: 600, height: 300 },
    });
    expect(next.zoneLayoutsById["free"]).toEqual(
      layoutModel.zoneLayoutsById["free"]
    );
  });
});

describe("snapZonesToSlotPoints — 바깥 존의 원모션 진입 스냅", () => {
  // 컨테이너가 월드 (100, 50) — 로컬/월드 좌표가 구분되는 배치.
  function outsideZoneSetup(outsiderWorld: { x: number; y: number }) {
    const m = model([
      zone("c", {
        zoneType: "container",
        slots: [PARALLEL_SLOT],
        childZoneIds: ["seated"],
      }),
      zone("seated", { parentZoneId: "c", slotKey: "parallel" }),
      zone("outsider"), // 루트 존 — 아직 컨테이너 밖 소속
    ]);
    let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
    layoutModel = updateZoneLayout(layoutModel, "c", {
      ...createZoneLayout({ x: 100, y: 50, width: 600, height: 300 }),
      slotLayoutsByKey: {
        parallel: {
          width: 220,
          snapPoints: [
            { x: 110, y: 75 },
            { x: 110, y: 225 },
          ],
        },
      },
    });
    // seated: 첫 포인트(로컬 110,75)에 착석 — 로컬 (30,35)
    layoutModel = updateZoneLayout(
      layoutModel,
      "seated",
      createZoneLayout({ x: 30, y: 35, width: 160, height: 80 })
    );
    // outsider: 루트 좌표 = 월드 좌표
    layoutModel = updateZoneLayout(
      layoutModel,
      "outsider",
      createZoneLayout({ ...outsiderWorld, width: 160, height: 80 })
    );
    return { m, layoutModel };
  }

  it("드래그 중 레인 위로 오면 (아직 부모가 아니어도) 빈 포인트로 스냅한다", () => {
    // outsider 중앙 월드 (210, 220) → 컨테이너 로컬 (110, 170) — 레인 안.
    // 첫 포인트(월드 210,125)는 seated 가 점유 → 둘째 포인트(월드 210,275)로.
    const { m, layoutModel } = outsideZoneSetup({ x: 130, y: 180 });
    const next = snapZonesToSlotPoints({
      model: m,
      layoutModel,
      zoneIds: ["outsider"],
    });
    const o = next.zoneLayoutsById["outsider"];
    // 루트 기준 좌표 = 월드: 중앙 (210, 275) → (130, 235)
    expect([o.x, o.y]).toEqual([130, 235]);
  });

  it("레인 밖(컨테이너 일반 영역)이면 스냅하지 않는다", () => {
    // 중앙 월드 (500, 220) → 로컬 (400, 170) — 컨테이너 안이지만 레인 밖.
    const { m, layoutModel } = outsideZoneSetup({ x: 420, y: 180 });
    const next = snapZonesToSlotPoints({
      model: m,
      layoutModel,
      zoneIds: ["outsider"],
    });
    expect(next.zoneLayoutsById["outsider"]).toEqual(
      layoutModel.zoneLayoutsById["outsider"]
    );
  });
});

describe("resolveZoneDropPlacement", () => {
  it("resolves the containing container and lane slotKey at the current position", () => {
    const before = model([slotContainer(), zone("child", { parentZoneId: "c" })]);

    // child center x = 40 + 80 = 120 ≤ 220 → parallel 레인 안
    const placement = resolveZoneDropPlacement({
      model: before,
      layoutModel: layoutWithChildAt(40),
      zoneId: "child",
    });

    expect(placement).not.toBeNull();
    expect(placement!.targetParentZoneId).toBe("c");
    expect(placement!.slotKey).toBe("parallel");
    expect(placement!.worldPoint).toEqual({ x: 120, y: 80 });
  });

  it("returns slotKey null when the center is outside every lane", () => {
    const before = model([slotContainer(), zone("child", { parentZoneId: "c" })]);

    // child center x = 300 + 80 = 380 > 220 → 레인 밖, 컨테이너 일반 영역
    const placement = resolveZoneDropPlacement({
      model: before,
      layoutModel: layoutWithChildAt(300),
      zoneId: "child",
    });

    expect(placement!.targetParentZoneId).toBe("c");
    expect(placement!.slotKey).toBeNull();
  });

  it("returns a null parent for a zone floating on the root canvas", () => {
    const before = model([slotContainer(), zone("free")]);
    let layoutModel = layoutWithChildAt(40);
    layoutModel = updateZoneLayout(
      layoutModel,
      "free",
      createZoneLayout({ x: 1000, y: 500, width: 160, height: 80 })
    );

    const placement = resolveZoneDropPlacement({
      model: before,
      layoutModel,
      zoneId: "free",
    });

    expect(placement!.targetParentZoneId).toBeNull();
    expect(placement!.slotKey).toBeNull();
  });

  it("returns null when the zone has no layout", () => {
    const before = model([zone("ghost")]);
    const placement = resolveZoneDropPlacement({
      model: before,
      layoutModel: createUniverseLayoutModel({ universeId: "u1" }),
      zoneId: "ghost",
    });

    expect(placement).toBeNull();
  });
});
