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

/** A docking-slot lane region resolved to world coordinates. */
export type ZoneSlotRegionVisual = {
  key: string;
  rect: Rect;
  /** Docking snap points in world coordinates (see ZoneSlotLayout.snapPoints). */
  snapPoints?: Point[];
};

export type ZoneVisualNode = {
  universeId: UniverseId;
  zoneId: ZoneId;
  zone: Zone;
  rect: Rect;
  anchors: {
    inlet: { point: Point; rect?: AnchorRect };
    outlet: { point: Point; rect?: AnchorRect };
  };
  /**
   * Docking-slot lane regions in world coordinates (containers declaring
   * `Zone.slots` only). Computed by the graph-layout engine from the same
   * geometry the editor hit-tests, so external drawers (renderZone /
   * renderZoneOverlay / custom DrawEngine) can draw the lanes themselves
   * without re-deriving positions.
   */
  slotRegions?: ZoneSlotRegionVisual[];
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
  /**
   * 소비자 리졸버({@link ResolvePathDisplay})가 강제한 표시 형태. `"edge"` 면
   * visibility 가 노드/라벨 렌더를 끄고 연결선은 직결로 collapse 된다.
   * 미지정 = `"node"` (기존 동작, density 자동 축약만 적용).
   */
  display?: PathDisplayMode;
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

/**
 * Connector line geometry: `"curved"` (default) is a bezier that bends and
 * routes around when endpoints are close/overlapping; `"straight"` is a direct
 * source→target segment.
 */
export type PathLineShape = "curved" | "straight";

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
  /**
   * Connector line geometry — `"curved"` (default) or `"straight"`. Affects
   * only the drawn connector path; anchor points and hit-testing are unchanged.
   */
  lineShape?: PathLineShape;
};

/**
 * Resolver invoked once per path to decide its style overrides. Return
 * `undefined`/`null` for the default presentation. Presentational only —
 * affects the connector's look/geometry, not node hit-testing.
 */
export type ResolvePathStyle = (
  path: Path
) => PathStyleOverride | null | undefined;

/**
 * 패스의 표시 형태.
 * - `"node"`: 라벨 노드 + 양쪽 연결선 (기존 기본).
 * - `"edge"`: 라벨 노드를 그리지 않고 존→존 **직결선**만 그린다 — "존 실행 후
 *   그냥 다음 존으로" 같은 단순 진행 연결용. 줌아웃 시 density 가 자동으로
 *   하는 edge-only 축약과 같은 렌더 경로를 쓴다.
 */
export type PathDisplayMode = "node" | "edge";

export type PathDisplayContext = {
  sourceZone: Zone;
  /** 타깃 존(모델). dangling 패스면 undefined. */
  targetZone?: Zone;
};

/**
 * 패스별 표시 형태를 소비자가 결정하는 리졸버 — "어떤 패스가 라벨 없는 단순
 * 연결인가"는 도메인 의미(존의 진행 방식 등)라 라이브러리는 판단하지 않는다.
 * `undefined`/`null` 반환 시 기존 동작(라벨 노드 + density 자동 축약).
 *
 * - 타깃 없는 dangling 패스에는 `"edge"` 를 반환해도 무시된다(라벨마저 없으면
 *   화면에서 완전히 사라지므로 라이브러리가 노드를 강제 유지).
 * - `"edge"` 패스도 에디터에서 **선택 가능한 항목**이다 — 연결선 중점의 칩
 *   또는 (존 위가 아닌) 선 클릭으로 선택되고, 선택되면 연결선이 강조되며
 *   툴바/삭제가 동작한다. 라벨 이동·리사이즈·재연결 핸들만 대상이 아니다.
 * - 렌더마다 패스별로 호출되므로 동기적이고 가벼워야 하며, throw 는
 *   `undefined` 로 처리.
 */
export type ResolvePathDisplay = (
  path: Path,
  context: PathDisplayContext
) => PathDisplayMode | null | undefined;

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
  /**
   * Docking-slot lane regions in ZONE-LOCAL pixels (origin = the host's
   * top-left corner), ready to position `absolute` children against —
   * `snapPoints` included, same coordinate space. World coordinates are on
   * `zoneVisual.slotRegions`. Empty for zones without declared slots.
   */
  slotRegions: Array<{ key: string; snapPoints?: Point[] } & Rect>;
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

