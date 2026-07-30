import type {
  Path,
  PathId,
  PathLayout,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneId,
  ZoneLayout,
} from "./types.js";

/**
 * One field-level change: the changed `field` name plus the raw `before` and
 * `after` values. `K` distributes over the union, so every field becomes its
 * own discriminated-union member and consumers can narrow on `field`.
 */
type FieldChangeEntry<T, K extends keyof T> = K extends keyof T
  ? { field: K; before: T[K]; after: T[K] }
  : never;

export type ZoneFieldChange =
  | FieldChangeEntry<
      Zone,
      | "name"
      | "zoneType"
      | "parentZoneId"
      | "inputDisabled"
      | "outputDisabled"
      | "fixedWidth"
      | "fixedHeight"
      | "slots"
      | "slotKey"
      | "action"
      | "meta"
    >
  | {
      /** Relative order of the paths kept on both sides changed (see {@link reorderPaths}). */
      field: "pathOrder";
      before: PathId[];
      after: PathId[];
    };

export type PathFieldChange =
  | FieldChangeEntry<Path, "key" | "name" | "target" | "rule" | "meta">
  | {
      /** The path moved to a different owning zone. */
      field: "sourceZoneId";
      before: ZoneId;
      after: ZoneId;
    };

export type ModelFieldChange =
  | FieldChangeEntry<UniverseModel, "version" | "universeId" | "meta">
  | {
      /** Relative order of the root zones kept on both sides changed. */
      field: "rootOrder";
      before: ZoneId[];
      after: ZoneId[];
    };

export type PathDiffRef = {
  pathId: PathId;
  /**
   * Zone owning the path in the model where it exists: the `after` model for
   * added paths, the `before` model for removed ones. For removed paths the
   * zone itself may also appear in `zones.removed` (the path disappeared
   * because its whole zone did) — cross-check when collapsing summaries.
   */
  sourceZoneId: ZoneId;
};

export type PathDiffChange = {
  /** Zone owning the path in the `after` model. */
  sourceZoneId: ZoneId;
  changes: PathFieldChange[];
};

export type UniverseModelDiff = {
  /** Top-level model changes: `version`, `universeId`, `meta`, root order. */
  model: ModelFieldChange[];
  zones: {
    added: ZoneId[];
    removed: ZoneId[];
    changed: Record<ZoneId, ZoneFieldChange[]>;
  };
  paths: {
    added: PathDiffRef[];
    removed: PathDiffRef[];
    changed: Record<PathId, PathDiffChange>;
  };
  /** True when the two models are semantically identical. */
  isEmpty: boolean;
};

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  ) {
    return false;
  }

  const aIsArray = Array.isArray(a);
  if (aIsArray !== Array.isArray(b)) return false;
  if (aIsArray) {
    const aItems = a as unknown[];
    const bItems = b as unknown[];
    if (aItems.length !== bItems.length) return false;
    return aItems.every((item, index) => deepEqual(item, bItems[index]));
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  // Keys holding `undefined` count as absent (JSON semantics) so that e.g.
  // `{ point, rect: undefined }` equals `{ point }`.
  const aKeys = Object.keys(aRecord).filter(
    (key) => aRecord[key] !== undefined
  );
  const bKeys = Object.keys(bRecord).filter(
    (key) => bRecord[key] !== undefined
  );
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(aRecord[key], bRecord[key]));
}

/**
 * `meta` (and `action`/`rule` payload holders) compare as "absent" when they
 * are `undefined`, `null`, or an empty object — every reader accesses them as
 * `meta?.someKey`, so those three spellings are semantically identical.
 */
function normalizeEmptyObject(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!value) return null;
  return Object.keys(value).length > 0 ? value : null;
}

/**
 * True when the relative order of the ids present on BOTH sides differs.
 * Additions/removals alone do not count — those are reported separately —
 * so a pure reorder is detected even while ids are being added or removed.
 */
