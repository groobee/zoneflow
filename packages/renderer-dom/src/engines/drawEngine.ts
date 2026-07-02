import type {
  BackgroundRendererContext,
  DrawEngine,
  PathComponentLayout,
  PathComponentRendererContext,
  PathComponentSlotName,
  PathLineStyle,
  PathRendererContext,
  PathVisualNode,
  Rect,
  RenderMountRegistry,
  RendererDrawInput,
  VisibilityEmphasis,
  ZoneRendererContext,
  ZoneVisualNode,
} from "../types";
import { resolveZoneAnchorRect } from "../anchors";
import { normalizeZoneShape, type ZoneAnchorRenderMode } from "../zoneShape";
import {
  getEffectiveZoneSlot,
  getZoneDepth,
  isZoneInputEnabled,
  isZoneOutputEnabled,
} from "@zoneflow/core";
import {
  appendEdgeFlowStyle,
  appendPulseStyle,
  resolveCollapsedEdgeStroke,
  resolveDrawableEdgeSegments,
  resolveEdgeFlowMotion,
} from "./edgeFlow";
import {
  applyStyles,
  createSurfaceChrome,
  toLocalRect,
} from "./drawShared";
import { renderDefaultZoneBody } from "./defaultZoneRenderer";

const SCENE_PADDING = 64;
const RENDER_Z_INDEX = {
  backgroundLayer: 0,
  zoneBase: 1,
  pathNode: 1,
  pathStatusBadge: 2,
  zoneLayer: 10,
  edgeLayer: 20,
  pathLayer: 30,
} as const;
const EDGE_FLOW_CLASS = "zoneflow-edge-flow";
const PULSE_CLASS = "zoneflow-pulse";
const PULSE_ANIMATION_NAME = "zoneflow-pulse";

function createEmptyMountRegistry(): RenderMountRegistry {
  return {
    zones: [],
    paths: [],
    zoneRenderers: [],
    zoneOverlays: [],
    pathRenderers: [],
    pathOverlays: [],
    background: null,
  };
}

function clearHost(host: HTMLElement) {
  host.innerHTML = "";
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/**
 * 모듈러 그리드 한 선 종류의 stroke-dasharray 를 만든다. 명시적 dash 가 있으면 그대로,
 * 없으면 style 프리셋으로: dashed 는 tileUnit 을 등분해 이음새 없는 점선, dotted 는 round
 * 캡 점, solid 는 dash 없음(실선). `round` 는 dotted 일 때만 true.
 */
function resolveModularGridDash(
  style: PathLineStyle | undefined,
  explicit: number[] | undefined,
  tileUnit: number
): { dasharray: string | null; round: boolean } {
  if (explicit && explicit.length > 0) {
    return { dasharray: explicit.join(" "), round: false };
  }
  switch (style) {
    case "dashed": {
      const seg = Math.max(tileUnit / 8, 1);
      return { dasharray: `${seg} ${seg}`, round: false };
    }
    case "dotted":
      return { dasharray: `0.1 ${Math.max(tileUnit / 5, 2)}`, round: true };
    default:
      return { dasharray: null, round: false };
  }
}

function makeModularGridLine(params: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
  dash: { dasharray: string | null; round: boolean };
}): SVGElement {
  const { x1, y1, x2, y2, stroke, width, dash } = params;

  // 실선은 stroke 대신 채움 rect 로 그린다 — 패턴 타일 경계 선과 내부 선의 폭이 갈려
  // "두 종류 굵기"로 보이는 스트로크 시접/중심정렬 문제를 피하고 균일 폭을 보장한다.
  // 점선·도트는 stroke-dasharray 가 필요하므로 line 으로.
  if (!dash.dasharray) {
    const rect = createSvgElement("rect");
    if (x1 === x2) {
      rect.setAttribute("x", String(x1 - width / 2));
      rect.setAttribute("y", String(Math.min(y1, y2)));
      rect.setAttribute("width", String(width));
      rect.setAttribute("height", String(Math.abs(y2 - y1)));
    } else {
      rect.setAttribute("x", String(Math.min(x1, x2)));
      rect.setAttribute("y", String(y1 - width / 2));
      rect.setAttribute("width", String(Math.abs(x2 - x1)));
      rect.setAttribute("height", String(width));
    }
    rect.setAttribute("fill", stroke);
    rect.setAttribute("shape-rendering", "crispEdges");
    return rect;
  }

  const line = createSvgElement("line");
  line.setAttribute("x1", String(x1));
  line.setAttribute("y1", String(y1));
  line.setAttribute("x2", String(x2));
  line.setAttribute("y2", String(y2));
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", String(width));
  line.setAttribute("stroke-dasharray", dash.dasharray);
  if (dash.round) line.setAttribute("stroke-linecap", "round");
  return line;
}

function makeModularFillRect(fill: string): SVGRectElement {
  const rect = createSvgElement("rect");
  rect.setAttribute("x", "0");
  rect.setAttribute("y", "0");
  rect.setAttribute("width", "100%");
  rect.setAttribute("height", "100%");
  rect.setAttribute("fill", fill);
  return rect;
}

let modularGridSeq = 0;

/**
 * 모듈러 그리드(셀 스냅의 시각판)를 SVG `<pattern>` 으로 그린다. 가는 그리드(size)는 기본
 * 점선, 셀 경계(반복 트랙 패턴 columns/rows)는 기본 실선이며, 둘 다 gridOptions.modular.grid /
 * .cell 로 색·두께·종류를 외부 주입해 덮어쓸 수 있다. 카메라 팬은 pattern x/y 로, 줌은 트랙
 * 크기 × zoom 으로 반영한다. 패턴이 비면 셀 경계는 생략하고 가는 그리드만 그린다.
 */
