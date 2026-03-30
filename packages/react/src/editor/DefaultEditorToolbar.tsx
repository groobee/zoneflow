import type { CSSProperties, ReactNode } from "react";
import type { UniverseEditorController } from "./useUniverseEditor";

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "14px 16px",
  background:
    "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))",
  borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
};

const groupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const buttonStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: 10,
  background: "rgba(15, 23, 42, 0.78)",
  color: "#e2e8f0",
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: "1px solid rgba(96, 165, 250, 0.44)",
  background: "rgba(37, 99, 235, 0.94)",
  color: "#eff6ff",
};

const selectStyle: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#e2e8f0",
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

export type DefaultEditorToolbarProps = {
  editor: UniverseEditorController;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: CSSProperties;
};

export function DefaultEditorToolbar(props: DefaultEditorToolbarProps) {
  const { editor, leading, trailing, style } = props;
  const isGridSizeEnabled = editor.gridSnapEnabled || editor.gridVisible;

  return (
    <header style={{ ...toolbarStyle, ...style }}>
      <div style={groupStyle}>
        {leading}
        <button
          type="button"
          style={editor.gridSnapEnabled ? primaryButtonStyle : buttonStyle}
          onClick={editor.toggleGridSnap}
        >
          Snap {editor.gridSnapEnabled ? "On" : "Off"}
        </button>
        <button
          type="button"
          style={editor.gridVisible ? primaryButtonStyle : buttonStyle}
          onClick={editor.toggleGridVisible}
        >
          Grid {editor.gridVisible ? "On" : "Off"}
        </button>
        <select
          style={{
            ...selectStyle,
            opacity: isGridSizeEnabled ? 1 : 0.56,
            cursor: isGridSizeEnabled ? "pointer" : "not-allowed",
          }}
          value={editor.gridSnapSize}
          disabled={!isGridSizeEnabled}
          onChange={(event) =>
            editor.setGridSnapSize(
              Number(event.target.value) as 8 | 12 | 16 | 24
            )
          }
        >
          <option value={8}>8 px</option>
          <option value={12}>12 px</option>
          <option value={16}>16 px</option>
          <option value={24}>24 px</option>
        </select>
      </div>

      <div style={groupStyle}>
        {trailing}
        {editor.isEditMode ? (
          <>
            <button
              type="button"
              style={{
                ...buttonStyle,
                opacity: editor.canUndo ? 1 : 0.56,
                cursor: editor.canUndo ? "pointer" : "not-allowed",
              }}
              disabled={!editor.canUndo}
              onClick={editor.undo}
              title="Cmd/Ctrl+Z"
            >
              되돌리기
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle,
                opacity: editor.canRedo ? 1 : 0.56,
                cursor: editor.canRedo ? "pointer" : "not-allowed",
              }}
              disabled={!editor.canRedo}
              onClick={editor.redo}
              title="Shift+Cmd/Ctrl+Z"
            >
              다시하기
            </button>
            <button type="button" style={buttonStyle} onClick={editor.cancelEdit}>
              취소
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={editor.applyEdit}
            >
              적용
            </button>
          </>
        ) : (
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={editor.startEdit}
          >
            수정
          </button>
        )}
      </div>
    </header>
  );
}
