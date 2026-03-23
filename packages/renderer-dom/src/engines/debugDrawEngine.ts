import type { Point } from "@zoneflow/core";
import type {
  CameraState,
  DebugLayer,
  RendererDrawInput,
  Rect,
} from "../types";

export type DebugDrawInput = RendererDrawInput & {
  layers?: DebugLayer[];
};

type DrawFn = (
  root: HTMLElement,
  pipeline: any,
  camera: CameraState,
  viewport: Rect
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
    const { host, pipeline, camera } = input;
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

    const screenRoot = document.createElement("div");
    screenRoot.style.position = "absolute";
    screenRoot.style.left = "0";
    screenRoot.style.top = "0";
    screenRoot.style.width = "100%";
    screenRoot.style.height = "100%";
    screenRoot.style.pointerEvents = "none";

    host.appendChild(worldRoot);
    host.appendChild(screenRoot);

    layers.forEach((layer) => {
      drawLayerMap[layer]?.(
        worldRoot,
        pipeline,
        camera,
        pipeline.viewportInfo.world
      );
    });

    if (layers.includes("viewport")) {
      drawHostViewport(screenRoot, pipeline.viewportInfo);
    }
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

    const color =
      !v.isVisible
        ? "rgba(148,163,184,0.45)"
        : v.isPartial
          ? "#f59e0b"
          : "#f97316";

    const label = !v.isVisible
      ? `culled / ${v.emphasis}`
      : v.isPartial
        ? `partial / ${v.emphasis}`
        : `visible / ${v.emphasis}`;

    drawBox(root, zone.rect, color, label, camera);
  });

  Object.values(graphLayout.pathsById).forEach((path: any) => {
    if (!path.rect) return;

    const v = visibility.pathVisibilityById[path.pathId];
    if (!v) return;

    const color =
      !v.isVisible
        ? "rgba(100,100,100,0.35)"
        : v.isPartial
          ? "#d97706"
          : "#ca8a04";

    const label = !v.isVisible
      ? `culled / ${v.emphasis}`
      : v.shouldRenderNode
        ? `node / ${v.emphasis}`
        : `edge-only / ${v.emphasis}`;

    drawBox(root, path.rect, color, label, camera);
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

  Object.values(edgesByPathId)
    .flatMap((edges: any) => edges)
    .forEach((edge: any) => {
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
    line.style.background =
      edge.kind === "zone-to-path"
        ? "#3b82f6"
        : "#ef4444";
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
    const inlet = zone.anchors?.inlet?.point;
    const outlet = zone.anchors?.outlet?.point;

    if (inlet) {
      drawAnchor(root, inlet, "#2563eb", `${zone.zoneId}:in`, camera);
    }
    if (outlet) {
      drawAnchor(root, outlet, "#dc2626", `${zone.zoneId}:out`, camera);
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
  viewport: Rect
) {
  drawBox(root, viewport, "#22c55e", "viewport", camera);
}

function drawHostViewport(root: HTMLElement, viewportInfo: any) {
  const box = document.createElement("div");

  const { effective, host } = viewportInfo;

  // 실제 host viewport 전체
  const hostBox = document.createElement("div");
  hostBox.style.position = "absolute";
  hostBox.style.left = `${host.x}px`;
  hostBox.style.top = `${host.y}px`;
  hostBox.style.width = `${host.width}px`;
  hostBox.style.height = `${host.height}px`;
  hostBox.style.border = "1px dashed rgba(59,130,246,0.9)";
  hostBox.style.boxSizing = "border-box";
  hostBox.style.pointerEvents = "none";

  // effective viewport
  box.style.position = "absolute";
  box.style.left = `${effective.x}px`;
  box.style.top = `${effective.y}px`;
  box.style.width = `${effective.width}px`;
  box.style.height = `${effective.height}px`;
  box.style.border = "2px solid cyan";
  box.style.boxSizing = "border-box";
  box.style.pointerEvents = "none";

  root.appendChild(hostBox);
  root.appendChild(box);
}