function sharedOrderChanged(
  before: readonly string[],
  after: readonly string[]
): boolean {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const beforeShared = before.filter((id) => afterSet.has(id));
  const afterShared = after.filter((id) => beforeSet.has(id));
  if (beforeShared.length !== afterShared.length) return true;
  return beforeShared.some((id, index) => afterShared[index] !== id);
}

function diffZoneFields(before: Zone, after: Zone): ZoneFieldChange[] {
  const changes: ZoneFieldChange[] = [];

  if (before.name !== after.name) {
    changes.push({ field: "name", before: before.name, after: after.name });
  }
  if (before.zoneType !== after.zoneType) {
    changes.push({
      field: "zoneType",
      before: before.zoneType,
      after: after.zoneType,
    });
  }
  if ((before.parentZoneId ?? null) !== (after.parentZoneId ?? null)) {
    changes.push({
      field: "parentZoneId",
      before: before.parentZoneId,
      after: after.parentZoneId,
    });
  }
  // Optional booleans: `undefined` and `false` are the same state (cf.
  // isZoneInputEnabled), so only a real toggle counts as a change.
  if (Boolean(before.inputDisabled) !== Boolean(after.inputDisabled)) {
    changes.push({
      field: "inputDisabled",
      before: before.inputDisabled,
      after: after.inputDisabled,
    });
  }
  if (Boolean(before.outputDisabled) !== Boolean(after.outputDisabled)) {
    changes.push({
      field: "outputDisabled",
      before: before.outputDisabled,
      after: after.outputDisabled,
    });
  }
  if (Boolean(before.fixedWidth) !== Boolean(after.fixedWidth)) {
    changes.push({
      field: "fixedWidth",
      before: before.fixedWidth,
      after: after.fixedWidth,
    });
  }
  if (Boolean(before.fixedHeight) !== Boolean(after.fixedHeight)) {
    changes.push({
      field: "fixedHeight",
      before: before.fixedHeight,
      after: after.fixedHeight,
    });
  }
  // Empty slot arrays count as absent, matching how readers treat them.
  if (
    !deepEqual(
      (before.slots?.length ?? 0) > 0 ? before.slots : null,
      (after.slots?.length ?? 0) > 0 ? after.slots : null
    )
  ) {
    changes.push({ field: "slots", before: before.slots, after: after.slots });
  }
  if ((before.slotKey ?? null) !== (after.slotKey ?? null)) {
    changes.push({
      field: "slotKey",
      before: before.slotKey,
      after: after.slotKey,
    });
  }
  if (!deepEqual(before.action ?? null, after.action ?? null)) {
    changes.push({
      field: "action",
      before: before.action,
      after: after.action,
    });
  }
  if (
    !deepEqual(normalizeEmptyObject(before.meta), normalizeEmptyObject(after.meta))
  ) {
    changes.push({ field: "meta", before: before.meta, after: after.meta });
  }
  if (sharedOrderChanged(before.pathIds, after.pathIds)) {
    changes.push({
      field: "pathOrder",
      before: [...before.pathIds],
      after: [...after.pathIds],
    });
  }

  return changes;
}

function diffPathFields(before: Path, after: Path): PathFieldChange[] {
  const changes: PathFieldChange[] = [];

  if (before.key !== after.key) {
    changes.push({ field: "key", before: before.key, after: after.key });
  }
  if (before.name !== after.name) {
    changes.push({ field: "name", before: before.name, after: after.name });
  }
  if (!deepEqual(before.target ?? null, after.target ?? null)) {
    changes.push({
      field: "target",
      before: before.target,
      after: after.target,
    });
  }
  if (!deepEqual(before.rule ?? null, after.rule ?? null)) {
    changes.push({ field: "rule", before: before.rule, after: after.rule });
  }
  if (
    !deepEqual(normalizeEmptyObject(before.meta), normalizeEmptyObject(after.meta))
  ) {
    changes.push({ field: "meta", before: before.meta, after: after.meta });
  }

  return changes;
}

type PathWithOwner = { path: Path; sourceZoneId: ZoneId };

