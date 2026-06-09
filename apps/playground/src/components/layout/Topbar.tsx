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
import type { EditPermissionMode } from "./CanvasHost";
import type {
  PlaygroundThemePreset,
  PlaygroundThemePresetId,
} from "../../theme/playgroundThemes";
import type { SampleType } from "../../hooks/useSampleSwitcher";
import {
  weatherBackgroundOptions,
  type WeatherBackgroundId,
} from "../renderers/customBackground";

type Props = {
  sampleType: SampleType;
  setSampleType: (value: SampleType) => void;
  themePreset: PlaygroundThemePreset;
  themePresetId: PlaygroundThemePresetId;
  setThemePresetId: (value: PlaygroundThemePresetId) => void;
  weatherBackgroundId: WeatherBackgroundId;
  setWeatherBackgroundId: (value: WeatherBackgroundId) => void;
  editor: UniverseEditorController;
  editPermissionMode: EditPermissionMode;
  setEditPermissionMode: (value: EditPermissionMode) => void;
  overlayHudVisible: boolean;
  onToggleOverlayHud: () => void;
  floatingEnabled: boolean;
  onToggleFloating: () => void;
  onOpenDataModal: () => void;
  onCreateNewDocument: () => void;
  onExportFile: () => void;
  onImportFile: () => void;
  onRemoveEmptyPaths: () => void;
};

export function Topbar({
  sampleType,
  setSampleType,
  themePreset,
  themePresetId,
  setThemePresetId,
  weatherBackgroundId,
  setWeatherBackgroundId,
  editor,
  editPermissionMode,
  setEditPermissionMode,
  overlayHudVisible,
  onToggleOverlayHud,
  floatingEnabled,
  onToggleFloating,
  onOpenDataModal,
  onCreateNewDocument,
  onExportFile,
  onImportFile,
  onRemoveEmptyPaths,
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
          <select
            style={themedSelectStyle}
            value={weatherBackgroundId}
            onChange={(e) =>
              setWeatherBackgroundId(e.target.value as WeatherBackgroundId)
            }
            title="Background weather"
          >
            {weatherBackgroundOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                BG: {opt.label}
              </option>
            ))}
          </select>
        </>
      }
      trailing={
        <>
          {editor.isEditMode ? (
            <select
              style={themedSelectStyle}
              value={editPermissionMode}
              onChange={(e) =>
                setEditPermissionMode(e.target.value as EditPermissionMode)
              }
              title="편집 권한 모드 — 레이아웃만 변경 / 보기 잠금"
            >
              <option value="full">권한: 전체 편집</option>
              <option value="layoutOnly">권한: 레이아웃만</option>
              <option value="locked">권한: 잠금(보기)</option>
            </select>
          ) : null}
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
            onClick={onRemoveEmptyPaths}
            title="이름이 비고 rule이 없는 'Empty' 패스를 모두 제거"
          >
            Empty 정리
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
            style={{
              ...themedControlStyle,
              ...(floatingEnabled
                ? {
                    background: "#2563eb",
                    color: "#eff6ff",
                    fontWeight: 700,
                  }
                : null),
            }}
            onClick={onToggleFloating}
            title={
              floatingEnabled && editor.isEditMode
                ? "Floating paused while editing"
                : "Toggle floating layout"
            }
          >
            Floating{" "}
            {floatingEnabled
              ? editor.isEditMode
                ? "On (paused)"
                : "On"
              : "Off"}
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
