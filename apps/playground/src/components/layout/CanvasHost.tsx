import React, { useEffect, useMemo, useRef } from "react";
import { updatePath, type PathId, type ZoneId } from "@zoneflow/core";
import {
  createZoneFromDropTemplate,
  editorPermissionPresets,
  UniverseEditorCanvas,
  type CanConnectPath,
  type CanvasExternalDropPayload,
  type UniverseEditorCanvasHandle,
  type UniverseEditorController,
} from "@zoneflow/react";
import {
  createDiffDecorations,
  DIFF_DECORATION_COLORS,
  type ResolvePathColor,
  type ResolvePathLineColor,
  type ResolvePathStyle,
  type ResolveZoneColor,
  type ResolveZoneIcon,
  type ResolveZoneShape,
  type ResolveZoneStyle,
  type ZoneflowThemeInput,
  type ZoneShape,
} from "@zoneflow/renderer-dom";
import type { DebugState } from "../../hooks/useDebugState";
import { readPaletteZoneDragData } from "../../palette/zonePalette";
import { canvasHostStyle } from "./layout.styles";
import { getThemePresetComponents } from "../renderers/presetComponents";
import {
  CustomPathNode,
  customZoneComponents,
  customZoneLayoutEngine,
  FarZoneCard,
} from "../renderers/customSlots";
import type { ResolvePathRenderComponent } from "@zoneflow/react";
import type {
  ResolveZoneRenderComponent,
  ResolveZoneOverlayComponent,
  ResolvePathOverlayComponent,
  ZoneOverlayComponentProps,
} from "@zoneflow/react";
import {
  makeWeatherBackground,
  type WeatherBackgroundId,
} from "../renderers/customBackground";
import {
  PlaygroundZoneEditButton,
  PlaygroundZoneEditor,
} from "../editor/PlaygroundZoneEditor";
import { PlaygroundPathEditor } from "../editor/PlaygroundPathEditor";
import type { PlaygroundThemePreset } from "../../theme/playgroundThemes";
import type { CleanupPreviewData } from "../../cleanupPreview";

/**
 * Special zones are drawn by shape, decided entirely here by the consumer.
 * Zones carry their intended shape in `meta.shape` (set by the palette
 * templates / zone editor); everything else falls back to the default rect.
 */
const resolveZoneShape: ResolveZoneShape = (zone) =>
  zone.meta?.shape as ZoneShape | undefined;

/** Per-zone accent color, also decided by the consumer from `meta.color`. */
const resolveZoneColor: ResolveZoneColor = (zone) =>
  zone.meta?.color as string | undefined;

/**
 * "설정 안 된" 패스 = 아직 rule(조건)이 정해지지 않은 패스. 이 데모에서는
 * 소비자(앱)가 그런 패스를 빨간 점선으로 표기하도록 결정한다 — 색/모양 모두
 * 외부에서 제어 가능함을 보여주는 예시.
 */
const isUnconfiguredPath = (path: { rule: unknown }) => path.rule === null;
const UNCONFIGURED_PATH_COLOR = "#f87171";

/** Per-path label color: meta.color 우선, 없으면 설정 안 된 패스는 빨갛게. */
const resolvePathColor: ResolvePathColor = (path) =>
  (path.meta?.color as string | undefined) ??
  (isUnconfiguredPath(path) ? UNCONFIGURED_PATH_COLOR : undefined);

/** 설정 안 된 패스의 연결선 색(빨강). 그 외엔 테마 기본. */
const resolvePathLineColor: ResolvePathLineColor = (path) =>
  isUnconfiguredPath(path) ? UNCONFIGURED_PATH_COLOR : undefined;

/** 설정 안 된 패스의 연결선 모양(점선). 그 외엔 기본 실선+flow. */
const resolvePathStyle: ResolvePathStyle = (path) =>
  isUnconfiguredPath(path) ? { lineStyle: "dashed" } : undefined;