function collectPathsById(model: UniverseModel): Map<PathId, PathWithOwner> {
  const result = new Map<PathId, PathWithOwner>();
  for (const zone of Object.values(model.zonesById)) {
    // pathIds first (canonical order), then pathsById strays so a model that
    // fails validateUniverseModel still diffs deterministically.
    for (const pathId of zone.pathIds) {
      const path = zone.pathsById[pathId];
      if (path && !result.has(pathId)) {
        result.set(pathId, { path, sourceZoneId: zone.id });
      }
    }
    for (const path of Object.values(zone.pathsById)) {
      if (!result.has(path.id)) {
        result.set(path.id, { path, sourceZoneId: zone.id });
      }
    }
  }
  return result;
}

/**
 * Compute a structural diff between two universe models, matching zones and
 * paths by their stable ids. Pure and side-effect free — built to preview a
 * programmatic transformation before committing it, e.g. showing what an
 * automated cleanup such as {@link removeEmptyPaths} would do:
 *
 * @example
 * const cleaned = removeEmptyPaths(model);
 * const diff = diffUniverseModels(model, cleaned);
 * if (!diff.isEmpty) renderCleanupPreview(diff);
 *
 * Comparison semantics:
 * - Zones/paths existing on only one side land in `added`/`removed`; ids on
 *   both sides get a field-by-field comparison in `changed`.
 * - Removing a zone also reports each of its paths in `paths.removed` —
 *   cross-check `sourceZoneId` against `zones.removed` to collapse those.
 * - `undefined` and `false` are one state for the optional zone flags, and
 *   `undefined`/`null`/`{}` are one state for `meta` — noise-free against
 *   models that round-tripped through JSON.
 * - `childZoneIds` is never compared: reparenting is already reported as a
 *   `parentZoneId` change on the child. Path/root *reorders* are reported
 *   (`pathOrder`/`rootOrder`) because order is meaningful when rendering.
 * - Layout (positions/sizes in `UniverseLayoutModel`) is out of scope; diff
 *   the layout model separately if placement changes matter to you.
 */
export function diffUniverseModels(
  before: UniverseModel,
  after: UniverseModel
): UniverseModelDiff {
  const modelChanges: ModelFieldChange[] = [];
  if (before.version !== after.version) {
    modelChanges.push({
      field: "version",
      before: before.version,
      after: after.version,
    });
  }
  if (before.universeId !== after.universeId) {
    modelChanges.push({
      field: "universeId",
      before: before.universeId,
      after: after.universeId,
    });
  }
  if (
    !deepEqual(normalizeEmptyObject(before.meta), normalizeEmptyObject(after.meta))
  ) {
    modelChanges.push({ field: "meta", before: before.meta, after: after.meta });
  }
  if (sharedOrderChanged(before.rootZoneIds, after.rootZoneIds)) {
    modelChanges.push({
      field: "rootOrder",
      before: [...before.rootZoneIds],
      after: [...after.rootZoneIds],
    });
  }

  const zonesAdded: ZoneId[] = [];
  const zonesRemoved: ZoneId[] = [];
  const zonesChanged: Record<ZoneId, ZoneFieldChange[]> = {};

  for (const zoneId of Object.keys(before.zonesById)) {
    if (!after.zonesById[zoneId]) zonesRemoved.push(zoneId);
  }
  for (const [zoneId, afterZone] of Object.entries(after.zonesById)) {
    const beforeZone = before.zonesById[zoneId];
    if (!beforeZone) {
      zonesAdded.push(zoneId);
      continue;
    }
    const changes = diffZoneFields(beforeZone, afterZone);
    if (changes.length > 0) zonesChanged[zoneId] = changes;
  }

  const pathsAdded: PathDiffRef[] = [];
  const pathsRemoved: PathDiffRef[] = [];
  const pathsChanged: Record<PathId, PathDiffChange> = {};

  const beforePaths = collectPathsById(before);
  const afterPaths = collectPathsById(after);

  for (const [pathId, entry] of beforePaths) {
    if (!afterPaths.has(pathId)) {
      pathsRemoved.push({ pathId, sourceZoneId: entry.sourceZoneId });
    }
  }
  for (const [pathId, afterEntry] of afterPaths) {
    const beforeEntry = beforePaths.get(pathId);
    if (!beforeEntry) {
      pathsAdded.push({ pathId, sourceZoneId: afterEntry.sourceZoneId });
      continue;
    }
    const changes = diffPathFields(beforeEntry.path, afterEntry.path);
    if (beforeEntry.sourceZoneId !== afterEntry.sourceZoneId) {
      changes.push({
        field: "sourceZoneId",
        before: beforeEntry.sourceZoneId,
        after: afterEntry.sourceZoneId,
      });
    }
    if (changes.length > 0) {
      pathsChanged[pathId] = {
        sourceZoneId: afterEntry.sourceZoneId,
        changes,
      };
    }
  }

  const isEmpty =
    modelChanges.length === 0 &&
    zonesAdded.length === 0 &&
    zonesRemoved.length === 0 &&
    Object.keys(zonesChanged).length === 0 &&
    pathsAdded.length === 0 &&
    pathsRemoved.length === 0 &&
    Object.keys(pathsChanged).length === 0;

  return {
    model: modelChanges,
    zones: {
      added: zonesAdded,
      removed: zonesRemoved,
      changed: zonesChanged,
    },
    paths: {
      added: pathsAdded,
      removed: pathsRemoved,
      changed: pathsChanged,
    },
    isEmpty,
  };
}

