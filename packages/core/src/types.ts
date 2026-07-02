export type UniverseId = string;
export type ZoneId = string;
export type PathId = string;
export type ZoneType = "container" | "action" | string;

export type Layout = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type Point = {
  x: number;
  y: number;
};

export type AnchorRect = Layout;

export type AnchorLayout = {
  point: Point;
  rect?: AnchorRect;
};
/** Per-slot lane geometry (world units). See {@link ZoneLayout.slotLayoutsByKey}. */
export type ZoneSlotLayout = {
  /**
   * Lane width for the default left-edge stacking. Ignored when {@link rect}
   * is set.
   */
  width?: number;
  /**
   * Free placement override, in container-local coordinates (relative to the
   * container's top-left, world units). A slot with a rect leaves the
   * left-edge stack entirely — place it anywhere, any size. Clamped to the
   * container bounds at resolve time; `width`/`height` fall back to the
   * library default width and the full container height. When free rects
   * overlap, the later-declared slot wins hit-testing (it is also drawn on
   * top).
   */
  rect?: Layout;
  /**
   * Docking snap points in SLOT-LOCAL coordinates (relative to the lane's
   * top-left, world units). While a child zone is dragged inside the lane its
   * CENTER snaps to the nearest point not already occupied by a sibling —
   * one zone per point, so docked zones never pile up on the same spot. No
   * free point → no snap (free placement; membership is unaffected). Omit
   * for free placement everywhere in the lane.
   */
  snapPoints?: Point[];
};

export type ZoneLayout = Layout & {
  zOrder?: number;
  /**
   * Lane geometry per slot key, presentation-only (membership lives on the
   * model as `Zone.slotKey`). Slots declared by the zone stack from its left
   * edge in declaration order; omitted entries use the library default width.
   * Resolved via `resolveZoneSlotRegions`.
   */
  slotLayoutsByKey?: Record<string, ZoneSlotLayout>;
  anchors: {
    inlet: AnchorLayout;
    outlet: AnchorLayout;
  };
};

export type PathLayout = {
  zOrder?: number;
  routeOffset?: Point;
  componentLayoutsById?: Record<string, Layout>;
};

export type ZoneAction = {
  type: string;
  payload?: Record<string, unknown>;
};

/**
 * Capability effects a slot applies to the child zones docked into it. These
 * are structural (which engines allow what), not semantic — the meaning of the
 * slot stays with the consuming service.
 */
export type ZoneSlotEffects = {
  /**
   * "disabled": docked children cannot be the target of any path — their
   * input capability derives to false (inlet anchor hidden, excluded from
   * connection drop targets, validation error on incoming paths).
   */
  childInput?: "disabled";
};

/**
 * A docking slot declared by a container zone (see {@link Zone.slots}).
 * Membership lives on the child ({@link Zone.slotKey}); lane geometry lives in
 * the layout model ({@link ZoneLayout.slotLayoutsByKey}).
 */
export type ZoneSlotDef = {
  /** Identifier referenced by children's {@link Zone.slotKey}. Unique per zone. */
  key: string;
  /** Display label for the default lane renderer. Defaults to the uppercased key. */
  label?: string;
  /** Capability effects applied to docked children. */
  effects?: ZoneSlotEffects;
  /**
   * When true the default renderer draws a dotted connector from the
   * container's inlet to this lane — the visual for "entering the container
   * activates this slot". Pure decoration of the docking semantics; no model
   * behavior changes.
   */
  entry?: boolean;
};

export type PathRule = {
  type: string;
  payload?: Record<string, unknown>;
};

export type ZoneRef = {
  universeId: UniverseId;
  zoneId: ZoneId;
};

export type Path = {
  id: PathId;
  key: string;
  name: string;
  target?: ZoneRef | null;
  rule: PathRule | null;
  meta?: Record<string, unknown>;
};

export type Zone = {
  id: ZoneId;
  parentZoneId: ZoneId | null;
  name: string;
  zoneType: ZoneType;
  inputDisabled?: boolean;
  outputDisabled?: boolean;
  /**
   * When true, the zone's width cannot be changed by the resize handle.
   * Useful for chip-like or one-line zones.
   */
  fixedWidth?: boolean;
  /**
   * When true, the zone's height cannot be changed by the resize handle.
   * Useful for chip-like or one-line zones.
   */
  fixedHeight?: boolean;
  /**
   * Smallest width the zone may shrink to, in world units. Enforced by both
   * the resize handle and the programmatic `editor.resizeZone` — a floor so a
   * zone never becomes too small to show its minimal info. When set it
   * overrides the editor's built-in default floor for this zone.
   */
  minWidth?: number;
  /** Smallest height the zone may shrink to, in world units. See {@link minWidth}. */
  minHeight?: number;
  /**
   * Container-only. Docking slots — declared lanes stacked from the
   * container's left edge, in declaration order. A child zone docks into a
   * slot by setting {@link slotKey}; the slot's {@link ZoneSlotDef.effects}
   * then apply to that child. What a slot *means* (e.g. "children here run in
   * parallel on container entry") is the consuming service's interpretation —
   * the library only carries the structure and the declared capability
   * effects. Declared explicitly (not derived from docked children) so an
   * empty lane still renders as a drop target.
   */
  slots?: ZoneSlotDef[];
  /**
   * Child-only. Key of the parent container's slot this zone is docked into
   * (see {@link slots}). Cleared automatically when the zone moves to a parent
   * that does not declare the key.
   */
  slotKey?: string;
  childZoneIds: ZoneId[];
  action?: ZoneAction;
  pathIds: PathId[];
  pathsById: Record<PathId, Path>;
  meta?: Record<string, unknown>;
};

export type UniverseModel = {
  version: string;
  universeId: UniverseId;
  rootZoneIds: ZoneId[];
  zonesById: Record<ZoneId, Zone>;
  meta?: Record<string, unknown>;
};

export type UniverseLayoutModel = {
  version: string;
  universeId: UniverseId;
  zoneLayoutsById: Record<ZoneId, ZoneLayout>;
  pathLayoutsById: Record<PathId, PathLayout>;
  meta?: Record<string, unknown>;
};
