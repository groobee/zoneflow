import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CameraState } from "@zoneflow/renderer-dom";

type UseCameraControlsParams = {
  hostRef: RefObject<HTMLElement | null>;
  camera: CameraState;
  setCamera: React.Dispatch<React.SetStateAction<CameraState>>;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.1;
const TOUCH_PAN_MIN_POINTERS = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpointBetween(
  a: { x: number; y: number },
  b: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function zoomCameraAt(params: {
  prev: CameraState;
  nextZoom: number;
  pointerX: number;
  pointerY: number;
}): CameraState {
  const { prev, nextZoom, pointerX, pointerY } = params;

  const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const worldX = (pointerX - prev.x) / prev.zoom;
  const worldY = (pointerY - prev.y) / prev.zoom;

  return {
    x: pointerX - worldX * clampedZoom,
    y: pointerY - worldY * clampedZoom,
    zoom: clampedZoom,
  };
}

export function useCameraControls({
                                    hostRef,
                                    camera,
                                    setCamera,
                                  }: UseCameraControlsParams) {
  const cameraRef = useRef(camera);
  const isSpacePressedRef = useRef(false);

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

  const activePointersRef = useRef<
    Map<number, { x: number; y: number; pointerType: string }>
  >(new Map());

  const touchGestureRef = useRef<{
    isActive: boolean;
    startDistance: number;
    startMidX: number;
    startMidY: number;
    startCameraX: number;
    startCameraY: number;
    startZoom: number;
  }>({
    isActive: false,
    startDistance: 0,
    startMidX: 0,
    startMidY: 0,
    startCameraX: 0,
    startCameraY: 0,
    startZoom: 1,
  });

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const updateIdleCursor = () => {
      if (panStateRef.current.isPanning) {
        host.style.cursor = "grabbing";
        return;
      }

      if (isSpacePressedRef.current) {
        host.style.cursor = "grab";
        return;
      }

      host.style.cursor = "default";
    };

    const stopPointerPan = () => {
      panStateRef.current.isPanning = false;
      panStateRef.current.pointerId = null;
      host.style.userSelect = "";
      updateIdleCursor();
    };

    const stopTouchGesture = () => {
      touchGestureRef.current.isActive = false;
    };

    const beginTouchGestureIfPossible = () => {
      const touchPointers = [...activePointersRef.current.values()].filter(
        (pointer) => pointer.pointerType === "touch"
      );

      if (touchPointers.length < TOUCH_PAN_MIN_POINTERS) {
        stopTouchGesture();
        return;
      }

      const [a, b] = touchPointers;
      const mid = midpointBetween(a, b);

      touchGestureRef.current = {
        isActive: true,
        startDistance: Math.max(distanceBetween(a, b), 1),
        startMidX: mid.x,
        startMidY: mid.y,
        startCameraX: cameraRef.current.x,
        startCameraY: cameraRef.current.y,
        startZoom: cameraRef.current.zoom,
      };
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (isEditableTarget) return;

      if (!isSpacePressedRef.current) {
        isSpacePressedRef.current = true;
        event.preventDefault();
        updateIdleCursor();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      isSpacePressedRef.current = false;
      updateIdleCursor();
    };

    const handleWheel = (event: WheelEvent) => {
      const rect = host.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        setCamera((prev: CameraState) => {
          const nextZoom =
            event.deltaY < 0 ? prev.zoom * ZOOM_STEP : prev.zoom / ZOOM_STEP;

          return zoomCameraAt({
            prev,
            nextZoom,
            pointerX,
            pointerY,
          });
        });

        return;
      }

      event.preventDefault();

      setCamera((prev: CameraState) => ({
        ...prev,
        x: prev.x - event.deltaX,
        y: prev.y - event.deltaY,
      }));
    };

    const handlePointerDown = (event: PointerEvent) => {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      });

      if (event.pointerType === "touch") {
        beginTouchGestureIfPossible();
        return;
      }

      const shouldStartPan =
        event.button === 1 ||
        (event.button === 0 && (event.altKey || isSpacePressedRef.current));

      if (!shouldStartPan) return;

      event.preventDefault();

      panStateRef.current.isPanning = true;
      panStateRef.current.pointerId = event.pointerId;
      panStateRef.current.startClientX = event.clientX;
      panStateRef.current.startClientY = event.clientY;
      panStateRef.current.startCameraX = cameraRef.current.x;
      panStateRef.current.startCameraY = cameraRef.current.y;

      host.style.userSelect = "none";
      host.style.cursor = "grabbing";

      host.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const existing = activePointersRef.current.get(event.pointerId);
      if (existing) {
        activePointersRef.current.set(event.pointerId, {
          ...existing,
          x: event.clientX,
          y: event.clientY,
        });
      }

      if (event.pointerType === "touch") {
        const touchPointers = [...activePointersRef.current.values()].filter(
          (pointer) => pointer.pointerType === "touch"
        );

        if (touchPointers.length < TOUCH_PAN_MIN_POINTERS) return;

        const [a, b] = touchPointers;
        const gesture = touchGestureRef.current;

        if (!gesture.isActive) {
          beginTouchGestureIfPossible();
          return;
        }

        const currentMid = midpointBetween(a, b);
        const currentDistance = Math.max(distanceBetween(a, b), 1);
        const scaleRatio = currentDistance / gesture.startDistance;

        const rect = host.getBoundingClientRect();
        const localMidX = currentMid.x - rect.left;
        const localMidY = currentMid.y - rect.top;

        setCamera(() => {
          const zoomedCamera = zoomCameraAt({
            prev: {
              x: gesture.startCameraX,
              y: gesture.startCameraY,
              zoom: gesture.startZoom,
            },
            nextZoom: gesture.startZoom * scaleRatio,
            pointerX: localMidX,
            pointerY: localMidY,
          });

          return {
            ...zoomedCamera,
            x: zoomedCamera.x + (currentMid.x - gesture.startMidX),
            y: zoomedCamera.y + (currentMid.y - gesture.startMidY),
          };
        });

        return;
      }

      const panState = panStateRef.current;
      if (!panState.isPanning) return;
      if (
        panState.pointerId !== null &&
        event.pointerId !== panState.pointerId
      ) {
        return;
      }

      const deltaX = event.clientX - panState.startClientX;
      const deltaY = event.clientY - panState.startClientY;

      setCamera((prev: CameraState) => ({
        ...prev,
        x: panState.startCameraX + deltaX,
        y: panState.startCameraY + deltaY,
      }));
    };

    const handlePointerEndLike = (event: PointerEvent) => {
      activePointersRef.current.delete(event.pointerId);

      if (event.pointerType === "touch") {
        const touchPointers = [...activePointersRef.current.values()].filter(
          (pointer) => pointer.pointerType === "touch"
        );

        if (touchPointers.length < TOUCH_PAN_MIN_POINTERS) {
          stopTouchGesture();
        } else {
          beginTouchGestureIfPossible();
        }
      }

      const panState = panStateRef.current;
      if (!panState.isPanning) return;
      if (
        panState.pointerId !== null &&
        event.pointerId !== panState.pointerId
      ) {
        return;
      }

      stopPointerPan();
    };

    host.addEventListener("wheel", handleWheel, { passive: false });
    host.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerEndLike);
    window.addEventListener("pointercancel", handlePointerEndLike);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      host.removeEventListener("wheel", handleWheel);
      host.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEndLike);
      window.removeEventListener("pointercancel", handlePointerEndLike);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      activePointersRef.current.clear();
      stopPointerPan();
      stopTouchGesture();
      isSpacePressedRef.current = false;
      updateIdleCursor();
    };
  }, [hostRef, setCamera]);
}
