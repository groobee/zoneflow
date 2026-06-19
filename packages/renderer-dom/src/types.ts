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
import type { TextScaleLevel, ZoneflowTheme, ZoneflowThemeInput } from "./theme";
import type {
  ResolveZoneColor,
  ResolveZoneIcon,
  ResolveZoneShape,
  ResolveZoneStyle,
  ZoneResolveContext,
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

export type DensityLevel = "farest" | "far" | "mid" | "near" | "detail";

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

/**
 * 라이브러리 **기본 zone 렌더러**(`renderDefaultZoneBody`)가 그리는 슬롯 이름들.
 * 코어 엔진이 강제하는 고정 목록이 아니라 기본 렌더러의 구현 디테일이다 — 존
 * 전체를 직접 그리려면 `resolveZoneRenderer` 로 풀바디 렌더러를 주면 이 슬롯들은
 * 아예 만들어지지 않는다.
 */
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

/**
 * Per-path presentation overrides beyond color — the path-side counterpart
 * of {@link ZoneStyleOverride}.
 */
export type PathLineStyle = "solid" | "dashed" | "dotted";

export type PathStyleOverride = {
  /**
   * Blink the path's node (label slots included) and its connector lines.
   * Built for diff previews where color alone is ambiguous because apps may
   * color paths for their own reasons. Disabled automatically under
   * `prefers-reduced-motion`.
   */
  pulse?: boolean;
  /**
   * Dash pattern for the path's connector lines. `"dashed"`/`"dotted"` draw a
   * single static stroke (the moving flow animation is suppressed so the
   * pattern stays legible), which reads as "inert / not yet wired up" — e.g.
   * an unconfigured path with no rule or target. Defaults to `"solid"` (the
   * normal animated flow). Pair with {@link ResolvePathLineColor} to also tint
   * it, and with the node `border-style` is left untouched — only the
   * connector line is affected.
   */
  lineStyle?: PathLineStyle;
};

/**
 * Resolver invoked once per path to decide its style overrides. Return
 * `undefined`/`null` for the default presentation. Purely presentational —
 * geometry and hit-testing are unaffected.
 */
export type ResolvePathStyle = (
  path: Path
) => PathStyleOverride | null | undefined;

export type ZoneComponentMount = {
  key: string;
  zoneId: ZoneId;
  slot: ZoneComponentSlotName;
  host: HTMLElement;
  rect: Rect;
  context: ZoneComponentRendererContext;
};

/**
 * Context for a full-zone renderer ({@link ZoneRenderer}). Unlike the slot
 * context there is no `componentLayout` — the renderer owns the whole body
 * (border, background, content), so it gets the zone's `rect` and resolved
 * accent (`zoneColor`) to draw against.
 */
export type ZoneRendererContext = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zone: Zone;
  zoneVisual: ZoneVisualNode;
  density: DensityLevel;
  visibility: ZoneVisibility;
  rect: Rect;
  camera: CameraState;
  theme: ZoneflowTheme;
  zoneColor?: string;
  textScale: TextScaleLevel;
};

/**
 * Imperative renderer that draws an ENTIRE zone body (border + background +
 * content) into `host`, replacing the built-in card chrome and slots. The
 * library still owns geometry, anchors, hit-testing, opacity/pulse — only the
 * inner visual is yours. See {@link ResolveZoneRenderer}.
 */
export type ZoneRenderer = (
  host: HTMLElement,
  context: ZoneRendererContext
) => void;

/**
 * Resolver invoked once per zone to pick a full-body renderer for the current
 * density level (or any per-zone condition). Return `undefined`/`null` to fall
 * back to the built-in default card. This is the "level renderer" escape hatch
 * for when parameterizing the default card (shape/color/style/icon) isn't
 * enough and you need to draw the whole thing — e.g. a borderless icon chip at
 * `farest`, a custom mini-card at `far`.
 */
export type ResolveZoneRenderer = (
  zone: Zone,
  context: ZoneResolveContext
) => ZoneRenderer | null | undefined;

/**
 * 존 위에 얹을 오버레이 렌더러를 고른다(없으면 undefined). 본문을 교체하지 않고
 * 위에 덮으며, 뷰/편집 양쪽 모드에서 적용된다. {@link ZoneOverlayMount}.
 */
export type ResolveZoneOverlayRenderer = (
  zone: Zone,
  context: ZoneResolveContext
) => ZoneRenderer | null | undefined;

export type ZoneRendererMount = {
  key: string;
  zoneId: ZoneId;
  host: HTMLElement;
  rect: Rect;
  context: ZoneRendererContext;
};

/**
 * 존 본문 위에 덮어 그리는 오버레이 마운트(배지·장식 등). 본문을 교체하는
 * {@link ZoneRendererMount} 와 달리 본문 위에 얹히며, 뷰/편집 양쪽 모드에서
 * 렌더된다(렌더 레벨이라 편집 모드 전용이 아니다). 호스트는 기본적으로
 * pointer-events:none 이라 빈 영역 클릭은 존으로 통과한다.
 */
