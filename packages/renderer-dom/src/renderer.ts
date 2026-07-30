import type {
  CameraState,
  ViewportConfig,
  EffectiveViewportRect,
  HostViewportRect,
  RendererFrame,
  RendererInput,
  RenderViewportInfo,
  WorldViewportRect,
  ZoneflowRenderer,
} from "./types.js";
import { resolveTheme } from "./themes/defaultTheme.js";
import { runRenderPipeline } from "./pipeline.js";

import { defaultGraphLayoutEngine } from "./engines/graphLayoutEngine.js";
import { defaultDensityEngine } from "./engines/densityEngine.js";
import { defaultVisibilityEngine } from "./engines/visibilityEngine.js";
import { defaultComponentLayoutEngine } from "./engines/componentLayoutEngine.js";
import { domDrawEngine } from "./engines/drawEngine.js";
import { debugDrawEngine } from "./engines/debugDrawEngine.js";

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

function ensureHostBaseStyle(host: HTMLElement) {
  host.style.position = "relative";
  host.style.overflow = "hidden";
}

function getHostViewport(host: HTMLElement): HostViewportRect {
  return {
    x: 0,
    y: 0,
    width: host.clientWidth,
    height: host.clientHeight,
  };
}

function getEffectiveViewport(
  hostViewport: HostViewportRect,
  viewport?: ViewportConfig
): EffectiveViewportRect {
  if (viewport?.enabled) {
    const offsetX = viewport.offsetX ?? 0;
    const offsetY = viewport.offsetY ?? 0;

    return {
      x: offsetX,
      y: offsetY,
      width: viewport.width,
      height: viewport.height,
    };
  }

  return {
    x: 0,
    y: 0,
    width: hostViewport.width,
    height: hostViewport.height,
  };
}

function getWorldViewport(
  camera: CameraState,
  effectiveViewport: EffectiveViewportRect
): WorldViewportRect {
  return {
    x: (effectiveViewport.x - camera.x) / camera.zoom,
    y: (effectiveViewport.y - camera.y) / camera.zoom,
    width: effectiveViewport.width / camera.zoom,
    height: effectiveViewport.height / camera.zoom,
  };
}

function resolveViewportInfo(
  host: HTMLElement,
  camera: CameraState,
  input: RendererInput
): RenderViewportInfo {
  const hostViewport = getHostViewport(host);
  const effectiveViewport = getEffectiveViewport(
    hostViewport,
    input.viewport
  );
  const worldViewport = getWorldViewport(camera, effectiveViewport);

  return {
    host: hostViewport,
    effective: effectiveViewport,
    world: worldViewport,
  };
}

export function createRenderer(): ZoneflowRenderer {
  let host: HTMLElement | null = null;

  return {
    mount(container) {
      host = container;
      ensureHostBaseStyle(host);
    },

    update(input: RendererInput) {
      if (!host) return;

      const {
        model,
        layoutModel,
        theme,
        textScale = "md",
        camera = DEFAULT_CAMERA,

        graphLayoutEngine = defaultGraphLayoutEngine,
        densityEngine = defaultDensityEngine,
        visibilityEngine = defaultVisibilityEngine,
        componentLayoutEngine = defaultComponentLayoutEngine,
        drawEngine = domDrawEngine,

        zoneComponentRenderers,
        pathComponentRenderers,
        resolveZoneShape,
        resolveZoneColor,
        resolveZoneStyle,
        resolveZoneIcon,
        resolveZoneRenderer,
        resolveZoneOverlayRenderer,
        resolvePathRenderer,
        resolvePathOverlayRenderer,
        resolvePathColor,
        resolvePathLineColor,
        resolvePathStyle,
        resolvePathDisplay,
        backgroundRenderer,
        gridOptions,
        interactionHandlers,
        exclusionState,

        debug,
      } = input;

      const mergedTheme = resolveTheme(theme);
      const viewportInfo = resolveViewportInfo(host, camera, input);

      const pipeline = runRenderPipeline(
        {
          model,
          layoutModel,
          camera,
          viewportInfo,
          theme: mergedTheme,
          textScale,
          resolvePathDisplay,
        },
        {
          graphLayoutEngine,
          densityEngine,
          visibilityEngine,
          componentLayoutEngine,
        }
      );

      if (debug?.enabled) {
        debugDrawEngine.draw({
          host,
          model,
          layoutModel,
          camera,
          viewportInfo,
          theme: mergedTheme,
          textScale,
          pipeline,
          exclusionState,
          layers: debug.layers ?? ["graph-layout", "edges", "anchors"],
        });
        return {
          viewportInfo,
          pipeline,
          mounts: {
            zones: [],
            paths: [],
            zoneRenderers: [],
            zoneOverlays: [],
            pathRenderers: [],
            pathOverlays: [],
            background: null,
          },
        } satisfies RendererFrame;
      }

      const mounts = drawEngine.draw({
        host,
        model,
        layoutModel,
        camera,
        viewportInfo,
        theme: mergedTheme,
        textScale,
        pipeline,
        zoneComponentRenderers,
        pathComponentRenderers,
        resolveZoneShape,
        resolveZoneColor,
        resolveZoneStyle,
        resolveZoneIcon,
        resolveZoneRenderer,
        resolveZoneOverlayRenderer,
        resolvePathRenderer,
        resolvePathOverlayRenderer,
        resolvePathColor,
        resolvePathLineColor,
        resolvePathStyle,
        backgroundRenderer,
        gridOptions,
        interactionHandlers,
        exclusionState,
      });

      return {
        viewportInfo,
        pipeline,
        mounts,
      } satisfies RendererFrame;
    },

    destroy() {
      if (host) {
        host.innerHTML = "";
      }
      host = null;
    },
  };
}