function createModularGridLayer(params: {
  options: NonNullable<RendererDrawInput["gridOptions"]>;
  camera: RendererDrawInput["camera"];
}): SVGSVGElement | null {
  const { options, camera } = params;
  const m = options.modular;
  if (!m) return null;
  const zoom = camera.zoom;
  const minor = Math.max(options.size ?? 16, 2) * zoom;
  if (minor < 2) return null;

  const colsScreen = (m.columns ?? []).filter((n) => n > 0).map((n) => n * zoom);
  const rowsScreen = (m.rows ?? []).filter((n) => n > 0).map((n) => n * zoom);
  const periodX = colsScreen.reduce((sum, n) => sum + n, 0);
  const periodY = rowsScreen.reduce((sum, n) => sum + n, 0);
  const hasCells = periodX >= 2 && periodY >= 2;

  // 기본: 그리드 점선 / 셀선 실선. 색·두께·종류는 외부 주입(grid/cell)으로 덮어쓴다.
  const fineColor = options.color ?? "rgba(148, 163, 184, 0.28)";
  const fineWidth = m.grid?.width ?? 1;
  const fineDash = resolveModularGridDash(
    m.grid?.style ?? "dashed",
    m.grid?.dash,
    minor
  );
  const cellColor =
    m.cell?.color ?? options.majorColor ?? "rgba(148, 163, 184, 0.55)";
  // 셀 경계는 점선 그리드 대비 "실선"으로 구분되므로 굵기는 그리드와 같은 1px 가 기본.
  const cellWidth = m.cell?.width ?? 1;
  const cellDash = resolveModularGridDash(
    m.cell?.style ?? "solid",
    m.cell?.dash,
    minor
  );

  const minorOffsetX = positiveModulo(camera.x, minor);
  const minorOffsetY = positiveModulo(camera.y, minor);
  const uid = (modularGridSeq = (modularGridSeq + 1) % 1_000_000);

  const svg = createSvgElement("svg");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  if (options.backgroundColor) {
    svg.style.backgroundColor = options.backgroundColor;
  }

  const defs = createSvgElement("defs");

  const fineId = `zf-grid-fine-${uid}`;
  const finePattern = createSvgElement("pattern");
  finePattern.setAttribute("id", fineId);
  finePattern.setAttribute("patternUnits", "userSpaceOnUse");
  finePattern.setAttribute("width", String(minor));
  finePattern.setAttribute("height", String(minor));
  finePattern.setAttribute("x", String(minorOffsetX));
  finePattern.setAttribute("y", String(minorOffsetY));
  // 타일 가장자리(local 0)의 선이 절반으로 잘려 "두 종류 굵기"로 보이는 것을 막는다.
  finePattern.setAttribute("overflow", "visible");
  finePattern.appendChild(
    makeModularGridLine({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: minor,
      stroke: fineColor,
      width: fineWidth,
      dash: fineDash,
    })
  );
  finePattern.appendChild(
    makeModularGridLine({
      x1: 0,
      y1: 0,
      x2: minor,
      y2: 0,
      stroke: fineColor,
      width: fineWidth,
      dash: fineDash,
    })
  );
  defs.appendChild(finePattern);

  let cellId: string | null = null;
  if (hasCells) {
    cellId = `zf-grid-cell-${uid}`;
    const cellOffsetX = positiveModulo(
      camera.x - (m.originX ?? 0) * zoom,
      periodX
    );
    const cellOffsetY = positiveModulo(
      camera.y - (m.originY ?? 0) * zoom,
      periodY
    );
    const cellPattern = createSvgElement("pattern");
    cellPattern.setAttribute("id", cellId);
    cellPattern.setAttribute("patternUnits", "userSpaceOnUse");
    cellPattern.setAttribute("width", String(periodX));
    cellPattern.setAttribute("height", String(periodY));
    cellPattern.setAttribute("x", String(cellOffsetX));
    cellPattern.setAttribute("y", String(cellOffsetY));
    // 셀 경계선이 타일 가장자리에서 잘리지 않도록(가장자리/내부 선 폭 통일).
    cellPattern.setAttribute("overflow", "visible");
    let x = 0;
    for (const w of colsScreen) {
      cellPattern.appendChild(
        makeModularGridLine({
          x1: x,
          y1: 0,
          x2: x,
          y2: periodY,
          stroke: cellColor,
          width: cellWidth,
          dash: cellDash,
        })
      );
      x += w;
    }
    let y = 0;
    for (const h of rowsScreen) {
      cellPattern.appendChild(
        makeModularGridLine({
          x1: 0,
          y1: y,
          x2: periodX,
          y2: y,
          stroke: cellColor,
          width: cellWidth,
          dash: cellDash,
        })
      );
      y += h;
    }
    defs.appendChild(cellPattern);
  }

  svg.appendChild(defs);
  svg.appendChild(makeModularFillRect(`url(#${fineId})`));
  if (cellId) svg.appendChild(makeModularFillRect(`url(#${cellId})`));
  return svg;
}

function createGridLayer(params: {
  options: NonNullable<RendererDrawInput["gridOptions"]>;
  camera: RendererDrawInput["camera"];
}): HTMLElement | SVGSVGElement | null {
  const { options, camera } = params;

  // 모듈러 그리드 — 가는 그리드(기본 점선) + 반복 트랙 패턴(columns/rows) 경계의 셀선(기본
  // 실선). cellSnap 과 같은 패턴을 받아 시각/스냅을 일치시킨다. 점선/실선 표현을 위해 SVG.
  if (options.modular) {
    return createModularGridLayer({ options, camera });
  }

  const worldSize = Math.max(options.size ?? 16, 2);
  const majorEvery = Math.max(options.majorEvery ?? 4, 2);
  const minorSize = worldSize * camera.zoom;
  const majorSize = minorSize * majorEvery;

  if (minorSize < 2) return null;

  const minorOffsetX = positiveModulo(camera.x, minorSize);
  const minorOffsetY = positiveModulo(camera.y, minorSize);
  const majorOffsetX = positiveModulo(camera.x, majorSize);
  const majorOffsetY = positiveModulo(camera.y, majorSize);

  const minorColor = options.color ?? "rgba(148, 163, 184, 0.10)";
  const majorColor = options.majorColor ?? "rgba(148, 163, 184, 0.18)";

  const grid = document.createElement("div");
  applyStyles(grid, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    backgroundColor: options.backgroundColor ?? "transparent",
    backgroundImage: [
      `linear-gradient(to right, ${minorColor} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${minorColor} 1px, transparent 1px)`,
      `linear-gradient(to right, ${majorColor} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${majorColor} 1px, transparent 1px)`,
    ].join(", "),
    backgroundSize: [
      `${minorSize}px ${minorSize}px`,
      `${minorSize}px ${minorSize}px`,
      `${majorSize}px ${majorSize}px`,
      `${majorSize}px ${majorSize}px`,
    ].join(", "),
    backgroundPosition: [
      `${minorOffsetX}px ${minorOffsetY}px`,
      `${minorOffsetX}px ${minorOffsetY}px`,
      `${majorOffsetX}px ${majorOffsetY}px`,
      `${majorOffsetX}px ${majorOffsetY}px`,
    ].join(", "),
  });
  return grid;
}

function createIdSet(ids?: string[]): Set<string> {
  return new Set(ids ?? []);
}

