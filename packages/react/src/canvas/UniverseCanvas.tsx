import {useEffect, useMemo, useRef, useState} from "react";
import type {UniverseLayoutModel, UniverseModel} from "@zoneflow/core";
import {screenPointToWorldPoint} from "@zoneflow/editor-dom";
import {
  type CameraState,
  type ComponentLayoutEngine,
  createRenderer,
  type DensityEngine,
  type DrawEngine,
  type GraphLayoutEngine,
  type RendererExclusionState,
  type RenderMountRegistry,
  type RendererFrame,
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
  type ZoneMoveEditorConfig,
  ZoneMoveEditorOverlay,
} from "../editor/ZoneMoveEditorOverlay";
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
  zoneMoveEditor?: ZoneMoveEditorConfig;

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
                                 zoneMoveEditor,
                               debug,
                               }: UniverseCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef(createRenderer());
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [frame, setFrame] = useState<RendererFrame | null>(null);
  const [exclusionState, setExclusionState] = useState<
    RendererExclusionState | undefined
  >(undefined);
  const [mounts, setMounts] = useState<RenderMountRegistry>({
    zones: [],
    paths: [],
  });
  const externalDropEnabled =
    zoneMoveEditor?.enabled &&
    zoneMoveEditor.externalDrop?.enabled !== false &&
    Boolean(zoneMoveEditor.externalDrop?.onDrop);

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
    hostRef: viewportRef,
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
    if (zoneMoveEditor?.enabled) return;
    setExclusionState(undefined);
  }, [zoneMoveEditor?.enabled]);

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
      exclusionState,
      debug,
    });

    setFrame(frame ?? null);
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
    exclusionState,
    debug,
  ]);

  return (
    <div
      ref={viewportRef}
      onDragOver={(event) => {
        if (!externalDropEnabled) return;
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        if (!externalDropEnabled) return;
        event.preventDefault();

        const bounds = viewportRef.current?.getBoundingClientRect();
        const screenPoint = {
          x: event.clientX - (bounds?.left ?? 0),
          y: event.clientY - (bounds?.top ?? 0),
        };

        zoneMoveEditor?.externalDrop?.onDrop({
          dataTransfer: event.dataTransfer,
          clientX: event.clientX,
          clientY: event.clientY,
          screenPoint,
          worldPoint: screenPointToWorldPoint(screenPoint, camera),
          model,
          layoutModel,
          camera,
          frame,
        });
      }}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    >
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
        }}
      />
      <SlotPortals
        mounts={mounts}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
      />
      <ZoneMoveEditorOverlay
        model={model}
        layoutModel={layoutModel}
        camera={camera}
        frame={frame}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        editor={zoneMoveEditor}
        onExclusionStateChange={setExclusionState}
      />
    </div>
  );
}
