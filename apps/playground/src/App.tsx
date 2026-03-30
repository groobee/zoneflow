import { useState } from "react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import { useDebugState } from "./hooks/useDebugState";
import { useSampleSwitcher } from "./hooks/useSampleSwitcher";
import { shellStyle } from "./components/layout/layout.styles";
import { Topbar } from "./components/layout/Topbar";
import { LeftPanel } from "./components/layout/LeftPanel";
import { RightPanel } from "./components/layout/RightPanel";
import { CanvasHost } from "./components/layout/CanvasHost";
import { ModelDataModal } from "./components/data/ModelDataModal";

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
    model,
    layoutModel,
    setModel,
    setLayoutModel,
  } =
    useSampleSwitcher("small");
  const [draftModel, setDraftModel] = useState<UniverseModel | null>(null);
  const [draftLayoutModel, setDraftLayoutModel] =
    useState<UniverseLayoutModel | null>(null);

  const [hostSize, setHostSize] = useState({
    width: 0,
    height: 0,
  });
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [gridSnapSize, setGridSnapSize] = useState<8 | 12 | 16 | 24>(16);
  const [gridVisible, setGridVisible] = useState(false);

  const isEditMode = draftModel !== null && draftLayoutModel !== null;
  const workingModel = draftModel ?? model;
  const workingLayoutModel = draftLayoutModel ?? layoutModel;

  const handleSampleTypeChange = (nextSampleType: "small" | "large") => {
    setDraftModel(null);
    setDraftLayoutModel(null);
    setSampleType(nextSampleType);
  };

  const handleStartEdit = () => {
    setDraftModel(structuredClone(model));
    setDraftLayoutModel(structuredClone(layoutModel));
  };

  const handleApplyEdit = () => {
    if (!draftModel || !draftLayoutModel) return;
    setModel(draftModel);
    setLayoutModel(draftLayoutModel);
    setDraftModel(null);
    setDraftLayoutModel(null);
  };

  const handleCancelEdit = () => {
    setDraftModel(null);
    setDraftLayoutModel(null);
  };

  return (
    <div style={shellStyle}>
      <Topbar
        sampleType={sampleType}
        setSampleType={handleSampleTypeChange}
        isEditMode={isEditMode}
        gridSnapEnabled={gridSnapEnabled}
        gridSnapSize={gridSnapSize}
        gridVisible={gridVisible}
        onToggleGridSnap={() => setGridSnapEnabled((current) => !current)}
        onToggleGridVisible={() => setGridVisible((current) => !current)}
        onGridSnapSizeChange={setGridSnapSize}
        onStartEdit={handleStartEdit}
        onApplyEdit={handleApplyEdit}
        onCancelEdit={handleCancelEdit}
        onOpenDataModal={() => setIsDataModalOpen(true)}
      />
      <LeftPanel isEditMode={isEditMode} />

      <CanvasHost
        model={workingModel}
        layoutModel={workingLayoutModel}
        isEditMode={isEditMode}
        onDraftModelChange={setDraftModel}
        onDraftLayoutModelChange={setDraftLayoutModel}
        debug={debug}
        onResize={setHostSize}
        gridSnapEnabled={gridSnapEnabled}
        gridSnapSize={gridSnapSize}
        gridVisible={gridVisible}
      />

      <RightPanel
        debug={debug}
        hostWidth={hostSize.width}
        hostHeight={hostSize.height}
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
