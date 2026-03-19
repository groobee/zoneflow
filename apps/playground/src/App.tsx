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
 * 이 컴포넌트는 zoneflow renderer를 사용하는 기본적인 구조를 보여주는 예제입니다.
 *
 * 주요 역할:
 * - 샘플 데이터 선택 (small / large)
 * - 디버그 레이어 제어
 * - 레이아웃 패널 구성 (좌/중앙/우)
 * - UniverseCanvas 렌더링
 *
 * 실제 서비스에서는:
 * - model / layoutModel을 서버 or 상태에서 받아오고
 * - debug는 제거하거나 개발 환경에서만 사용합니다.
 */
export default function App() {
  /**
   * Debug 상태 관리
   *
   * - enabled: 디버그 렌더링 여부
   * - layers: 어떤 디버그 레이어를 표시할지
   *
   * 기본값:
   * - graph-layout: 기본 박스
   * - edges: 연결선
   * - anchors: 입출력 포인트
   */
  const debug = useDebugState([
    "graph-layout",
    "edges",
    "anchors",
  ]);

  /**
   * 샘플 데이터 스위처
   *
   * - sampleType: 현재 선택된 샘플 (small | large)
   * - model: Universe 데이터
   * - layoutModel: 레이아웃 정보
   *
   * Playground에서는 샘플 전환용으로 사용되며,
   * 실제 서비스에서는 API or 상태 관리로 대체됩니다.
   */
  const {
    sampleType,
    setSampleType,
    model,
    layoutModel,
  } = useSampleSwitcher("small");

  return (
    <div style={shellStyle}>
      {/* 상단 툴바
          - 샘플 선택
          - (추후) zoom reset / debug toggle 등 확장 가능 */}
      <Topbar
        sampleType={sampleType}
        setSampleType={setSampleType}
      />

      {/* 좌측 패널 (Palette)
          - 노드 타입 목록
          - Drag & Drop 영역으로 확장 가능 */}
      <LeftPanel />

      {/* 중앙 캔버스 영역
          - 실제 그래프 렌더링
          - camera (zoom/pan)는 내부에서 관리됨 */}
      <CanvasHost
        model={model}
        layoutModel={layoutModel}
        debugEnabled={debug.enabled}
        debugLayers={debug.layers}
      />

      {/* 우측 패널 (Inspector)
          - Debug Layer 제어
          - Selection 정보
          - 속성 패널로 확장 가능 */}
      <RightPanel debug={debug} />
    </div>
  );
}