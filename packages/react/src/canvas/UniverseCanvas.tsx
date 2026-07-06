import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type {UniverseLayoutModel, UniverseModel, ZoneId} from "@zoneflow/core";
import {screenPointToWorldPoint} from "@zoneflow/editor-dom";
import {
  type BackgroundRenderer,
  type CameraState,
  type ComponentLayoutEngine,
  createRenderer,
  type DensityEngine,
  type DrawEngine,
  type GraphLayoutEngine,
  type GridOptions,
  type RendererExclusionState,
  type RendererSelectionState,
  type RenderMountRegistry,
  type RendererFrame,
  type PathComponentRendererMap,
  type PathComponentSlotName,
  type RendererDebugOptions,
  type RendererInteractionHandlers,
  type ResolvePathColor,
  type ResolvePathDisplay,
  type ResolvePathLineColor,
  type ResolvePathStyle,
  type ResolveZoneColor,
  type ResolveZoneIcon,
  type ResolvePathRenderer,
  type ResolvePathOverlayRenderer,
  type ResolveZoneRenderer,
  type ResolveZoneOverlayRenderer,
  type ResolveZoneShape,
  type ResolveZoneStyle,
  type TextScaleLevel,
  type ViewportConfig,
  type VisibilityEngine,
  type ZoneComponentRendererMap,
  type ZoneComponentSlotName,
  type ZoneflowThemeInput,
} from "@zoneflow/renderer-dom";
import {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  useCameraControls,
} from "../controls/useCameraControls";
import {
  type ZoneMoveEditorConfig,
  ZoneMoveEditorOverlay,
} from "../editor/ZoneMoveEditorOverlay";
import {resolvePermissions} from "../editor/editorPermissions";
import {
  type BackgroundComponent,
  type PathSlotComponentMap,
  type ResolvePathRenderComponent,
  type ResolvePathOverlayComponent,
  type ResolveZoneRenderComponent,
  type ResolveZoneOverlayComponent,
  SlotPortals,
  type ZoneSlotComponentMap,
} from "../slots/slotComponents";

export type UniverseCanvasProps = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  theme?: ZoneflowThemeInput;
  textScale?: TextScaleLevel;
  viewport?: ViewportConfig;
  grid?: GridOptions;

  graphLayoutEngine?: GraphLayoutEngine;
  densityEngine?: DensityEngine;
  visibilityEngine?: VisibilityEngine;
  componentLayoutEngine?: ComponentLayoutEngine;
  drawEngine?: DrawEngine;

  zoneComponentRenderers?: ZoneComponentRendererMap;
  pathComponentRenderers?: PathComponentRendererMap;
  resolveZoneShape?: ResolveZoneShape;
  resolveZoneColor?: ResolveZoneColor;
  resolveZoneStyle?: ResolveZoneStyle;
  resolveZoneIcon?: ResolveZoneIcon;
  renderZone?: ResolveZoneRenderComponent;
  /**
   * 존 본문 위에 덮어 그릴 오버레이(배지·장식 등). renderZone 과 달리 본문을
   * 교체하지 않고 위에 얹으며, 뷰/편집 양쪽 모드에서 렌더된다.
   */
  renderZoneOverlay?: ResolveZoneOverlayComponent;
  renderPath?: ResolvePathRenderComponent;
  /**
   * 패스 노드 위에 덮어 그릴 오버레이(배지·장식 등). renderPath 와 달리 본문을
   * 교체하지 않고 위에 얹으며, 뷰/편집 양쪽 모드에서 렌더된다. (renderZoneOverlay 대칭)
   */
  renderPathOverlay?: ResolvePathOverlayComponent;
  resolvePathColor?: ResolvePathColor;
  resolvePathLineColor?: ResolvePathLineColor;
  resolvePathStyle?: ResolvePathStyle;
  /**
   * 패스별 표시 형태 결정 — `"edge"` 반환 시 라벨 노드 없이 존→존 직결선만
   * 그린다(단순 진행 연결). 미지정/`undefined` 는 기존 동작. dangling 패스는
   * `"edge"` 를 반환해도 노드가 유지된다. {@link ResolvePathDisplay}
   */
  resolvePathDisplay?: ResolvePathDisplay;
  zoneComponents?: ZoneSlotComponentMap;
  pathComponents?: PathSlotComponentMap;
  backgroundRenderer?: BackgroundRenderer;
  background?: BackgroundComponent;
  interactionHandlers?: RendererInteractionHandlers;
  zoneMoveEditor?: ZoneMoveEditorConfig;
  cameraState?: CameraState;
  onCameraChange?: (nextCamera: CameraState) => void;
  onFrameChange?: (frame: RendererFrame | null) => void;

  debug?: RendererDebugOptions;
};

