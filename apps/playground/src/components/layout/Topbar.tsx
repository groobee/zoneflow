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
import type {
  PlaygroundThemePreset,
  PlaygroundThemePresetId,
} from "../../theme/playgroundThemes";
import type { SampleType } from "../../hooks/useSampleSwitcher";

type Props = {
  sampleType: SampleType;
  setSampleType: (value: SampleType) => void;
  themePreset: PlaygroundThemePreset;
  themePresetId: PlaygroundThemePresetId;
  setThemePresetId: (value: PlaygroundThemePresetId) => void;
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
  themePreset,
  themePresetId,
  setThemePresetId,
  editor,
  overlayHudVisible,
  onToggleOverlayHud,
  onOpenDataModal,
  onCreateNewDocument,
  onExportFile,
  onImportFile,
}: Props) {
  const themedTopbarStyle: React.CSSProperties = {
    ...topbarStyle,
    background: themePreset.topbar.background,
    borderBottom: themePreset.topbar.border,
  };
  const themedControlStyle: React.CSSProperties = {
    ...buttonStyle,
    background: themePreset.topbar.controlBackground,
    border: themePreset.topbar.controlBorder,
    color: themePreset.topbar.controlText,
  };
  const themedSelectStyle: React.CSSProperties = {
    ...selectStyle,
    background: themePreset.topbar.controlBackground,
    border: themePreset.topbar.controlBorder,
    color: themePreset.topbar.controlText,
  };

  return (
    <DefaultEditorToolbar
      editor={editor}
      style={themedTopbarStyle}
      theme={themePreset.editorTheme}
      leading={
        <>
          <select
            style={themedSelectStyle}
            value={themePresetId}
            onChange={(e) =>
              setThemePresetId(e.target.value as PlaygroundThemePresetId)
            }
            title={themePreset.description}
          >
            <option value="sunset">Theme: Sunset</option>
            <option value="ocean">Theme: Ocean</option>
            <option value="dark">Theme: Dark</option>
            <option value="light">Theme: Light</option>
            <option value="party">Theme: Party</option>
            <option value="korean-culture">Theme: Korean Culture</option>
            <option value="sci-fi">Theme: Sci-fi</option>
            <option value="fantasy">Theme: Fantasy</option>
            <option value="mono">Theme: Mono</option>
            <option value="garden">Theme: Garden</option>
            <option value="utopia">Theme: Utopia</option>
            <option value="dystopia">Theme: Dystopia</option>
            <option value="desert">Theme: Desert</option>
          </select>
          <select
            style={themedSelectStyle}
            value={sampleType}
            onChange={(e) => setSampleType(e.target.value as SampleType)}
          >
            <option value="tiny">Tiny sample</option>
            <option value="small">Small sample</option>
            <option value="large">Large sample</option>
            <option value="no-self-loop">No self-loop sample</option>
            <option value="dag">DAG sample</option>
            {sampleType === "custom" ? (
              <option value="custom">Loaded file</option>
            ) : null}
          </select>
        </>
      }
      trailing={
        <>
          <button
            type="button"
            style={themedControlStyle}
            onClick={onCreateNewDocument}
          >
            새 문서
          </button>
          <button type="button" style={themedControlStyle} onClick={onImportFile}>
            불러오기
          </button>
          <button type="button" style={themedControlStyle} onClick={onExportFile}>
            저장
          </button>
          <button
            type="button"
            style={themedControlStyle}
            onClick={onToggleOverlayHud}
          >
            HUD {overlayHudVisible ? "On" : "Off"}
          </button>
          <button
            type="button"
            style={themedControlStyle}
            onClick={onOpenDataModal}
          >
            데이터
          </button>
        </>
      }
    />
  );
}
