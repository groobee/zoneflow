import type {
  Path,
  PathId,
  Point,
  UniverseLayoutModel,
  UniverseModel,
  UniverseId,
  Zone,
  ZoneId,
} from "@zoneflow/core";
import type { TextScaleLevel, ZoneflowTheme } from "./theme";

export type CameraState = {
  x: number;
  y: number;
  zoom: number;
};

export type ViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DensityLevel = "far" | "mid" | "near" | "detail";

export type PathVisualMode = "hidden" | "edge-only" | "chip" | "full";

export type ZoneVisualNode = {
  universeId: UniverseId;
  zoneId: ZoneId;
  zone: Zone;
  rect: Rect;
  inlet: Point;
  outlet: Point;
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
  pathId: PathId;
  source: Point;
  target: Point;
  points?: Point[];
};

export type GraphLayoutResult = {
  zonesById: Record<ZoneId, ZoneVisualNode>;
  pathsById: Record<PathId, PathVisualNode>;
  edgesByPathId: Record<PathId, EdgeVisual>;
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
};

export type PathVisibility = {
  isVisible: boolean;
  shouldRenderNode: boolean;
  shouldRenderEdge: boolean;
  shouldRenderLabel: boolean;
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

export type RendererInteractionHandlers = {
  onZoneClick?: (zoneId: ZoneId) => void;
  onPathClick?: (pathId: PathId) => void;
  onBackgroundClick?: () => void;
};

export type RenderPipelineInput = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  viewport: ViewportRect;
  theme: ZoneflowTheme;
  textScale: TextScaleLevel;
};

export type RenderPipelineResult = {
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
  viewport: ViewportRect;
  theme: ZoneflowTheme;
  textScale: TextScaleLevel;
  pipeline: RenderPipelineResult;
  zoneComponentRenderers?: ZoneComponentRendererMap;
  pathComponentRenderers?: PathComponentRendererMap;
  interactionHandlers?: RendererInteractionHandlers;
};

export type RendererInput = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  theme?: Partial<ZoneflowTheme>;
  textScale?: TextScaleLevel;
  camera?: CameraState;

  graphLayoutEngine?: GraphLayoutEngine;
  densityEngine?: DensityEngine;
  visibilityEngine?: VisibilityEngine;
  componentLayoutEngine?: ComponentLayoutEngine;
  drawEngine?: DrawEngine;

  zoneComponentRenderers?: ZoneComponentRendererMap;
  pathComponentRenderers?: PathComponentRendererMap;
  interactionHandlers?: RendererInteractionHandlers;

  debug?: RendererDebugOptions;
};

export type ZoneflowRenderer = {
  mount(container: HTMLElement): void;
  update(input: RendererInput): void;
  destroy(): void;
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
  draw(input: RendererDrawInput): void;
};

export type DebugLayer =
  | "graph-layout"
  | "density"
  | "visibility"
  | "component-layout"
  | "edges"
  | "anchors"
  | "viewport";

export type DebugViewportOverride = {
  enabled: boolean;
  width: number;
  height: number;
};

export type RendererDebugOptions = {
  enabled?: boolean;
  layers?: DebugLayer[];
  viewport?: DebugViewportOverride;
};