/**
 * farest(가장 작게/줌아웃) 일 때 표시할 아이콘. meta.icon 우선, 없으면
 * zoneType 별 기본 글리프 — 둘 다 없으면 렌더러가 이름 첫 글자로 폴백한다.
 */
const resolveZoneIcon: ResolveZoneIcon = (zone) =>
  (zone.meta?.icon as string | undefined) ??
  (zone.zoneType === "container" ? "📦" : "●");

/**
 * 레벨별 렌더링 데모 (줌아웃하며 단계적으로 바뀜):
 * - mid: 기본 카드 + 점선 테두리 (density-aware 리졸버 = 파라미터화)
 * - far: 커스텀 풀바디 렌더러(FarZoneCard)가 카드 전체를 교체 (renderZone)
 * - farest: 아이콘만 (resolveZoneIcon)
 */
const resolveZoneStyle: ResolveZoneStyle = (_zone, { density }) =>
  density === "mid" ? { borderStyle: "dashed" } : undefined;

/** far 레벨에서 기본 카드 대신 커스텀 컴포넌트로 통째 렌더. 그 외엔 기본. */
const renderZone: ResolveZoneRenderComponent = (_zone, { density }) =>
  density === "far" ? FarZoneCard : undefined;

/** 존 유형 태그(SEND/BRANCH 등). 없으면 null. */
function zoneTypeTag(name: string, zoneType: string): string | null {
  if (zoneType === "container") return "GROUP";
  const n = name.toLowerCase();
  if (n.includes("send") || n.includes("push")) return "SEND";
  if (n.includes("wait") || n.includes("timer")) return "WAIT";
  if (n.includes("branch") || n.includes("condition")) return "BRANCH";
  if (n.includes("offer") || n.includes("nudge")) return "OFFER";
  if (n.includes("terminal")) return "END";
  if (n.includes("review") || n.includes("queue")) return "QUEUE";
  return null;
}

/**
 * 렌더 레벨 오버레이 배지 — renderZoneOverlay 로 주입되어 뷰/편집 양쪽 모드에서
 * 존 우상단에 항상 떠 있는다(targetMeta 의 편집 전용 배지와 대비됨).
 */
function ZoneTypeBadgeOverlay({ mount }: ZoneOverlayComponentProps) {
  const tag = zoneTypeTag(mount.context.zone.name, mount.context.zone.zoneType);
  if (!tag) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 6,
        top: 6,
        padding: "2px 7px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.06em",
        background: "rgba(15, 23, 42, 0.82)",
        color: "#fff",
        pointerEvents: "none",
      }}
    >
      {tag}
    </div>
  );
}

/** 태그가 있는 존에만 오버레이 배지 부착(뷰·편집 양쪽 모드). */
const renderZoneOverlay: ResolveZoneOverlayComponent = (zone) =>
  zoneTypeTag(zone.name, zone.zoneType) ? ZoneTypeBadgeOverlay : undefined;

/** 규칙이 설정된 패스는 노드 전체를 커스텀 칩으로. 미설정 패스는 기본. */
const renderPath: ResolvePathRenderComponent = (path) =>
  path.rule !== null ? CustomPathNode : undefined;

/**
 * 렌더 레벨 패스 오버레이 — 설정 안 된 패스(rule === null) 좌상단에 "!" 주의 마커를
 * 뷰/편집 양쪽에서 얹는다(비대화형). 수정 버튼(✏️)은 클릭이 필요하므로 에디터 레이어
 * (editorConfig.renderPathOverlays)로 옮겼다 — 렌더러 층 오버레이는 편집 모드에서
 * 에디터 오버레이에 가려 클릭되지 않기 때문이다.
 */
function UnconfiguredPathMarker() {
  return (
    <div
      style={{
        position: "absolute",
        left: 3,
        top: 3,
        width: 14,
        height: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        background: UNCONFIGURED_PATH_COLOR,
        color: "#fff",
        pointerEvents: "none",
      }}
    >
      !
    </div>
  );
}

