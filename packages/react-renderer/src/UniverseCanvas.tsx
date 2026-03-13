import { useEffect, useRef, useState } from "react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import {
  createZoneflowDomRenderer,
  type CameraState,
  type ZoneLayoutEngine,
  type ZonePathEngine,
  type ZoneSlotRendererMap,
  type ZoneflowTheme,
  type TextScaleLevel,
} from "@zoneflow/renderer-dom";

export type UniverseCanvasProps = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  theme?: Partial<ZoneflowTheme>;
  textScale?: TextScaleLevel;
  slotRenderers?: ZoneSlotRendererMap;
  layoutEngine?: ZoneLayoutEngine;
  pathEngine?: ZonePathEngine;
};

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function UniverseCanvas({
  model,
  layoutModel,
  theme,
  textScale = "md",
  slotRenderers,
  layoutEngine,
  pathEngine,
}: UniverseCanvasProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef(createZoneflowDomRenderer());
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);

  const cameraRef = useRef(camera);
  const panStateRef = useRef<{
    isPanning: boolean;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    startCameraX: number;
    startCameraY: number;
  }>({
    isPanning: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startCameraX: 0,
    startCameraY: 0,
  });

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    if (!ref.current) return;
    rendererRef.current.mount(ref.current);

    return () => {
      rendererRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const stopPan = () => {
      panStateRef.current.isPanning = false;
      panStateRef.current.pointerId = null;
      host.style.cursor = "default";
      host.style.userSelect = "";
    };

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      const rect = host.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      setCamera((prev) => {
        const nextZoom = clamp(
          event.deltaY < 0 ? prev.zoom * ZOOM_STEP : prev.zoom / ZOOM_STEP,
          MIN_ZOOM,
          MAX_ZOOM
        );

        const worldX = (pointerX - prev.x) / prev.zoom;
        const worldY = (pointerY - prev.y) / prev.zoom;

        return {
          x: pointerX - worldX * nextZoom,
          y: pointerY - worldY * nextZoom,
          zoom: nextZoom,
        };
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const shouldStartPan =
        event.button === 1 || (event.button === 0 && event.altKey);

      if (!shouldStartPan) return;

      event.preventDefault();

      panStateRef.current.isPanning = true;
      panStateRef.current.pointerId = event.pointerId;
      panStateRef.current.startClientX = event.clientX;
      panStateRef.current.startClientY = event.clientY;
      panStateRef.current.startCameraX = cameraRef.current.x;
      panStateRef.current.startCameraY = cameraRef.current.y;

      host.style.cursor = "grabbing";
      host.style.userSelect = "none";

      host.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const panState = panStateRef.current;
      if (!panState.isPanning) return;
      if (panState.pointerId !== null && event.pointerId !== panState.pointerId) {
        return;
      }

      const deltaX = event.clientX - panState.startClientX;
      const deltaY = event.clientY - panState.startClientY;

      setCamera((prev) => ({
        ...prev,
        x: panState.startCameraX + deltaX,
        y: panState.startCameraY + deltaY,
      }));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const panState = panStateRef.current;
      if (!panState.isPanning) return;
      if (panState.pointerId !== null && event.pointerId !== panState.pointerId) {
        return;
      }

      stopPan();
    };

    host.addEventListener("wheel", handleWheel, { passive: false });
    host.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      host.removeEventListener("wheel", handleWheel);
      host.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      stopPan();
    };
  }, []);

  useEffect(() => {
    rendererRef.current.update({
      model,
      layoutModel,
      theme,
      textScale,
      camera,
      slotRenderers,
      layoutEngine,
      pathEngine,
    });
  }, [
    model,
    layoutModel,
    theme,
    textScale,
    camera,
    slotRenderers,
    layoutEngine,
    pathEngine,
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
      }}
    />
  );
}
