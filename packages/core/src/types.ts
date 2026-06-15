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
export type ZoneLayout = Layout & {
  zOrder?: number;
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
