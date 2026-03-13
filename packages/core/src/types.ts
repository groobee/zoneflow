export type UniverseId = string;
export type ZoneId = string;
export type PathId = string;
export type ZoneType = "container" | "action" | string;

export type Layout = {
  x: number;
  y: number;
  z?: number;
  width?: number;
  height?: number;
};

export type Point = {
  x: number;
  y: number;
};

export type ZoneLayout = Layout & {
  anchors: {
    inlet: Point;
    outlet: Point;
  };
};

export type PathLayout = {
  // Route-level offset in world coordinates to separate overlapping paths.
  routeOffset?: Point;
  // External renderer/editor components mounted on a path (e.g. condition chips).
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
  rule?: PathRule;
  meta?: Record<string, unknown>;
};

export type Zone = {
  id: ZoneId;
  parentZoneId: ZoneId | null;
  name: string;
  zoneType: ZoneType;

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
