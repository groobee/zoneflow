import {useEffect, useMemo, useRef, useState} from "react";
import type {UniverseLayoutModel, UniverseModel} from "@zoneflow/core";
import {
  type CameraState,
  type ComponentLayoutEngine,
  createRenderer,
  type DensityEngine,
  type DrawEngine,
  type GraphLayoutEngine,
  type RenderMountRegistry,
  type PathComponentRendererMap,
  type PathComponentSlotName,
  type RendererDebugOptions,
  type RendererInteractionHandlers,
  type TextScaleLevel,
  type ViewportConfig,
  type VisibilityEngine,
  type ZoneComponentRendererMap,
  type ZoneComponentSlotName,
  type ZoneflowTheme,
} from "@zoneflow/renderer-dom";
import {useCameraControls} from "../controls/useCameraControls";
import {
  type PathSlotComponentMap,
  SlotPortals,
  type ZoneSlotComponentMap,
} from "../slots/slotComponents";

export type UniverseCanvasProps = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  theme?: Partial<ZoneflowTheme>;
  textScale?: TextScaleLevel;
  viewport?: ViewportConfig;

  graphLayoutEngine?: GraphLayoutEngine;
  densityEngine?: DensityEngine;
  visibilityEngine?: VisibilityEngine;
  componentLayoutEngine?: ComponentLayoutEngine;
  drawEngine?: DrawEngine;

  zoneComponentRenderers?: ZoneComponentRendererMap;
  pathComponentRenderers?: PathComponentRendererMap;
  zoneComponents?: ZoneSlotComponentMap;
  pathComponents?: PathSlotComponentMap;
  interactionHandlers?: RendererInteractionHandlers;

  debug?: RendererDebugOptions;
};

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

const noopRenderer = () => {};

export function UniverseCanvas({
                                 model,
                                 layoutModel,
                                 theme,
                                 textScale = "md",
                                 viewport,

                                 graphLayoutEngine,
                                 densityEngine,
                                 visibilityEngine,
                                 componentLayoutEngine,
                                 drawEngine,

                                 zoneComponentRenderers,
                                 pathComponentRenderers,
                                 zoneComponents,
                                 pathComponents,
                                 interactionHandlers,
                               debug,
                             }: UniverseCanvasProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef(createRenderer());
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [mounts, setMounts] = useState<RenderMountRegistry>({
    zones: [],
    paths: [],
  });

  const effectiveZoneComponentRenderers = useMemo(() => {
    if (!zoneComponents) return zoneComponentRenderers;

    const next: ZoneComponentRendererMap = {
      ...(zoneComponentRenderers ?? {}),
    };

    for (const slot of Object.keys(zoneComponents) as ZoneComponentSlotName[]) {
      next[slot] = noopRenderer;
    }

    return next;
  }, [zoneComponentRenderers, zoneComponents]);

  const effectivePathComponentRenderers = useMemo(() => {
    if (!pathComponents) return pathComponentRenderers;

    const next: PathComponentRendererMap = {
      ...(pathComponentRenderers ?? {}),
    };

    for (const slot of Object.keys(pathComponents) as PathComponentSlotName[]) {
      next[slot] = noopRenderer;
    }

    return next;
  }, [pathComponentRenderers, pathComponents]);

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
    const frame = rendererRef.current.update({
      model,
      layoutModel,
      theme,
      textScale,
      camera,
      viewport,

      graphLayoutEngine,
      densityEngine,
      visibilityEngine,
      componentLayoutEngine,
      drawEngine,

      zoneComponentRenderers: effectiveZoneComponentRenderers,
      pathComponentRenderers: effectivePathComponentRenderers,
      interactionHandlers,
      debug,
    });

    setMounts(frame?.mounts ?? {
      zones: [],
      paths: [],
    });
  }, [
    model,
    layoutModel,
    theme,
    textScale,
    camera,
    viewport,
    graphLayoutEngine,
    densityEngine,
    visibilityEngine,
    componentLayoutEngine,
    drawEngine,
    effectiveZoneComponentRenderers,
    effectivePathComponentRenderers,
    zoneComponents,
    pathComponents,
    interactionHandlers,
    debug,
  ]);

  return (
    <>
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
      <SlotPortals
        mounts={mounts}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
      />
    </>
  );
}