const renderPathOverlay: ResolvePathOverlayComponent = (path) =>
  isUnconfiguredPath(path) ? UnconfiguredPathMarker : undefined;

/** 편집 권한 프리셋 키. editorPermissionPresets 와 자동 동기화. */
export type EditPermissionMode = keyof typeof editorPermissionPresets;

type Props = {
  editor: UniverseEditorController;
  debug: DebugState;
  onResize: (size: { width: number; height: number }) => void;
  overlayHudVisible: boolean;
  themePreset: PlaygroundThemePreset;
  weatherBackgroundId: WeatherBackgroundId;
  canConnectPath?: CanConnectPath;
  editPermissionMode: EditPermissionMode;
  /** density 임계값(LOD 기준) 오버라이드 — theme.density 에 partial 로 병합. */
  densityOverride?: ZoneflowThemeInput["density"];
  /**
   * 정리 미리보기 상태.
   * - `undefined`: 미리보기 꺼짐
   * - `null`: 미리보기를 열었지만 정리할 항목이 없음
   * - 데이터: diff 결과 — 캔버스 데코레이션 + 요약 패널 표시
   */
  cleanupPreview?: CleanupPreviewData | null;
  onApplyCleanup?: () => void;
  onCloseCleanupPreview?: () => void;
  /** 캔버스 선택 변경 → 상위(App)로 전달해 인스펙터에 표시. */
  onZoneSelectionChange?: (zoneIds: ZoneId[]) => void;
  onPathSelectionChange?: (pathIds: PathId[]) => void;
};