function sortZonesForRender(params: {
  input: RendererDrawInput;
  zonesById: Record<string, ZoneVisualNode>;
}): ZoneVisualNode[] {
  const zones = Object.values(params.zonesById);

  return zones
    .map((zone, index) => ({
      zone,
      index,
      depth: getZoneDepth(params.input.model, zone.zoneId),
      zOrder: params.input.layoutModel.zoneLayoutsById[zone.zoneId]?.zOrder ?? index,
    }))
    .sort((a, b) => a.depth - b.depth || a.zOrder - b.zOrder || a.index - b.index)
    .map((entry) => entry.zone);
}

function sortPathsForRender(params: {
  input: RendererDrawInput;
  pathsById: Record<string, PathVisualNode>;
}): PathVisualNode[] {
  return Object.values(params.pathsById)
    .map((path, index) => ({
      path,
      index,
      zOrder: params.input.layoutModel.pathLayoutsById[path.pathId]?.zOrder ?? index,
    }))
    .sort((a, b) => a.zOrder - b.zOrder || a.index - b.index)
    .map((entry) => entry.path);
}

function resolvePathDisplayName(params: {
  name: string;
  rule: PathVisualNode["path"]["rule"];
}): string {
  const trimmed = params.name.trim();
  if (trimmed) return trimmed;
  return params.rule === null ? "Empty" : "Untitled";
}

function resolvePathTargetDisplay(params: {
  model: PathComponentRendererContext["model"];
  pathVisual: PathComponentRendererContext["pathVisual"];
}) {
  const targetZoneId = params.pathVisual.targetZoneId;

  if (!targetZoneId) {
    return {
      label: "—",
      status: "unconfigured" as const,
    };
  }

  const targetZone = params.model.zonesById[targetZoneId];
  if (!targetZone) {
    return {
      label: "—",
      status: "missing" as const,
    };
  }

  return {
    label: targetZone.name,
    status: "resolved" as const,
  };
}

function createPathStatusBadge(params: {
  owner: HTMLElement;
  status: "unconfigured" | "missing";
  theme: RendererDrawInput["theme"];
}) {
  const { owner, status, theme } = params;
  const badge = document.createElement("div");

  const tone = status === "missing" ? theme.status.warning : theme.status.info;
  const isMissing = status === "missing";
  badge.title = isMissing ? "Broken path target" : "Path target not set";
  badge.setAttribute(
    "aria-label",
    isMissing ? "Broken path target" : "Path target not set"
  );
  badge.textContent = isMissing ? "⚠" : "?";

  applyStyles(badge, {
    position: "absolute",
    right: "10px",
    top: "10px",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    border: tone.border,
    background: tone.background,
    color: tone.color,
    boxShadow: tone.shadow,
    fontSize: "12px",
    lineHeight: "1",
    fontWeight: "700",
    pointerEvents: "none",
    zIndex: RENDER_Z_INDEX.pathStatusBadge,
  });

  owner.appendChild(badge);
}

