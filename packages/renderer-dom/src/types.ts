import type {
  AnchorRect,
  Path,
  PathId,
  Point,
  UniverseId,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneId,
} from "@zoneflow/core";
import type { TextScaleLevel, ZoneflowTheme } from "./theme";
import type {
  ResolveZoneColor,
  ResolveZoneShape,
  ResolveZoneStyle,
} from "./zoneShape";

export type CameraState = {
  x: number;
  y: number;
  zoom: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HostViewportRect = Rect;

export type EffectiveViewportRect = Rect;

export type WorldViewportRect = Rect;

export type RenderViewportInfo = {
  host: HostViewportRect;
  effective: EffectiveViewportRect;
  world: WorldViewportRect;
};

export type DensityLevel = "far" | "mid" | "near" | "detail";

export type PathVisualMode = "hidden" | "edge-only" | "chip" | "full";

export type VisibilityEmphasis = "strong" | "normal" | "dim" | "hidden";

export type ZoneVisualNode = {
  universeId: UniverseId;
  zoneId: ZoneId;
  zone: Zone;
  rect: Rect;
  anchors: {
    inlet: { point: Point; rect?: AnchorRect };
    outlet: { point: Point; rect?: AnchorRect };
  };
};

export type PathVisualNode = {
  universeId: UniverseId;
  pathId: PathId;
  sourceZoneId: ZoneId;
  targetZoneId?: ZoneId | null;
  path: Path;
  rect?: Rect;
  inlet?: Point;
  outlet?: Point;
};

export type EdgeVisual = {
  id: string;
  pathId: PathId;
  source: Point;
  target: Point;
  kind: "zone-to-path" | "path-to-zone";
  points?: Point[];
};

export type GraphLayoutResult = {
  zonesById: Record<ZoneId, ZoneVisualNode>;
  pathsById: Record<PathId, PathVisualNode>;
  edgesByPathId: Record<PathId, EdgeVisual[]>;
};

export type DensityResult = {
  zoneDensityById: Record<ZoneId, DensityLevel>;
  pathDensityById: Record<PathId, PathVisualMode>;
};

export type ZoneVisibility = {
  isVisible: boolean;
  isPartial: boolean;
  shouldRenderBody: boolean;
  shouldRenderContent: boolean;
  emphasis: VisibilityEmphasis;
};

export type PathVisibility = {
  isVisible: boolean;
  isPartial: boolean;
  shouldRenderNode: boolean;
  shouldRenderEdge: boolean;
  shouldRenderLabel: boolean;
  emphasis: VisibilityEmphasis;
};

export type VisibilityResult = {
  zoneVisibilityById: Record<ZoneId, ZoneVisibility>;
  pathVisibilityById: Record<PathId, PathVisibility>;
};

export type BuiltInZoneSlotName =
  | "title"
  | "type"
  | "badge"
  | "body"
  | "footer";

export type ZoneComponentSlotName = BuiltInZoneSlotName | (string & {});

export type BuiltInPathSlotName =
  | "label"
  | "rule"
  | "target"
  | "body";

export type PathComponentSlotName = BuiltInPathSlotName | (string & {});

export type ZoneComponentLayout = {
  zoneId: ZoneId;
  slots: Partial<Record<ZoneComponentSlotName, Rect>>;
};

export type PathComponentLayout = {
  pathId: PathId;
  slots: Partial<Record<PathComponentSlotName, Rect>>;
};

export type ComponentLayoutResult = {
  zonesById: Record<ZoneId, ZoneComponentLayout>;
  pathsById: Record<PathId, PathComponentLayout>;
};

export type ZoneComponentRendererContext = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zone: Zone;
  zoneVisual: ZoneVisualNode;
  density: DensityLevel;
  visibility: ZoneVisibility;
  componentLayout: ZoneComponentLayout;
  camera: CameraState;
  theme: ZoneflowTheme;
  /**
   * Per-zone color resolved once from the consumer's `resolveZoneColor` prop —
   * the same value that tints the zone's border/accent on the DOM shape
   * (undefined when not provided or it returned nullish). Symmetric with
   * {@link PathComponentRendererContext.pathColor}: custom slot renderers can
   * read this to match the accent instead of reaching into `zone.meta`. The
   * built-in title/body fallbacks stay theme-driven to preserve contrast.
   */
  zoneColor?: string;
  textScale: TextScaleLevel;
};

