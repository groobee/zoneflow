import { useRef, useState, type CSSProperties } from "react";
import type {
  UniverseLayoutModel,
  UniverseModel,
  ZoneId,
} from "@zoneflow/core";
import {
  DefaultEditorToolbar,
  UniverseEditorCanvas,
  useUniverseEditor,
} from "@zoneflow/react";
import { sampleLayoutModel, sampleModel } from "./sample";
import { zoneComponents, pathComponents } from "./renderers";
import { dropMaterial, extractMaterial, type Material } from "./material";

/** 드래그 페이로드: 은행 카드 → 캔버스. material id 만 실어 보낸다. */
const MATERIAL_MIME = "application/x-zoneflow-material";

const shellStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  width: "100vw",
  height: "100vh",
};

const bodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  minHeight: 0,
};

const bankStyle: CSSProperties = {
  borderRight: "1px solid rgba(148, 163, 184, 0.28)",
  background: "#ffffff",
  padding: 16,
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 12,
  minHeight: 0,
};

const canvasPanelStyle: CSSProperties = { minWidth: 0, minHeight: 0, padding: 16 };

const canvasCardStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "#ffffff",
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
};

const buttonStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(148, 163, 184, 0.32)",
  borderRadius: 10,
  background: "#0f172a",
  color: "#ffffff",
  padding: "9px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.32)",
  borderRadius: 12,
  background: "#f8fafc",
  padding: "10px 12px",
  cursor: "grab",
  display: "grid",
  gap: 4,
};

export default function App() {
  const [model, setModel] = useState<UniverseModel>(sampleModel);
  const [layoutModel, setLayoutModel] =
    useState<UniverseLayoutModel>(sampleLayoutModel);
  const [selectedZoneIds, setSelectedZoneIds] = useState<ZoneId[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const materialSeq = useRef(0);

  const editor = useUniverseEditor({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
    initialGridVisible: true,
  });

  const handleSaveMaterial = () => {
    if (selectedZoneIds.length === 0) return;
    materialSeq.current += 1;
    const first = editor.model.zonesById[selectedZoneIds[0]]?.name ?? "소재";
    const label =
      selectedZoneIds.length > 1
        ? `${first} 외 ${selectedZoneIds.length - 1}`
        : first;
    const material = extractMaterial({
      id: `material-${materialSeq.current}`,
      label,
      model: editor.model,
      layoutModel: editor.layoutModel,
      zoneIds: selectedZoneIds,
    });
    if (material) setMaterials((prev) => [material, ...prev]);
  };

  return (
    <div style={shellStyle}>
      <DefaultEditorToolbar
        editor={editor}
        leading={
          <div style={{ display: "grid", gap: 2 }}>
            <strong style={{ fontSize: 14 }}>Zoneflow 소재은행</strong>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              존/패스 묶음을 자유 선택 → 저장 → 드래그해서 재사용
            </span>
          </div>
        }
        trailing={
          editor.isEditMode ? (
            <button
              type="button"
              style={{
                ...buttonStyle,
                opacity: selectedZoneIds.length === 0 ? 0.45 : 1,
              }}
              disabled={selectedZoneIds.length === 0}
              onClick={handleSaveMaterial}
            >
              선택을 소재로 저장 ({selectedZoneIds.length})
            </button>
          ) : null
        }
      />

      <div style={bodyStyle}>
        <aside style={bankStyle}>
          <strong style={{ fontSize: 13 }}>소재 ({materials.length})</strong>
          <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
            편집 모드에서 존을 여러 개 선택하고 상단의 "소재로 저장"을 누르세요.
            카드를 캔버스로 끌어다 놓으면 새 ID 로 복제 삽입됩니다.
          </p>
          <div style={{ display: "grid", gap: 8, alignContent: "start", overflow: "auto" }}>
            {materials.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                아직 저장된 소재가 없습니다.
              </div>
            ) : (
              materials.map((material) => (
                <div
                  key={material.id}
                  style={cardStyle}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(MATERIAL_MIME, material.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  title="캔버스로 드래그"
                >
                  <strong style={{ fontSize: 12 }}>{material.label}</strong>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    존 {material.zoneCount}개 · {Math.round(material.width)}×
                    {Math.round(material.height)}
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>

        <div style={canvasPanelStyle}>
          <div style={canvasCardStyle}>
            <UniverseEditorCanvas
              editor={editor}
              zoneComponents={zoneComponents}
              pathComponents={pathComponents}
              editorConfig={{
                overlayControls: { enabled: true },
                onZoneSelectionChange: setSelectedZoneIds,
                externalDrop: {
                  enabled: true,
                  onDrop: (payload) => {
                    const id = payload.dataTransfer?.getData(MATERIAL_MIME);
                    if (!id) return;
                    const material = materials.find((m) => m.id === id);
                    if (!material) return;
                    const next = dropMaterial({
                      model: payload.model,
                      layoutModel: payload.layoutModel,
                      material,
                      worldPoint: payload.worldPoint,
                    });
                    editor.updateDraftModel(next.model);
                    editor.updateDraftLayoutModel(next.layoutModel);
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
