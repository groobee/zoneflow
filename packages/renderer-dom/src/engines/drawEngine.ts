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

const SCENE_PADDING = 64;

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

function ensureArrowMarker(svg: SVGSVGElement, color: string) {
  const defs = createSvgElement("defs");
  const marker = createSvgElement("marker");
  marker.setAttribute("id", "zoneflow-arrow");
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");

  const arrow = createSvgElement("path");
  arrow.setAttribute("d", "M 0 0 L 12 6 L 0 12 z");
  arrow.setAttribute("fill", color);

  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);
}

function getBezierCurvePathD(params: {
  source: { x: number; y: number };
  target: { x: number; y: number };
}) {
  const { source, target } = params;
  const dx = target.x - source.x;
  const direction = dx >= 0 ? 1 : -1;
  const handle = Math.min(Math.max(Math.abs(dx) * 0.45, 28), 104);
  const control1X = source.x + handle * direction;
  const control2X = target.x - handle * direction;

  return `M ${source.x} ${source.y} C ${control1X} ${source.y}, ${control2X} ${target.y}, ${target.x} ${target.y}`;
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
    host.textContent = context.path.name;
    applyStyles(host, {
      ...base,
      fontSize: "12px",
      fontWeight: 700,
    });
    return;
  }

  if (slot === "rule") {
    host.textContent = context.path.rule?.type ?? context.path.key;
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
    host.textContent = context.pathVisual.targetZoneId ?? "unresolved";
    applyStyles(host, {
      ...base,
      color: context.theme.zoneSubtext,
      fontSize: "11px",
    });
    return;
  }

  if (slot === "body") {
    host.textContent = context.path.rule?.payload
      ? JSON.stringify(context.path.rule.payload)
      : "condition";
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
      const path = createSvgElement("path");
      path.setAttribute(
        "d",
        getBezierCurvePathD({
          source: edge.source,
          target: edge.target,
        })
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", input.theme.pathEdge);
      path.setAttribute(
        "stroke-width",
        edge.kind === "path-to-zone" ? "2.25" : "1.85"
      );
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", String(getOpacity(visibility.emphasis)));
      path.setAttribute("marker-end", "url(#zoneflow-arrow)");
      svg.appendChild(path);
    }
  }
}

function drawZoneAnchors(params: {
  owner: HTMLElement;
  zone: ZoneVisualNode;
}) {
  const { owner, zone } = params;

  for (const kind of ["inlet", "outlet"] as const) {
    const anchor = zone.anchors[kind];
    const rect = resolveZoneAnchorRect({
      zoneRect: zone.rect,
      anchor,
      kind,
    });
    const el = document.createElement("div");

    applyStyles(el, {
      position: "absolute",
      left: `${rect.x - zone.rect.x}px`,
      top: `${rect.y - zone.rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: "999px",
      background:
        kind === "inlet"
          ? "linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.98))"
          : "linear-gradient(180deg, rgba(255, 247, 237, 0.98), rgba(255, 237, 213, 0.98))",
      border:
        kind === "inlet"
          ? "1px solid rgba(59, 130, 246, 0.26)"
          : "1px solid rgba(249, 115, 22, 0.26)",
      boxShadow: "0 6px 14px rgba(15, 23, 42, 0.1)",
      boxSizing: "border-box",
      pointerEvents: "none",
    });

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
      zIndex: 20,
    });
    ensureArrowMarker(edgeSvg, theme.pathEdge);

    applyStyles(zoneLayer, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      zIndex: 10,
    });

    applyStyles(pathLayer, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${sceneBounds.width}px`,
      height: `${sceneBounds.height}px`,
      zIndex: 30,
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

    for (const zoneVisual of Object.values(pipeline.graphLayout.zonesById)) {
      const visibility = pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];
      if (!visibility?.isVisible || excludedZoneIds.has(zoneVisual.zoneId)) continue;

      const componentLayout = pipeline.componentLayout.zonesById[zoneVisual.zoneId];
      const zoneEl = document.createElement("div");
      const zoneBodyEl = document.createElement("div");
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
        zIndex: 1,
      });

      applyStyles(zoneBodyEl, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        borderRadius: zoneVisual.zone.zoneType === "action" ? "18px" : "22px",
        border: `1px solid ${
          zoneVisual.zone.zoneType === "action"
            ? theme.zoneActionBorder
            : theme.zoneContainerBorder
        }`,
        background: "#ffffff",
        boxSizing: "border-box",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
      });

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

      drawZoneAnchors({
        owner: zoneEl,
        zone: zoneVisual,
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
      pathEl.dataset.zoneflowPathId = pathVisual.pathId;

      applyStyles(pathEl, {
        position: "absolute",
        left: `${pathVisual.rect.x}px`,
        top: `${pathVisual.rect.y}px`,
        width: `${pathVisual.rect.width}px`,
        height: `${pathVisual.rect.height}px`,
        borderRadius: "16px",
        border: `1px solid ${theme.pathEdge}`,
        background: "#ffffff",
        boxSizing: "border-box",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        opacity: getOpacity(visibility.emphasis),
        zIndex: 1,
      });

      pathEl.addEventListener("click", (event) => {
        event.stopPropagation();
        interactionHandlers?.onPathClick?.(pathVisual.pathId);
      });

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