export type ZoneOverlayMount = {
  key: string;
  zoneId: ZoneId;
  host: HTMLElement;
  rect: Rect;
  context: ZoneRendererContext;
};

/** Context passed to {@link ResolvePathRenderer} (path-side {@link ZoneResolveContext}). */
export type PathResolveContext = {
  /** The path's resolved visual mode this frame (edge-only / chip / full). */
  mode: PathVisualMode;
};

/**
 * Context for a full-path renderer ({@link PathRenderer}) — the path-node
 * counterpart of {@link ZoneRendererContext}. The renderer owns the entire
 * node body (border, background, content), so it gets the node `rect` and the
 * resolved `pathColor` rather than a per-slot layout.
 */
export type PathRendererContext = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  path: Path;
  pathVisual: PathVisualNode;
  mode: PathVisualMode;
  visibility: PathVisibility;
  rect: Rect;
  camera: CameraState;
  theme: ZoneflowTheme;
  pathColor?: string;
  textScale: TextScaleLevel;
};

/**
 * Imperative renderer that draws an ENTIRE path node (border + background +
 * content) into `host`, replacing the built-in chip chrome, status badge and
 * slots. The library still owns geometry, the connector edges, hit-testing and
 * opacity/pulse — only the node's inner visual is yours. See
 * {@link ResolvePathRenderer}.
 */
export type PathRenderer = (
  host: HTMLElement,
  context: PathRendererContext
) => void;

/**
 * Resolver invoked once per path to pick a full-node renderer for the current
 * visual mode (or any per-path condition). Return `undefined`/`null` to fall
 * back to the built-in chip. The path-side equivalent of
 * {@link ResolveZoneRenderer}.
 */
export type ResolvePathRenderer = (
  path: Path,
  context: PathResolveContext
) => PathRenderer | null | undefined;

export type PathRendererMount = {
  key: string;
  pathId: PathId;
  host: HTMLElement;
  rect: Rect;
  context: PathRendererContext;
};

/**
 * 패스 노드 위에 얹을 오버레이 렌더러를 고른다(없으면 undefined). 본문을 교체하지
 * 않고 위에 덮으며, 뷰/편집 양쪽 모드에서 적용된다. 존의
 * {@link ResolveZoneOverlayRenderer} 와 대칭. {@link PathOverlayMount}.
 */
export type ResolvePathOverlayRenderer = (
  path: Path,
  context: PathResolveContext
) => PathRenderer | null | undefined;

/**
 * 패스 노드 위에 덮어 그리는 오버레이 마운트(배지·장식 등). 본문을 교체하는
 * {@link PathRendererMount} 와 달리 본문 위에 얹히며, 뷰/편집 양쪽 모드에서
 * 렌더된다. 호스트는 기본적으로 pointer-events:none 이라 빈 영역 클릭은 패스로
 * 통과한다. 존의 {@link ZoneOverlayMount} 와 대칭.
 */
export type PathOverlayMount = {
  key: string;
  pathId: PathId;
  host: HTMLElement;
  rect: Rect;
  context: PathRendererContext;
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
  /** Full-body zone renderers (see {@link ResolveZoneRenderer}). */
  zoneRenderers: ZoneRendererMount[];
  /** On-top zone overlays (see {@link ResolveZoneOverlayRenderer}). */
  zoneOverlays: ZoneOverlayMount[];
  /** Full-node path renderers (see {@link ResolvePathRenderer}). */
  pathRenderers: PathRendererMount[];
  /** On-top path overlays (see {@link ResolvePathOverlayRenderer}). */
  pathOverlays: PathOverlayMount[];
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
  resolveZoneIcon?: ResolveZoneIcon;
  resolveZoneRenderer?: ResolveZoneRenderer;
  resolveZoneOverlayRenderer?: ResolveZoneOverlayRenderer;
  resolvePathRenderer?: ResolvePathRenderer;
  resolvePathOverlayRenderer?: ResolvePathOverlayRenderer;
  resolvePathColor?: ResolvePathColor;
  resolvePathLineColor?: ResolvePathLineColor;
  resolvePathStyle?: ResolvePathStyle;
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
  theme?: ZoneflowThemeInput;
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
  resolveZoneIcon?: ResolveZoneIcon;
  resolveZoneRenderer?: ResolveZoneRenderer;
  resolveZoneOverlayRenderer?: ResolveZoneOverlayRenderer;
  resolvePathRenderer?: ResolvePathRenderer;
  resolvePathOverlayRenderer?: ResolvePathOverlayRenderer;
  resolvePathColor?: ResolvePathColor;
  resolvePathLineColor?: ResolvePathLineColor;
  resolvePathStyle?: ResolvePathStyle;
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
