import { useRef, useState, type CSSProperties } from "react";
import {
  parseZoneflowDocument,
  serializeZoneflowDocument,
  type UniverseLayoutModel,
  type UniverseModel,
} from "@zoneflow/core";
import {
  createZoneFromDropTemplate,
  DefaultEditorToolbar,
  UniverseEditorCanvas,
  useUniverseEditor,
} from "@zoneflow/react";
import { starterLayoutModel, starterModel } from "./sample";
import {
  starterPathComponents,
  starterZoneComponents,
} from "./renderers";

const shellStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  width: "100vw",
  height: "100vh",
  background: "#f5f7fb",
};

const toolbarMetaStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const canvasPanelStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  padding: 20,
};

const canvasCardStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "#ffffff",
  boxShadow: "0 22px 54px rgba(15, 23, 42, 0.08)",
};

const toolbarActionGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const toolbarButtonStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: 10,
  background: "#ffffff",
  color: "#0f172a",
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

function resolveNextRootWorldPoint(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  width: number;
  height: number;
  variant: "action" | "container";
}) {
  const { model, layoutModel, width, height, variant } = params;
  const rootLayouts = model.rootZoneIds
    .map((zoneId) => layoutModel.zoneLayoutsById[zoneId])
    .filter((layout): layout is NonNullable<typeof layout> => Boolean(layout));

  if (rootLayouts.length === 0) {
    return {
      x: 120 + width / 2,
      y: 72 + height / 2,
    };
  }

  const minX = Math.min(...rootLayouts.map((layout) => layout.x));
  const maxBottom = Math.max(
    ...rootLayouts.map((layout) => layout.y + (layout.height ?? 0))
  );

  return {
    x: minX + (variant === "container" ? width / 2 : width / 2 + 280),
    y: maxBottom + 56 + height / 2,
  };
}

export default function App() {
  const [model, setModel] = useState<UniverseModel>(starterModel);
  const [layoutModel, setLayoutModel] =
    useState<UniverseLayoutModel>(starterLayoutModel);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editor = useUniverseEditor({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
    initialGridVisible: true,
  });

  const handleAddZone = (variant: "action" | "container") => {
    if (!editor.isEditMode) return;

    const zoneCount = Object.keys(editor.model.zonesById).length + 1;
    const template =
      variant === "container"
        ? {
            name: `Container ${zoneCount}`,
            zoneType: "container" as const,
            width: 320,
            height: 180,
            inputDisabled: true,
          }
        : {
            name: `Action ${zoneCount}`,
            zoneType: "action" as const,
            width: 200,
            height: 120,
            action: {
              type: "customAction",
            },
          };

    const worldPoint = resolveNextRootWorldPoint({
      model: editor.model,
      layoutModel: editor.layoutModel,
      width: template.width,
      height: template.height,
      variant,
    });
    const next = createZoneFromDropTemplate({
      model: editor.model,
      layoutModel: editor.layoutModel,
      worldPoint,
      template,
      gridSnapEnabled: editor.gridSnapEnabled,
      gridSnapSize: editor.gridSnapSize,
    });

    editor.updateDraftModel(next.model);
    editor.updateDraftLayoutModel(next.layoutModel);
  };

  const handleExport = () => {
    const payload = serializeZoneflowDocument({
      model: editor.model,
      layoutModel: editor.layoutModel,
    });
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeUniverseId = editor.model.universeId.replace(/[^a-zA-Z0-9-_]+/g, "-");

    anchor.href = url;
    anchor.download = `${safeUniverseId || "zoneflow-starter"}.zoneflow.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const payload = await file.text();
      const documentBundle = parseZoneflowDocument(payload);

      editor.resetForSampleChange();
      setModel(documentBundle.model);
      setLayoutModel(documentBundle.layoutModel);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown import error";
      window.alert(`Zoneflow 파일을 불러오지 못했습니다.\n\n${message}`);
    }
  };

  return (
    <div style={shellStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zoneflow.json,application/json"
        style={{ display: "none" }}
        onChange={handleImportChange}
      />
      <DefaultEditorToolbar
        editor={editor}
        leading={
          <div style={toolbarMetaStyle}>
            <strong style={{ fontSize: 14 }}>Zoneflow Starter</strong>
            <span
              style={{
                fontSize: 12,
                color: "#64748b",
              }}
            >
              가장 단순한 viewer/editor integration 예제
            </span>
          </div>
        }
        trailing={
          <div style={toolbarActionGroupStyle}>
            <button
              type="button"
              style={toolbarButtonStyle}
              onClick={handleImportClick}
            >
              불러오기
            </button>
            <button
              type="button"
              style={toolbarButtonStyle}
              onClick={handleExport}
            >
              저장
            </button>
            {editor.isEditMode ? (
              <>
                <button
                  type="button"
                  style={toolbarButtonStyle}
                  onClick={() => handleAddZone("action")}
                >
                  액션 추가
                </button>
                <button
                  type="button"
                  style={toolbarButtonStyle}
                  onClick={() => handleAddZone("container")}
                >
                  컨테이너 추가
                </button>
              </>
            ) : null}
          </div>
        }
      />

      <div style={canvasPanelStyle}>
        <div style={canvasCardStyle}>
          <UniverseEditorCanvas
            editor={editor}
            zoneComponents={starterZoneComponents}
            pathComponents={starterPathComponents}
            editorConfig={{
              overlayControls: {
                enabled: true,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