export type ZoneLayoutFieldChange = FieldChangeEntry<
  ZoneLayout,
  "x" | "y" | "width" | "height" | "zOrder" | "anchors"
>;

export type PathLayoutFieldChange = FieldChangeEntry<
  PathLayout,
  "zOrder" | "routeOffset" | "componentLayoutsById"
>;

export type LayoutModelFieldChange = FieldChangeEntry<
  UniverseLayoutModel,
  "version" | "universeId" | "meta"
>;

export type UniverseLayoutModelDiff = {
  /** Top-level layout-model changes: `version`, `universeId`, `meta`. */
  model: LayoutModelFieldChange[];
  zoneLayouts: {
    added: ZoneId[];
    removed: ZoneId[];
    changed: Record<ZoneId, ZoneLayoutFieldChange[]>;
  };
  pathLayouts: {
    added: PathId[];
    removed: PathId[];
    changed: Record<PathId, PathLayoutFieldChange[]>;
  };
  /** True when the two layout models are semantically identical. */
  isEmpty: boolean;
};

function diffZoneLayoutFields(
  before: ZoneLayout,
  after: ZoneLayout
): ZoneLayoutFieldChange[] {
  const changes: ZoneLayoutFieldChange[] = [];

  if (before.x !== after.x) {
    changes.push({ field: "x", before: before.x, after: after.x });
  }
  if (before.y !== after.y) {
    changes.push({ field: "y", before: before.y, after: after.y });
  }
  if (before.width !== after.width) {
    changes.push({ field: "width", before: before.width, after: after.width });
  }
  if (before.height !== after.height) {
    changes.push({
      field: "height",
      before: before.height,
      after: after.height,
    });
  }
  if (before.zOrder !== after.zOrder) {
    changes.push({
      field: "zOrder",
      before: before.zOrder,
      after: after.zOrder,
    });
  }
  if (!deepEqual(before.anchors, after.anchors)) {
    changes.push({
      field: "anchors",
      before: before.anchors,
      after: after.anchors,
    });
  }

  return changes;
}

function diffPathLayoutFields(
  before: PathLayout,
  after: PathLayout
): PathLayoutFieldChange[] {
  const changes: PathLayoutFieldChange[] = [];

  if (before.zOrder !== after.zOrder) {
    changes.push({
      field: "zOrder",
      before: before.zOrder,
      after: after.zOrder,
    });
  }
  if (!deepEqual(before.routeOffset ?? null, after.routeOffset ?? null)) {
    changes.push({
      field: "routeOffset",
      before: before.routeOffset,
      after: after.routeOffset,
    });
  }
  if (
    !deepEqual(
      normalizeEmptyObject(before.componentLayoutsById),
      normalizeEmptyObject(after.componentLayoutsById)
    )
  ) {
    changes.push({
      field: "componentLayoutsById",
      before: before.componentLayoutsById,
      after: after.componentLayoutsById,
    });
  }

  return changes;
}

