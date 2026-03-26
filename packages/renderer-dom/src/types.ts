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

export type ZoneComponentSlotName =
  | "title"
  | "type"
  | "badge"
  | "body"
  | "footer";

export type PathComponentSlotName =
  | "label"
  | "rule"
  | "target"
  | "body";

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

export type RenderMountRegistry = {
  zones: ZoneComponentMount[];
  paths: PathComponentMount[];
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
  interactionHandlers?: RendererInteractionHandlers;
  exclusionState?: RendererExclusionState;

  debug?: RendererDebugOptions;
};

export type ZoneflowRenderer = {
  mount(container: HTMLElement): void;
  update(input: RendererInput): RendererFrame | undefined;
  destroy(): void;
};