export function CanvasHost({
  editor,
  debug,
  onResize,
  overlayHudVisible,
  themePreset,
  weatherBackgroundId,
  canConnectPath,
  editPermissionMode,
  densityOverride,
  cleanupPreview,
  onApplyCleanup,
  onCloseCleanupPreview,
  onZoneSelectionChange,
  onPathSelectionChange,
}: Props) {
  // density 기준을 바꾸려면 renderer theme 의 density 만 partial 로 덮어쓰면 됨.
  const rendererTheme: ZoneflowThemeInput = densityOverride
    ? { ...themePreset.rendererTheme, density: densityOverride }
    : themePreset.rendererTheme;
  const ref = useRef<HTMLDivElement | null>(null);
  const { zoneComponents, pathComponents } = useMemo(() => {
    const preset = getThemePresetComponents(themePreset.id);
    return {
      zoneComponents: { ...preset.zoneComponents, ...customZoneComponents },
      pathComponents: preset.pathComponents,
    };
  }, [themePreset.id]);
  const Background = useMemo(
    () => makeWeatherBackground(weatherBackgroundId),
    [weatherBackgroundId]
  );

  // 미리보기 중에는 diff 기반 데코레이션이 앱의 기본 리졸버를 감싼다 —
  // 정리 대상이 아닌 패스는 여전히 "설정 안 됨(점선+빨강)" 표기가 유지된다.
  const cleanupResolvers = useMemo(
    () =>
      cleanupPreview
        ? createDiffDecorations(cleanupPreview.diff, {
            base: {
              resolvePathColor,
              resolveZoneColor,
              resolveZoneStyle,
              resolvePathLineColor,
              resolvePathStyle,
            },
          })
        : null,
    [cleanupPreview]
  );

  const editorCanvasRef = useRef<UniverseEditorCanvasHandle | null>(null);
  const handleJumpToZone = (zoneId: string) => {
    editorCanvasRef.current?.focusZone(zoneId);
  };

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;

      onResize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [onResize]);

  const handlePaletteZoneDrop = (event: CanvasExternalDropPayload) => {
    const template = readPaletteZoneDragData(event.dataTransfer);
    if (!template) return;

    const next = createZoneFromDropTemplate({
      model: editor.model,
      layoutModel: editor.layoutModel,
      worldPoint: event.worldPoint,
      gridSnapEnabled: editor.gridSnapEnabled,
      gridSnapSize: editor.gridSnapSize,
      template: {
        name: template.label,
        zoneType: template.zoneType,
        width: template.width,
        height: template.height,
        action: template.action,
        inputDisabled: template.inputDisabled,
        outputDisabled: template.outputDisabled,
        fixedWidth: template.fixedWidth,
        fixedHeight: template.fixedHeight,
        meta: template.meta,
      },
    });

    editor.updateDraftModel(next.model);
    editor.updateDraftLayoutModel(next.layoutModel);
  };

  const handlePathCreated = (params: {
    pathId: string;
    sourceZoneId: string;
    targetZoneId: string | null;
    model: typeof editor.model;
    layoutModel: typeof editor.layoutModel;
  }) => {
    const allowedRules = ["allow", "deny", "match", "fallback"];
    const ruleType = window.prompt(
      `새 패스 옵션 선택 (${allowedRules.join(" / ")}, 빈 값=옵션 없음)`,
      "allow"
    );
    if (ruleType === null) return;

    const trimmed = ruleType.trim();
    const nextRule = trimmed ? { type: trimmed } : null;

    return {
      model: updatePath(
        params.model,
        params.sourceZoneId,
        params.pathId,
        {
          name: trimmed,
          rule: nextRule,
        }
      ),
    };
  };

  const handlePathDropOnEmptySpace = (params: {
    worldPoint: { x: number; y: number };
    model: typeof editor.model;
    layoutModel: typeof editor.layoutModel;
  }) => {
    const name = window.prompt("새 zone 이름을 입력하세요", "New Zone");
    if (!name) return null;

    const next = createZoneFromDropTemplate({
      model: params.model,
      layoutModel: params.layoutModel,
      worldPoint: params.worldPoint,
      gridSnapEnabled: editor.gridSnapEnabled,
      gridSnapSize: editor.gridSnapSize,
      template: {
        name,
        zoneType: "container",
        width: 220,
        height: 140,
      },
    });

    return {
      model: next.model,
      layoutModel: next.layoutModel,
      targetZoneId: next.zoneId,
    };
  };

  return (
    <main ref={ref} style={canvasHostStyle}>
      <UniverseEditorCanvas
        ref={editorCanvasRef}
        editor={editor}
        theme={rendererTheme}
        viewport={debug.viewport}
        componentLayoutEngine={customZoneLayoutEngine}
        background={Background}
        resolveZoneShape={resolveZoneShape}
        resolveZoneColor={cleanupResolvers?.resolveZoneColor ?? resolveZoneColor}
        resolveZoneStyle={cleanupResolvers?.resolveZoneStyle ?? resolveZoneStyle}
        resolveZoneIcon={resolveZoneIcon}
        renderZone={renderZone}
        renderZoneOverlay={renderZoneOverlay}
        renderPath={renderPath}
        renderPathOverlay={renderPathOverlay}
        resolvePathColor={cleanupResolvers?.resolvePathColor ?? resolvePathColor}
        resolvePathLineColor={
          cleanupResolvers?.resolvePathLineColor ?? resolvePathLineColor
        }
        resolvePathStyle={cleanupResolvers?.resolvePathStyle ?? resolvePathStyle}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        editorConfig={{
          theme: themePreset.editorTheme,
          // layoutOnly 프리셋은 reparentZone:false → 자식 존이 컨테이너 밖으로 자동으로
          // 못 나간다(confineChildZonesToParent 기본값 = !reparentZone). 별도 배선 불필요.
          permissions: editorPermissionPresets[editPermissionMode],
          overlayControls: {
            enabled: overlayHudVisible,
          },
          externalDrop: {
            enabled: true,
            onDrop: handlePaletteZoneDrop,
          },
          onPathCreated: handlePathCreated,
          onPathDropOnEmptySpace: handlePathDropOnEmptySpace,
          onZoneSelectionChange,
          onPathSelectionChange,
          onZoneResize: ({ zoneId, from, to }) => {
            console.log("[zoneflow resize] handle", { zoneId, from, to });
          },
          // 선택 툴바 커스텀 버튼: 뷰모드(최소화/간략히/자세히)를 존 안이 아니라
          // 정렬 툴바에 두고, 선택된 존들을 한 번에 해당 크기로 리사이즈한다
          // (editor.resizeZone). 크기가 바뀌면 density 레벨도 따라 움직임.
          zoneSelectionActions: [
            {
              id: "minimize",
              label: "최소화",
              title: "선택 존을 farest(아이콘) 크기로",
              // far 임계값(기본 56) 아래로 줄여 farest → 아이콘만 노출.
              onClick: ({ zoneIds }) =>
                zoneIds.forEach((id) =>
                  editor.resizeZone(id, { width: 46, height: 44 })
                ),
            },
            {
              id: "brief",
              label: "간략히",
              onClick: ({ zoneIds }) =>
                zoneIds.forEach((id) =>
                  editor.resizeZone(id, { width: 150, height: 76 })
                ),
            },
            {
              id: "detail",
              label: "자세히",
              onClick: ({ zoneIds }) =>
                zoneIds.forEach((id) =>
                  editor.resizeZone(id, { width: 320, height: 208 })
                ),
            },
          ],
          // 패스 쪽 '공통만' 데모: rule 이 있는 패스에서만 뜨고, 클릭하면 실제로
          // 규칙을 지운다(→ 라벨이 바뀌고 isAvailable 이 false 가 되어 사라짐).
          pathSelectionActions: [
            {
              id: "clear-rule",
              label: "규칙 지우기",
              variant: "danger",
              title: "rule 이 있는 패스에서만",
              isAvailable: (path) => path.rule !== null,
              onClick: ({ paths }) => {
                let next = editor.model;
                for (const { path, sourceZoneId } of paths) {
                  next = updatePath(next, sourceZoneId, path.id, { rule: null });
                }
                editor.updateDraftModel(next);
              },
            },
          ],
          deleteInteraction: {
            animation: true,
            confirm: true,
          },
          selectionToolbar: { placement: "bottom", offset: 12 },
          canConnectPath,
          // 라이브러리가 편집 버튼을 그려주던 대신, 오버레이로 직접 그린다.
          // hover/선택/편집 중일 때만 우상단에 "설정" 버튼을 덮어 그림.
          renderZoneOverlays: (props) =>
            props.isHovered || props.isSelected || props.isEditing ? (
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  pointerEvents: "auto",
                }}
              >
                <PlaygroundZoneEditButton {...props} />
              </div>
            ) : null,
          // 패스판 오버레이 — 에디터 레이어라 실제로 클릭된다(렌더러 층 renderPathOverlay
          // 의 "!" 마커와 달리). hover/선택/편집 시 ✏️ 를 라벨 위(밖)에 띄우고, 클릭하면
          // openEditor() 로 renderPathEditor 를 연다(라벨 더블클릭과 동일 경로).
          renderPathOverlays: (props) =>
            props.isHovered || props.isSelected || props.isEditing ? (
              <button
                type="button"
                title="패스 수정"
                onClick={() => props.openEditor()}
                style={{
                  position: "absolute",
                  right: 0,
                  top: -22,
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  border: "none",
                  padding: 0,
                  fontSize: 11,
                  lineHeight: 1,
                  background: "rgba(15, 23, 42, 0.82)",
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
              >
                ✏️
              </button>
            ) : null,
          renderZoneEditor: (props) =>
            props.onModelChange ? (
              <PlaygroundZoneEditor
                model={props.model}
                zoneId={props.zoneId}
                onModelChange={props.onModelChange}
                onClose={props.closeEditor}
              />
            ) : null,
          renderPathEditor: (props) =>
            props.onModelChange ? (
              <PlaygroundPathEditor
                model={props.model}
                pathId={props.pathId}
                sourceZoneId={props.sourceZoneId}
                onModelChange={props.onModelChange}
                onClose={props.closeEditor}
              />
            ) : null,
          // 패스 output 앵커를 기본 "→" 대신 동그라미(점)로.
          // 출력 앵커: 프레임(원형 링) 안의 가운데 점 — 존 앵커와 같은 "링+점" 모양.
          // 크기를 % 로 줘 프레임(=줌)과 함께 커지게 한다. 고정 px 면 확대 시 프레임만
          // 커지고 점은 그대로라 상대적으로 작아 보여 어색하다.
          renderPathOutputAnchor: () => (
            <span
              style={{
                width: "44%",
                height: "44%",
                borderRadius: 999,
                background: "currentColor",
                display: "block",
              }}
            />
          ),
        }}
        debug={{
          enabled: debug.enabled,
          layers: debug.layers,
        }}
      />
      {cleanupPreview !== undefined ? (
        <CleanupPreviewPanel
          preview={cleanupPreview}
          onApply={onApplyCleanup}
          onClose={onCloseCleanupPreview}
          onJumpToZone={handleJumpToZone}
        />
      ) : null}
    </main>
  );
}

const cleanupPanelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "7px 0",
  borderRadius: 8,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "transparent",
  color: "#e2e8f0",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const cleanupItemButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "2px 4px",
  margin: "-2px -4px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: DIFF_DECORATION_COLORS.removed,
  fontSize: 12,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

/**
 * 정리 미리보기 요약 패널 — diff 를 사람이 읽는 목록으로 보여주고,
 * 항목 클릭 시 해당 존으로 카메라를 이동한다 (focusZone).
 */
function CleanupPreviewPanel({
  preview,
  onApply,
  onClose,
  onJumpToZone,
}: {
  preview: CleanupPreviewData | null;
  onApply?: () => void;
  onClose?: () => void;
  onJumpToZone?: (zoneId: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        top: 16,
        zIndex: 40,
        width: 248,
        maxHeight: "70%",
        overflowY: "auto",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.28)",
        background: "rgba(2, 6, 23, 0.92)",
        color: "#e2e8f0",
        padding: "14px 16px",
        display: "grid",
        gap: 10,
        fontSize: 12,
        boxShadow: "0 18px 40px rgba(2, 6, 23, 0.5)",
      }}
    >
      <strong style={{ fontSize: 13 }}>정리 미리보기</strong>
      {preview ? (
        <>
          {preview.removedPaths.length > 0 ? (
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "#94a3b8" }}>
                제거될 패스 {preview.removedPaths.length}
              </span>
              {preview.removedPaths.map((entry) => (
                <button
                  key={entry.pathId}
                  type="button"
                  style={cleanupItemButtonStyle}
                  title="클릭하면 해당 존으로 이동"
                  onClick={() => onJumpToZone?.(entry.sourceZoneId)}
                >
                  · {entry.label}
                </button>
              ))}
            </div>
          ) : null}
          {preview.removedZones.length > 0 ? (
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "#94a3b8" }}>
                제거될 존 {preview.removedZones.length}
              </span>
              {preview.removedZones.map((entry) => (
                <button
                  key={entry.zoneId}
                  type="button"
                  style={cleanupItemButtonStyle}
                  title="클릭하면 해당 존으로 이동"
                  onClick={() => onJumpToZone?.(entry.zoneId)}
                >
                  · {entry.label}
                </button>
              ))}
            </div>
          ) : null}
          <span style={{ color: "#64748b" }}>
            캔버스에서 빨간 연결선·점선 존이 제거 대상입니다. 항목을 클릭하면
            해당 존으로 이동합니다.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={{
                ...cleanupPanelButtonStyle,
                background: "#dc2626",
                borderColor: "#dc2626",
                color: "#fef2f2",
              }}
              onClick={onApply}
            >
              적용
            </button>
            <button type="button" style={cleanupPanelButtonStyle} onClick={onClose}>
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <span style={{ color: "#94a3b8" }}>정리할 항목이 없습니다.</span>
          <button type="button" style={cleanupPanelButtonStyle} onClick={onClose}>
            닫기
          </button>
        </>
      )}
    </div>
  );
}
