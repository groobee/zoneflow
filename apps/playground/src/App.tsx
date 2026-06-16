import { useMemo, useRef, useState } from "react";
import {
  applyLocalScale,
  createUniverseId,
  createUniverseLayoutModel,
  parseZoneflowDocument,
  serializeZoneflowDocument,
} from "@zoneflow/core";
import { buildCleanupPreview } from "./cleanupPreview";
import { useFloatingLayout, useUniverseEditor } from "@zoneflow/react";
import { useDebugState } from "./hooks/useDebugState";
import {
  useSampleSwitcher,
  type SampleType,
} from "./hooks/useSampleSwitcher";
import { shellStyle } from "./components/layout/layout.styles";
import { Topbar } from "./components/layout/Topbar";
import { LeftPanel } from "./components/layout/LeftPanel";
import { RightPanel } from "./components/layout/RightPanel";
import {
  CanvasHost,
  type EditPermissionMode,
} from "./components/layout/CanvasHost";
import { ModelDataModal } from "./components/data/ModelDataModal";
import {
  defaultPlaygroundThemePresetId,
  playgroundThemePresets,
  type PlaygroundThemePresetId,
} from "./theme/playgroundThemes";
import type { WeatherBackgroundId } from "./components/renderers/customBackground";

/**
 * Zoneflow Playground (Sample App)
 *
 * 이 컴포넌트는 zoneflow renderer 사용 예제를 보여주는 샘플 앱입니다.
 * - 샘플 데이터 전환
 * - 디버그 레이어 제어
 * - viewport override 테스트
 * - UniverseCanvas 렌더링
 */
