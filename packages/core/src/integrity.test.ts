import { describe, expect, it } from "vitest";
import { cloneZoneSubtree } from "./clone.js";
import { diffUniverseLayoutModels, diffUniverseModels } from "./diff.js";
import {
  createZoneflowDocument,
  readZoneflowDocument,
} from "./document.js";
import { getAncestorZoneIds } from "./hierarchy.js";
import { importZoneSubgraph, importZoneSubtree } from "./import.js";
import {
  computeAutoLayoutForZoneTree,
  createUniverseLayoutModel,
  createZoneLayout,
} from "./layout.js";
import {
  addPath,
  moveZone,
  removeZone,
  reorderPaths,
} from "./mutation.js";
import { flattenSubtree } from "./traversal.js";
import { unwrapZone } from "./unwrap.js";
import { validateUniverseModel } from "./validation.js";
import { wrapZonesWithNewParent } from "./wrap.js";
import type { Path, UniverseModel, Zone } from "./types.js";

function zone(id: string, over: Partial<Zone> = {}): Zone {
  return {
    id,
    parentZoneId: null,
    name: id,
    zoneType: "container",
    childZoneIds: [],
    pathIds: [],
    pathsById: {},
    ...over,
  };
}

function path(id: string, over: Partial<Path> = {}): Path {
  return { id, key: id, name: id, target: null, rule: null, ...over };
}

function withPaths(z: Zone, paths: Path[]): Zone {
  return {
    ...z,
    pathIds: paths.map((p) => p.id),
    pathsById: Object.fromEntries(paths.map((p) => [p.id, p])),
  };
}

function model(zones: Zone[]): UniverseModel {
  return {
    version: "1",
    universeId: "u1",
    rootZoneIds: zones.filter((z) => z.parentZoneId === null).map((z) => z.id),
    zonesById: Object.fromEntries(zones.map((z) => [z.id, z])),
  };
}

const to = (zoneId: string) => ({ universeId: "u1", zoneId });

// A(container) ⊃ B, plus C whose path p1 targets B.
function containerWithTargetedChild(): UniverseModel {
  return model([
    zone("A", { childZoneIds: ["B"] }),
    zone("B", { parentZoneId: "A" }),
    withPaths(zone("C"), [path("p1", { target: to("B") })]),
  ]);
}

