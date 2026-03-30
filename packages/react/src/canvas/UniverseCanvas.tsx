import {useEffect, useMemo, useRef, useState} from "react";
import type { CSSProperties } from "react";
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
  grid?: {
    enabled?: boolean;
    size?: number;
    color?: string;
    majorEvery?: number;
    majorColor?: string;
    backgroundColor?: string;
  };

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

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function UniverseCanvas({
                                 model,
                                 layoutModel,
                                 theme,
                                 textScale = "md",
                                 viewport,
                                 grid,

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
  const effectiveTheme = useMemo(() => {
    if (!grid?.enabled) return theme;
    return {
      ...(theme ?? {}),
      background: "transparent",
    };
  }, [grid?.enabled, theme]);
  const gridStyle = useMemo(() => {
    if (!grid?.enabled) return null;

    const worldSize = Math.max(grid.size ?? 16, 2);
    const majorEvery = Math.max(grid.majorEvery ?? 4, 2);
    const minorSize = worldSize * camera.zoom;
    const majorSize = minorSize * majorEvery;

    if (minorSize < 2) return null;

    const minorOffsetX = positiveModulo(camera.x, minorSize);
    const minorOffsetY = positiveModulo(camera.y, minorSize);
    const majorOffsetX = positiveModulo(camera.x, majorSize);
    const majorOffsetY = positiveModulo(camera.y, majorSize);

    return {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 0,
      backgroundColor:
        grid.backgroundColor ??
        theme?.background ??
        "#f3f6fb",
      backgroundImage: [
        `linear-gradient(to right, ${grid.color ?? "rgba(148, 163, 184, 0.10)"} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${grid.color ?? "rgba(148, 163, 184, 0.10)"} 1px, transparent 1px)`,
        `linear-gradient(to right, ${grid.majorColor ?? "rgba(148, 163, 184, 0.18)"} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${grid.majorColor ?? "rgba(148, 163, 184, 0.18)"} 1px, transparent 1px)`,
      ].join(", "),
      backgroundSize: [
        `${minorSize}px ${minorSize}px`,
        `${minorSize}px ${minorSize}px`,
        `${majorSize}px ${majorSize}px`,
        `${majorSize}px ${majorSize}px`,
      ].join(", "),
      backgroundPosition: [
        `${minorOffsetX}px ${minorOffsetY}px`,
        `${minorOffsetX}px ${minorOffsetY}px`,
        `${majorOffsetX}px ${majorOffsetY}px`,
        `${majorOffsetX}px ${majorOffsetY}px`,
      ].join(", "),
    } satisfies CSSProperties;
  }, [camera.x, camera.y, camera.zoom, grid, theme?.background]);

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
      theme: effectiveTheme,
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
    effectiveTheme,
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
      {gridStyle ? <div style={gridStyle} /> : null}
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          zIndex: 1,
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