/**
 * 모듈러 그리드에서 한 종류의 선(가는 그리드 / 셀 경계)을 어떻게 그릴지 — 소비자가
 * 주입하는 스타일. `style` 은 `solid|dashed|dotted` 프리셋이고, `dash` 로 직접
 * stroke-dasharray(px)를 줄 수도 있다(주면 style 보다 우선). 색/두께도 덮어쓸 수 있다.
 */
export type ModularGridLineStyle = {
  color?: string;
  /** 선 두께(px, 화면 기준). */
  width?: number;
  /** 선 종류 프리셋. */
  style?: PathLineStyle;
  /** 명시적 stroke-dasharray(px). 주면 `style` 보다 우선. */
  dash?: number[];
};

export type GridOptions = {
  enabled?: boolean;
  size?: number;
  color?: string;
  majorEvery?: number;
  majorColor?: string;
  backgroundColor?: string;
  /**
   * "모듈러 그리드" — 기본 가는 그리드(size) 위에 **반복 트랙 패턴**의 경계마다 굵은 선을
   * 덧그린다(모눈종이에 트랙 경계마다 굵은 선). 축별 트랙 패턴은 origin 부터 무한 반복하며,
   * 편집기 `cellSnap` 과 같은 의미로 짝수 인덱스 트랙이 셀·홀수가 거터다. `cellSnap` 과 같은
   * columns/rows 를 주면 스냅과 시각이 일치한다(셀 스냅의 시각판). 가는 선은 size/color 를 그대로 쓴다.
   */
  modular?: {
    /**
     * 가로/세로 트랙 패턴(px), 반복. 트랙 경계마다 굵은 선. 예: `[256, 80]` → 256·80 이
     * 번갈아 반복(짝수=셀, 홀수=거터). `[256]` → 거터 없는 균일 셀.
     */
    columns: number[];
    rows: number[];
    originX?: number;
    originY?: number;
    /**
     * 가는 그리드 선 스타일. **기본값 점선(dashed)**. 외부에서 색/두께/종류를 주입해 덮어쓸 수 있다.
     */
    grid?: ModularGridLineStyle;
    /**
     * 셀(스냅) 경계 선 스타일. **기본값 실선(solid)**. 외부에서 주입해 덮어쓸 수 있다.
     * 색 미지정 시 majorColor 로 폴백.
     */
    cell?: ModularGridLineStyle;
  };
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

/**
 * 에디터의 선택/hover 상태를 렌더러에 내려보내는 채널
 * (`exclusionState` 와 대칭). 선택된 패스는 연결선 전체가 `theme.selection`
 * 색으로 강조된다 — 라벨 노드가 없는(display "edge") 패스도 선으로
 * 피드백을 받도록. hover 는 굵기/불투명도만 올린다.
 */
export type RendererSelectionState = {
  selectedPathIds?: PathId[];
  hoveredPathId?: PathId | null;
};

export type RenderPipelineInput = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  viewportInfo: RenderViewportInfo;
  theme: ZoneflowTheme;
  textScale: TextScaleLevel;
  /**
   * 파이프라인 단계(graph layout → visibility)에서 쓰이는 패스 표시 형태
   * 리졸버. 드로우 전용 리졸버들(resolvePathStyle 등)과 달리 레이아웃/가시성
   * 결과 자체를 바꾸므로 파이프라인 입력에 있다.
   */
  resolvePathDisplay?: ResolvePathDisplay;
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
  selectionState?: RendererSelectionState;
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
  resolvePathDisplay?: ResolvePathDisplay;
  backgroundRenderer?: BackgroundRenderer;
  gridOptions?: GridOptions;
  interactionHandlers?: RendererInteractionHandlers;
  exclusionState?: RendererExclusionState;
  selectionState?: RendererSelectionState;

  debug?: RendererDebugOptions;
};

export type ZoneflowRenderer = {
  mount(container: HTMLElement): void;
  update(input: RendererInput): RendererFrame | undefined;
  destroy(): void;
};
