import { useEffect, useRef, useState } from "react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import {
  createRenderer,
  type CameraState,
  type ComponentLayoutEngine,
  type DensityEngine,
  type DrawEngine,
  type GraphLayoutEngine,
  type PathComponentRendererMap,
  type RendererDebugOptions,
  type RendererInteractionHandlers,
  type TextScaleLevel,
  type VisibilityEngine,
  type ZoneComponentRendererMap,
  type ZoneflowTheme,
} from "@zoneflow/renderer-dom";
import { useCameraControls } from "../controls/useCameraControls";

export type UniverseCanvasProps = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  theme?: Partial<ZoneflowTheme>;
  textScale?: TextScaleLevel;

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

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

export function UniverseCanvas({
                                 model,
                                 layoutModel,
                                 theme,
                                 textScale = "md",

                                 graphLayoutEngine,
                                 densityEngine,
                                 visibilityEngine,
                                 componentLayoutEngine,
                                 drawEngine,

                                 zoneComponentRenderers,
                                 pathComponentRenderers,
                                 interactionHandlers,
                                 debug,
                               }: UniverseCanvasProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef(createRenderer());
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);

  useCameraControls({
    hostRef: ref,
    camera,
    setCamera,
  });

  useEffect(() => {
    if (!ref.current) return;

    rendererRef.current.mount(ref.current);

    return () => {
      rendererRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    rendererRef.current.update({
      model,
      layoutModel,
      theme,
      textScale,
      camera,

      graphLayoutEngine,
      densityEngine,
      visibilityEngine,
      componentLayoutEngine,
      drawEngine,

      zoneComponentRenderers,
      pathComponentRenderers,
      interactionHandlers,
      debug,
    });
  }, [
    model,
    layoutModel,
    theme,
    textScale,
    camera,
    graphLayoutEngine,
    densityEngine,
    visibilityEngine,
    componentLayoutEngine,
    drawEngine,
    zoneComponentRenderers,
    pathComponentRenderers,
    interactionHandlers,
    debug,
  ]);

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    />
  );
}