function getOpacity(emphasis: VisibilityEmphasis): number {
  switch (emphasis) {
    case "strong":
      return 1;
    case "normal":
      return 0.92;
    case "dim":
      return 0.52;
    case "hidden":
    default:
      return 0.18;
  }
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function getEdgeColor(params: {
  kind: "zone-to-path" | "path-to-zone";
  theme: RendererDrawInput["theme"];
}) {
  return params.kind === "zone-to-path"
    ? params.theme.pathEdge
    : params.theme.pathInboundEdge;
}

// SVG stroke-dasharray for a consumer-chosen line style. Dotted relies on the
// round linecap (already set on every edge stroke) to render the ~0-length
// dashes as dots. Returns null for solid/undefined (no dash pattern).
function getEdgeDashPattern(lineStyle: PathLineStyle | undefined): string | null {
  switch (lineStyle) {
    case "dashed":
      return "7 6";
    case "dotted":
      return "0.1 6";
    default:
      return null;
  }
}

// 패스 연결선을 출발→도착 직선으로(곡선 우회 없이). lineShape: "straight" 용.
function getStraightPathD(params: {
  source: { x: number; y: number };
  target: { x: number; y: number };
}) {
  const { source, target } = params;
  return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
}

function getBezierCurvePathD(params: {
  source: { x: number; y: number };
  target: { x: number; y: number };
}) {
  const { source, target } = params;
  const distanceX = Math.abs(target.x - source.x);
  const distanceY = Math.abs(target.y - source.y);

  if (distanceX <= 72 && distanceY <= 48) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  const sourceLead = Math.min(Math.max(Math.abs(target.x - source.x) * 0.18, 18), 42);
  const leadSourceX = source.x + sourceLead;
  const targetLead = Math.min(Math.max(Math.abs(target.x - source.x) * 0.16, 18), 42);
  const targetApproachX = target.x - targetLead;
  const shouldRouteAround = targetApproachX - leadSourceX < 36;

  if (shouldRouteAround) {
    const bridgeDistance = Math.abs(leadSourceX - targetApproachX);
    const midX = (leadSourceX + targetApproachX) / 2;
    const sourceBendX =
      leadSourceX + Math.min(Math.max(bridgeDistance * 0.22, 28), 72);
    const targetBendX =
      targetApproachX - Math.min(Math.max(bridgeDistance * 0.22, 28), 72);
    const verticalGap = Math.abs(target.y - source.y);
    const verticalDirection = target.y >= source.y ? 1 : -1;
    const laneOffset = Math.min(
      Math.max(Math.abs(target.x - source.x) * 0.22 + 48, 56),
      144
    );
    const laneY =
      (source.y + target.y) / 2 +
      (verticalGap < 36 ? verticalDirection * laneOffset : 0);

    return [
      `M ${source.x} ${source.y}`,
      `L ${leadSourceX} ${source.y}`,
      `C ${sourceBendX} ${source.y}, ${sourceBendX} ${laneY}, ${midX} ${laneY}`,
      `C ${targetBendX} ${laneY}, ${targetBendX} ${target.y}, ${targetApproachX} ${target.y}`,
      `L ${target.x} ${target.y}`,
    ].join(" ");
  }

  const dx = targetApproachX - leadSourceX;
  const handle = Math.min(Math.max(Math.abs(dx) * 0.45, 28), 104);
  const control1X = leadSourceX + handle;
  const control2X = targetApproachX - handle;

  return `M ${source.x} ${source.y} L ${leadSourceX} ${source.y} C ${control1X} ${source.y}, ${control2X} ${target.y}, ${targetApproachX} ${target.y} L ${target.x} ${target.y}`;
}

function computeSceneBounds(input: RendererDrawInput): Rect {
  const {
    pipeline,
    viewportInfo,
  } = input;

  let maxX = viewportInfo.world.x + viewportInfo.world.width;
  let maxY = viewportInfo.world.y + viewportInfo.world.height;

  for (const zone of Object.values(pipeline.graphLayout.zonesById)) {
    maxX = Math.max(maxX, zone.rect.x + zone.rect.width);
    maxY = Math.max(maxY, zone.rect.y + zone.rect.height);
  }

  for (const path of Object.values(pipeline.graphLayout.pathsById)) {
    if (!path.rect) continue;
    maxX = Math.max(maxX, path.rect.x + path.rect.width);
    maxY = Math.max(maxY, path.rect.y + path.rect.height);
  }

  for (const edges of Object.values(pipeline.graphLayout.edgesByPathId)) {
    for (const edge of edges) {
      maxX = Math.max(maxX, edge.source.x, edge.target.x);
      maxY = Math.max(maxY, edge.source.y, edge.target.y);
    }
  }

  return {
    x: 0,
    y: 0,
    width: Math.max(1, maxX + SCENE_PADDING),
    height: Math.max(1, maxY + SCENE_PADDING),
  };
}

function renderPathFallback(
  host: HTMLElement,
  slot: PathComponentSlotName,
  context: PathComponentRendererContext
) {
  const base: Record<string, string | number> = {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: context.theme.pathLabel,
    boxSizing: "border-box",
    fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
  };

  if (slot === "label") {
    const title = resolvePathDisplayName({
      name: context.path.name,
      rule: context.path.rule,
    });
    host.textContent = title;
    applyStyles(host, {
      ...base,
      // Consumer-resolved per-path color (resolvePathColor) overrides the theme.
      color: context.pathColor ?? context.theme.pathLabel,
      fontSize: "12px",
      fontWeight: 700,
    });
    return;
  }

  if (slot === "rule") {
    host.textContent = context.path.rule?.type ?? "empty";
    applyStyles(host, {
      ...base,
      color: context.theme.zoneSubtext,
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    });
    return;
  }

  if (slot === "target") {
    const targetDisplay = resolvePathTargetDisplay({
      model: context.model,
      pathVisual: context.pathVisual,
    });

    host.textContent = targetDisplay.label;
    applyStyles(host, {
      ...base,
      color:
        targetDisplay.status === "missing"
          ? context.theme.status.warning.color
          : targetDisplay.status === "unconfigured"
            ? context.theme.status.info.color
            : context.theme.zoneSubtext,
      fontSize: "11px",
      fontWeight: targetDisplay.status === "resolved" ? 500 : 700,
    });
    return;
  }

  if (slot === "body") {
    host.textContent = context.path.rule
      ? context.path.rule.payload
        ? JSON.stringify(context.path.rule.payload)
        : "No payload"
      : "No rule configured";
    applyStyles(host, {
      ...base,
      whiteSpace: "normal",
      color: context.theme.zoneSubtext,
      fontSize: "11px",
      lineHeight: "1.4",
    });
  }
}

function createPathSlotHost(params: {
  pathVisual: PathVisualNode;
  componentLayout: PathComponentLayout;
  slot: PathComponentSlotName;
  input: RendererDrawInput;
  mounts: RenderMountRegistry;
  owner: HTMLElement;
}) {
  const {
    pathVisual,
    componentLayout,
    slot,
    input,
    mounts,
    owner,
  } = params;

  const rect = componentLayout.slots[slot];
  if (!rect || !pathVisual.rect) return;

  const localRect = toLocalRect(pathVisual.rect, rect);
  const host = document.createElement("div");
  host.dataset.zoneflowPathId = pathVisual.pathId;
  host.dataset.zoneflowSlot = slot;

  applyStyles(host, {
    position: "absolute",
    left: `${localRect.x}px`,
    top: `${localRect.y}px`,
    width: `${localRect.width}px`,
    height: `${localRect.height}px`,
    pointerEvents: "auto",
  });

  const visibility = input.pipeline.visibility.pathVisibilityById[pathVisual.pathId];
  const density = input.pipeline.density.pathDensityById[pathVisual.pathId];
  const context: PathComponentRendererContext = {
    model: input.model,
    layoutModel: input.layoutModel,
    path: pathVisual.path,
    pathVisual,
    density,
    visibility,
    componentLayout,
    camera: input.camera,
    theme: input.theme,
    pathColor: input.resolvePathColor?.(pathVisual.path) ?? undefined,
    textScale: input.textScale,
  };

  const renderer = input.pathComponentRenderers?.[slot];
  if (renderer) {
    renderer(host, context);
  } else {
    renderPathFallback(host, slot, context);
  }

  owner.appendChild(host);
  mounts.paths.push({
    key: `${pathVisual.pathId}:${slot}`,
    pathId: pathVisual.pathId,
    slot,
    host,
    rect,
    context,
  });
}

function drawEdges(params: {
  svg: SVGSVGElement;
  input: RendererDrawInput;
}) {
  const { svg, input } = params;
  const edgeFlowMotion = resolveEdgeFlowMotion(input.theme);
  appendEdgeFlowStyle({
    svg,
    animationName: "zoneflow-edge-flow",
    className: EDGE_FLOW_CLASS,
    motion: edgeFlowMotion,
  });
  // CSS rules are document-global even from an SVG <style>, so this also
  // powers the pulse class on the DOM zone/path layers.
  appendPulseStyle({
    svg,
    animationName: PULSE_ANIMATION_NAME,
    className: PULSE_CLASS,
  });

  for (const [pathId, edges] of Object.entries(input.pipeline.graphLayout.edgesByPathId)) {
    const visibility = input.pipeline.visibility.pathVisibilityById[pathId];
    if (!visibility?.shouldRenderEdge) continue;

    const drawableEdges = resolveDrawableEdgeSegments({
      pathId,
      edges,
      visibility,
    });

    // Consumer-resolved per-path line color overrides the theme's edge colors
    // for every segment of this path, collapsed ones included.
    const pathVisual = input.pipeline.graphLayout.pathsById[pathId];
    const lineColor = pathVisual
      ? input.resolvePathLineColor?.(pathVisual.path) ?? undefined
      : undefined;
    const pathStyle = pathVisual
      ? input.resolvePathStyle?.(pathVisual.path) ?? undefined
      : undefined;

    // Pulsing segments are wrapped in a group so the blink animates the
    // group's opacity without fighting the per-stroke flow animation class.
    let edgeOwner: SVGElement = svg;
    if (pathStyle?.pulse) {
      const pulseGroup = createSvgElement("g");
      pulseGroup.setAttribute("class", PULSE_CLASS);
      svg.appendChild(pulseGroup);
      edgeOwner = pulseGroup;
    }

    // dashed/dotted draws a single static patterned stroke and suppresses the
    // moving flow layers — a flowing dash on top of a static dash reads as
    // noise, and an inert path is exactly what "not wired up yet" should look
    // like. Solid keeps the normal base + animated flow stack.
    const patterned = getEdgeDashPattern(pathStyle?.lineStyle);

    for (const { edge, collapsed } of drawableEdges) {
      const stroke =
        lineColor ??
        (collapsed
          ? resolveCollapsedEdgeStroke(input.theme)
          : getEdgeColor({
              kind: edge.kind,
              theme: input.theme,
            }));
      const pathD =
        pathStyle?.lineShape === "straight"
          ? getStraightPathD({ source: edge.source, target: edge.target })
          : getBezierCurvePathD({ source: edge.source, target: edge.target });
      const opacity = getOpacity(visibility.emphasis);
      const baseWidth = edge.kind === "path-to-zone" ? 2.25 : 1.85;

      if (patterned) {
        const dashed = createSvgElement("path");
        dashed.setAttribute("d", pathD);
        dashed.setAttribute("fill", "none");
        dashed.setAttribute("stroke", stroke);
        dashed.setAttribute("stroke-width", String(baseWidth));
        dashed.setAttribute("stroke-linecap", "round");
        dashed.setAttribute("stroke-linejoin", "round");
        dashed.setAttribute("stroke-dasharray", patterned);
        // Sole layer, so render it at full emphasis (no faint base stack).
        dashed.setAttribute("opacity", String(opacity * 0.9));
        edgeOwner.appendChild(dashed);
        continue;
      }

      const path = createSvgElement("path");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", String(baseWidth));
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", String(opacity * 0.42));
      edgeOwner.appendChild(path);

      const flowGlow = createSvgElement("path");
      flowGlow.setAttribute("d", pathD);
      flowGlow.setAttribute("fill", "none");
      flowGlow.setAttribute("stroke", stroke);
      flowGlow.setAttribute(
        "stroke-width",
        edge.kind === "path-to-zone" ? "4.4" : "3.8"
      );
      flowGlow.setAttribute("stroke-linecap", "round");
      flowGlow.setAttribute("stroke-linejoin", "round");
      flowGlow.setAttribute("stroke-dasharray", edgeFlowMotion.dashArray);
      flowGlow.setAttribute("stroke-dashoffset", edgeFlowMotion.dashOffset);
      flowGlow.setAttribute("opacity", String(opacity * 0.18));
      flowGlow.setAttribute("class", EDGE_FLOW_CLASS);
      edgeOwner.appendChild(flowGlow);

      const flow = createSvgElement("path");
      flow.setAttribute("d", pathD);
      flow.setAttribute("fill", "none");
      flow.setAttribute("stroke", stroke);
      flow.setAttribute(
        "stroke-width",
        edge.kind === "path-to-zone" ? "2.55" : "2.15"
      );
      flow.setAttribute("stroke-linecap", "round");
      flow.setAttribute("stroke-linejoin", "round");
      flow.setAttribute("stroke-dasharray", edgeFlowMotion.dashArray);
      flow.setAttribute("stroke-dashoffset", edgeFlowMotion.dashOffset);
      flow.setAttribute("opacity", String(opacity * 0.94));
      flow.setAttribute("class", EDGE_FLOW_CLASS);
      edgeOwner.appendChild(flow);
    }
  }
}

// Depth for clipped shapes: box-shadow is cut away by clip-path, so a
// polygon-following drop-shadow filter is used instead. Tuned to match the
// zone surface box-shadow tokens (rgba(15, 23, 42, …)).
function drawZoneAnchors(params: {
  owner: HTMLElement;
  zone: ZoneVisualNode;
  input: RendererDrawInput;
  mode?: ZoneAnchorRenderMode;
}) {
  const { owner, zone, input, mode = "edge" } = params;
  const density =
    input.pipeline.density.zoneDensityById[zone.zoneId] ?? "far";
  const zoneColor =
    input.resolveZoneColor?.(zone.zone, { density }) ?? undefined;
  const zoneBorderColor =
    zoneColor ??
    (zone.zone.zoneType === "action"
      ? input.theme.zoneActionBorder
      : input.theme.zoneContainerBorder);
  const anchorAccentColor =
    zoneColor ??
    (zone.zone.zoneType === "action"
      ? input.theme.surface.anchor.actionAccent
      : input.theme.surface.anchor.containerAccent);
  const anchorGlowColor = zoneColor
    ? `color-mix(in srgb, ${zoneColor} 12%, transparent)`
    : anchorAccentColor.replace("0.96", "0.12");
  const parentZone = zone.zone.parentZoneId
    ? input.model.zonesById[zone.zone.parentZoneId]
    : undefined;
  const effectiveSlot = getEffectiveZoneSlot(zone.zone, parentZone);
  const shouldRenderAnchor = (kind: "inlet" | "outlet") =>
    kind === "inlet"
      ? isZoneInputEnabled(zone.zone, parentZone)
      : isZoneOutputEnabled(zone.zone);

  // childInput 이 막힌 슬롯에 도킹된 존은 인렛 앵커가 사라지는 자리(좌측 엣지
  // 중앙)에 슬롯 라벨 첫 글자 마커를 그린다 — "패스로 진입하지 않는 존"임을
  // 앵커 위치에서 바로 읽게 한다. 슬롯 레인과 같은 테마 토큰을 쓴다.
  if (effectiveSlot?.effects?.childInput === "disabled") {
    const markerSize = 16;
    const marker = document.createElement("div");
    marker.textContent =
      Array.from(
        (effectiveSlot.label ?? effectiveSlot.key).trim()
      )[0]?.toUpperCase() ?? "•";
    applyStyles(marker, {
      position: "absolute",
      top: "50%",
      left: "0",
      width: `${markerSize}px`,
      height: `${markerSize}px`,
      transform: "translate(-50%, -50%)",
      borderRadius: "999px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: input.theme.surface.anchor.background,
      border: `1px solid ${
        input.theme.surface.zone.slotBorder ?? zoneBorderColor
      }`,
      color: input.theme.surface.zone.slotLabel ?? anchorAccentColor,
      fontSize: "9px",
      fontWeight: 700,
      lineHeight: "1",
      boxSizing: "border-box",
      boxShadow: input.theme.surface.anchor.shadow,
      pointerEvents: "none",
    });
    owner.appendChild(marker);
  }

  // Vertex mode: a compact dot centered on the left/right edge midpoint,
  // sitting exactly on a round/diamond node's side. The interactive anchor
  // geometry is unchanged — this only swaps the visual indicator.
  if (mode === "vertex") {
    const dotSize = 14;
    for (const kind of ["inlet", "outlet"] as const) {
      if (!shouldRenderAnchor(kind)) continue;
      const dot = document.createElement("div");
      const accentDot = document.createElement("div");

      applyStyles(dot, {
        position: "absolute",
        top: "50%",
        left: kind === "inlet" ? "0" : "auto",
        right: kind === "outlet" ? "0" : "auto",
        width: `${dotSize}px`,
        height: `${dotSize}px`,
        transform:
          kind === "inlet"
            ? "translate(-50%, -50%)"
            : "translate(50%, -50%)",
        borderRadius: "999px",
        background: input.theme.surface.anchor.background,
        border: `1px solid ${zoneBorderColor}`,
        boxShadow: input.theme.surface.anchor.shadow,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      });

      applyStyles(accentDot, {
        width: "6px",
        height: "6px",
        borderRadius: "999px",
        background: anchorAccentColor,
      });

      dot.appendChild(accentDot);
      owner.appendChild(dot);
    }
    return;
  }

  for (const kind of ["inlet", "outlet"] as const) {
    if (!shouldRenderAnchor(kind)) continue;
    const anchor = zone.anchors[kind];
    const rect = resolveZoneAnchorRect({
      zoneRect: zone.rect,
      anchor,
      kind,
    });
    const el = document.createElement("div");
    const seam = document.createElement("div");
    const accent = document.createElement("div");

    applyStyles(el, {
      position: "absolute",
      left: `${rect.x - zone.rect.x}px`,
      top: `${rect.y - zone.rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: "0",
      background: input.theme.surface.anchor.background,
      border: `1px solid ${zoneBorderColor}`,
      borderRight: kind === "inlet" ? "none" : `1px solid ${zoneBorderColor}`,
      borderLeft: kind === "outlet" ? "none" : `1px solid ${zoneBorderColor}`,
      boxShadow: input.theme.surface.anchor.shadow,
      boxSizing: "border-box",
      overflow: "hidden",
      pointerEvents: "none",
    });

    applyStyles(seam, {
      position: "absolute",
      top: "0",
      bottom: "0",
      width: "10px",
      background: input.theme.surface.anchor.background,
      right: kind === "inlet" ? "0" : "auto",
      left: kind === "outlet" ? "0" : "auto",
    });

    applyStyles(accent, {
      position: "absolute",
      top: "50%",
      width: "4px",
      height: `${Math.max(22, rect.height * 0.34)}px`,
      transform: "translateY(-50%)",
      borderRadius: "2px",
      background: anchorAccentColor,
      left: kind === "inlet" ? "8px" : "auto",
      right: kind === "outlet" ? "8px" : "auto",
      boxShadow: `0 0 0 4px ${anchorGlowColor}`,
    });

    el.appendChild(seam);
    el.appendChild(accent);
    owner.appendChild(el);
  }
}

export const domDrawEngine: DrawEngine = {
  draw(input) {
    const mounts = createEmptyMountRegistry();
    const {
      host,
      viewportInfo,
      camera,
      theme,
      pipeline,
      interactionHandlers,
    } = input;
    const excludedZoneIds = createIdSet(input.exclusionState?.excludedZoneIds);
    const excludedPathIds = createIdSet(input.exclusionState?.excludedPathIds);

    clearHost(host);
    applyStyles(host, {
      position: "relative",
      overflow: "hidden",
      background: theme.background,
    });

    const sceneBounds = computeSceneBounds(input);
    const viewportRoot = document.createElement("div");
    const worldBgRoot = document.createElement("div");
    const worldRoot = document.createElement("div");
    const backgroundLayer = document.createElement("div");
    const edgeSvg = createSvgElement("svg");
    const zoneLayer = document.createElement("div");
    const pathLayer = document.createElement("div");

    applyStyles(viewportRoot, {
      position: "absolute",
      left: `${viewportInfo.effective.x}px`,
      top: `${viewportInfo.effective.y}px`,
      width: `${viewportInfo.effective.width}px`,
      height: `${viewportInfo.effective.height}px`,
      overflow: "hidden",
      background: theme.background,
    });

    viewportRoot.addEventListener("click", (event) => {
      if (event.target === viewportRoot) {
        interactionHandlers?.onBackgroundClick?.();
      }
    });

    const worldTransform = `translate(${camera.x - viewportInfo.effective.x}px, ${camera.y - viewportInfo.effective.y}px) scale(${camera.zoom})`;

    applyStyles(worldBgRoot, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      transform: worldTransform,
      transformOrigin: "0 0",
      willChange: "transform",
      pointerEvents: "none",
    });

    applyStyles(worldRoot, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      transform: worldTransform,
      transformOrigin: "0 0",
      willChange: "transform",
    });

    edgeSvg.setAttribute("width", String(sceneBounds.width));
    edgeSvg.setAttribute("height", String(sceneBounds.height));
    edgeSvg.setAttribute("viewBox", `0 0 ${sceneBounds.width} ${sceneBounds.height}`);
    applyStyles(edgeSvg, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      overflow: "visible",
      pointerEvents: "none",
      zIndex: RENDER_Z_INDEX.edgeLayer,
    });

    applyStyles(backgroundLayer, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      zIndex: RENDER_Z_INDEX.backgroundLayer,
      pointerEvents: "none",
    });

    applyStyles(zoneLayer, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      zIndex: RENDER_Z_INDEX.zoneLayer,
      pointerEvents: "none",
    });

    applyStyles(pathLayer, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      zIndex: RENDER_Z_INDEX.pathLayer,
      pointerEvents: "none",
    });

    const backgroundContext: BackgroundRendererContext = {
      sceneBounds,
      camera,
      viewportInfo,
      theme,
    };

    if (input.backgroundRenderer) {
      input.backgroundRenderer(backgroundLayer, backgroundContext);
    }

    mounts.background = {
      host: backgroundLayer,
      context: backgroundContext,
    };

    worldBgRoot.appendChild(backgroundLayer);
    worldRoot.appendChild(edgeSvg);
    worldRoot.appendChild(zoneLayer);
    worldRoot.appendChild(pathLayer);

    viewportRoot.appendChild(worldBgRoot);
    if (input.gridOptions?.enabled) {
      const gridLayer = createGridLayer({
        options: input.gridOptions,
        camera,
      });
      if (gridLayer) viewportRoot.appendChild(gridLayer);
    }
    viewportRoot.appendChild(worldRoot);
    host.appendChild(viewportRoot);

    drawEdges({
      svg: edgeSvg,
      input,
    });

    for (const zoneVisual of sortZonesForRender({
      input,
      zonesById: pipeline.graphLayout.zonesById,
    })) {
      const visibility = pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];
      if (!visibility?.isVisible || excludedZoneIds.has(zoneVisual.zoneId)) continue;

      const componentLayout = pipeline.componentLayout.zonesById[zoneVisual.zoneId];
      const zoneDepth = getZoneDepth(input.model, zoneVisual.zoneId);
      const zoneEl = document.createElement("div");
      const zoneBodyEl = document.createElement("div");
      zoneEl.dataset.zoneflowZoneId = zoneVisual.zoneId;
      zoneBodyEl.dataset.zoneflowZoneBody = zoneVisual.zoneId;

      // Per-zone resolvers are density-aware so a consumer can vary the card
      // (shape/color/border style/icon) by level — e.g. a dashed dim border at
      // far. Resolve the level once and pass it to all of them.
      const zoneDensity =
        input.pipeline.density.zoneDensityById[zoneVisual.zoneId] ?? "far";
      const zoneResolveContext = { density: zoneDensity };

      // Consumer-resolved style overrides (diff-preview ghosts etc.). Opacity
      // composes onto the visibility-driven value and dims the whole subtree —
      // body, slots, and anchors alike.
      const zoneStyle =
        input.resolveZoneStyle?.(zoneVisual.zone, zoneResolveContext) ??
        undefined;
      const zoneStyleOpacity = Math.min(Math.max(zoneStyle?.opacity ?? 1, 0), 1);

      applyStyles(zoneEl, {
        position: "absolute",
        left: `${zoneVisual.rect.x}px`,
        top: `${zoneVisual.rect.y}px`,
        width: `${zoneVisual.rect.width}px`,
        height: `${zoneVisual.rect.height}px`,
        opacity: getOpacity(visibility.emphasis) * zoneStyleOpacity,
        overflow: "visible",
        zIndex: zoneDepth + RENDER_Z_INDEX.zoneBase,
        // zoneLayer 가 pointer-events: none 이고 이 속성은 상속되므로,
        // 명시하지 않으면 카드에서 슬롯 사각형 밖 영역의 클릭이 배경으로 빠진다.
        pointerEvents: "auto",
      });
      if (zoneStyle?.pulse) {
        // Pulses from the inline opacity above, so it composes with ghosting.
        zoneEl.classList.add(PULSE_CLASS);
      }

      const shape = normalizeZoneShape(
        input.resolveZoneShape?.(zoneVisual.zone, zoneResolveContext)
      );
      // Consumer-resolved per-zone color overrides the theme's border + accent
      // (body background and text stay theme-driven to preserve contrast).
      const zoneColor =
        input.resolveZoneColor?.(zoneVisual.zone, zoneResolveContext) ??
        undefined;
      const zoneBorderColor =
        zoneColor ??
        (zoneVisual.zone.zoneType === "action"
          ? theme.zoneActionBorder
          : theme.zoneContainerBorder);
      const zoneAccentColor = zoneColor
        ? `color-mix(in srgb, ${zoneColor} 18%, transparent)`
        : zoneVisual.zone.zoneType === "action"
          ? theme.surface.zone.actionAccent
          : theme.surface.zone.containerAccent;

      // 도킹 슬롯 레인을 존 로컬 좌표로 변환해 외부 렌더러 컨텍스트에 노출 —
      // 풀바디/오버레이 렌더러가 재계산 없이 그대로 그릴 수 있다.
      const zoneSlotRegions = (zoneVisual.slotRegions ?? []).map((region) => ({
        key: region.key,
        x: region.rect.x - zoneVisual.rect.x,
        y: region.rect.y - zoneVisual.rect.y,
        width: region.rect.width,
        height: region.rect.height,
      }));

      // Full-body renderer escape hatch: when the consumer provides one for
      // this zone/level, it owns the entire body (border, background, content)
      // — skip the built-in chrome, slots and farest icon. Geometry, anchors,
      // click and opacity/pulse stay library-controlled.
      const customZoneRenderer =
        input.resolveZoneRenderer?.(zoneVisual.zone, zoneResolveContext) ??
        undefined;

      if (customZoneRenderer) {
        // Full-body renderer escape hatch: the consumer's renderer owns the
        // entire body (border, background, content). Geometry, anchors, click
        // and opacity/pulse stay library-controlled.
        applyStyles(zoneBodyEl, {
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        });
        const rendererContext: ZoneRendererContext = {
          model: input.model,
          layoutModel: input.layoutModel,
          zone: zoneVisual.zone,
          zoneVisual,
          density: zoneDensity,
          visibility,
          rect: zoneVisual.rect,
          camera: input.camera,
          theme,
          zoneColor,
          textScale: input.textScale,
          slotRegions: zoneSlotRegions,
        };
        customZoneRenderer(zoneBodyEl, rendererContext);
        mounts.zoneRenderers.push({
          key: `${zoneVisual.zoneId}:__zone__`,
          zoneId: zoneVisual.zoneId,
          host: zoneBodyEl,
          rect: zoneVisual.rect,
          context: rendererContext,
        });
      } else {
        // No consumer renderer → the library's default zone renderer draws the
        // standard card (chrome + built-in slots + farest icon). The built-in
        // slot taxonomy lives in that renderer, not in the engine core.
        renderDefaultZoneBody({
          host: zoneBodyEl,
          zoneVisual,
          componentLayout,
          shape,
          zoneBorderColor,
          zoneAccentColor,
          zoneStyle,
          zoneDensity,
          zoneColor,
          zoneResolveContext,
          input,
          mounts,
        });
      }

      zoneEl.addEventListener("click", (event) => {
        event.stopPropagation();
        interactionHandlers?.onZoneClick?.(zoneVisual.zoneId);
      });

      zoneEl.appendChild(zoneBodyEl);

      // 본문 위에 얹는 오버레이(배지/장식 등). renderer 레벨이라 뷰/편집 양쪽 모드
      // 에서 렌더된다. 호스트는 pointer-events:none 이라 빈 영역 클릭은 존으로
      // 통과하고, 소비자가 자기 요소에 pointerEvents:"auto" 를 주면 상호작용 가능.
      const zoneOverlayRenderer =
        input.resolveZoneOverlayRenderer?.(
          zoneVisual.zone,
          zoneResolveContext
        ) ?? undefined;
      if (zoneOverlayRenderer) {
        const overlayEl = document.createElement("div");
        overlayEl.dataset.zoneflowZoneOverlay = zoneVisual.zoneId;
        applyStyles(overlayEl, {
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
        });
        const overlayContext: ZoneRendererContext = {
          model: input.model,
          layoutModel: input.layoutModel,
          zone: zoneVisual.zone,
          zoneVisual,
          density: zoneDensity,
          visibility,
          rect: zoneVisual.rect,
          camera: input.camera,
          theme,
          zoneColor,
          textScale: input.textScale,
          slotRegions: zoneSlotRegions,
        };
        zoneOverlayRenderer(overlayEl, overlayContext);
        zoneEl.appendChild(overlayEl);
        mounts.zoneOverlays.push({
          key: `${zoneVisual.zoneId}:__overlay__`,
          zoneId: zoneVisual.zoneId,
          host: overlayEl,
          rect: zoneVisual.rect,
          context: overlayContext,
        });
      }

      drawZoneAnchors({
        owner: zoneEl,
        zone: zoneVisual,
        input,
        mode: shape.anchors,
      });

      zoneLayer.appendChild(zoneEl);
    }

    for (const pathVisual of sortPathsForRender({
      input,
      pathsById: pipeline.graphLayout.pathsById,
    })) {
      const visibility = pipeline.visibility.pathVisibilityById[pathVisual.pathId];
      if (
        !visibility?.shouldRenderNode ||
        !pathVisual.rect ||
        excludedPathIds.has(pathVisual.pathId)
      ) {
        continue;
      }

      const componentLayout = pipeline.componentLayout.pathsById[pathVisual.pathId];
      const pathDensity = pipeline.density.pathDensityById[pathVisual.pathId];
      const pathEl = document.createElement("div");
      pathEl.dataset.zoneflowPathId = pathVisual.pathId;

      // Full-node renderer escape hatch (path-side renderZone): when present it
      // owns the whole node — skip the built-in chip chrome, status badge and
      // slots. Geometry, connector edges, click and opacity/pulse stay ours.
      const customPathRenderer =
        input.resolvePathRenderer?.(pathVisual.path, { mode: pathDensity }) ??
        undefined;

      // pathEl 은 투명 프레임(overflow:visible) — 오버레이가 라벨 박스 밖으로
      // 나갈 수 있게 한다. 본문(chrome+슬롯 / 풀노드 렌더러)은 안쪽 pathBodyEl 이
      // 칩 모양대로 클립한다. zoneEl + zoneBodyEl 구조와 동일.
      applyStyles(pathEl, {
        position: "absolute",
        left: `${pathVisual.rect.x}px`,
        top: `${pathVisual.rect.y}px`,
        width: `${pathVisual.rect.width}px`,
        height: `${pathVisual.rect.height}px`,
        boxSizing: "border-box",
        opacity: getOpacity(visibility.emphasis),
        zIndex: RENDER_Z_INDEX.pathNode,
        overflow: "visible",
        // pathLayer 의 pointer-events: none 상속 차단 — zoneEl 과 동일한 이유.
        pointerEvents: "auto",
      });

      if (input.resolvePathStyle?.(pathVisual.path)?.pulse) {
        pathEl.classList.add(PULSE_CLASS);
      }

      pathEl.addEventListener("click", (event) => {
        event.stopPropagation();
        interactionHandlers?.onPathClick?.(pathVisual.pathId);
      });

      // 본문 래퍼: 칩 모양(rounded)대로 클립. 풀노드 렌더러는 자기 배경/테두리를
      // 직접 그리므로 chrome 스타일은 생략한다.
      const pathBodyEl = document.createElement("div");
      applyStyles(pathBodyEl, {
        position: "absolute",
        inset: "0",
        boxSizing: "border-box",
        overflow: "hidden",
        ...(customPathRenderer
          ? {}
          : {
              borderRadius: "18px",
              border: `1px solid ${theme.pathEdge}`,
              background: theme.surface.path.background,
              boxShadow: theme.surface.path.shadow,
            }),
      });
      pathEl.appendChild(pathBodyEl);

      if (customPathRenderer) {
        const rendererContext: PathRendererContext = {
          model: input.model,
          layoutModel: input.layoutModel,
          path: pathVisual.path,
          pathVisual,
          mode: pathDensity,
          visibility,
          rect: pathVisual.rect,
          camera: input.camera,
          theme,
          pathColor: input.resolvePathColor?.(pathVisual.path) ?? undefined,
          textScale: input.textScale,
        };
        customPathRenderer(pathBodyEl, rendererContext);
        mounts.pathRenderers.push({
          key: `${pathVisual.pathId}:__path__`,
          pathId: pathVisual.pathId,
          host: pathBodyEl,
          rect: pathVisual.rect,
          context: rendererContext,
        });
      } else {
        const pathChromeEl = document.createElement("div");
        createSurfaceChrome({
          owner: pathChromeEl,
          accent: theme.surface.path.accent,
          radius: "18px",
          theme,
          topBandOpacity: 0.72,
        });
        pathBodyEl.appendChild(pathChromeEl);

        const targetDisplay = resolvePathTargetDisplay({
          model: input.model,
          pathVisual,
        });

        if (targetDisplay.status !== "resolved") {
          createPathStatusBadge({
            owner: pathBodyEl,
            status: targetDisplay.status,
            theme,
          });
        }

        for (const slot of Object.keys(componentLayout?.slots ?? {}) as PathComponentSlotName[]) {
          createPathSlotHost({
            pathVisual,
            componentLayout,
            slot,
            input,
            mounts,
            owner: pathBodyEl,
          });
        }
      }

      // 본문 위에 얹는 오버레이(배지/장식 등). renderer 레벨이라 뷰/편집 양쪽 모드
      // 에서 렌더된다. 호스트는 pointer-events:none 이라 빈 영역 클릭은 패스로 통과
      // 하고, 소비자가 자기 요소에 pointerEvents:"auto" 를 주면 상호작용 가능.
      // (존 오버레이와 대칭 — renderPath 와 달리 본문을 교체하지 않고 위에 얹는다.)
      const pathOverlayRenderer =
        input.resolvePathOverlayRenderer?.(pathVisual.path, {
          mode: pathDensity,
        }) ?? undefined;
      if (pathOverlayRenderer) {
        const overlayEl = document.createElement("div");
        overlayEl.dataset.zoneflowPathOverlay = pathVisual.pathId;
        applyStyles(overlayEl, {
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
        });
        const overlayContext: PathRendererContext = {
          model: input.model,
          layoutModel: input.layoutModel,
          path: pathVisual.path,
          pathVisual,
          mode: pathDensity,
          visibility,
          rect: pathVisual.rect,
          camera: input.camera,
          theme,
          pathColor: input.resolvePathColor?.(pathVisual.path) ?? undefined,
          textScale: input.textScale,
        };
        pathOverlayRenderer(overlayEl, overlayContext);
        pathEl.appendChild(overlayEl);
        mounts.pathOverlays.push({
          key: `${pathVisual.pathId}:__overlay__`,
          pathId: pathVisual.pathId,
          host: overlayEl,
          rect: pathVisual.rect,
          context: overlayContext,
        });
      }

      pathLayer.appendChild(pathEl);
    }

    return mounts;
  },
};
