import { useCallback, useRef, useState } from "react";
import type { CameraState } from "@zoneflow/renderer-dom";
import { UniverseCanvas, type UniverseCanvasProps } from "../canvas/UniverseCanvas";
import type { ZoneMoveEditorConfig } from "./ZoneMoveEditorOverlay";
import type { UniverseEditorController } from "./useUniverseEditor";

type ControlledZoneMoveEditorConfig = Omit<
  ZoneMoveEditorConfig,
  | "enabled"
  | "gridSnap"
  | "onModelChange"
  | "onLayoutModelChange"
  | "onTransactionStart"
  | "onTransactionCommit"
  | "onTransactionCancel"
  | "history"
>;

export type UniverseEditorCanvasProps = Omit<
  UniverseCanvasProps,
  "model" | "layoutModel" | "zoneMoveEditor" | "cameraState" | "onCameraChange"
> & {
  editor: UniverseEditorController;
  editorConfig?: ControlledZoneMoveEditorConfig;
};

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

const ZOOM_STEP = 1.1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

export function UniverseEditorCanvas(props: UniverseEditorCanvasProps) {
  const { editor, editorConfig, grid, ...canvasProps } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);

  const zoomAtCenter = useCallback((factor: number) => {
    const rect = hostRef.current?.getBoundingClientRect();
    const pointerX = rect ? rect.width / 2 : 0;
    const pointerY = rect ? rect.height / 2 : 0;

    setCamera((prev) =>
      zoomCameraAt({
        prev,
        nextZoom: prev.zoom * factor,
        pointerX,
        pointerY,
      })
    );
  }, []);

  const resetZoom = useCallback(() => {
    const rect = hostRef.current?.getBoundingClientRect();
    const pointerX = rect ? rect.width / 2 : 0;
    const pointerY = rect ? rect.height / 2 : 0;
    setCamera((prev) =>
      zoomCameraAt({
        prev,
        nextZoom: 1,
        pointerX,
        pointerY,
      })
    );
  }, []);

  const zoneMoveEditor: ZoneMoveEditorConfig | undefined = editor.isEditMode
    ? {
        ...editorConfig,
        enabled: true,
        gridSnap: {
          enabled: editor.gridSnapEnabled,
          size: editor.gridSnapSize,
        },
        onModelChange: editor.updateDraftModel,
        onLayoutModelChange: editor.updateDraftLayoutModel,
        onTransactionStart: editor.beginTransaction,
        onTransactionCommit: editor.commitTransaction,
        onTransactionCancel: editor.cancelTransaction,
        history: {
          canUndo: editor.canUndo,
          canRedo: editor.canRedo,
          onUndo: editor.undo,
          onRedo: editor.redo,
        },
        overlayControls: {
          enabled: editorConfig?.overlayControls?.enabled ?? false,
          showHistory: editorConfig?.overlayControls?.showHistory,
          showDelete: editorConfig?.overlayControls?.showDelete,
          showGridToggle: editorConfig?.overlayControls?.showGridToggle,
          showSnapToggle: editorConfig?.overlayControls?.showSnapToggle,
          showZoomControls: editorConfig?.overlayControls?.showZoomControls,
          showZoomValue: editorConfig?.overlayControls?.showZoomValue,
          gridVisible: editor.gridVisible,
          onToggleGridVisible: editor.toggleGridVisible,
          snapEnabled: editor.gridSnapEnabled,
          onToggleSnap: editor.toggleGridSnap,
          zoom: camera.zoom,
          onZoomIn: () => zoomAtCenter(ZOOM_STEP),
          onZoomOut: () => zoomAtCenter(1 / ZOOM_STEP),
          onResetZoom: resetZoom,
        },
      }
    : undefined;

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <UniverseCanvas
        {...canvasProps}
        model={editor.model}
        layoutModel={editor.layoutModel}
        grid={{
          ...(grid ?? {}),
          enabled: editor.gridVisible,
          size: editor.gridSnapSize,
        }}
        cameraState={camera}
        onCameraChange={setCamera}
        zoneMoveEditor={zoneMoveEditor}
      />
    </div>
  );
}
