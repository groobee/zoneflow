import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CameraState } from "@zoneflow/renderer-dom";
import { createFrameCoalescer } from "./frameCoalescer.js";

type UseCameraControlsParams = {
  hostRef: RefObject<HTMLElement | null>;
  camera: CameraState;
  setCamera: React.Dispatch<React.SetStateAction<CameraState>>;
};

export const CAMERA_MIN_ZOOM = 0.25;
export const CAMERA_MAX_ZOOM = 3;

const MIN_ZOOM = CAMERA_MIN_ZOOM;
const MAX_ZOOM = CAMERA_MAX_ZOOM;
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

    // 카메라 갱신 하나가 곧 캔버스 전체 redraw 다 — 포인터 이동은 프레임당
    // 한 번으로 합친다. 팬/핀치는 제스처 시작값 기준 절대 계산이라 중간
    // 이벤트를 버려도 최종 카메라가 같다(휠은 prev 누산이라 합치지 않는다).
    const cameraFrame = createFrameCoalescer<
      (prev: CameraState) => CameraState
    >((updater) =>
      setCamera((prev: CameraState) => {
        const next = updater(prev);
        // cameraRef 는 평소 렌더 후 effect 로 따라오는데, 제스처 경계(pointerdown ·
        // 손가락 수 변화)는 그 전에 이 값을 기준점으로 읽는다 — 커밋 시점에 맞춰둔다.
        cameraRef.current = next;
        return next;
      })
    );

    const flushPendingCamera = () => cameraFrame.flush();
    const schedulePointerCamera = (
      updater: (prev: CameraState) => CameraState
    ) => cameraFrame.schedule(updater);
    const cancelPendingCamera = () => cameraFrame.cancel();

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
      // 휠은 prev 누산이라 합치지 않는다. 다만 팬 중에 휠이 오면 미적용분을 먼저
      // 흘려보내야 누산 기준이 뒤로 밀리지 않는다.
      flushPendingCamera();

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
      // 새 제스처의 기준점(startCameraX/startZoom)은 cameraRef 에서 읽는데, 그건
      // 커밋된 카메라만 담는다 — 미적용분을 먼저 흘려보내야 기준점이 안 밀린다.
      flushPendingCamera();

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

        schedulePointerCamera(() => {
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

      schedulePointerCamera((prev: CameraState) => ({
        ...prev,
        x: panState.startCameraX + deltaX,
        y: panState.startCameraY + deltaY,
      }));
    };

    const handlePointerEndLike = (event: PointerEvent) => {
      // 제스처의 마지막 이동이 아직 프레임을 못 만났을 수 있다 — 버리면 최종
      // 위치가 한 프레임 어긋난 채로 굳는다.
      flushPendingCamera();

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
    host.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerEndLike);
    window.addEventListener("pointercancel", handlePointerEndLike);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      host.removeEventListener("wheel", handleWheel);
      host.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEndLike);
      window.removeEventListener("pointercancel", handlePointerEndLike);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      cancelPendingCamera();
      activePointersRef.current.clear();
      stopPointerPan();
      stopTouchGesture();
      isSpacePressedRef.current = false;
      updateIdleCursor();
    };
  }, [hostRef, setCamera]);
}