export type PathComponentRendererContext = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  path: Path;
  pathVisual: PathVisualNode;
  density: PathVisualMode;
  visibility: PathVisibility;
  componentLayout: PathComponentLayout;
  camera: CameraState;
  theme: ZoneflowTheme;
  /**
   * Per-path color resolved once from the consumer's `resolvePathColor` prop
   * (undefined when not provided or it returned nullish). Single source of
   * truth for both the DOM fallback label and custom slot renderers — mirrors
   * how `resolveZoneColor` drives a zone's accent, so slots should read this
   * rather than reaching into `path.meta` themselves.
   */
  pathColor?: string;
  textScale: TextScaleLevel;
};

export type ZoneComponentRenderer = (
  host: HTMLElement,
  context: ZoneComponentRendererContext
) => void;

export type PathComponentRenderer = (
  host: HTMLElement,
  context: PathComponentRendererContext
) => void;

export type ZoneComponentRendererMap = Partial<
  Record<ZoneComponentSlotName, ZoneComponentRenderer>
>;

export type PathComponentRendererMap = Partial<
  Record<PathComponentSlotName, PathComponentRenderer>
>;

/**
 * Resolver invoked once per path to decide its label color. Return a CSS color
 * to override the path label's text color for that path; return
 * `undefined`/`null` to fall back to the theme's `pathLabel` color. Like
 * {@link ResolveZoneColor}, a purely presentational hook decided by the
 * consumer (e.g. from `path.meta.color`, `path.rule`, …). Only the label text
 * is affected — the rule/target/body slots stay theme-driven for contrast.
 */
export type ResolvePathColor = (path: Path) => string | null | undefined;

/**
 * Resolver invoked once per path to decide the color of its connector lines
 * (the zone→path and path→zone edge strokes, including the flow animation).
 * Return `undefined`/`null` to fall back to the theme's edge colors. The
 * override also applies to the path's collapsed edge segments so a decorated
 * path stays recognizable while a subtree is folded. Pair with
 * {@link ResolvePathColor} when the label should match the line — built for
 * states like a diff preview ("this connection will be removed/retargeted").
 */
export type ResolvePathLineColor = (path: Path) => string | null | undefined;

export type ZoneComponentMount = {
  key: string;
  zoneId: ZoneId;
  slot: ZoneComponentSlotName;
  host: HTMLElement;
  rect: Rect;
  context: ZoneComponentRendererContext;
};

export type PathComponentMount = {
  key: string;
  pathId: PathId;
  slot: PathComponentSlotName;
  host: HTMLElement;
  rect: Rect;
  context: PathComponentRendererContext;
};

export type BackgroundRendererContext = {
  sceneBounds: Rect;
  camera: CameraState;
  viewportInfo: RenderViewportInfo;
  theme: ZoneflowTheme;
};

export type GridOptions = {
  enabled?: boolean;
  size?: number;
  color?: string;
  majorEvery?: number;
  majorColor?: string;
  backgroundColor?: string;
};

export type BackgroundRenderer = (
  host: HTMLElement,
  context: BackgroundRendererContext
) => void;

export type BackgroundMount = {
  host: HTMLElement;
  context: BackgroundRendererContext;
};

export type RenderMountRegistry = {
  zones: ZoneComponentMount[];
  paths: PathComponentMount[];
  background: BackgroundMount | null;
};

export type RendererInteractionHandlers = {
  onZoneClick?: (zoneId: ZoneId) => void;
  onPathClick?: (pathId: PathId) => void;
  onBackgroundClick?: () => void;
};

