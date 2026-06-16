import type {
  BackgroundRendererContext,
  DrawEngine,
  PathComponentLayout,
  PathComponentMount,
  PathComponentRendererContext,
  PathComponentSlotName,
  PathLineStyle,
  PathVisualNode,
  Rect,
  RenderMountRegistry,
  RendererDrawInput,
  VisibilityEmphasis,
  ZoneComponentLayout,
  ZoneComponentMount,
  ZoneComponentRendererContext,
  ZoneComponentSlotName,
  ZoneVisualNode,
} from "../types";
import { resolveZoneAnchorRect } from "../anchors";
import { normalizeZoneShape, type ZoneAnchorRenderMode } from "../zoneShape";
import {
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

function applyStyles(
  el: HTMLElement | SVGElement,
  styles: Record<string, string | number>
) {
  for (const [key, value] of Object.entries(styles)) {
    // @ts-expect-error CSSStyleDeclaration index access
    el.style[key] = String(value);
  }
}

function createEmptyMountRegistry(): RenderMountRegistry {
  return {
    zones: [],
    paths: [],
    background: null,
  };
}

function clearHost(host: HTMLElement) {
  host.innerHTML = "";
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function createGridLayer(params: {
  options: NonNullable<RendererDrawInput["gridOptions"]>;
  camera: RendererDrawInput["camera"];
  theme: RendererDrawInput["theme"];
}): HTMLElement | null {
  const { options, camera, theme } = params;
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

function renderZoneFallback(
  host: HTMLElement,
  slot: ZoneComponentSlotName,
  context: ZoneComponentRendererContext
) {
  const base: Record<string, string | number> = {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: context.theme.zoneTitle,
    boxSizing: "border-box",
    fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
  };

  if (slot === "title") {
    host.textContent = context.zone.name;
    applyStyles(host, {
      ...base,
      fontSize: context.textScale === "lg" ? "15px" : context.textScale === "sm" ? "12px" : "13px",
      fontWeight: 700,
    });
    return;
  }

  if (slot === "type") {
    host.textContent = context.zone.zoneType;
    applyStyles(host, {
      ...base,
      color: context.theme.zoneSubtext,
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    });
    return;
  }

  if (slot === "badge") {
    const badge = document.createElement("div");
    badge.textContent = context.zone.action?.type ?? "zone";
    applyStyles(badge, {
      display: "inline-flex",
      alignItems: "center",
      height: "100%",
      maxWidth: "100%",
      padding: "0 8px",
      borderRadius: "999px",
      background: context.theme.zoneBadgeBg,
      color: context.theme.zoneTitle,
      fontSize: "11px",
      fontWeight: 600,
      boxSizing: "border-box",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    host.appendChild(badge);
    return;
  }

  if (slot === "body") {
    host.textContent = context.zone.action?.type
      ? `Action: ${context.zone.action.type}`
      : `${context.zone.childZoneIds.length} child zones`;
    applyStyles(host, {
      ...base,
      whiteSpace: "normal",
      color: context.theme.zoneSubtext,
      fontSize: "12px",
      lineHeight: "1.4",
    });
    return;
  }

  if (slot === "footer") {
    host.textContent = context.zone.zoneType === "action"
      ? "action node"
      : `${context.zone.pathIds.length} conditions`;
    applyStyles(host, {
      ...base,
      color: context.theme.zoneSubtext,
      fontSize: "11px",
    });
  }
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

function toLocalRect(ownerRect: Rect, slotRect: Rect): Rect {
  return {
    x: slotRect.x - ownerRect.x,
    y: slotRect.y - ownerRect.y,
    width: slotRect.width,
    height: slotRect.height,
  };
}

function createZoneSlotHost(params: {
  zoneVisual: ZoneVisualNode;
  componentLayout: ZoneComponentLayout;
  slot: ZoneComponentSlotName;
  input: RendererDrawInput;
  mounts: RenderMountRegistry;
  owner: HTMLElement;
}) {
  const {
    zoneVisual,
    componentLayout,
    slot,
    input,
    mounts,
    owner,
  } = params;

  const rect = componentLayout.slots[slot];
  if (!rect) return;

  const localRect = toLocalRect(zoneVisual.rect, rect);
  const host = document.createElement("div");
  host.dataset.zoneflowZoneId = zoneVisual.zoneId;
  host.dataset.zoneflowSlot = slot;

  applyStyles(host, {
    position: "absolute",
    left: `${localRect.x}px`,
    top: `${localRect.y}px`,
    width: `${localRect.width}px`,
    height: `${localRect.height}px`,
    pointerEvents: "auto",
  });

  const visibility = input.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];
  const density = input.pipeline.density.zoneDensityById[zoneVisual.zoneId];
  const context: ZoneComponentRendererContext = {
    model: input.model,
    layoutModel: input.layoutModel,
    zone: zoneVisual.zone,
    zoneVisual,
    density,
    visibility,
    componentLayout,
    camera: input.camera,
    theme: input.theme,
    zoneColor: input.resolveZoneColor?.(zoneVisual.zone) ?? undefined,
    textScale: input.textScale,
  };

  const renderer = input.zoneComponentRenderers?.[slot];
  if (renderer) {
    renderer(host, context);
  } else {
    renderZoneFallback(host, slot, context);
  }

  owner.appendChild(host);
  mounts.zones.push({
    key: `${zoneVisual.zoneId}:${slot}`,
    zoneId: zoneVisual.zoneId,
    slot,
    host,
    rect,
    context,
  });
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
      const pathD = getBezierCurvePathD({
        source: edge.source,
        target: edge.target,
      });
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
const ZONE_CLIP_SHADOW =
  "drop-shadow(0 14px 22px rgba(15, 23, 42, 0.12)) drop-shadow(0 3px 6px rgba(15, 23, 42, 0.08))";

function createSurfaceChrome(params: {
  owner: HTMLElement;
  accent: string;
  radius: string;
  theme: RendererDrawInput["theme"];
  header?: boolean;
  topBandOpacity?: number;
}) {
  const { owner, accent, radius, theme, header = true, topBandOpacity = 0.64 } =
    params;
  const chrome = document.createElement("div");

  applyStyles(chrome, {
    position: "absolute",
    inset: "0",
    borderRadius: radius,
    pointerEvents: "none",
    background: theme.surface.chrome.overlay,
  });

  if (header) {
    const topBand = document.createElement("div");
    const cornerGlow = document.createElement("div");

    applyStyles(topBand, {
      position: "absolute",
      left: "0",
      top: "0",
      right: "0",
      height: "44px",
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      background: `linear-gradient(90deg, ${accent} 0%, ${theme.surface.chrome.accentFade} 72%)`,
      opacity: topBandOpacity,
      pointerEvents: "none",
    });

    applyStyles(cornerGlow, {
      position: "absolute",
      right: "-20px",
      top: "-24px",
      width: "116px",
      height: "116px",
      borderRadius: "999px",
      background: theme.surface.chrome.glow,
      pointerEvents: "none",
    });

    chrome.appendChild(topBand);
    chrome.appendChild(cornerGlow);
  } else {
    // Header-less shapes (circle/pill/diamond/…) keep their accent identity
    // via a soft top-centered wash instead of the rectangular band.
    const accentWash = document.createElement("div");
    applyStyles(accentWash, {
      position: "absolute",
      inset: "0",
      borderRadius: radius,
      background: `radial-gradient(135% 100% at 50% 0%, ${accent} 0%, ${theme.surface.chrome.accentFade} 70%)`,
      opacity: 0.85,
      pointerEvents: "none",
    });
    chrome.appendChild(accentWash);
  }

  owner.appendChild(chrome);
}

function drawZoneAnchors(params: {
  owner: HTMLElement;
  zone: ZoneVisualNode;
  input: RendererDrawInput;
  mode?: ZoneAnchorRenderMode;
}) {
  const { owner, zone, input, mode = "edge" } = params;
  const zoneColor = input.resolveZoneColor?.(zone.zone) ?? undefined;
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
  const shouldRenderAnchor = (kind: "inlet" | "outlet") =>
    kind === "inlet"
      ? isZoneInputEnabled(zone.zone)
      : isZoneOutputEnabled(zone.zone);

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
        theme,
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

      // Consumer-resolved style overrides (diff-preview ghosts etc.). Opacity
      // composes onto the visibility-driven value and dims the whole subtree —
      // body, slots, and anchors alike.
      const zoneStyle = input.resolveZoneStyle?.(zoneVisual.zone) ?? undefined;
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
        input.resolveZoneShape?.(zoneVisual.zone)
      );
      // Consumer-resolved per-zone color overrides the theme's border + accent
      // (body background and text stay theme-driven to preserve contrast).
      const zoneColor = input.resolveZoneColor?.(zoneVisual.zone) ?? undefined;
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

      if (shape.clipPath) {
        // Clipped polygon (diamond/hexagon/custom). A CSS border would be
        // cut by clip-path, so the outline is synthesized: a border-colored
        // base layer with a 1px-inset fill layer on top. Depth comes from a
        // drop-shadow filter since box-shadow is clipped away.
        applyStyles(zoneBodyEl, {
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          background: zoneBorderColor,
          clipPath: shape.clipPath,
          boxSizing: "border-box",
          overflow: "hidden",
          filter: ZONE_CLIP_SHADOW,
        });

        const zoneFillEl = document.createElement("div");
        applyStyles(zoneFillEl, {
          position: "absolute",
          inset: "1px",
          background: theme.surface.zone.background,
          clipPath: shape.clipPath,
          boxSizing: "border-box",
          overflow: "hidden",
        });
        zoneBodyEl.appendChild(zoneFillEl);

        createSurfaceChrome({
          owner: zoneFillEl,
          accent: zoneAccentColor,
          radius: "0",
          theme,
          header: shape.header,
        });
      } else {
        applyStyles(zoneBodyEl, {
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          borderRadius: shape.borderRadius,
          border: `1px ${zoneStyle?.borderStyle ?? "solid"} ${zoneBorderColor}`,
          background: theme.surface.zone.background,
          boxSizing: "border-box",
          boxShadow: theme.surface.zone.shadow,
          overflow: "hidden",
        });

        const zoneChromeEl = document.createElement("div");
        createSurfaceChrome({
          owner: zoneChromeEl,
          accent: zoneAccentColor,
          radius: shape.borderRadius,
          theme,
          header: shape.header,
        });
        zoneBodyEl.appendChild(zoneChromeEl);
      }

      zoneEl.addEventListener("click", (event) => {
        event.stopPropagation();
        interactionHandlers?.onZoneClick?.(zoneVisual.zoneId);
      });

      zoneEl.appendChild(zoneBodyEl);

      for (const slot of Object.keys(componentLayout?.slots ?? {}) as ZoneComponentSlotName[]) {
        createZoneSlotHost({
          zoneVisual,
          componentLayout,
          slot,
          input,
          mounts,
          owner: zoneBodyEl,
        });
      }

      // "farest" — the zone is too small for any slot, so show an icon-only
      // marker (consumer-resolved glyph, else the name's first character) so
      // it never reads as a blank card.
      if (
        input.pipeline.density.zoneDensityById[zoneVisual.zoneId] === "farest"
      ) {
        const iconText =
          input.resolveZoneIcon?.(zoneVisual.zone) ??
          Array.from(zoneVisual.zone.name.trim())[0] ??
          "";
        if (iconText) {
          const iconEl = document.createElement("div");
          const fontSize = Math.max(
            8,
            Math.min(zoneVisual.rect.width, zoneVisual.rect.height) * 0.5
          );
          applyStyles(iconEl, {
            position: "absolute",
            inset: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: zoneColor ?? theme.zoneTitle,
            fontSize: `${fontSize}px`,
            fontWeight: "600",
            lineHeight: "1",
            overflow: "hidden",
            pointerEvents: "none",
          });
          iconEl.textContent = iconText;
          zoneBodyEl.appendChild(iconEl);
        }
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
      const pathEl = document.createElement("div");
      const pathChromeEl = document.createElement("div");
      pathEl.dataset.zoneflowPathId = pathVisual.pathId;

      applyStyles(pathEl, {
        position: "absolute",
        left: `${pathVisual.rect.x}px`,
        top: `${pathVisual.rect.y}px`,
        width: `${pathVisual.rect.width}px`,
        height: `${pathVisual.rect.height}px`,
        borderRadius: "18px",
        border: `1px solid ${theme.pathEdge}`,
        background: theme.surface.path.background,
        boxSizing: "border-box",
        boxShadow: theme.surface.path.shadow,
        opacity: getOpacity(visibility.emphasis),
        zIndex: RENDER_Z_INDEX.pathNode,
        overflow: "hidden",
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

      createSurfaceChrome({
        owner: pathChromeEl,
        accent: theme.surface.path.accent,
        radius: "18px",
        theme,
        topBandOpacity: 0.72,
      });

      pathEl.appendChild(pathChromeEl);

      const targetDisplay = resolvePathTargetDisplay({
        model: input.model,
        pathVisual,
      });

      if (targetDisplay.status !== "resolved") {
        createPathStatusBadge({
          owner: pathEl,
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
          owner: pathEl,
        });
      }

      pathLayer.appendChild(pathEl);
    }

    return mounts;
  },
};
