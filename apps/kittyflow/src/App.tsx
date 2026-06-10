import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { UniverseCanvas, type UniverseCanvasHandle } from "@zoneflow/react";
import {
  CATS_BY_ID,
  kittyflowLayoutModel,
  kittyflowModel,
  RELATION_STYLE,
} from "./cats";
import { buildKittyZoneComponents, kittyPathComponents } from "./renderers";
import { CatInfoPanel } from "./CatInfoPanel";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";

const shellStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  width: "100vw",
  height: "100vh",
  background: "#fef3e2",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  padding: "14px 24px",
  borderBottom: "1px solid rgba(120, 86, 35, 0.14)",
  background: "#fffdf7",
};

const mainStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 340px",
  gap: 16,
  minWidth: 0,
  minHeight: 0,
  padding: 16,
};

const canvasCardStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid rgba(120, 86, 35, 0.18)",
  background: "#ffffff",
  boxShadow: "0 22px 54px rgba(120, 72, 15, 0.10)",
};

const startZoneButtonStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(120, 86, 35, 0.24)",
  borderRadius: 999,
  background: "#ffffff",
  color: "#57534e",
  padding: "7px 14px",
  fontFamily: sans,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const START_CAT_ID = "nabi";

export default function App() {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const canvasRef = useRef<UniverseCanvasHandle | null>(null);

  // 캔버스 밖(정보 패널, 헤더 버튼)에서 고양이를 고를 때는
  // 선택과 함께 해당 존이 화면 중앙에 오도록 카메라를 이동한다.
  const selectCatAndFocus = useCallback((catId: string) => {
    setSelectedCatId(catId);
    canvasRef.current?.focusZone(catId);
  }, []);

  const interactionHandlers = useMemo(
    () => ({
      // 캔버스에서 직접 클릭한 존은 이미 화면 안에 있으니 카메라는 그대로 둔다.
      onZoneClick: (zoneId: string) => {
        setSelectedCatId(zoneId);
      },
      onBackgroundClick: () => {
        setSelectedCatId(null);
      },
    }),
    []
  );

  const zoneComponents = useMemo(
    () => buildKittyZoneComponents(selectedCatId),
    [selectedCatId]
  );

  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <div style={{ display: "grid", gap: 2 }}>
          <strong style={{ fontFamily: sans, fontSize: 16, color: "#1c1917" }}>
            =^.^= Kittyflow
          </strong>
          <span style={{ fontFamily: sans, fontSize: 12, color: "#78716c" }}>
            골목 고양이 관계도 — 편집은 안 되고, 고양이 존을 클릭하면 우측에
            프로필이 열립니다.
          </span>
        </div>
        <button
          type="button"
          onClick={() => selectCatAndFocus(START_CAT_ID)}
          style={startZoneButtonStyle}
          title="그래프의 시작 존(나비)으로 카메라를 이동합니다"
        >
          ◎ 시작 존으로 ({CATS_BY_ID[START_CAT_ID].name})
        </button>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {Object.values(RELATION_STYLE).map((style) => (
            <span
              key={style.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 700,
                color: "#57534e",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: style.color,
                }}
              />
              {style.label}
            </span>
          ))}
        </div>
      </header>

      <main style={mainStyle}>
        <div style={canvasCardStyle}>
          <UniverseCanvas
            ref={canvasRef}
            model={kittyflowModel}
            layoutModel={kittyflowLayoutModel}
            zoneComponents={zoneComponents}
            pathComponents={kittyPathComponents}
            resolveZoneColor={(zone) => CATS_BY_ID[zone.id]?.color}
            resolvePathColor={(path) =>
              typeof path.meta?.color === "string" ? path.meta.color : undefined
            }
            interactionHandlers={interactionHandlers}
            grid={{
              enabled: true,
              size: 24,
              color: "rgba(120, 86, 35, 0.05)",
            }}
          />
        </div>

        <CatInfoPanel
          selectedCatId={selectedCatId}
          onSelectCat={selectCatAndFocus}
        />
      </main>
    </div>
  );
}
