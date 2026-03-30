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
  sampleType: "small" | "large";
  setSampleType: (value: "small" | "large") => void;
  editor: UniverseEditorController;
  onOpenDataModal: () => void;
};

export function Topbar({
  sampleType,
  setSampleType,
  editor,
  onOpenDataModal,
}: Props) {
  return (
    <DefaultEditorToolbar
      editor={editor}
      style={topbarStyle}
      leading={
        <select
          style={selectStyle}
          value={sampleType}
          onChange={(e) => setSampleType(e.target.value as "small" | "large")}
        >
          <option value="small">Small sample</option>
          <option value="large">Large sample</option>
        </select>
      }
      trailing={
        <button type="button" style={buttonStyle} onClick={onOpenDataModal}>
          데이터
        </button>
      }
    />
  );
}
