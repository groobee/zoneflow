import { describe, expect, it } from "vitest";
import type { Path, UniverseModelDiff, Zone } from "@zoneflow/core";
import {
  createDiffDecorations,
  DIFF_DECORATION_COLORS,
} from "./diffDecorations.js";

function emptyDiff(): UniverseModelDiff {
  return {
    model: [],
    zones: { added: [], removed: [], changed: {} },
    paths: { added: [], removed: [], changed: {} },
    isEmpty: true,
  };
}

function zone(id: string): Zone {
  return {
    id,
    parentZoneId: null,
    name: id,
    zoneType: "action",
    childZoneIds: [],
    pathIds: [],
    pathsById: {},
  };
}

function path(id: string): Path {
  return { id, key: id, name: id, target: null, rule: null };
}

describe("createDiffDecorations", () => {
  it("paints removed/added/changed statuses with default colors", () => {
    const diff = emptyDiff();
    diff.zones.removed = ["z-removed"];
    diff.zones.added = ["z-added"];
    diff.zones.changed = {
      "z-changed": [{ field: "name", before: "a", after: "b" }],
    };
    diff.paths.removed = [{ pathId: "p-removed", sourceZoneId: "z1" }];
    diff.paths.added = [{ pathId: "p-added", sourceZoneId: "z1" }];
    diff.paths.changed = {
      "p-changed": { sourceZoneId: "z1", changes: [] },
    };

    const deco = createDiffDecorations(diff);

    expect(deco.resolveZoneColor(zone("z-removed"))).toBe(
      DIFF_DECORATION_COLORS.removed
    );
    expect(deco.resolveZoneColor(zone("z-added"))).toBe(
      DIFF_DECORATION_COLORS.added
    );
    expect(deco.resolveZoneColor(zone("z-changed"))).toBe(
      DIFF_DECORATION_COLORS.changed
    );
    expect(deco.resolvePathLineColor(path("p-removed"))).toBe(
      DIFF_DECORATION_COLORS.removed
    );
    expect(deco.resolvePathColor(path("p-added"))).toBe(
      DIFF_DECORATION_COLORS.added
    );
    expect(deco.resolvePathLineColor(path("p-changed"))).toBe(
      DIFF_DECORATION_COLORS.changed
    );
  });

  it("ghosts and pulses removed zones only", () => {
    const diff = emptyDiff();
    diff.zones.removed = ["z-removed"];
    diff.zones.added = ["z-added"];

    const deco = createDiffDecorations(diff);
    expect(deco.resolveZoneStyle(zone("z-removed"))).toEqual({
      borderStyle: "dashed",
      opacity: 0.45,
      pulse: true,
    });
    expect(deco.resolveZoneStyle(zone("z-added"))).toBeUndefined();
  });

  it("pulses removed paths and respects pulseRemoved: false", () => {
    const diff = emptyDiff();
    diff.paths.removed = [{ pathId: "p-removed", sourceZoneId: "z1" }];
    diff.zones.removed = ["z-removed"];

    const deco = createDiffDecorations(diff);
    expect(deco.resolvePathStyle(path("p-removed"))).toEqual({ pulse: true });
    expect(deco.resolvePathStyle(path("p-kept"))).toBeUndefined();

    const still = createDiffDecorations(diff, { pulseRemoved: false });
    expect(still.resolvePathStyle(path("p-removed"))).toBeUndefined();
    expect(still.resolveZoneStyle(zone("z-removed"))).toEqual({
      borderStyle: "dashed",
      opacity: 0.45,
    });
  });

  it("merges base path style under the removal pulse (dashed stays dashed)", () => {
    const diff = emptyDiff();
    diff.paths.removed = [{ pathId: "p-removed", sourceZoneId: "z1" }];

    const deco = createDiffDecorations(diff, {
      base: {
        resolvePathStyle: (p) =>
          p.id === "p-removed" ? { lineStyle: "dashed" } : undefined,
      },
    });

    expect(deco.resolvePathStyle(path("p-removed"))).toEqual({
      lineStyle: "dashed",
      pulse: true,
    });
  });

  it("falls back to base resolvers for undecorated elements", () => {
    const diff = emptyDiff();
    diff.paths.removed = [{ pathId: "p-removed", sourceZoneId: "z1" }];

    const deco = createDiffDecorations(diff, {
      base: {
        resolvePathColor: (p) => (p.id === "p-meta" ? "#ec4899" : undefined),
        resolveZoneColor: () => "#2563eb",
      },
    });

    expect(deco.resolvePathColor(path("p-removed"))).toBe(
      DIFF_DECORATION_COLORS.removed
    );
    expect(deco.resolvePathColor(path("p-meta"))).toBe("#ec4899");
    expect(deco.resolvePathColor(path("p-plain"))).toBeUndefined();
    expect(deco.resolveZoneColor(zone("z-any"))).toBe("#2563eb");
  });

  it("honors color and ghost-style overrides", () => {
    const diff = emptyDiff();
    diff.zones.removed = ["z-removed"];

    const deco = createDiffDecorations(diff, {
      colors: { removed: "#000000" },
      removedZoneStyle: null,
    });

    expect(deco.resolveZoneColor(zone("z-removed"))).toBe("#000000");
    // ghost disabled but pulse stays on by default
    expect(deco.resolveZoneStyle(zone("z-removed"))).toEqual({ pulse: true });

    const fullyStatic = createDiffDecorations(diff, {
      removedZoneStyle: null,
      pulseRemoved: false,
    });
    expect(fullyStatic.resolveZoneStyle(zone("z-removed"))).toBeUndefined();
  });
});
