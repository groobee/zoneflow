import { useEffect, useRef, useState } from "react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import {
  UniverseEditorCanvas,
  useUniverseEditor,
  type ResolveZoneRenderComponent,
  type UniverseEditorCanvasHandle,
} from "@zoneflow/react";
import type { CSSProperties } from "react";
import { customLayoutModel, customModel } from "./sample";
import { CustomZoneCard } from "./CustomZoneCard";

/**
 * 모든 존을 풀바디 렌더러(CustomZoneCard)로 그린다.
 * → title / type / badge / body / footer 같은 빌트인 슬롯을 하나도 쓰지 않고,
 *   존 rect 전체를 우리가 직접 그린다.
 *
 * 특정 조건에서만 커스텀하고 나머지는 기본 카드를 쓰고 싶으면 undefined 를
 * 반환하면 된다. 예) `(zone) => zone.zoneType === "branch" ? CustomZoneCard : undefined`
 */
const renderZone: ResolveZoneRenderComponent = () => CustomZoneCard;

const shell: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  width: "100vw",
  height: "100vh",
  background: "#eef2f9",
};

const header: CSSProperties = {
  padding: "16px 24px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
  background: "#ffffff",
};

const canvasPanel: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  padding: 20,
};

const canvasCard: CSSProperties = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "#f8fafc",
  boxShadow: "0 22px 54px rgba(15, 23, 42, 0.08)",
};

export default function App() {
  const [model, setModel] = useState<UniverseModel>(customModel);
  const [layoutModel, setLayoutModel] =
    useState<UniverseLayoutModel>(customLayoutModel);
  const editor = useUniverseEditor({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
    initialGridVisible: true,
  });

  // 콘텐츠가 화면에 들어오도록 맞춘다. 캔버스는 뷰포트 밖 존을 그리지 않으므로
  // 기본 카메라가 콘텐츠를 비추게 해줘야 한다. fitToView 는 첫 프레임이 준비된
  // 뒤에야 동작하므로, 준비될 때까지 잠깐 폴링한다(준비 후 호출은 idempotent).
  const canvasRef = useRef<UniverseEditorCanvasHandle | null>(null);
  useEffect(() => {
    const fit = () => canvasRef.current?.fitToView();
    fit();
    const interval = setInterval(fit, 150);
    const stop = setTimeout(() => clearInterval(interval), 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, []);

  return (
    <div style={shell}>
      <header style={header}>
        <strong style={{ fontSize: 15 }}>Custom Zone Rendering</strong>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
          빌트인 슬롯(title/type/badge/body/footer)을 전혀 쓰지 않고,{" "}
          <code>renderZone</code> 으로 존 전체를 직접 그리는 예제. 드래그로 이동,
          휠로 확대/축소.
        </div>
      </header>

      <div style={canvasPanel}>
        <div style={canvasCard}>
          <UniverseEditorCanvas
            ref={canvasRef}
            editor={editor}
            renderZone={renderZone}
            // 렌더링 데모라 에디터 HUD 는 숨긴다(드래그 이동·휠 확대축소는 유지).
            editorConfig={{ overlayControls: { enabled: false } }}
          />
        </div>
      </div>
    </div>
  );
}