describe("structural edits keep the model valid", () => {
  it("removeZone detaches paths that targeted the removed subtree", () => {
    const next = removeZone(containerWithTargetedChild(), "A");

    expect(next.zonesById.C.pathsById.p1.target).toBeNull();
    expect(validateUniverseModel(next)).toEqual([]);
  });

  it("unwrapZone detaches paths that targeted the wrapper", () => {
    const m = model([
      zone("W", { childZoneIds: ["X"], slots: [{ key: "lane" }] }),
      zone("X", { parentZoneId: "W", slotKey: "lane" }),
      withPaths(zone("C"), [path("p1", { target: to("W") })]),
    ]);

    const { model: next } = unwrapZone(m, "W");

    expect(next.zonesById.C.pathsById.p1.target).toBeNull();
    // The wrapper's slot is gone, so the docked key goes with it.
    expect(next.zonesById.X.slotKey).toBeUndefined();
    expect(validateUniverseModel(next)).toEqual([]);
  });

  it("moveZone refuses to create a parent cycle", () => {
    const m = containerWithTargetedChild();

    expect(moveZone(m, "A", "B")).toBe(m);
    expect(moveZone(m, "A", "A")).toBe(m);
  });

  it("wrapZonesWithNewParent drops slot keys the wrapper does not declare", () => {
    const m = model([
      zone("P", { childZoneIds: ["X"], slots: [{ key: "lane" }] }),
      zone("X", { parentZoneId: "P", slotKey: "lane" }),
    ]);

    const { model: next } = wrapZonesWithNewParent(m, {
      zoneIds: ["X"],
      name: "wrap",
      newZoneId: "W",
    });

    expect(next.zonesById.X.slotKey).toBeUndefined();
    expect(validateUniverseModel(next)).toEqual([]);
  });

  it("cloneZoneSubtree to root drops the slot key and returns a path id map", () => {
    const m = model([
      zone("P", { childZoneIds: ["X"], slots: [{ key: "lane" }] }),
      withPaths(zone("X", { parentZoneId: "P", slotKey: "lane" }), [
        path("p1"),
      ]),
    ]);

    const result = cloneZoneSubtree(m, "X", { nextParentZoneId: null });
    const cloned = result.model.zonesById[result.clonedRootZoneId];

    expect(cloned.slotKey).toBeUndefined();
    expect(cloned.pathIds).toEqual([result.pathIdMap.p1]);
    expect(validateUniverseModel(result.model)).toEqual([]);
  });

  it("clone/import into a missing parent is a no-op", () => {
    const m = containerWithTargetedChild();

    expect(cloneZoneSubtree(m, "B", { nextParentZoneId: "nope" }).model).toBe(
      m
    );
    expect(
      importZoneSubtree(m, m, "B", { nextParentZoneId: "nope" }).model
    ).toBe(m);
    expect(
      importZoneSubgraph(m, m, ["B"], { nextParentZoneId: "nope" }).model
    ).toBe(m);
  });

  it("import drops a root slot key the new parent does not declare", () => {
    const source = model([
      zone("P", { childZoneIds: ["X"], slots: [{ key: "lane" }] }),
      zone("X", { parentZoneId: "P", slotKey: "lane" }),
    ]);
    const target = model([zone("T")]);

    const subtree = importZoneSubtree(target, source, "X", {
      nextParentZoneId: "T",
    });
    const subgraph = importZoneSubgraph(target, source, ["X"], {
      nextParentZoneId: "T",
    });

    expect(subtree.model.zonesById[subtree.importedRootZoneId].slotKey).toBe(
      undefined
    );
    expect(
      subgraph.model.zonesById[subgraph.importedRootZoneIds[0]].slotKey
    ).toBe(undefined);
    expect(validateUniverseModel(subtree.model)).toEqual([]);
    expect(validateUniverseModel(subgraph.model)).toEqual([]);
  });

  it("addPath rejects an id already used by another zone", () => {
    const m = model([withPaths(zone("A"), [path("p")]), zone("B")]);

    const next = addPath(m, "B", {
      id: "p",
      key: "k",
      name: "dup",
      rule: null,
    });

    expect(next).toBe(m);
  });

  it("reorderPaths rejects duplicated ids", () => {
    const m = model([withPaths(zone("A"), [path("p1"), path("p2")])]);

    expect(reorderPaths(m, "A", ["p1", "p1"])).toBe(m);
  });
});

describe("validateUniverseModel catches structural corruption", () => {
  it("reports a detached parent cycle", () => {
    const m = model([
      zone("R"),
      zone("A", { parentZoneId: "B", childZoneIds: ["B"] }),
      zone("B", { parentZoneId: "A", childZoneIds: ["A"] }),
    ]);

    expect(validateUniverseModel(m).join("\n")).toMatch(/not reachable/);
  });

  it("reports parent/child mismatches, orphans and duplicate roots", () => {
    const m: UniverseModel = {
      ...model([zone("A", { childZoneIds: ["B"] }), zone("B")]),
      rootZoneIds: ["A", "A"],
    };

    const errors = validateUniverseModel(m).join("\n");

    expect(errors).toMatch(/listed more than once/);
    expect(errors).toMatch(/lists child "B" whose parentZoneId/);
    expect(errors).toMatch(/"B" has no parent but is not listed in rootZoneIds/);
  });

  it("reports key/id mismatches and path ids shared across zones", () => {
    const m = model([
      withPaths(zone("A"), [path("p")]),
      withPaths(zone("B"), [path("p")]),
    ]);
    m.zonesById.X = zone("Y");
    m.rootZoneIds.push("X");

    const errors = validateUniverseModel(m).join("\n");

    expect(errors).toMatch(/Zone keyed "X" has mismatched id "Y"/);
    expect(errors).toMatch(/Path id "p" is used by both zone "A" and zone "B"/);
  });

  it("does not resolve Object.prototype members as zones", () => {
    const m = model([
      withPaths(zone("A"), [path("p", { target: to("constructor") })]),
    ]);

    expect(validateUniverseModel(m).join("\n")).toMatch(
      /points to missing zone "constructor"/
    );
  });
});