/**
 * Compute a structural diff between two universe layout models, matching
 * entries by zone/path id. The companion of {@link diffUniverseModels} for the
 * placement side: run both to preview a full model + layout transformation,
 * e.g. a cleanup paired with {@link pruneLayoutModel}:
 *
 * @example
 * const cleanedModel = removeEmptyPaths(model);
 * const cleanedLayout = pruneLayoutModel(cleanedModel, layoutModel);
 * const modelDiff = diffUniverseModels(model, cleanedModel);
 * const layoutDiff = diffUniverseLayoutModels(layoutModel, cleanedLayout);
 *
 * Comparison semantics match {@link diffUniverseModels}: ids on one side only
 * land in `added`/`removed`, ids on both sides get field-level comparison,
 * `meta`/`componentLayoutsById` treat `undefined` ≡ `{}`, and object keys
 * holding `undefined` count as absent (so anchors written with an explicit
 * `rect: undefined` compare equal to anchors without a `rect` key).
 */
export function diffUniverseLayoutModels(
  before: UniverseLayoutModel,
  after: UniverseLayoutModel
): UniverseLayoutModelDiff {
  const modelChanges: LayoutModelFieldChange[] = [];
  if (before.version !== after.version) {
    modelChanges.push({
      field: "version",
      before: before.version,
      after: after.version,
    });
  }
  if (before.universeId !== after.universeId) {
    modelChanges.push({
      field: "universeId",
      before: before.universeId,
      after: after.universeId,
    });
  }
  if (
    !deepEqual(normalizeEmptyObject(before.meta), normalizeEmptyObject(after.meta))
  ) {
    modelChanges.push({ field: "meta", before: before.meta, after: after.meta });
  }

  const zonesAdded: ZoneId[] = [];
  const zonesRemoved: ZoneId[] = [];
  const zonesChanged: Record<ZoneId, ZoneLayoutFieldChange[]> = {};

  for (const zoneId of Object.keys(before.zoneLayoutsById)) {
    if (!after.zoneLayoutsById[zoneId]) zonesRemoved.push(zoneId);
  }
  for (const [zoneId, afterLayout] of Object.entries(after.zoneLayoutsById)) {
    const beforeLayout = before.zoneLayoutsById[zoneId];
    if (!beforeLayout) {
      zonesAdded.push(zoneId);
      continue;
    }
    const changes = diffZoneLayoutFields(beforeLayout, afterLayout);
    if (changes.length > 0) zonesChanged[zoneId] = changes;
  }

  const pathsAdded: PathId[] = [];
  const pathsRemoved: PathId[] = [];
  const pathsChanged: Record<PathId, PathLayoutFieldChange[]> = {};

  for (const pathId of Object.keys(before.pathLayoutsById)) {
    if (!after.pathLayoutsById[pathId]) pathsRemoved.push(pathId);
  }
  for (const [pathId, afterLayout] of Object.entries(after.pathLayoutsById)) {
    const beforeLayout = before.pathLayoutsById[pathId];
    if (!beforeLayout) {
      pathsAdded.push(pathId);
      continue;
    }
    const changes = diffPathLayoutFields(beforeLayout, afterLayout);
    if (changes.length > 0) pathsChanged[pathId] = changes;
  }

  const isEmpty =
    modelChanges.length === 0 &&
    zonesAdded.length === 0 &&
    zonesRemoved.length === 0 &&
    Object.keys(zonesChanged).length === 0 &&
    pathsAdded.length === 0 &&
    pathsRemoved.length === 0 &&
    Object.keys(pathsChanged).length === 0;

  return {
    model: modelChanges,
    zoneLayouts: {
      added: zonesAdded,
      removed: zonesRemoved,
      changed: zonesChanged,
    },
    pathLayouts: {
      added: pathsAdded,
      removed: pathsRemoved,
      changed: pathsChanged,
    },
    isEmpty,
  };
}