export type UniverseCanvasFocusZoneOptions = {
  /**
   * 이동 후 zoom. 미지정 시 현재 zoom 을 유지합니다.
   * 카메라 컨트롤과 동일하게 0.25 ~ 3 범위로 clamp 됩니다.
   */
  zoom?: number;
};

export type UniverseCanvasHandle = {
  /**
   * 특정 zone 이 화면 중앙에 오도록 카메라를 이동합니다.
   *
   * - 아직 첫 프레임이 그려지지 않았거나 zone 을 찾지 못하면 `false` 를 반환합니다.
   * - controlled camera (`cameraState`/`onCameraChange`) 모드에서도 동작합니다 —
   *   계산된 카메라가 `onCameraChange` 로 전달됩니다.
   */
  focusZone: (zoneId: ZoneId, options?: UniverseCanvasFocusZoneOptions) => boolean;
};

/**
 * zone 이 뷰포트 중앙에 오는 CameraState 를 계산합니다.
 * ref 핸들 없이 controlled camera 를 직접 관리하는 쪽에서 사용할 수 있습니다.
 */
export function computeZoneFocusCamera(params: {
  frame: RendererFrame | null;
  zoneId: ZoneId;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
}): CameraState | null {
  const { frame, zoneId, viewportWidth, viewportHeight, zoom } = params;
  const rect = frame?.pipeline.graphLayout.zonesById[zoneId]?.rect;
  if (!rect) return null;
  if (viewportWidth <= 0 || viewportHeight <= 0) return null;

  return {
    x: viewportWidth / 2 - (rect.x + rect.width / 2) * zoom,
    y: viewportHeight / 2 - (rect.y + rect.height / 2) * zoom,
    zoom,
  };
}

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
};

const noopRenderer = () => {};

const HOST_RESIZE_DEBOUNCE_MS = 150;

