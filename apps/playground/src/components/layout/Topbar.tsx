import React, { useState } from "react";
import {
  DefaultEditorToolbar,
  type UniverseEditorController,
} from "@zoneflow/react";

/** "16, 5" → [16, 5]. 콤마로 나눠 유한 양수만 취한다(빈 입력/문자는 버림). */
function parseCellPattern(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}
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
  onOpenCleanupPreview: () => void;
  localScaleEnabled: boolean;
  onToggleLocalScale: () => void;
  localScaleFactor: number;
  onLocalScaleStep: (delta: number) => void;
  densityPreset: "default" | "dense" | "sparse";
  setDensityPreset: (value: "default" | "dense" | "sparse") => void;
  cellSnapOn: boolean;
  onToggleCellSnap: () => void;
  cellPattern: { cols: number[]; rows: number[] };
  onCellPatternChange: (next: { cols: number[]; rows: number[] }) => void;
  straightPaths: boolean;
  onToggleStraightPaths: () => void;
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
  onOpenCleanupPreview,
  localScaleEnabled,
  onToggleLocalScale,
  localScaleFactor,
  onLocalScaleStep,
  densityPreset,
  setDensityPreset,
  cellSnapOn,
  onToggleCellSnap,
  cellPattern,
  onCellPatternChange,
  straightPaths,
  onToggleStraightPaths,
}: Props) {
  // 트랙 패턴 입력 버퍼 — 배열↔문자열 변환 때문에 입력 중 콤마가 사라지지 않도록
  // 로컬 문자열 상태를 두고, 파싱이 비지 않을 때만 상위로 전달한다.
  const [colsText, setColsText] = useState(cellPattern.cols.join(", "));
  const [rowsText, setRowsText] = useState(cellPattern.rows.join(", "));
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
            <option value="dag">DAG sample</option>
            <option value="parallel">Parallel slot sample</option>
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
            onClick={onOpenCleanupPreview}
            title="빈 패스/고아 존 정리 결과를 적용 전에 미리보기 (diffUniverseModels)"
          >
            정리 미리보기
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
            style={{
              ...themedControlStyle,
              ...(localScaleEnabled
                ? { background: "#0f766e", color: "#ecfeff", fontWeight: 700 }
                : null),
            }}
            onClick={onToggleLocalScale}
            disabled={editor.isEditMode}
            title={
              editor.isEditMode
                ? "로컬 스케일은 보기 모드에서만 (편집 중 비활성)"
                : "로컬 스케일 (줌과 별개로 요소 크기만 스케일)"
            }
          >
            로컬 스케일 {localScaleEnabled ? "On" : "Off"}
          </button>
          {localScaleEnabled && !editor.isEditMode ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                style={themedControlStyle}
                onClick={() => onLocalScaleStep(-1)}
                title="작게"
              >
                −
              </button>
              <span
                style={{
                  minWidth: 34,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: themePreset.topbar.controlText,
                }}
              >
                {localScaleFactor.toFixed(1)}×
              </span>
              <button
                type="button"
                style={themedControlStyle}
                onClick={() => onLocalScaleStep(1)}
                title="크게"
              >
                +
              </button>
            </span>
          ) : null}
          <select
            style={themedSelectStyle}
            value={densityPreset}
            onChange={(e) =>
              setDensityPreset(
                e.target.value as "default" | "dense" | "sparse"
              )
            }
            title="LOD 기준(farest~detail 임계값) — theme.density.zone 커스터마이징"
          >
            <option value="default">기준: 기본</option>
            <option value="dense">기준: 촘촘(디테일 빨리)</option>
            <option value="sparse">기준: 듬성(디테일 늦게)</option>
          </select>
          <button
            type="button"
            style={{
              ...themedControlStyle,
              ...(cellSnapOn
                ? { background: "#7c3aed", color: "#f5f3ff", fontWeight: 700 }
                : null),
            }}
            onClick={onToggleCellSnap}
            title="셀 스냅 — 존 중앙을 모듈러 그리드 셀 중앙에 맞춤(트랙 패턴, 짝수=셀·홀수=거터, 그리드 칸 수)"
          >
            셀 스냅 {cellSnapOn ? "On" : "Off"}
          </button>
          {cellSnapOn ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: themePreset.topbar.controlText,
              }}
            >
              셀 패턴(칸)
              <label style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                가로
                <input
                  type="text"
                  value={colsText}
                  placeholder="16, 5"
                  title="가로 트랙 패턴(그리드 칸 수, 콤마 구분). 짝수=셀·홀수=거터. 예: 16, 5"
                  onChange={(e) => {
                    const raw = e.target.value;
                    setColsText(raw);
                    const cols = parseCellPattern(raw);
                    if (cols.length)
                      onCellPatternChange({ cols, rows: cellPattern.rows });
                  }}
                  style={{ ...themedSelectStyle, width: 72, padding: "2px 4px" }}
                />
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                세로
                <input
                  type="text"
                  value={rowsText}
                  placeholder="14, 3"
                  title="세로 트랙 패턴(그리드 칸 수, 콤마 구분). 짝수=셀·홀수=거터. 예: 14, 3"
                  onChange={(e) => {
                    const raw = e.target.value;
                    setRowsText(raw);
                    const rows = parseCellPattern(raw);
                    if (rows.length)
                      onCellPatternChange({ cols: cellPattern.cols, rows });
                  }}
                  style={{ ...themedSelectStyle, width: 72, padding: "2px 4px" }}
                />
              </label>
              <span style={{ opacity: 0.6 }}>
                ={" "}
                {cellPattern.cols
                  .map((n) => n * editor.gridSnapSize)
                  .join("·")}{" "}
                /{" "}
                {cellPattern.rows
                  .map((n) => n * editor.gridSnapSize)
                  .join("·")}{" "}
                px
              </span>
            </span>
          ) : null}
          <button
            type="button"
            style={{
              ...themedControlStyle,
              ...(straightPaths
                ? { background: "#0891b2", color: "#ecfeff", fontWeight: 700 }
                : null),
            }}
            onClick={onToggleStraightPaths}
            title='패스 연결선을 직선으로 (resolvePathStyle 의 lineShape:"straight" 주입)'
          >
            직선 패스 {straightPaths ? "On" : "Off"}
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
