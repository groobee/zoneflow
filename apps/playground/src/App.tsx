import { useRef, useState } from "react";
import {
  createUniverseId,
  createUniverseLayoutModel,
  parseZoneflowDocument,
  serializeZoneflowDocument,
} from "@zoneflow/core";
import { useUniverseEditor } from "@zoneflow/react";
import { useDebugState } from "./hooks/useDebugState";
import { useSampleSwitcher } from "./hooks/useSampleSwitcher";
import { shellStyle } from "./components/layout/layout.styles";
import { Topbar } from "./components/layout/Topbar";
import { LeftPanel } from "./components/layout/LeftPanel";
import { RightPanel } from "./components/layout/RightPanel";
import { CanvasHost } from "./components/layout/CanvasHost";
import { ModelDataModal } from "./components/data/ModelDataModal";
import {
  defaultPlaygroundThemePresetId,
  playgroundThemePresets,
  type PlaygroundThemePresetId,
} from "./theme/playgroundThemes";

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
  } =
    useSampleSwitcher("small");
  const editor = useUniverseEditor({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
  });

  const [hostSize, setHostSize] = useState({
    width: 0,
    height: 0,
  });
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [overlayHudVisible, setOverlayHudVisible] = useState(true);
  const [themePresetId, setThemePresetId] = useState<PlaygroundThemePresetId>(
    defaultPlaygroundThemePresetId
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = editor.isEditMode;
  const workingModel = editor.model;
  const workingLayoutModel = editor.layoutModel;
  const themePreset = playgroundThemePresets[themePresetId];

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

  const handleSampleTypeChange = (
    nextSampleType: "tiny" | "small" | "large" | "custom"
  ) => {
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
        editor={editor}
        overlayHudVisible={overlayHudVisible}
        onToggleOverlayHud={() => setOverlayHudVisible((current) => !current)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onCreateNewDocument={handleCreateNewDocument}
        onExportFile={handleExportFile}
        onImportFile={handleImportClick}
      />
      <LeftPanel isEditMode={isEditMode} themePreset={themePreset} />

      <CanvasHost
        editor={editor}
        debug={debug}
        onResize={setHostSize}
        overlayHudVisible={overlayHudVisible}
        themePreset={themePreset}
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