export const UniverseCanvas = forwardRef<UniverseCanvasHandle, UniverseCanvasProps>(
  function UniverseCanvas({
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
    resolveZoneShape,
    resolveZoneColor,
    resolveZoneStyle,
    resolveZoneIcon,
    renderZone,
    renderZoneOverlay,
    renderPath,
    renderPathOverlay,
    resolvePathColor,
    resolvePathLineColor,
    resolvePathStyle,
    resolvePathDisplay,
    zoneComponents,
    pathComponents,
    backgroundRenderer,
    background,
    interactionHandlers,
    zoneMoveEditor,
    cameraState,
    onCameraChange,
    onFrameChange,
    debug,
  }: UniverseCanvasProps, handleRef) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef(createRenderer());
  const [internalCamera, setInternalCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [frame, setFrame] = useState<RendererFrame | null>(null);
  const frameRef = useRef<RendererFrame | null>(null);
  const [exclusionState, setExclusionState] = useState<
    RendererExclusionState | undefined
  >(undefined);
  // 에디터 선택/hover 패스 → 렌더러 연결선 강조 채널 (exclusionState 와 대칭).
  const [selectionState, setSelectionState] = useState<
    RendererSelectionState | undefined
  >(undefined);
  const [mounts, setMounts] = useState<RenderMountRegistry>({
    zones: [],
    paths: [],
    zoneRenderers: [],
    zoneOverlays: [],
    pathRenderers: [],
    pathOverlays: [],
    background: null,
  });
  const camera = cameraState ?? internalCamera;
  const cameraRef = useRef(camera);
  const isControlledCameraRef = useRef(cameraState !== undefined);
  const onCameraChangeRef = useRef(onCameraChange);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => {
    isControlledCameraRef.current = cameraState !== undefined;
  }, [cameraState]);
  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  const setCamera = useCallback((
    nextCamera: CameraState | ((prev: CameraState) => CameraState)
  ) => {
    const resolved =
      typeof nextCamera === "function"
        ? nextCamera(cameraRef.current)
        : nextCamera;

    cameraRef.current = resolved;

    if (!isControlledCameraRef.current) {
      setInternalCamera(resolved);
    }

    onCameraChangeRef.current?.(resolved);
  }, []);

  const externalDropEnabled =
    zoneMoveEditor?.enabled &&
    zoneMoveEditor.externalDrop?.enabled !== false &&
    Boolean(zoneMoveEditor.externalDrop?.onDrop) &&
    resolvePermissions(zoneMoveEditor?.permissions).createZone;

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

  const effectiveBackgroundRenderer = useMemo(() => {
    if (background) return backgroundRenderer ?? noopRenderer;
    return backgroundRenderer;
  }, [background, backgroundRenderer]);

  // Bridge the React `renderZone` resolver to the renderer's imperative hook:
  // when a component applies, hand the draw engine a no-op so it builds a bare
  // body host + registers a mount; SlotPortals then portals the component in.
  const effectiveResolveZoneRenderer = useMemo<
    ResolveZoneRenderer | undefined
  >(() => {
    if (!renderZone) return undefined;
    return (zone, context) =>
      renderZone(zone, context) ? noopRenderer : undefined;
  }, [renderZone]);

  const effectiveResolveZoneOverlayRenderer = useMemo<
    ResolveZoneOverlayRenderer | undefined
  >(() => {
    if (!renderZoneOverlay) return undefined;
    return (zone, context) =>
      renderZoneOverlay(zone, context) ? noopRenderer : undefined;
  }, [renderZoneOverlay]);

  const effectiveResolvePathRenderer = useMemo<
    ResolvePathRenderer | undefined
  >(() => {
    if (!renderPath) return undefined;
    return (path, context) =>
      renderPath(path, context) ? noopRenderer : undefined;
  }, [renderPath]);

  const effectiveResolvePathOverlayRenderer = useMemo<
    ResolvePathOverlayRenderer | undefined
  >(() => {
    if (!renderPathOverlay) return undefined;
    return (path, context) =>
      renderPathOverlay(path, context) ? noopRenderer : undefined;
  }, [renderPathOverlay]);

  useCameraControls({
    hostRef: viewportRef,
    camera,
    setCamera,
  });

  const focusZone = useCallback(
    (zoneId: ZoneId, options?: UniverseCanvasFocusZoneOptions): boolean => {
      const viewportEl = viewportRef.current;
      if (!viewportEl) return false;

      const zoom = Math.min(
        Math.max(options?.zoom ?? cameraRef.current.zoom, CAMERA_MIN_ZOOM),
        CAMERA_MAX_ZOOM
      );
      const nextCamera = computeZoneFocusCamera({
        frame: frameRef.current,
        zoneId,
        viewportWidth: viewportEl.clientWidth,
        viewportHeight: viewportEl.clientHeight,
        zoom,
      });

      if (!nextCamera) return false;
      setCamera(nextCamera);
      return true;
    },
    [setCamera]
  );

  useImperativeHandle(handleRef, () => ({ focusZone }), [focusZone]);

  useEffect(() => {
    if (!ref.current) return;

    rendererRef.current.mount(ref.current);

    return () => {
      rendererRef.current.destroy();
    };
  }, []);

  // 렌더러는 update 시점에 host.clientWidth/Height 로 world viewport 를 계산해
  // 화면 밖 zone/path 노드를 컬링한다. props 가 전혀 안 바뀌는 정적 viewer 는
  // update 가 다시 돌지 않아 mount 시점 측정값이 stale 해질 수 있으므로
  // (초기 0×0 측정, 윈도우/컨테이너 리사이즈 등) host 크기 변화를 감지해 재렌더한다.
  // update 한 번이 캔버스 전체 redraw 라 리사이즈 중 매 프레임 그리지 않고,
  // 크기 변화가 멈춘 시점에 한 번만 반영한다 (debounce).
  const [hostSizeVersion, setHostSizeVersion] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;

    let lastWidth = el.clientWidth;
    let lastHeight = el.clientHeight;
    let debounceTimer: number | null = null;

    const observer = new ResizeObserver(() => {
      const nextWidth = el.clientWidth;
      const nextHeight = el.clientHeight;
      if (nextWidth === lastWidth && nextHeight === lastHeight) return;

      // 0×0 측정 상태에서는 아무것도 안 그려져 있으므로, 처음 실제 크기를
      // 얻는 순간만큼은 디바운스 없이 즉시 그려 mount 직후 공백을 줄인다.
      const wasEmpty = lastWidth === 0 || lastHeight === 0;

      lastWidth = nextWidth;
      lastHeight = nextHeight;

      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      if (wasEmpty) {
        setHostSizeVersion((version) => version + 1);
        return;
      }

      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        setHostSizeVersion((version) => version + 1);
      }, HOST_RESIZE_DEBOUNCE_MS);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
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
      resolveZoneShape,
      resolveZoneColor,
      resolveZoneStyle,
      resolveZoneIcon,
      resolveZoneRenderer: effectiveResolveZoneRenderer,
      resolveZoneOverlayRenderer: effectiveResolveZoneOverlayRenderer,
      resolvePathRenderer: effectiveResolvePathRenderer,
      resolvePathOverlayRenderer: effectiveResolvePathOverlayRenderer,
      resolvePathColor,
      resolvePathLineColor,
      resolvePathStyle,
      resolvePathDisplay,
      backgroundRenderer: effectiveBackgroundRenderer,
      gridOptions: grid,
      interactionHandlers,
      exclusionState,
      selectionState,
      debug,
    });

    frameRef.current = frame ?? null;
    setFrame(frame ?? null);
    setMounts(frame?.mounts ?? {
      zones: [],
      paths: [],
      zoneRenderers: [],
      zoneOverlays: [],
      pathRenderers: [],
      pathOverlays: [],
      background: null,
    });
    onFrameChange?.(frame ?? null);
  }, [
    model,
    layoutModel,
    theme,
    textScale,
    camera,
    viewport,
    grid,
    graphLayoutEngine,
    densityEngine,
    visibilityEngine,
    componentLayoutEngine,
    drawEngine,
    effectiveZoneComponentRenderers,
    effectivePathComponentRenderers,
    resolveZoneShape,
    resolveZoneColor,
    resolveZoneStyle,
    resolveZoneIcon,
    effectiveResolveZoneRenderer,
    effectiveResolveZoneOverlayRenderer,
    effectiveResolvePathRenderer,
    effectiveResolvePathOverlayRenderer,
    resolvePathColor,
    resolvePathLineColor,
    resolvePathStyle,
    resolvePathDisplay,
    effectiveBackgroundRenderer,
    zoneComponents,
    pathComponents,
    background,
    interactionHandlers,
    exclusionState,
    selectionState,
    debug,
    cameraState,
    onCameraChange,
    onFrameChange,
    hostSizeVersion,
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
          zIndex: 1,
        }}
      />
      <SlotPortals
        mounts={mounts}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        background={background}
        renderZone={renderZone}
        renderZoneOverlay={renderZoneOverlay}
        renderPath={renderPath}
        renderPathOverlay={renderPathOverlay}
      />
      <ZoneMoveEditorOverlay
        model={model}
        layoutModel={layoutModel}
        camera={camera}
        frame={frame}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        editor={zoneMoveEditor}
        resolveZoneShape={resolveZoneShape}
        resolvePathStyle={resolvePathStyle}
        onExclusionStateChange={setExclusionState}
        onSelectionStateChange={setSelectionState}
      />
    </div>
  );
  }
);
