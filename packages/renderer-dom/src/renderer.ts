import type {
  CameraState,
  RendererInput,
  ViewportRect,
  ZoneflowRenderer,
} from "./types";
import {resolveTheme} from "./themes/defaultTheme";
import {runRenderPipeline} from "./pipeline";

import {defaultGraphLayoutEngine} from "./engines/graphLayoutEngine";
import {defaultDensityEngine} from "./engines/densityEngine";
import {defaultVisibilityEngine} from "./engines/visibilityEngine";
import {defaultComponentLayoutEngine} from "./engines/componentLayoutEngine";
import {domDrawEngine} from "./engines/drawEngine";
import {debugDrawEngine} from "./engines/debugDrawEngine";

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

function ensureHostBaseStyle(host: HTMLElement) {
  host.style.position = "relative";
  host.style.overflow = "hidden";
}

function getViewport(host: HTMLElement): ViewportRect {
  return {
    x: 0,
    y: 0,
    width: host.clientWidth,
    height: host.clientHeight,
  };
}

export type RendererDebugOptions = {
  enabled?: boolean;
  mode?:
    | "graph-layout"
    | "density"
    | "visibility"
    | "component-layout";
};

export function createRenderer(): ZoneflowRenderer {
  let host: HTMLElement | null = null;

  return {
    mount(container) {
      host = container;
      ensureHostBaseStyle(host);
    },

    update(input: RendererInput & { debug?: RendererDebugOptions }) {
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
        interactionHandlers,

        debug,
      } = input;

      const mergedTheme = resolveTheme(theme);
      const viewport = getViewport(host);

      const pipeline = runRenderPipeline(
        {
          model,
          layoutModel,
          camera,
          viewport,
          theme: mergedTheme,
          textScale,
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
          viewport,
          theme: mergedTheme,
          textScale,
          pipeline,
          layers: debug.layers ?? ["graph-layout", "edges", "anchors",],
        });
        return;
      }

      // 일반 렌더링
      drawEngine.draw({
        host,
        model,
        layoutModel,
        camera,
        viewport,
        theme: mergedTheme,
        textScale,
        pipeline,
        zoneComponentRenderers,
        pathComponentRenderers,
        interactionHandlers,
      });
    },

    destroy() {
      if (host) {
        host.innerHTML = "";
      }
      host = null;
    },
  };
}