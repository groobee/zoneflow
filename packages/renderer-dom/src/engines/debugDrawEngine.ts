import type { Point } from "@zoneflow/core";
import type { RendererDrawInput } from "../types";

export type DebugLayer =
  | "graph-layout"
  | "density"
  | "visibility"
  | "component-layout"
  | "edges"
  | "anchors";

export type DebugDrawInput = RendererDrawInput & {
  layers?: DebugLayer[];
};

type DrawFn = (root: HTMLElement, pipeline: any) => void;

const ANCHOR_SIZE = 8;

const DEFAULT_DEBUG_LAYERS: DebugLayer[] = [
  "graph-layout",
  "edges",
  "anchors",
];

const drawLayerMap: Record<DebugLayer, DrawFn> = {
  "graph-layout": drawGraphLayout,
  density: drawDensity,
  visibility: drawVisibility,
  "component-layout": drawComponentLayout,
  edges: drawEdges,
  anchors: drawAnchors,
};

export const debugDrawEngine = {
  draw(input: DebugDrawInput) {
    const { host, pipeline, camera } = input;
    const layers = input.layers ?? DEFAULT_DEBUG_LAYERS;

    host.innerHTML = "";

    const root = document.createElement("div");
    root.style.position = "absolute";
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
    root.style.transformOrigin = "0 0";

    host.appendChild(root);

    layers.forEach((layer) => {
      drawLayerMap[layer]?.(root, pipeline);
    });
  },
};

function drawBox(
  root: HTMLElement,
  rect: { x: number; y: number; width: number; height: number },
  color: string,
  label?: string
) {
  const el = document.createElement("div");

  el.style.position = "absolute";
  el.style.left = `${rect.x}px`;
  el.style.top = `${rect.y}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.border = `1px dashed ${color}`;
  el.style.boxSizing = "border-box";
  el.style.pointerEvents = "none";

  if (label) {
    const text = document.createElement("div");
    text.textContent = String(label);
    text.style.fontSize = "10px";
    text.style.color = color;
    text.style.position = "absolute";
    text.style.left = "2px";
    text.style.top = "2px";
    text.style.pointerEvents = "none";
    el.appendChild(text);
  }

  root.appendChild(el);
}

function drawAnchor(
  root: HTMLElement,
  point: Point,
  color: string,
  label?: string
) {
  const dot = document.createElement("div");
  dot.style.position = "absolute";
  dot.style.left = `${point.x - ANCHOR_SIZE / 2}px`;
  dot.style.top = `${point.y - ANCHOR_SIZE / 2}px`;
  dot.style.width = `${ANCHOR_SIZE}px`;
  dot.style.height = `${ANCHOR_SIZE}px`;
  dot.style.borderRadius = "999px";
  dot.style.background = color;
  dot.style.border = "1px solid white";
  dot.style.boxSizing = "border-box";
  dot.style.pointerEvents = "none";

  if (label) {
    const text = document.createElement("div");
    text.textContent = label;
    text.style.position = "absolute";
    text.style.left = `${point.x + 6}px`;
    text.style.top = `${point.y - 6}px`;
    text.style.fontSize = "10px";
    text.style.color = color;
    text.style.whiteSpace = "nowrap";
    text.style.pointerEvents = "none";
    root.appendChild(text);
  }

  root.appendChild(dot);
}

function drawGraphLayout(root: HTMLElement, pipeline: any) {
  const { graphLayout } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    drawBox(root, zone.rect, "blue", zone.zone.name);
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (path.rect) {
      drawBox(root, path.rect, "green", path.path.name);
    }
  });
}

function drawDensity(root: HTMLElement, pipeline: any) {
  const { graphLayout, density } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    const level = density.zoneDensityById[zone.zoneId];
    drawBox(root, zone.rect, "purple", level);
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (!path.rect) return;
    const level = density.pathDensityById[path.pathId];
    drawBox(root, path.rect, "magenta", level);
  });
}

function drawVisibility(root: HTMLElement, pipeline: any) {
  const { graphLayout, visibility } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    const v = visibility.zoneVisibilityById[zone.zoneId];
    if (!v?.isVisible) return;

    drawBox(root, zone.rect, "orange", v.isPartial ? "partial" : "visible");
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    const v = visibility.pathVisibilityById[path.pathId];
    if (!v?.isVisible || !path.rect) return;

    drawBox(root, path.rect, "goldenrod", v.shouldRenderNode ? "node" : "hidden");
  });
}

function drawComponentLayout(root: HTMLElement, pipeline: any) {
  const { componentLayout } = pipeline;

  Object.values(componentLayout.zonesById).forEach((zone: any) => {
    Object.entries(zone.slots).forEach(([name, rect]: any) => {
      drawBox(root, rect, "red", name);
    });
  });

  Object.values(componentLayout.pathsById ?? {}).forEach((path: any) => {
    Object.entries(path.slots).forEach(([name, rect]: any) => {
      drawBox(root, rect, "brown", `path:${name}`);
    });
  });
}

function drawEdges(root: HTMLElement, pipeline: any) {
  const { edgesByPathId } = pipeline.graphLayout;

  Object.values(edgesByPathId).forEach((edge: any) => {
    const line = document.createElement("div");

    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    line.style.position = "absolute";
    line.style.left = `${edge.source.x}px`;
    line.style.top = `${edge.source.y}px`;
    line.style.width = `${length}px`;
    line.style.height = "1px";
    line.style.background = "red";
    line.style.transformOrigin = "0 0";
    line.style.transform = `rotate(${angle}deg)`;
    line.style.pointerEvents = "none";

    root.appendChild(line);
  });
}

function drawAnchors(root: HTMLElement, pipeline: any) {
  const { graphLayout } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    if (zone.inlet) {
      drawAnchor(root, zone.inlet, "#2563eb", `${zone.zoneId}:in`);
    }
    if (zone.outlet) {
      drawAnchor(root, zone.outlet, "#dc2626", `${zone.zoneId}:out`);
    }
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (path.inlet) {
      drawAnchor(root, path.inlet, "#16a34a", `${path.pathId}:in`);
    }
    if (path.outlet) {
      drawAnchor(root, path.outlet, "#ca8a04", `${path.pathId}:out`);
    }
  });
}