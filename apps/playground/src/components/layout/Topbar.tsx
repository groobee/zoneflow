import React from "react";
import {
  DefaultEditorToolbar,
  type UniverseEditorController,
} from "@zoneflow/react";
import {
  buttonStyle,
  selectStyle,
  topbarStyle,
} from "./layout.styles";

type Props = {
  sampleType: "small" | "large" | "custom";
  setSampleType: (value: "small" | "large" | "custom") => void;
  editor: UniverseEditorController;
  overlayHudVisible: boolean;
  onToggleOverlayHud: () => void;
  onOpenDataModal: () => void;
  onCreateNewDocument: () => void;
  onExportFile: () => void;
  onImportFile: () => void;
};

export function Topbar({
  sampleType,
  setSampleType,
  editor,
  overlayHudVisible,
  onToggleOverlayHud,
  onOpenDataModal,
  onCreateNewDocument,
  onExportFile,
  onImportFile,
}: Props) {
  return (
    <DefaultEditorToolbar
      editor={editor}
      style={topbarStyle}
      leading={
        <select
          style={selectStyle}
          value={sampleType}
          onChange={(e) =>
            setSampleType(e.target.value as "small" | "large" | "custom")
          }
        >
          <option value="small">Small sample</option>
          <option value="large">Large sample</option>
          {sampleType === "custom" ? (
            <option value="custom">Loaded file</option>
          ) : null}
        </select>
      }
      trailing={
        <>
          <button type="button" style={buttonStyle} onClick={onCreateNewDocument}>
            새 문서
          </button>
          <button type="button" style={buttonStyle} onClick={onImportFile}>
            불러오기
          </button>
          <button type="button" style={buttonStyle} onClick={onExportFile}>
            저장
          </button>
          <button type="button" style={buttonStyle} onClick={onToggleOverlayHud}>
            HUD {overlayHudVisible ? "On" : "Off"}
          </button>
          <button type="button" style={buttonStyle} onClick={onOpenDataModal}>
            데이터
          </button>
        </>
      }
    />
  );
}