export default function App() {
  const debug = useDebugState([
    "graph-layout",
    "edges",
    "anchors",
    "viewport",
  ]);

  const {
    sampleType,
    setSampleType,
    setCustomSample,
    model,
    layoutModel,
    setModel,
    setLayoutModel,
    canConnectPath,
  } =
    useSampleSwitcher("small");

  // 로컬 스케일(줌과 별개): 요소(존·앵커·패스 오프셋) 크기만 factor 로 스케일.
  const [localScaleEnabled, setLocalScaleEnabled] = useState(false);
  const [localScaleFactor, setLocalScaleFactor] = useState(1.4);

  // 에디터는 항상 base 레이아웃을 소유한다 — 스케일된 뷰를 에디터에 넣으면
  // 편집 진입 시 draft 가 스케일된 채 복제→적용되어 base 에 박힌다(반복 시
  // 폭주). 로컬 스케일은 순수 뷰라, 렌더용으로만 layoutModel 을 덮어쓴
  // viewEditor 를 캔버스에 넘기고, 편집 중에는 바이패스한다.
  const editor = useUniverseEditor({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
  });

  const localScaleActive = localScaleEnabled && !editor.isEditMode;
  const viewEditor = useMemo(
    () =>
      localScaleActive
        ? {
            ...editor,
            layoutModel: applyLocalScale(
              model,
              editor.layoutModel,
              localScaleFactor
            ),
          }
        : editor,
    [editor, localScaleActive, model, localScaleFactor]
  );

  const [hostSize, setHostSize] = useState({
    width: 0,
    height: 0,
  });
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [overlayHudVisible, setOverlayHudVisible] = useState(true);
  const [floatingEnabled, setFloatingEnabled] = useState(false);
  const [editPermissionMode, setEditPermissionMode] =
    useState<EditPermissionMode>("full");
  const [themePresetId, setThemePresetId] = useState<PlaygroundThemePresetId>(
    defaultPlaygroundThemePresetId
  );
  const [weatherBackgroundId, setWeatherBackgroundId] =
    useState<WeatherBackgroundId>("sunny");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = editor.isEditMode;
  const workingModel = editor.model;
  const workingLayoutModel = editor.layoutModel;
  const themePreset = playgroundThemePresets[themePresetId];

  // Floating mode: gently drift action zones into flow-aligned positions.
  // Paused during edit mode, where positions are driven by draft transactions.
  //
  // Drift the BASE layout, not `editor.layoutModel` — the latter is the local-
  // scale *view* (displayLayoutModel). Reading the scaled view and writing it
  // back to the base would re-scale it every tick (a compounding loop that
  // shrinks/grows zones). Local scale stays a pure view on top of the drift.
  useFloatingLayout({
    enabled: floatingEnabled,
    paused: editor.isEditMode,
    model,
    layoutModel,
    onLayoutModelChange: setLayoutModel,
  });

  const handleCreateNewDocument = () => {
    const universeId = createUniverseId();

    editor.resetForSampleChange();
    setCustomSample({
      model: {
        version: "1.0.0",
        universeId,
        rootZoneIds: [],
        zonesById: {},
      },
      layoutModel: createUniverseLayoutModel({
        universeId,
        version: "1.0.0",
      }),
    });
  };

  const handleSampleTypeChange = (nextSampleType: SampleType) => {
    if (nextSampleType === "custom") {
      return;
    }

    editor.resetForSampleChange();
    setSampleType(nextSampleType);
  };

  const handleThemePresetChange = (nextThemePresetId: PlaygroundThemePresetId) => {
    const nextPreset = playgroundThemePresets[nextThemePresetId];
    setThemePresetId(nextThemePresetId);

    if (sampleType !== "custom") {
      editor.resetForSampleChange();
      setSampleType(nextPreset.sampleType);
    }
  };

  const handleExportFile = () => {
    const payload = serializeZoneflowDocument({
      model: workingModel,
      layoutModel: workingLayoutModel,
    });
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeUniverseId = workingModel.universeId.replace(/[^a-zA-Z0-9-_]+/g, "-");

    anchor.href = url;
    anchor.download = `${safeUniverseId || "zoneflow-universe"}.zoneflow.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const payload = await file.text();
      const documentBundle = parseZoneflowDocument(payload);

      editor.resetForSampleChange();
      setCustomSample({
        model: documentBundle.model,
        layoutModel: documentBundle.layoutModel,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown import error";
      window.alert(`Zoneflow 파일을 불러오지 못했습니다.\\n\\n${message}`);
    }
  };

  // 정리 미리보기 — diffUniverseModels 기반. 모델이 바뀌면(편집 드래프트 포함)
  // useMemo 가 diff 를 다시 계산하므로 미리보기가 항상 현재 모델을 따라간다.
  const [cleanupPreviewOpen, setCleanupPreviewOpen] = useState(false);
  const cleanupPreview = useMemo(
    () =>
      cleanupPreviewOpen
        ? buildCleanupPreview(workingModel, workingLayoutModel)
        : undefined,
    [cleanupPreviewOpen, workingModel, workingLayoutModel]
  );

  const handleApplyCleanup = () => {
    if (!cleanupPreview) return;

    if (editor.isEditMode) {
      // 편집 중에는 draft 트랜잭션으로 — undo/적용 흐름에 포함
      editor.updateDraftModel(cleanupPreview.nextModel);
      editor.updateDraftLayoutModel(cleanupPreview.nextLayoutModel);
    } else {
      setModel(cleanupPreview.nextModel);
      setLayoutModel(cleanupPreview.nextLayoutModel);
    }
    setCleanupPreviewOpen(false);
  };

  return (
    <div
      style={{
        ...shellStyle,
        background: themePreset.rendererTheme.background ?? shellStyle.background,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zoneflow.json,application/json"
        style={{ display: "none" }}
        onChange={handleImportFileChange}
      />
      <Topbar
        sampleType={sampleType}
        setSampleType={handleSampleTypeChange}
        themePreset={themePreset}
        themePresetId={themePresetId}
        setThemePresetId={handleThemePresetChange}
        weatherBackgroundId={weatherBackgroundId}
        setWeatherBackgroundId={setWeatherBackgroundId}
        editor={editor}
        editPermissionMode={editPermissionMode}
        setEditPermissionMode={setEditPermissionMode}
        overlayHudVisible={overlayHudVisible}
        onToggleOverlayHud={() => setOverlayHudVisible((current) => !current)}
        floatingEnabled={floatingEnabled}
        onToggleFloating={() => setFloatingEnabled((current) => !current)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onCreateNewDocument={handleCreateNewDocument}
        onExportFile={handleExportFile}
        onImportFile={handleImportClick}
        onOpenCleanupPreview={() => setCleanupPreviewOpen(true)}
        localScaleEnabled={localScaleEnabled}
        onToggleLocalScale={() => setLocalScaleEnabled((v) => !v)}
        localScaleFactor={localScaleFactor}
        onLocalScaleStep={(delta) =>
          setLocalScaleFactor((f) =>
            Math.round(Math.min(2.2, Math.max(0.3, f + delta * 0.2)) * 10) / 10
          )
        }
      />
      <LeftPanel isEditMode={isEditMode} themePreset={themePreset} />

      <CanvasHost
        editor={viewEditor}
        editPermissionMode={editPermissionMode}
        debug={debug}
        onResize={setHostSize}
        overlayHudVisible={overlayHudVisible}
        themePreset={themePreset}
        weatherBackgroundId={weatherBackgroundId}
        canConnectPath={canConnectPath}
        cleanupPreview={cleanupPreview}
        onApplyCleanup={handleApplyCleanup}
        onCloseCleanupPreview={() => setCleanupPreviewOpen(false)}
      />

      <RightPanel
        debug={debug}
        hostWidth={hostSize.width}
        hostHeight={hostSize.height}
        themePreset={themePreset}
      />

      {isDataModalOpen ? (
        <ModelDataModal
          model={workingModel}
          layoutModel={workingLayoutModel}
          onClose={() => setIsDataModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
