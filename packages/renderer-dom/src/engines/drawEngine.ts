import type {
  DrawEngine,
  PathComponentLayout,
  PathComponentMount,
  PathComponentRendererContext,
  PathComponentSlotName,
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
import {
  getZoneDepth,
  isZoneInputEnabled,
  isZoneOutputEnabled,
} from "@zoneflow/core";

const SCENE_PADDING = 64;
const RENDER_Z_INDEX = {
  zoneBase: 1,
  pathNode: 1,
  pathStatusBadge: 2,
  zoneLayer: 10,
  edgeLayer: 20,
  pathLayer: 30,
} as const;

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
  };
}

function clearHost(host: HTMLElement) {
  host.innerHTML = "";
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
    }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map((entry) => entry.zone);
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

function getBezierCurvePathD(params: {
  source: { x: number; y: number };
  target: { x: number; y: number };
}) {
  const { source, target } = params;
  const sourceLead = Math.min(Math.max(Math.abs(target.x - source.x) * 0.18, 18), 42);
  const leadSourceX = source.x + sourceLead;
  const dx = target.x - leadSourceX;
  const direction = dx >= 0 ? 1 : -1;
  const handle = Math.min(Math.max(Math.abs(dx) * 0.45, 28), 104);
  const control1X = leadSourceX + handle * direction;
  const control2X = target.x - handle * direction;

  return `M ${source.x} ${source.y} L ${leadSourceX} ${source.y} C ${control1X} ${source.y}, ${control2X} ${target.y}, ${target.x} ${target.y}`;
}

function getChevronPathD(params: {
  target: { x: number; y: number };
  direction: 1 | -1;
}) {
  const { target, direction } = params;
  const tipX = target.x - direction * 6;
  const baseX = tipX - direction * 7;
  const topY = target.y - 4;
  const bottomY = target.y + 4;

  return `M ${baseX} ${topY} L ${tipX} ${target.y} L ${baseX} ${bottomY}`;
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

  for (const [pathId, edges] of Object.entries(input.pipeline.graphLayout.edgesByPathId)) {
    const visibility = input.pipeline.visibility.pathVisibilityById[pathId];
    if (!visibility?.shouldRenderEdge) continue;

    for (const edge of edges) {
      const stroke = getEdgeColor({
        kind: edge.kind,
        theme: input.theme,
      });
      const path = createSvgElement("path");
      path.setAttribute(
        "d",
        getBezierCurvePathD({
          source: edge.source,
          target: edge.target,
        })
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", stroke);
      path.setAttribute(
        "stroke-width",
        edge.kind === "path-to-zone" ? "2.25" : "1.85"
      );
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", String(getOpacity(visibility.emphasis)));
      svg.appendChild(path);

      const chevron = createSvgElement("path");
      chevron.setAttribute(
        "d",
        getChevronPathD({
          target: edge.target,
          direction: edge.kind === "path-to-zone" ? 1 : edge.target.x >= edge.source.x ? 1 : -1,
        })
      );
      chevron.setAttribute("fill", "none");
      chevron.setAttribute("stroke", stroke);
      chevron.setAttribute(
        "stroke-width",
        edge.kind === "path-to-zone" ? "1.95" : "1.7"
      );
      chevron.setAttribute("stroke-linecap", "round");
      chevron.setAttribute("stroke-linejoin", "round");
      chevron.setAttribute("opacity", String(getOpacity(visibility.emphasis)));
      svg.appendChild(chevron);
    }
  }
}

function createSurfaceChrome(params: {
  owner: HTMLElement;
  accent: string;
  radius: string;
  theme: RendererDrawInput["theme"];
  topBandOpacity?: number;
}) {
  const { owner, accent, radius, theme, topBandOpacity = 0.64 } = params;
  const chrome = document.createElement("div");
  const topBand = document.createElement("div");
  const cornerGlow = document.createElement("div");

  applyStyles(chrome, {
    position: "absolute",
    inset: "0",
    borderRadius: radius,
    pointerEvents: "none",
    background: theme.surface.chrome.overlay,
  });

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
  owner.appendChild(chrome);
}

function drawZoneAnchors(params: {
  owner: HTMLElement;
  zone: ZoneVisualNode;
  input: RendererDrawInput;
}) {
  const { owner, zone, input } = params;
  const zoneBorderColor =
    zone.zone.zoneType === "action"
      ? input.theme.zoneActionBorder
      : input.theme.zoneContainerBorder;
  const anchorAccentColor =
    zone.zone.zoneType === "action"
      ? input.theme.surface.anchor.actionAccent
      : input.theme.surface.anchor.containerAccent;
  const shouldRenderAnchor = (kind: "inlet" | "outlet") =>
    kind === "inlet"
      ? isZoneInputEnabled(zone.zone)
      : isZoneOutputEnabled(zone.zone);

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
      boxShadow: `0 0 0 4px ${anchorAccentColor.replace("0.96", "0.12")}`,
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
    const worldRoot = document.createElement("div");
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

    applyStyles(worldRoot, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      transform: `translate(${camera.x - viewportInfo.effective.x}px, ${camera.y - viewportInfo.effective.y}px) scale(${camera.zoom})`,
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

    applyStyles(zoneLayer, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      zIndex: RENDER_Z_INDEX.zoneLayer,
    });

    applyStyles(pathLayer, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      zIndex: RENDER_Z_INDEX.pathLayer,
    });

    worldRoot.appendChild(edgeSvg);
    worldRoot.appendChild(zoneLayer);
    worldRoot.appendChild(pathLayer);
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
      const zoneChromeEl = document.createElement("div");
      zoneEl.dataset.zoneflowZoneId = zoneVisual.zoneId;
      zoneBodyEl.dataset.zoneflowZoneBody = zoneVisual.zoneId;

      applyStyles(zoneEl, {
        position: "absolute",
        left: `${zoneVisual.rect.x}px`,
        top: `${zoneVisual.rect.y}px`,
        width: `${zoneVisual.rect.width}px`,
        height: `${zoneVisual.rect.height}px`,
        opacity: getOpacity(visibility.emphasis),
        overflow: "visible",
        zIndex: zoneDepth + RENDER_Z_INDEX.zoneBase,
      });

      applyStyles(zoneBodyEl, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        borderRadius: "0",
        border: `1px solid ${
          zoneVisual.zone.zoneType === "action"
            ? theme.zoneActionBorder
            : theme.zoneContainerBorder
        }`,
        background: theme.surface.zone.background,
        boxSizing: "border-box",
        boxShadow: theme.surface.zone.shadow,
        overflow: "hidden",
      });

      zoneEl.addEventListener("click", (event) => {
        event.stopPropagation();
        interactionHandlers?.onZoneClick?.(zoneVisual.zoneId);
      });

      createSurfaceChrome({
        owner: zoneChromeEl,
        accent:
          zoneVisual.zone.zoneType === "action"
            ? theme.surface.zone.actionAccent
            : theme.surface.zone.containerAccent,
        radius: "0",
        theme,
      });

      zoneBodyEl.appendChild(zoneChromeEl);
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

      drawZoneAnchors({
        owner: zoneEl,
        zone: zoneVisual,
        input,
      });

      zoneLayer.appendChild(zoneEl);
    }

    for (const pathVisual of Object.values(pipeline.graphLayout.pathsById)) {
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
      });

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