describe("tree walks survive a cyclic model", () => {
  const cyclic = model([
    zone("A", { parentZoneId: "B", childZoneIds: ["B"] }),
    zone("B", { parentZoneId: "A", childZoneIds: ["A"] }),
  ]);

  it("getAncestorZoneIds terminates", () => {
    expect(getAncestorZoneIds(cyclic, "A")).toEqual(["B"]);
  });

  it("flattenSubtree visits each zone once", () => {
    expect(flattenSubtree(cyclic, "A").map((z) => z.id)).toEqual(["A", "B"]);
  });
});

describe("document parsing", () => {
  it("lists validation errors on separate lines", () => {
    const m = model([withPaths(zone("A"), [path("p", { target: to("gone") })])]);
    const doc = createZoneflowDocument({
      model: m,
      layoutModel: createUniverseLayoutModel({ universeId: "u1" }),
    });

    expect(() => readZoneflowDocument(doc)).toThrow(
      /Invalid zoneflow document:\n- Path "p"/
    );
  });

  it("rejects a malformed zone record with a readable error", () => {
    const doc = createZoneflowDocument({
      model: model([zone("A")]),
      layoutModel: createUniverseLayoutModel({ universeId: "u1" }),
    });
    (doc.model.zonesById.A as Partial<Zone>).childZoneIds = undefined;

    expect(() => readZoneflowDocument(doc)).toThrow(
      /zonesById\["A"\] must be a zone/
    );
  });
});

describe("diff reports every persisted field", () => {
  it("reports minWidth/minHeight and child reorders", () => {
    const before = model([
      zone("A", { childZoneIds: ["B", "C"] }),
      zone("B", { parentZoneId: "A" }),
      zone("C", { parentZoneId: "A" }),
    ]);
    const after = model([
      zone("A", { childZoneIds: ["C", "B"], minWidth: 200, minHeight: 80 }),
      zone("B", { parentZoneId: "A" }),
      zone("C", { parentZoneId: "A" }),
    ]);

    const diff = diffUniverseModels(before, after);

    expect(diff.isEmpty).toBe(false);
    expect(diff.zones.changed.A.map((c) => c.field)).toEqual([
      "minWidth",
      "minHeight",
      "childOrder",
    ]);
  });

  it("reports slotLayoutsByKey changes", () => {
    const before = createUniverseLayoutModel({ universeId: "u1" });
    before.zoneLayoutsById.A = createZoneLayout({ x: 0, y: 0, width: 160, height: 100 });
    const after = structuredClone(before);
    after.zoneLayoutsById.A.slotLayoutsByKey = { lane: { width: 120 } };

    const diff = diffUniverseLayoutModels(before, after);

    expect(diff.zoneLayouts.changed.A.map((c) => c.field)).toEqual([
      "slotLayoutsByKey",
    ]);
  });
});

describe("computeAutoLayoutForZoneTree", () => {
  it("grows the parent around local child coordinates and is stable", () => {
    const m = model([
      zone("A", { childZoneIds: ["B"] }),
      zone("B", { parentZoneId: "A" }),
    ]);
    const layout = createUniverseLayoutModel({ universeId: "u1" });
    layout.zoneLayoutsById.A = createZoneLayout({
      x: 10,
      y: 20,
      width: 160,
      height: 100,
    });
    layout.zoneLayoutsById.B = createZoneLayout({
      x: 400,
      y: 60,
      width: 100,
      height: 50,
    });

    const first = computeAutoLayoutForZoneTree(m, layout, "A")!;
    layout.zoneLayoutsById.A = first;
    const second = computeAutoLayoutForZoneTree(m, layout, "A")!;

    expect(first).toMatchObject({ x: 10, y: 20, width: 532, height: 134 });
    expect(second).toMatchObject({ width: 532, height: 134 });
  });
});
