import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  getGridSnapToggleLabel,
  getGridToggleLabel,
  getObjectSnapToggleLabel,
  getZoneflowEditorStrings,
  resolveEditorLocale,
} from "./strings";
import { resolveEditorTheme, type ZoneflowEditorThemeInput } from "./theme";
import type { UniverseEditorController } from "./useUniverseEditor";

const groupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

export type DefaultEditorToolbarProps = {
  editor: UniverseEditorController;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: CSSProperties;
  theme?: ZoneflowEditorThemeInput;
};

export function DefaultEditorToolbar(props: DefaultEditorToolbarProps) {
  const { editor, leading, trailing, style, theme } = props;
  const editorLocale = useMemo(resolveEditorLocale, []);
  const editorStrings = useMemo(
    () => getZoneflowEditorStrings(editorLocale),
    [editorLocale]
  );
  const editorTheme = useMemo(() => resolveEditorTheme(theme), [theme]);
  const toolbarStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 16px",
    background: editorTheme.hud.panelBackground,
    borderBottom: editorTheme.hud.panelBorder,
  };
  const buttonStyle: CSSProperties = {
    border: editorTheme.hud.buttonBorder,
    borderRadius: 10,
    background: editorTheme.hud.buttonBackground,
    color: editorTheme.hud.buttonText,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
  const primaryButtonStyle: CSSProperties = {
    ...buttonStyle,
    border: editorTheme.hud.buttonActiveBorder,
    background: editorTheme.hud.buttonActiveBackground,
    color: editorTheme.hud.buttonActiveText,
  };
  const selectStyle: CSSProperties = {
    borderRadius: 10,
    border: editorTheme.hud.buttonBorder,
    background: editorTheme.hud.buttonBackground,
    color: editorTheme.hud.buttonText,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
  };
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
          {getGridSnapToggleLabel({
            locale: editorLocale,
            enabled: editor.gridSnapEnabled,
          })}
        </button>
        <button
          type="button"
          style={editor.objectSnapEnabled ? primaryButtonStyle : buttonStyle}
          onClick={editor.toggleObjectSnap}
        >
          {getObjectSnapToggleLabel({
            locale: editorLocale,
            enabled: editor.objectSnapEnabled,
          })}
        </button>
        <button
          type="button"
          style={editor.gridVisible ? primaryButtonStyle : buttonStyle}
          onClick={editor.toggleGridVisible}
        >
          {getGridToggleLabel({
            locale: editorLocale,
            enabled: editor.gridVisible,
          })}
        </button>
        <select
          style={{
            ...selectStyle,
            opacity: isGridSizeEnabled ? 1 : editorTheme.hud.buttonDisabledOpacity,
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
                opacity: editor.canUndo ? 1 : editorTheme.hud.buttonDisabledOpacity,
                cursor: editor.canUndo ? "pointer" : "not-allowed",
              }}
              disabled={!editor.canUndo}
              onClick={editor.undo}
              title="Cmd/Ctrl+Z"
            >
              {editorStrings.hud.undo}
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle,
                opacity: editor.canRedo ? 1 : editorTheme.hud.buttonDisabledOpacity,
                cursor: editor.canRedo ? "pointer" : "not-allowed",
              }}
              disabled={!editor.canRedo}
              onClick={editor.redo}
              title="Shift+Cmd/Ctrl+Z"
            >
              {editorStrings.hud.redo}
            </button>
            <button type="button" style={buttonStyle} onClick={editor.cancelEdit}>
              {editorStrings.deleteDialog.cancel}
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={editor.applyEdit}
            >
              {editorLocale === "ko" ? "적용" : "Apply"}
            </button>
          </>
        ) : (
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={editor.startEdit}
          >
            {editorStrings.target.edit}
          </button>
        )}
      </div>
    </header>
  );
}
