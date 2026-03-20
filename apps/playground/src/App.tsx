import { useState } from "react";
import { useDebugState } from "./hooks/useDebugState";
import { useSampleSwitcher } from "./hooks/useSampleSwitcher";
import { shellStyle } from "./components/layout/layout.styles";
import { Topbar } from "./components/layout/Topbar";
import { LeftPanel } from "./components/layout/LeftPanel";
import { RightPanel } from "./components/layout/RightPanel";
import { CanvasHost } from "./components/layout/CanvasHost";

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

  const { sampleType, setSampleType, model, layoutModel } =
    useSampleSwitcher("small");

  const [hostSize, setHostSize] = useState({
    width: 0,
    height: 0,
  });

  return (
    <div style={shellStyle}>
      <Topbar sampleType={sampleType} setSampleType={setSampleType} />

      <LeftPanel />

      <CanvasHost
        model={model}
        layoutModel={layoutModel}
        debug={debug}
        onResize={setHostSize} // 👈 추가
      />

      <RightPanel
        debug={debug}
        hostWidth={hostSize.width}
        hostHeight={hostSize.height}
      />
    </div>
  );
}