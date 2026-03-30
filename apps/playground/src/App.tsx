import { useState } from "react";
import { useUniverseEditor } from "@zoneflow/react";
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
  const isEditMode = editor.isEditMode;
  const workingModel = editor.model;
  const workingLayoutModel = editor.layoutModel;

  const handleSampleTypeChange = (nextSampleType: "small" | "large") => {
    editor.resetForSampleChange();
    setSampleType(nextSampleType);
  };

  return (
    <div style={shellStyle}>
      <Topbar
        sampleType={sampleType}
        setSampleType={handleSampleTypeChange}
        editor={editor}
        onOpenDataModal={() => setIsDataModalOpen(true)}
      />
      <LeftPanel isEditMode={isEditMode} />

      <CanvasHost
        editor={editor}
        debug={debug}
        onResize={setHostSize}
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
