import React from "react";
import {
  buttonStyle,
  controlGroupStyle,
  primaryButtonStyle,
  selectStyle,
  topbarStyle,
} from "./layout.styles";

type Props = {
  sampleType: "small" | "large";
  setSampleType: (value: "small" | "large") => void;
  isEditMode: boolean;
  onStartEdit: () => void;
  onApplyEdit: () => void;
  onCancelEdit: () => void;
  onOpenDataModal: () => void;
};

export function Topbar({
  sampleType,
  setSampleType,
  isEditMode,
  onStartEdit,
  onApplyEdit,
  onCancelEdit,
  onOpenDataModal,
}: Props) {
  return (
    <header style={topbarStyle}>
      <div style={controlGroupStyle}>
        <select
          style={selectStyle}
          value={sampleType}
          onChange={(e) => setSampleType(e.target.value as "small" | "large")}
        >
          <option value="small">Small sample</option>
          <option value="large">Large sample</option>
        </select>
      </div>

      <div style={controlGroupStyle}>
        <button type="button" style={buttonStyle} onClick={onOpenDataModal}>
          데이터
        </button>
        {isEditMode ? (
          <>
            <button type="button" style={buttonStyle} onClick={onCancelEdit}>
              취소
            </button>
            <button type="button" style={primaryButtonStyle} onClick={onApplyEdit}>
              적용
            </button>
          </>
        ) : (
          <button type="button" style={primaryButtonStyle} onClick={onStartEdit}>
            수정
          </button>
        )}
      </div>
    </header>
  );
}
