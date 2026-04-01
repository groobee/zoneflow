import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CameraState, RendererFrame, Rect } from "@zoneflow/renderer-dom";
import { UniverseCanvas, type UniverseCanvasProps } from "../canvas/UniverseCanvas";
import type { ZoneMoveEditorConfig } from "./ZoneMoveEditorOverlay";
import { resolveEditorTheme } from "./theme";
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
  | "model"
  | "layoutModel"
  | "zoneMoveEditor"
  | "cameraState"
  | "onCameraChange"
  | "onFrameChange"
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
const FIT_TO_VIEW_PADDING = 64;
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

function getUnionRect(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;

  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (const rect of rects.slice(1)) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function resolveSceneBounds(frame: RendererFrame | null): Rect | null {
  if (!frame) return null;

  const zoneRects = Object.values(frame.pipeline.graphLayout.zonesById).map(
    (zone) => zone.rect
  );
  const pathRects = Object.values(frame.pipeline.graphLayout.pathsById)
    .map((path) => path.rect)
    .filter((rect): rect is Rect => rect !== undefined);

  return getUnionRect([...zoneRects, ...pathRects]);
}

function fitCameraToWorldRect(params: {
  rect: Rect;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
}): CameraState {
  const { rect, viewportWidth, viewportHeight, padding = FIT_TO_VIEW_PADDING } = params;
  const availableWidth = Math.max(viewportWidth - padding * 2, 1);
  const availableHeight = Math.max(viewportHeight - padding * 2, 1);
  const zoom = clamp(
    Math.min(availableWidth / rect.width, availableHeight / rect.height),
    MIN_ZOOM,
    MAX_ZOOM
  );
  const contentWidth = rect.width * zoom;
  const contentHeight = rect.height * zoom;

  return {
    x: padding + (availableWidth - contentWidth) / 2 - rect.x * zoom,
    y: padding + (availableHeight - contentHeight) / 2 - rect.y * zoom,
    zoom,
  };
}

export function UniverseEditorCanvas(props: UniverseEditorCanvasProps) {
  const { editor, editorConfig, grid, ...canvasProps } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<RendererFrame | null>(null);
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const resolvedEditorTheme = useMemo(
    () => resolveEditorTheme(editorConfig?.theme),
    [editorConfig?.theme]
  );
  const viewerHudButtonStyle = useMemo<CSSProperties>(
    () => ({
      appearance: "none" as const,
      border: resolvedEditorTheme.hud.buttonBorder,
      background: resolvedEditorTheme.hud.buttonBackground,
      color: resolvedEditorTheme.hud.buttonText,
      borderRadius: 10,
      height: 36,
      padding: "0 12px",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.02em",
      cursor: "pointer",
    }),
    [resolvedEditorTheme]
  );
  const viewerHudActiveButtonStyle = useMemo<CSSProperties>(
    () => ({
      background: resolvedEditorTheme.hud.buttonActiveBackground,
      border: resolvedEditorTheme.hud.buttonActiveBorder,
      color: resolvedEditorTheme.hud.buttonActiveText,
    }),
    [resolvedEditorTheme]
  );

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

  const fitToView = useCallback(() => {
    const rect = hostRef.current?.getBoundingClientRect();
    const sceneBounds = resolveSceneBounds(frameRef.current);

    if (!rect || rect.width <= 0 || rect.height <= 0 || !sceneBounds) {
      return;
    }

    setCamera(
      fitCameraToWorldRect({
        rect: sceneBounds,
        viewportWidth: rect.width,
        viewportHeight: rect.height,
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
          showFitToView: editorConfig?.overlayControls?.showFitToView,
          showZoomControls: editorConfig?.overlayControls?.showZoomControls,
          showZoomValue: editorConfig?.overlayControls?.showZoomValue,
          gridVisible: editor.gridVisible,
          onToggleGridVisible: editor.toggleGridVisible,
          snapEnabled: editor.gridSnapEnabled,
          onToggleSnap: editor.toggleGridSnap,
          onFitToView: fitToView,
          zoom: camera.zoom,
          onZoomIn: () => zoomAtCenter(ZOOM_STEP),
          onZoomOut: () => zoomAtCenter(1 / ZOOM_STEP),
          onResetZoom: resetZoom,
        },
      }
    : undefined;
  const viewerOverlayControlsEnabled =
    !editor.isEditMode && (editorConfig?.overlayControls?.enabled ?? false);

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
        onFrameChange={(nextFrame) => {
          frameRef.current = nextFrame;
        }}
        zoneMoveEditor={zoneMoveEditor}
      />
      {viewerOverlayControlsEnabled ? (
        <div
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            display: "grid",
            gap: 8,
            padding: 10,
            minWidth: 198,
            borderRadius: 14,
            border: resolvedEditorTheme.hud.panelBorder,
            background: resolvedEditorTheme.hud.panelBackground,
            boxShadow: resolvedEditorTheme.hud.panelShadow,
            pointerEvents: "auto",
            zIndex: 20,
          }}
        >
          {editorConfig?.overlayControls?.showFitToView !== false ? (
            <button
              type="button"
              onClick={fitToView}
              style={viewerHudButtonStyle}
            >
              한눈에 보기
            </button>
          ) : null}

          {(editorConfig?.overlayControls?.showGridToggle !== false ||
            editorConfig?.overlayControls?.showSnapToggle !== false) ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {editorConfig?.overlayControls?.showGridToggle !== false ? (
                <button
                  type="button"
                    onClick={editor.toggleGridVisible}
                    style={{
                      ...viewerHudButtonStyle,
                      ...(editor.gridVisible ? viewerHudActiveButtonStyle : null),
                    }}
                >
                  Grid {editor.gridVisible ? "On" : "Off"}
                </button>
              ) : null}
              {editorConfig?.overlayControls?.showSnapToggle !== false ? (
                <button
                  type="button"
                    onClick={editor.toggleGridSnap}
                    style={{
                      ...viewerHudButtonStyle,
                      ...(editor.gridSnapEnabled ? viewerHudActiveButtonStyle : null),
                    }}
                >
                  Snap {editor.gridSnapEnabled ? "On" : "Off"}
                </button>
              ) : null}
            </div>
          ) : null}

          {(editorConfig?.overlayControls?.showZoomControls !== false ||
            editorConfig?.overlayControls?.showZoomValue !== false) ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "36px minmax(0, 1fr) 36px",
                gap: 8,
                alignItems: "center",
              }}
            >
              {editorConfig?.overlayControls?.showZoomControls !== false ? (
                <button
                    type="button"
                    onClick={() => zoomAtCenter(1 / ZOOM_STEP)}
                    style={viewerHudButtonStyle}
                  >
                  -
                </button>
              ) : (
                <div />
              )}
              {editorConfig?.overlayControls?.showZoomValue !== false ? (
                <button
                  type="button"
                  onClick={resetZoom}
                    style={{
                      ...viewerHudButtonStyle,
                      fontVariantNumeric: "tabular-nums",
                    }}
                >
                  {Math.round(camera.zoom * 100)}%
                </button>
              ) : (
                <div />
              )}
              {editorConfig?.overlayControls?.showZoomControls !== false ? (
                <button
                    type="button"
                    onClick={() => zoomAtCenter(ZOOM_STEP)}
                    style={viewerHudButtonStyle}
                  >
                  +
                </button>
              ) : (
                <div />
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
