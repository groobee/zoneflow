import type { Point } from "@zoneflow/core";
import type {
  CameraState,
  DebugViewportOverride,
  RendererDrawInput,
  ViewportRect,
} from "../types";

export type DebugLayer =
  | "graph-layout"
  | "density"
  | "visibility"
  | "component-layout"
  | "edges"
  | "anchors"
  | "viewport";

export type DebugDrawInput = RendererDrawInput & {
  layers?: DebugLayer[];
  viewportOverride?: DebugViewportOverride;
};

type DrawFn = (
  root: HTMLElement,
  pipeline: any,
  camera: CameraState,
  viewport: ViewportRect
) => void;

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
  viewport: drawViewport,
};

export const debugDrawEngine = {
  draw(input: DebugDrawInput) {
    const { host, pipeline, camera, viewport } = input;
    const layers = input.layers ?? DEFAULT_DEBUG_LAYERS;

    host.innerHTML = "";

    const worldRoot = document.createElement("div");
    worldRoot.style.position = "absolute";
    worldRoot.style.left = "0";
    worldRoot.style.top = "0";
    worldRoot.style.width = "100%";
    worldRoot.style.height = "100%";
    worldRoot.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
    worldRoot.style.transformOrigin = "0 0";
    worldRoot.style.pointerEvents = "none";

    host.appendChild(worldRoot);

    layers.forEach((layer) => {
      drawLayerMap[layer]?.(worldRoot, pipeline, camera, viewport);
    });
  },
};

function getDebugFontSize(camera: CameraState): number {
  return Math.min(24, Math.max(12, 18 / camera.zoom));
}

function drawBox(
  root: HTMLElement,
  rect: { x: number; y: number; width: number; height: number },
  color: string,
  label: string | undefined,
  camera: CameraState
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
    const fontSize = getDebugFontSize(camera);

    text.textContent = String(label);
    text.style.fontSize = `${fontSize}px`;
    text.style.color = color;
    text.style.position = "absolute";
    text.style.left = "2px";
    text.style.top = "2px";
    text.style.pointerEvents = "none";
    text.style.background = "rgba(0,0,0,0.6)";
    text.style.padding = "1px 3px";
    text.style.borderRadius = "3px";
    text.style.fontWeight = "600";

    el.appendChild(text);
  }

  root.appendChild(el);
}

function drawAnchor(
  root: HTMLElement,
  point: Point,
  color: string,
  label: string | undefined,
  camera: CameraState
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
    const fontSize = getDebugFontSize(camera);

    text.textContent = label;
    text.style.position = "absolute";
    text.style.left = `${point.x + 6}px`;
    text.style.top = `${point.y - 6}px`;
    text.style.fontSize = `${fontSize}px`;
    text.style.color = color;
    text.style.whiteSpace = "nowrap";
    text.style.pointerEvents = "none";
    text.style.background = "rgba(0,0,0,0.6)";
    text.style.padding = "1px 3px";
    text.style.borderRadius = "3px";
    text.style.fontWeight = "600";

    root.appendChild(text);
  }

  root.appendChild(dot);
}

function drawGraphLayout(
  root: HTMLElement,
  pipeline: any,
  camera: CameraState
) {
  const { graphLayout } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    drawBox(root, zone.rect, "blue", zone.zone.name, camera);
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (path.rect) {
      drawBox(root, path.rect, "green", path.path.name, camera);
    }
  });
}

function drawDensity(
  root: HTMLElement,
  pipeline: any,
  camera: CameraState
) {
  const { graphLayout, density } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    const level = density.zoneDensityById[zone.zoneId];
    drawBox(root, zone.rect, "purple", level, camera);
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (!path.rect) return;
    const level = density.pathDensityById[path.pathId];
    drawBox(root, path.rect, "magenta", level, camera);
  });
}

function drawVisibility(
  root: HTMLElement,
  pipeline: any,
  camera: CameraState
) {
  const { graphLayout, visibility } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    const v = visibility.zoneVisibilityById[zone.zoneId];

    if (!v) return;

    if (v.isVisible) {
      drawBox(
        root,
        zone.rect,
        v.isPartial ? "#f59e0b" : "#f97316",
        v.isPartial ? "partial" : "visible",
        camera
      );
    } else {
      drawBox(root, zone.rect, "rgba(148,163,184,0.45)", "culled", camera);
    }
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (!path.rect) return;

    const v = visibility.pathVisibilityById[path.pathId];
    if (!v) return;

    if (v.isVisible) {
      drawBox(
        root,
        path.rect,
        "#d97706",
        v.shouldRenderNode ? "node" : "edge-only",
        camera
      );
    } else {
      drawBox(root, path.rect, "rgba(100,100,100,0.35)", "culled", camera);
    }
  });
}

function drawComponentLayout(
  root: HTMLElement,
  pipeline: any,
  camera: CameraState
) {
  const { componentLayout } = pipeline;

  Object.values(componentLayout.zonesById).forEach((zone: any) => {
    Object.entries(zone.slots).forEach(([name, rect]: any) => {
      drawBox(root, rect, "red", name, camera);
    });
  });

  Object.values(componentLayout.pathsById ?? {}).forEach((path: any) => {
    Object.entries(path.slots).forEach(([name, rect]: any) => {
      drawBox(root, rect, "brown", `path:${name}`, camera);
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

function drawAnchors(
  root: HTMLElement,
  pipeline: any,
  camera: CameraState
) {
  const { graphLayout } = pipeline;

  Object.values(graphLayout.zonesById).forEach((zone: any) => {
    if (zone.inlet) {
      drawAnchor(root, zone.inlet, "#2563eb", `${zone.zoneId}:in`, camera);
    }
    if (zone.outlet) {
      drawAnchor(root, zone.outlet, "#dc2626", `${zone.zoneId}:out`, camera);
    }
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (path.inlet) {
      drawAnchor(root, path.inlet, "#16a34a", `${path.pathId}:in`, camera);
    }
    if (path.outlet) {
      drawAnchor(root, path.outlet, "#ca8a04", `${path.pathId}:out`, camera);
    }
  });
}

function drawViewport(
  root: HTMLElement,
  _pipeline: any,
  camera: CameraState,
  viewport: ViewportRect
) {
  const worldViewport = {
    x: -camera.x / camera.zoom,
    y: -camera.y / camera.zoom,
    width: viewport.width / camera.zoom,
    height: viewport.height / camera.zoom,
  };

  drawBox(root, worldViewport, "#22c55e", "viewport", camera);
}