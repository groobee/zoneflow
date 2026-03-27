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
  gridSnapEnabled: boolean;
  gridSnapSize: 8 | 12 | 16 | 24;
  onToggleGridSnap: () => void;
  onGridSnapSizeChange: (value: 8 | 12 | 16 | 24) => void;
  onStartEdit: () => void;
  onApplyEdit: () => void;
  onCancelEdit: () => void;
  onOpenDataModal: () => void;
};

export function Topbar({
  sampleType,
  setSampleType,
  isEditMode,
  gridSnapEnabled,
  gridSnapSize,
  onToggleGridSnap,
  onGridSnapSizeChange,
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
        <button
          type="button"
          style={
            gridSnapEnabled
              ? primaryButtonStyle
              : buttonStyle
          }
          onClick={onToggleGridSnap}
        >
          Snap {gridSnapEnabled ? "On" : "Off"}
        </button>
        <select
          style={{
            ...selectStyle,
            opacity: gridSnapEnabled ? 1 : 0.56,
            cursor: gridSnapEnabled ? "pointer" : "not-allowed",
          }}
          value={gridSnapSize}
          disabled={!gridSnapEnabled}
          onChange={(e) =>
            onGridSnapSizeChange(Number(e.target.value) as 8 | 12 | 16 | 24)
          }
        >
          <option value={8}>8 px</option>
          <option value={12}>12 px</option>
          <option value={16}>16 px</option>
          <option value={24}>24 px</option>
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
