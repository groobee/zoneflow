import { describe, expect, it } from "vitest";
import { diffUniverseModels } from "./diff";
import {
  createZone,
  removeEmptyPaths,
  removeZone,
  reorderPaths,
  setPathTarget,
} from "./mutation";
import type { Path, UniverseModel, Zone } from "./types";

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

describe("diffUniverseModels", () => {
  it("returns an empty diff for identical models", () => {
    const a = model([zone("z1")]);
    const diff = diffUniverseModels(a, a);
    expect(diff.isEmpty).toBe(true);
    expect(diff.model).toEqual([]);
    expect(diff.zones).toEqual({ added: [], removed: [], changed: {} });
    expect(diff.paths).toEqual({ added: [], removed: [], changed: {} });
  });

  it("treats undefined≡false flags and undefined≡{} meta as equal", () => {
    const a = model([zone("z1")]);
    const b = model([zone("z1", { inputDisabled: false, meta: {} })]);
    expect(diffUniverseModels(a, b).isEmpty).toBe(true);
  });

  it("previews a removeEmptyPaths cleanup as path removals only", () => {
    const z1 = zone("z1", {
      pathIds: ["p1", "p2"],
      pathsById: {
        p1: path("p1", {
          name: "조건 1",
          rule: { type: "always" },
          target: { universeId: "u1", zoneId: "z2" },
        }),
        p2: path("p2", { name: "", rule: null }),
      },
    });
    const before = model([z1, zone("z2")]);
    const after = removeEmptyPaths(before);

    const diff = diffUniverseModels(before, after);
    expect(diff.isEmpty).toBe(false);
    expect(diff.paths.removed).toEqual([{ pathId: "p2", sourceZoneId: "z1" }]);
    expect(diff.paths.added).toEqual([]);
    expect(diff.zones.removed).toEqual([]);
    expect(diff.zones.changed).toEqual({});
  });

  it("reports retargeting as a target field change", () => {
    const z1 = zone("z1", {
      pathIds: ["p1"],
      pathsById: {
        p1: path("p1", { target: { universeId: "u1", zoneId: "z2" } }),
      },
    });
    const before = model([z1, zone("z2"), zone("z3")]);
    const after = setPathTarget(before, "z1", "p1", {
      universeId: "u1",
      zoneId: "z3",
    });

    const diff = diffUniverseModels(before, after);
    expect(diff.paths.changed.p1).toEqual({
      sourceZoneId: "z1",
      changes: [
        {
          field: "target",
          before: { universeId: "u1", zoneId: "z2" },
          after: { universeId: "u1", zoneId: "z3" },
        },
      ],
    });
  });

  it("reports zone field changes (rename + flag toggle)", () => {
    const before = model([zone("z1")]);
    const after = model([zone("z1", { name: "결제", inputDisabled: true })]);

    const diff = diffUniverseModels(before, after);
    expect(diff.zones.changed.z1).toEqual([
      { field: "name", before: "z1", after: "결제" },
      { field: "inputDisabled", before: undefined, after: true },
    ]);
  });

  it("reports a removed zone's paths in paths.removed with their sourceZoneId", () => {
    const z2 = zone("z2", { pathIds: ["p9"], pathsById: { p9: path("p9") } });
    const before = model([zone("z1"), z2]);
    const after = removeZone(before, "z2");

    const diff = diffUniverseModels(before, after);
    expect(diff.zones.removed).toEqual(["z2"]);
    expect(diff.paths.removed).toEqual([{ pathId: "p9", sourceZoneId: "z2" }]);
  });

  it("reports added zones", () => {
    const before = model([zone("z1")]);
    const after = createZone(before, {
      id: "z9",
      parentZoneId: null,
      name: "new",
      zoneType: "action",
    });

    const diff = diffUniverseModels(before, after);
    expect(diff.zones.added).toEqual(["z9"]);
    expect(diff.zones.removed).toEqual([]);
  });

  it("reports a pure path reorder as pathOrder and nothing else", () => {
    const z1 = zone("z1", {
      pathIds: ["p1", "p2"],
      pathsById: { p1: path("p1"), p2: path("p2") },
    });
    const before = model([z1]);
    const after = reorderPaths(before, "z1", ["p2", "p1"]);

    const diff = diffUniverseModels(before, after);
    expect(diff.zones.changed.z1).toEqual([
      { field: "pathOrder", before: ["p1", "p2"], after: ["p2", "p1"] },
    ]);
    expect(diff.paths.changed).toEqual({});
  });

  it("does not report pathOrder when only a removal shifted positions", () => {
    const z1 = zone("z1", {
      pathIds: ["p1", "p2", "p3"],
      pathsById: { p1: path("p1"), p2: path("p2"), p3: path("p3") },
    });
    const z1After = zone("z1", {
      pathIds: ["p1", "p3"],
      pathsById: { p1: path("p1"), p3: path("p3") },
    });

    const diff = diffUniverseModels(model([z1]), model([z1After]));
    expect(diff.paths.removed).toEqual([{ pathId: "p2", sourceZoneId: "z1" }]);
    expect(diff.zones.changed).toEqual({});
  });

  it("reports root zone reordering as a model-level rootOrder change", () => {
    const before = model([zone("z1"), zone("z2")]);
    const after = { ...before, rootZoneIds: ["z2", "z1"] };

    const diff = diffUniverseModels(before, after);
    expect(diff.model).toEqual([
      { field: "rootOrder", before: ["z1", "z2"], after: ["z2", "z1"] },
    ]);
  });

  it("deep-compares rule payloads", () => {
    const mk = (payload: Record<string, unknown>) =>
      model([
        zone("z1", {
          pathIds: ["p1"],
          pathsById: {
            p1: path("p1", { rule: { type: "segment", payload } }),
          },
        }),
      ]);

    expect(diffUniverseModels(mk({ seg: 1 }), mk({ seg: 1 })).isEmpty).toBe(
      true
    );

    const diff = diffUniverseModels(mk({ seg: 1 }), mk({ seg: 2 }));
    expect(diff.paths.changed.p1?.changes.map((c) => c.field)).toEqual([
      "rule",
    ]);
  });

  it("reports a path moved between zones as a sourceZoneId change", () => {
    const before = model([
      zone("z1", { pathIds: ["p1"], pathsById: { p1: path("p1") } }),
      zone("z2"),
    ]);
    const after = model([
      zone("z1"),
      zone("z2", { pathIds: ["p1"], pathsById: { p1: path("p1") } }),
    ]);

    const diff = diffUniverseModels(before, after);
    expect(diff.paths.changed.p1).toEqual({
      sourceZoneId: "z2",
      changes: [{ field: "sourceZoneId", before: "z1", after: "z2" }],
    });
  });

  it("narrows change entries by field discriminant", () => {
    const before = model([zone("z1")]);
    const after = model([zone("z1", { name: "renamed" })]);

    const changes = diffUniverseModels(before, after).zones.changed.z1 ?? [];
    for (const change of changes) {
      if (change.field === "name") {
        // Type-level check: before/after narrow to string here.
        expect(change.before.length).toBeGreaterThan(0);
        expect(change.after).toBe("renamed");
      }
    }
  });
});