export type RendererExclusionState = {
  excludedZoneIds?: ZoneId[];
  excludedPathIds?: PathId[];
};

export type RenderPipelineInput = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  viewportInfo: RenderViewportInfo;
  theme: ZoneflowTheme;
  textScale: TextScaleLevel;
};

export type RenderPipelineResult = {
  viewportInfo: RenderViewportInfo;
  graphLayout: GraphLayoutResult;
  density: DensityResult;
  visibility: VisibilityResult;
  componentLayout: ComponentLayoutResult;
};

export type RendererDrawInput = {
  host: HTMLElement;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  viewportInfo: RenderViewportInfo;
  theme: ZoneflowTheme;
  textScale: TextScaleLevel;
  pipeline: RenderPipelineResult;
  zoneComponentRenderers?: ZoneComponentRendererMap;
  pathComponentRenderers?: PathComponentRendererMap;
  resolveZoneShape?: ResolveZoneShape;
  resolveZoneColor?: ResolveZoneColor;
  resolveZoneStyle?: ResolveZoneStyle;
  resolvePathColor?: ResolvePathColor;
  resolvePathLineColor?: ResolvePathLineColor;
  backgroundRenderer?: BackgroundRenderer;
  gridOptions?: GridOptions;
  interactionHandlers?: RendererInteractionHandlers;
  exclusionState?: RendererExclusionState;
};

export type RendererFrame = {
  viewportInfo: RenderViewportInfo;
  pipeline: RenderPipelineResult;
  mounts: RenderMountRegistry;
};

export type GraphLayoutEngine = {
  compute(input: RenderPipelineInput): GraphLayoutResult;
};

export type DensityEngine = {
  compute(input: {
    base: RenderPipelineInput;
    graphLayout: GraphLayoutResult;
  }): DensityResult;
};

export type VisibilityEngine = {
  compute(input: {
    base: RenderPipelineInput;
    graphLayout: GraphLayoutResult;
    density: DensityResult;
  }): VisibilityResult;
};

export type ComponentLayoutEngine = {
  compute(input: {
    base: RenderPipelineInput;
    graphLayout: GraphLayoutResult;
    density: DensityResult;
    visibility: VisibilityResult;
  }): ComponentLayoutResult;
};

export type DrawEngine = {
  draw(input: RendererDrawInput): RenderMountRegistry;
};

export type DebugLayer =
  | "graph-layout"
  | "density"
  | "visibility"
  | "component-layout"
  | "edges"
  | "anchors"
  | "viewport";

export type ViewportConfig = {
  enabled: boolean;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
};
export type RendererDebugOptions = {
  enabled?: boolean;
  layers?: DebugLayer[];
};

export type RendererInput = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  theme?: Partial<ZoneflowTheme>;
  textScale?: TextScaleLevel;
  camera?: CameraState;
  viewport?: ViewportConfig;

  graphLayoutEngine?: GraphLayoutEngine;
  densityEngine?: DensityEngine;
  visibilityEngine?: VisibilityEngine;
  componentLayoutEngine?: ComponentLayoutEngine;
  drawEngine?: DrawEngine;

  zoneComponentRenderers?: ZoneComponentRendererMap;
  pathComponentRenderers?: PathComponentRendererMap;
  resolveZoneShape?: ResolveZoneShape;
  resolveZoneColor?: ResolveZoneColor;
  resolveZoneStyle?: ResolveZoneStyle;
  resolvePathColor?: ResolvePathColor;
  resolvePathLineColor?: ResolvePathLineColor;
  backgroundRenderer?: BackgroundRenderer;
  gridOptions?: GridOptions;
  interactionHandlers?: RendererInteractionHandlers;
  exclusionState?: RendererExclusionState;

  debug?: RendererDebugOptions;
};

export type ZoneflowRenderer = {
  mount(container: HTMLElement): void;
  update(input: RendererInput): RendererFrame | undefined;
  destroy(): void;
};
