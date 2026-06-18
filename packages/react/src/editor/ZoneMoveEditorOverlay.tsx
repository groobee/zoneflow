import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  findPathSourceZoneId,
  pruneLayoutModel,
  removePath,
  removeZone,
} from "@zoneflow/core";
import type {
  Path,
  PathId,
  Point,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneId,
} from "@zoneflow/core";
import {
  alignPathsByMode,
  alignZonesByMode,
  createPathFromOutputAnchorDrag,
  commitZoneGroupReparentAtCurrentPosition,
  commitZoneReparentAtCurrentPosition,
  distributePathsByMode,
  distributeZonesByMode,
  getMoveEditorTargets,
  moveEditorTargetByScreenDelta,
  resolveGroupZoneDragOrigin,
  resolveMoveEditorDragOrigin,
  resolveMoveEditorObjectSnapGuides,
  resolvePathOutputAnchorScreenRect,
  resolvePathResizeOrigin,
  reorderPathsByZOrderMode,
  reorderZonesByZOrderMode,
  resizeZoneByScreenDelta,
  resizePathNodeByScreenDelta,
  retargetPathFromOutputAnchorDrag,
  resolveInputAnchorTargetZoneId,
  resolveGroupPathDragOrigin,
  resolveZoneReparentCandidate,
  resolveZoneAnchorScreenRect,
  resolveZoneResizeOrigin,
  screenPointToWorldPoint,
  type CanConnectPath,
  type CanConnectPathParams,
  type MoveEditorDragOrigin,
  type MoveEditorTarget,
  type PathResizeOrigin,
  type ZOrderMode,
  type ZoneResizeOrigin,
} from "@zoneflow/editor-dom";
import type {
  CameraState,
  PathComponentMount,
  PathComponentRendererContext,
  PathComponentSlotName,
  RendererExclusionState,
  RendererFrame,
  Rect,
  ResolveZoneShape,
  ZoneComponentMount,
  ZoneComponentRendererContext,
  ZoneComponentSlotName,
} from "@zoneflow/renderer-dom";
import type {
  PathSlotComponentMap,
  ZoneSlotComponentMap,
} from "../slots/slotComponents";
import {
  resolvePermissions,
  type EditorPermissions,
} from "./editorPermissions";
import {
  formatDeleteSelectionLabel,
  formatDeleteTargetLabel,
  getGridToggleLabel,
  getGridSnapToggleLabel,
  getObjectSnapToggleLabel,
  getSelectionCommandLabel,
  getSelectionToolbarCountLabel,
  getTargetBadgeLabel as getTargetBadgeLabelText,
  getTargetMetaStateLabel,
  getZoneflowEditorStrings,
  resolveEditorLocale,
  type SelectionCommandKey,
  type ZoneflowEditorLocale,
} from "./strings";
import {
  resolveEditorTheme,
  type ZoneflowEditorTheme,
  type ZoneflowEditorThemeInput,
} from "./theme";
import type {
  PathEditorRenderProps,
  ZoneEditorRenderProps,
  ZoneOverlayRenderProps,
} from "./editorRenderProps";

/**
 * 선택 툴바에서 종류(정렬 / 분배 / 순서 / 커스텀 / 삭제)별 그룹을 가르는 얇은 세로
 * 구분선. `currentColor` 를 낮은 불투명도로 써서 zone/path 툴바와 테마에 자동으로
 * 맞춰진다. flex wrap 컨테이너 안에서 하나의 아이템으로 동작한다.
 */
function ToolbarDivider() {
  return (
    <span
      aria-hidden="true"
      data-toolbar-divider="true"
      style={{
        alignSelf: "stretch",
        width: 1,
        minHeight: 16,
        margin: "1px 1px",
        background: "currentColor",
        opacity: 0.22,
        flex: "0 0 auto",
      }}
    />
  );
}

/**
 * 선택 툴바의 한 종류 그룹(정렬 / 분배 / 순서 / 커스텀 / 삭제)을 감싸는 nowrap
 * 컨테이너. 바깥 툴바는 flex-wrap 이라 폭이 부족하면 줄바꿈되는데, 각 그룹을 이
 * 래퍼로 묶어두면 그룹 내부 버튼은 쪼개지지 않고 "디바이더(그룹) 경계"에서만
 * 줄바꿈된다. `divider` 를 주면 그룹 맨 앞에 구분선을 붙여, 줄바꿈으로 새 줄에
 * 내려가도 구분선이 그룹과 함께 따라가 고아 구분선이 생기지 않는다.
 */
function ToolbarGroup(props: { divider?: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "nowrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {props.divider ? <ToolbarDivider /> : null}
      {props.children}
    </div>
  );
}

/**
 * 줄바꿈된 선택 툴바에서 "줄 맨 앞"에 오게 된 그룹 선행 구분선을 숨긴다. flex-wrap
 * 만으로는 어느 그룹이 새 줄의 첫 항목인지 CSS 로 알 수 없어, 레이아웃을 측정해
 * 처리한다. (구분선은 그룹 안 선행 요소뿐이라 "줄 끝"에는 오지 않는다.)
 *
 * - 같은 줄 항목은 `alignItems:center` 라 수직 중심(centerY)이 동일하므로, 직전
 *   형제와 centerY 가 다르면 그 그룹은 새 줄의 첫 항목 → 구분선 숨김. (높이가
 *   다른 count 라벨과 버튼 그룹이 섞여도 안전하다.)
 * - `visibility: hidden` 으로 숨겨 박스 크기는 유지 → ResizeObserver 재귀(루프) 없음.
 * - 컨테이너 크기 변화(뷰포트 리사이즈로 인한 재줄바꿈)는 ResizeObserver 로 추적.
 */
function useHideRowStartGroupDividers(
  containerRef: { current: HTMLDivElement | null },
  deps: unknown[]
) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const apply = () => {
      let prevCenter: number | null = null;
      for (const child of Array.from(container.children) as HTMLElement[]) {
        const center = child.offsetTop + child.offsetHeight / 2;
        const divider = child.firstElementChild as HTMLElement | null;
        if (divider?.dataset.toolbarDivider === "true") {
          const isRowStart =
            prevCenter === null || Math.abs(center - prevCenter) > 2;
          divider.style.visibility = isRowStart ? "hidden" : "visible";
        }
        prevCenter = center;
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const ALIGN_COMMANDS = [
  "align-left",
  "align-right",
  "align-top",
  "align-bottom",
  "align-center-horizontal",
  "align-center-vertical",
] as const;
const DISTRIBUTE_COMMANDS = [
  "distribute-horizontal",
  "distribute-vertical",
] as const;
const ZORDER_COMMANDS = [
  "send-to-back",
  "send-backward",
  "bring-forward",
  "bring-to-front",
] as const;

export type PathLabelEventPayload = {
  pathId: PathId;
  sourceZoneId: ZoneId;
  path: Path;
  sourceZone: Zone;
  clientX: number;
  clientY: number;
};

export type CanvasExternalDropPayload = {
  dataTransfer: DataTransfer | null;
  clientX: number;
  clientY: number;
  screenPoint: Point;
  worldPoint: Point;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  frame: RendererFrame | null;
};

export type { CanConnectPath, CanConnectPathParams };

export type EditorTransactionMeta =
  | {
      kind: "move-zone";
      zoneIds: ZoneId[];
    }
  | {
      kind: "move-zone-group";
      zoneIds: ZoneId[];
    }
  | {
      kind: "move-path";
      pathIds: PathId[];
    }
  | {
      kind: "move-path-group";
      pathIds: PathId[];
    }
  | {
      kind: "resize-zone";
      zoneIds: ZoneId[];
    }
  | {
      kind: "resize-path";
      pathIds: PathId[];
    }
  | {
      kind: "create-path";
      sourceZoneId: ZoneId;
    }
  | {
      kind: "retarget-path";
      pathIds: PathId[];
      sourceZoneId: ZoneId;
    };

/**
 * Consumer-injected button for the selection toolbar. The toolbar shows an
 * action only when EVERY selected item passes its `isAvailable` predicate
 * (the common-denominator across the selection); `isAvailable` omitted means
 * "always applicable". `onClick` receives the full selection.
 */
export type ZoneSelectionAction = {
  id: string;
  /** Button content — text or any node (e.g. an icon). */
  label: ReactNode;
  title?: string;
  /** `"danger"` uses the toolbar's danger styling (like delete). */
  variant?: "default" | "danger";
  /** Whether this action applies to a given selected zone. Omit = always. */
  isAvailable?: (zone: Zone) => boolean;
  onClick: (selection: { zoneIds: ZoneId[]; zones: Zone[] }) => void;
};

export type PathSelectionAction = {
  id: string;
  label: ReactNode;
  title?: string;
  variant?: "default" | "danger";
  /** Whether this action applies to a given selected path. Omit = always. */
  isAvailable?: (path: Path, sourceZoneId: ZoneId) => boolean;
  onClick: (selection: {
    pathIds: PathId[];
    paths: { path: Path; sourceZoneId: ZoneId }[];
  }) => void;
};

export type ZoneMoveEditorConfig = {
  enabled?: boolean;
  includeRoot?: boolean;
  gridSnap?: {
    enabled?: boolean;
    size?: number;
  };
  objectSnap?: {
    enabled?: boolean;
    threshold?: number;
  };
  onModelChange?: (nextModel: UniverseModel) => void;
  onLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  /**
   * 존 본문 위에 덮어 그릴 오버레이(버튼·배지·퀵액션 등)를 소비자가 직접 그린다.
   * 라이브러리가 "편집 버튼"을 강제로 그리던 `renderZoneEditButton` 을 대체 —
   * 무엇을 어떻게 그릴지는 전적으로 소비자 몫이다. {@link ZoneOverlayRenderProps}.
   */
  renderZoneOverlays?: (props: ZoneOverlayRenderProps) => ReactNode;
  renderZoneEditor?: (props: ZoneEditorRenderProps) => ReactNode;
  renderPathEditor?: (props: PathEditorRenderProps) => ReactNode;
  onZoneEditClick?: (zoneId: ZoneId) => void;
  onPathLabelClick?: (event: PathLabelEventPayload) => void;
  onPathLabelDoubleClick?: (event: PathLabelEventPayload) => void;
  onPathLabelContextMenu?: (event: PathLabelEventPayload) => void;
  /**
   * zone 선택이 바뀔 때마다 호출됩니다.
   *
   * - 단일 클릭, shift/ctrl/cmd 토글, 마퀴(드래그 박스) 선택 모두 같은 콜백으로 옵니다.
   * - 선택 해제(빈 캔버스 클릭, 편집 모드 종료, 선택된 zone 삭제 등) 시 빈 배열로 호출됩니다.
   * - 선택 내용이 실제로 바뀔 때만 호출됩니다 (같은 zone 재클릭 시 재호출되지 않음).
   * - zone 과 path 선택은 상호 배타라서, zone 선택 시 path 선택이 비워지며
   *   `onPathSelectionChange` 도 빈 배열로 함께 호출될 수 있습니다.
   */
  onZoneSelectionChange?: (zoneIds: ZoneId[]) => void;
  /**
   * path 선택이 바뀔 때마다 호출됩니다. 규칙은 `onZoneSelectionChange` 와 동일합니다.
   */
  onPathSelectionChange?: (pathIds: PathId[]) => void;
  /**
   * 사용자가 리사이즈 핸들을 드래그해 zone 크기를 바꾼 뒤(제스처 종료 시)
   * 한 번 호출됩니다. `from`/`to` 는 각각 드래그 시작·종료 시점의 크기입니다.
   *
   * - 핸들 리사이즈에만 발생합니다. 프로그래매틱 변경
   *   (`editor.resizeZone`)은 앱이 직접 호출하는 동작이므로 여기서 다시
   *   통지하지 않습니다 — 필요하면 호출부에서 처리하세요.
   * - 크기가 실제로 바뀐 경우에만 호출됩니다.
   */
  onZoneResize?: (event: {
    zoneId: ZoneId;
    from: { width: number; height: number };
    to: { width: number; height: number };
  }) => void;
  /**
   * 존 선택 시 정렬/삭제 툴바에 함께 노출할 커스텀 버튼들. 선택된 모든 존이
   * `isAvailable` 를 통과한 액션만(= 공통으로 쓸 수 있는 것만) 표시됩니다.
   */
  zoneSelectionActions?: ZoneSelectionAction[];
  /**
   * 패스 선택 시 툴바에 노출할 커스텀 버튼들. 규칙은 zone 과 동일 —
   * 선택된 모든 패스가 `isAvailable` 를 통과한 액션만 표시됩니다.
   */
  pathSelectionActions?: PathSelectionAction[];
  /**
   * 외부에서 zone 간 path 연결 가능 여부를 검증하는 콜백.
   *
   * - 미지정 시 기본 동작: 모든 연결 허용 (기존 동작과 동일).
   * - hover 단계: `false` 반환 시 해당 zone 이 drop target 후보에서 제외됨 — 사용자에게 즉시 시각 피드백.
   * - drop 단계: `false` 반환 시 path 의 target 이 `null` 로 강등됨 (path 노드는 만들어지되 dangling).
   *
   * 도메인 룰(zoneType 호환성, cycle 방지, 중복 차단 등) 을 외부에서 결정할 때 사용.
   * pointermove 마다 호출되므로 동기적이고 가벼워야 함.
   */
  canConnectPath?: CanConnectPath;
  onTransactionStart?: (transaction: EditorTransactionMeta) => void;
  onTransactionCommit?: (transaction: EditorTransactionMeta) => void;
  onTransactionCancel?: (transaction: EditorTransactionMeta) => void;
  history?: {
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
  };
  overlayControls?: {
    enabled?: boolean;
    showHistory?: boolean;
    showDelete?: boolean;
    showGridToggle?: boolean;
    showGridSnapToggle?: boolean;
    showObjectSnapToggle?: boolean;
    showSnapToggle?: boolean;
    showFitToView?: boolean;
    showZoomControls?: boolean;
    showZoomValue?: boolean;
    gridVisible?: boolean;
    onToggleGridVisible?: () => void;
    gridSnapEnabled?: boolean;
    objectSnapEnabled?: boolean;
    onToggleGridSnap?: () => void;
    onToggleObjectSnap?: () => void;
    snapEnabled?: boolean;
    onToggleSnap?: () => void;
    onFitToView?: () => void;
    zoom?: number;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
  };
  externalDrop?: {
    enabled?: boolean;
    onDrop: (event: CanvasExternalDropPayload) => void;
  };
  /**
   * Zone outlet 에서 새 path 를 만들어낸 직후에 호출됩니다.
   *
   * 외부에서 path 의 옵션 (rule type, name, payload 등) 을 즉석에서 설정할 수 있게 합니다.
   * 콜백은 새로 만들어진 `pathId` 와 함께 path 가 들어간 `model` / `layoutModel` 을 받고,
   * 추가로 변경한 `model` / `layoutModel` 을 반환하면 editor 가 그 결과를 path 생성과
   * 한 commit 으로 함께 적용합니다 (undo 도 한 단계).
   *
   * - 반환값이 `null/undefined/void` 이면 path 만 만들어진 상태 그대로 commit (기존 동작).
   * - target 이 없는 dangling path 에도 동일하게 호출됩니다 (`targetZoneId === null`).
   * - sync 호출이므로 prompt 같은 즉시 UI 가 자연스럽고, 비동기 modal 이 필요하면
   *   콜백에서는 commit 만 두고 modal 이 닫힌 뒤 별도 setModel 로 후속 mutation 하는 패턴을
   *   권장합니다.
   */
  onPathCreated?: (params: {
    pathId: PathId;
    sourceZoneId: ZoneId;
    targetZoneId: ZoneId | null;
    model: UniverseModel;
    layoutModel: UniverseLayoutModel;
  }) =>
    | {
        model?: UniverseModel;
        layoutModel?: UniverseLayoutModel;
      }
    | null
    | undefined
    | void;
  /**
   * 기존 path 의 output anchor 를 끌어 zone 위가 아닌 빈 공간에 드롭했을 때 호출됩니다.
   * (zone outlet 에서 새 path 를 만드는 흐름에서는 호출되지 않습니다 — 그 경우는 기존
   * 동작대로 dangling path 가 생성됩니다.)
   *
   * 외부에서 새 zone 을 생성한 뒤, 생성된 zone 의 id 와 함께 변경된 model/layoutModel 을
   * 반환하면 editor 가 그 zone 을 path 의 target 으로 자동 연결합니다.
   *
   * - 반환값이 `null/undefined/void` 이면 dangling path 로 처리 (기존 동작).
   * - 반환된 `model` / `layoutModel` 은 path 연결까지 한 commit 에 적용됩니다.
   */
  onPathDropOnEmptySpace?: (params: {
    sourceZoneId: ZoneId;
    pathId: PathId;
    worldPoint: Point;
    screenPoint: Point;
    model: UniverseModel;
    layoutModel: UniverseLayoutModel;
  }) =>
    | {
        model: UniverseModel;
        layoutModel: UniverseLayoutModel;
        targetZoneId: ZoneId;
      }
    | null
    | undefined
    | void;
  /**
   * 에디터에서 허용할 동작을 세분화 제어합니다. 미지정 시 전부 허용(기존 동작과 동일).
   * 자주 쓰는 조합은 `editorPermissionPresets` 를 넣으세요.
   */
  permissions?: Partial<EditorPermissions>;
  /**
   * 타깃 위에 뜨는 메타 표기를 제어합니다.
   *
   * - `badgeVisibility`: 좌상단 종류 배지의 표시 시점.
   *   - `"always"` : 편집 모드에서 항상 노출
   *   - `"selected"` : 선택/드래그 중일 때만 노출 (기본값)
   *   - `"hidden"` : 항상 숨김
   * - `resolveBadgeLabel`: 배지 라벨을 타깃별로 커스터마이즈. 예) 발송존 → "SEND",
   *   분기존 → "BRANCH". 문자열을 반환하면 그 라벨을, `null` 을 반환하면 그 타깃의
   *   배지만 숨기고, `undefined` 를 반환하면 기본 라벨(ZONE / PATH)을 씁니다.
   * - `showStateChip`: 우하단의 상태 표기(DRAG / MOVING / RESIZE). 기본 `false`(숨김).
   *
   * 미지정 시 종류 배지는 선택 시 기본 라벨로 노출되고 상태 표기는 숨겨집니다.
   */
  targetMeta?: {
    badgeVisibility?: "always" | "selected" | "hidden";
    resolveBadgeLabel?: (params: {
      kind: "zone" | "path";
      zone?: Zone;
      path?: Path;
      zoneId?: ZoneId;
      pathId?: PathId;
      model: UniverseModel;
      locale: ZoneflowEditorLocale;
      defaultLabel: string;
    }) => string | null | undefined;
    showStateChip?: boolean;
  };
  deleteInteraction?: {
    animation?: boolean;
    confirm?: boolean;
    longPressMs?: number;
    undoMs?: number;
  };
  theme?: ZoneflowEditorThemeInput;
};

type DragState = {
  target: MoveEditorTarget;
  origin: MoveEditorDragOrigin;
  startClientX: number;
  startClientY: number;
  hasMoved: boolean;
};

type ResizeState = {
  target: Extract<MoveEditorTarget, { kind: "zone" }>;
  origin: ZoneResizeOrigin;
  startClientX: number;
  startClientY: number;
};

type PathResizeState = {
  target: Extract<MoveEditorTarget, { kind: "path" }>;
  origin: PathResizeOrigin;
  startClientX: number;
  startClientY: number;
};

type PathCreateDragState = {
  sourceZoneId: ZoneId;
  startClientX: number;
  startClientY: number;
  currentScreenPoint: { x: number; y: number };
  hasMoved: boolean;
};

type PathRetargetDragState = {
  pathId: PathId;
  sourceZoneId: ZoneId;
  startClientX: number;
  startClientY: number;
  currentScreenPoint: { x: number; y: number };
  hasMoved: boolean;
};

type CornerHandleRect = {
  size: number;
  x: number;
  y: number;
};

type LongPressState = {
  target: MoveEditorTarget;
  startClientX: number;
  startClientY: number;
};

type DeleteConfirmState = {
  kind: "target";
  target: MoveEditorTarget;
} | {
  kind: "zone-selection";
  zoneIds: ZoneId[];
} | {
  kind: "path-selection";
  pathIds: PathId[];
};

type DeleteUndoState = {
  targetKey: string;
  label: string;
};

type MarqueeSelectionState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  appendToSelection: boolean;
};

type ObjectSnapGuideLineState = {
  x?: number;
  y?: number;
};

type PreviewHostProps = {
  frame: RendererFrame;
  camera: CameraState;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  target: MoveEditorTarget;
  editorTheme: ZoneflowEditorTheme;
  editorStrings: ReturnType<typeof getZoneflowEditorStrings>;
  zoneComponents?: ZoneSlotComponentMap;
  pathComponents?: PathSlotComponentMap;
};

type TargetVisualState = "idle" | "hover" | "selected" | "dragging";

const previewHostBaseStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  boxSizing: "border-box",
  opacity: 1,
};

const DRAG_START_DISTANCE = 4;
const DELETE_LONG_PRESS_MS = 520;
const DELETE_UNDO_MS = 5000;
const DELETE_SHAKE_ANIMATION = "zoneflow-delete-shake 180ms ease-in-out infinite alternate";
const DELETE_ICON_POP_ANIMATION = "zoneflow-delete-pop 160ms ease-out";
const DELETE_TOAST_IN_ANIMATION = "zoneflow-delete-toast-in 180ms ease-out";
const OVERLAY_Z_INDEX = {
  // Overlay container's stacking position relative to the page (canvas, slot
  // portals). Everything below is a child *inside* this container and only
  // competes with the other children, ordered here bottom → top.
  root: 30,
  pathStatusBadge: 2,
  toast: 12,
  floatingToolbar: 24,
  hud: 28,
  // Confirmation dialogs sit above the floating (alignment) toolbar and HUD —
  // the delete-confirm popped from the alignment toolbar must never hide
  // behind the toolbar that triggered it.
  itemDialog: 32,
  selectionDialog: 33,
} as const;
const HELP_PANEL_STORAGE_KEY = "zoneflow:editor-help-panel";

function createPreviewHost(): HTMLElement {
  return typeof document === "undefined"
    ? ({} as HTMLElement)
    : document.createElement("div");
}

function toScreenRect(rect: Rect, camera: CameraState): Rect {
  return {
    x: camera.x + rect.x * camera.zoom,
    y: camera.y + rect.y * camera.zoom,
    width: rect.width * camera.zoom,
    height: rect.height * camera.zoom,
  };
}

function toLocalRect(ownerRect: Rect, childRect: Rect): Rect {
  return {
    x: childRect.x - ownerRect.x,
    y: childRect.y - ownerRect.y,
    width: childRect.width,
    height: childRect.height,
  };
}

function getCornerResizeHandleRect(rect: Rect): CornerHandleRect {
  const size = Math.min(18, Math.max(14, Math.min(rect.width, rect.height) * 0.22));

  return {
    size,
    x: rect.width - size / 2,
    y: rect.height - size / 2,
  };
}

function resolveDeleteButtonPosition(target: MoveEditorTarget) {
  return target.kind === "zone"
    ? { x: target.rect.width - 24, y: -14 }
    : { x: target.rect.width - 22, y: -12 };
}

function resolveDragTransactionMeta(drag: DragState): EditorTransactionMeta {
  if (drag.origin.kind === "zone-group") {
    return {
      kind: "move-zone-group",
      zoneIds: Object.keys(drag.origin.originsByZoneId) as ZoneId[],
    };
  }

  if (drag.origin.kind === "path-group") {
    return {
      kind: "move-path-group",
      pathIds: Object.keys(drag.origin.originsByPathId) as PathId[],
    };
  }

  return drag.target.kind === "zone"
    ? {
        kind: "move-zone",
        zoneIds: [drag.target.zoneId],
      }
    : {
        kind: "move-path",
        pathIds: [drag.target.pathId],
      };
}

function collectTopLevelSelectedZoneIds(
  model: UniverseModel,
  zoneIds: ZoneId[]
): ZoneId[] {
  const selectedSet = new Set(zoneIds);

  return zoneIds.filter((zoneId) => {
    let currentParentId = model.zonesById[zoneId]?.parentZoneId ?? null;

    while (currentParentId) {
      if (selectedSet.has(currentParentId)) {
        return false;
      }

      currentParentId = model.zonesById[currentParentId]?.parentZoneId ?? null;
    }

    return true;
  });
}

function resolvePathLabelEventPayload(params: {
  model: UniverseModel;
  pathId: PathId;
  clientX: number;
  clientY: number;
}): PathLabelEventPayload | null {
  const { model, pathId, clientX, clientY } = params;
  const sourceZoneId = findPathSourceZoneId(model, pathId);
  if (!sourceZoneId) return null;

  const sourceZone = model.zonesById[sourceZoneId];
  const path = sourceZone?.pathsById[pathId];
  if (!sourceZone || !path) return null;

  return {
    pathId,
    sourceZoneId,
    path,
    sourceZone,
    clientX,
    clientY,
  };
}

function toCanvasScreenPoint(
  host: HTMLDivElement | null,
  clientX: number,
  clientY: number
) {
  const bounds = host?.getBoundingClientRect();
  return {
    x: clientX - (bounds?.left ?? 0),
    y: clientY - (bounds?.top ?? 0),
  };
}

function getScreenDistance(params: {
  startClientX: number;
  startClientY: number;
  nextClientX: number;
  nextClientY: number;
}) {
  const { startClientX, startClientY, nextClientX, nextClientY } = params;
  return Math.hypot(nextClientX - startClientX, nextClientY - startClientY);
}

function getExclusionState(target: MoveEditorTarget): RendererExclusionState {
  if (target.kind === "zone") {
    return {
      excludedZoneIds: [target.zoneId],
    };
  }

  return {
    excludedPathIds: [target.pathId],
  };
}

function getTargetVisualState(params: {
  target: MoveEditorTarget;
  hoveredTargetKey: string | null;
  isSelected: boolean;
  draggingTargetKey: string | null;
}): TargetVisualState {
  const { target, hoveredTargetKey, isSelected, draggingTargetKey } = params;

  if (draggingTargetKey === target.key) return "dragging";
  if (isSelected) return "selected";
  if (hoveredTargetKey === target.key) return "hover";
  return "idle";
}

function getTargetOutlineStyle(
  target: MoveEditorTarget,
  visualState: TargetVisualState,
  editorTheme: ZoneflowEditorTheme
): CSSProperties {
  const isZone = target.kind === "zone";
  const tone = editorTheme.targetOutline[visualState];

  return {
    border: tone.border,
    background: tone.background,
    boxShadow: tone.boxShadow,
    borderRadius: isZone ? 18 : 14,
  };
}

function getTargetBadgeStyle(
  visualState: TargetVisualState,
  editorTheme: ZoneflowEditorTheme
): CSSProperties {
  const tone = editorTheme.targetBadge[visualState];
  return {
    background: tone.background,
    color: tone.color,
  };
}

function shouldShowTargetMeta(visualState: TargetVisualState): boolean {
  return visualState === "selected" || visualState === "dragging";
}

function toggleZoneSelection(zoneIds: ZoneId[], zoneId: ZoneId): ZoneId[] {
  return zoneIds.includes(zoneId)
    ? zoneIds.filter((current) => current !== zoneId)
    : [...zoneIds, zoneId];
}

function togglePathSelection(pathIds: PathId[], pathId: PathId): PathId[] {
  return pathIds.includes(pathId)
    ? pathIds.filter((current) => current !== pathId)
    : [...pathIds, pathId];
}

function areIdListsEqual<Id extends string>(left: Id[], right: Id[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeMarqueeRect(selection: MarqueeSelectionState): Rect {
  const x = Math.min(selection.startX, selection.currentX);
  const y = Math.min(selection.startY, selection.currentY);
  return {
    x,
    y,
    width: Math.abs(selection.currentX - selection.startX),
    height: Math.abs(selection.currentY - selection.startY),
  };
}

function intersectsRect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function renderZoneFallback(
  slot: ZoneComponentSlotName,
  context: ZoneComponentRendererContext
) {
  switch (slot) {
    case "title":
      return (
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: context.theme.zoneTitle,
          }}
        >
          {context.zone.name}
        </div>
      );
    case "type":
      return (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: context.theme.zoneSubtext,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {context.zone.zoneType}
        </div>
      );
    case "badge":
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            background: context.theme.zoneBadgeBg,
            color: context.theme.selection,
            fontSize: 11,
            fontWeight: 700,
            boxSizing: "border-box",
          }}
        >
          {context.zone.action?.type ?? "group"}
        </div>
      );
    case "body":
      return (
        <div
          style={{
            fontSize: 11,
            color: context.theme.zoneSubtext,
            lineHeight: 1.45,
          }}
        >
          {context.zone.childZoneIds.length} child zones
        </div>
      );
    case "footer":
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: context.theme.zoneSubtext,
            fontWeight: 600,
          }}
        >
          <span>{context.visibility.emphasis}</span>
          <span>{context.density}</span>
        </div>
      );
  }
}

function resolvePathTargetDisplay(context: PathComponentRendererContext) {
  const targetZoneId = context.pathVisual.targetZoneId;
  if (!targetZoneId) {
    return {
      label: "—",
      status: "unconfigured" as const,
    };
  }

  const targetZone = context.model.zonesById[targetZoneId];
  if (!targetZone) {
    return {
      label: "—",
      status: "missing" as const,
    };
  }

  return {
    label: targetZone.name,
    status: "resolved" as const,
  };
}

function renderPathStatusBadge(
  status: "unconfigured" | "missing",
  editorTheme: ZoneflowEditorTheme,
  strings: ReturnType<typeof getZoneflowEditorStrings>
) {
  const isMissing = status === "missing";
  const tone = isMissing
    ? editorTheme.preview.status.warning
    : editorTheme.preview.status.info;

  return (
    <div
      title={isMissing ? strings.pathStatus.brokenTarget : strings.pathStatus.targetNotSet}
      aria-label={
        isMissing ? strings.pathStatus.brokenTarget : strings.pathStatus.targetNotSet
      }
      style={{
        position: "absolute",
        right: 10,
        top: 10,
        width: 22,
        height: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        border: tone.border,
        background: tone.background,
        color: tone.color,
        boxShadow: tone.shadow,
        fontSize: 12,
        lineHeight: 1,
        fontWeight: 700,
        pointerEvents: "none",
        zIndex: OVERLAY_Z_INDEX.pathStatusBadge,
      }}
    >
      {isMissing ? "⚠" : "?"}
    </div>
  );
}

function renderPathFallback(
  slot: PathComponentSlotName,
  context: PathComponentRendererContext
) {
  const targetDisplay = resolvePathTargetDisplay(context);

  switch (slot) {
    case "label":
      return (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: context.theme.pathLabel,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {context.path.name.trim() || "Empty"}
        </div>
      );
    case "rule":
      return (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: context.theme.pathInboundEdge,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {context.path.rule?.type ?? "Empty"}
        </div>
      );
    case "target":
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color:
              targetDisplay.status === "missing"
                ? context.theme.status.warning.color
                : targetDisplay.status === "unconfigured"
                  ? context.theme.status.info.color
                  : context.theme.zoneSubtext,
            fontWeight: targetDisplay.status === "resolved" ? 600 : 700,
          }}
        >
          <span>next</span>
          <span>{targetDisplay.label}</span>
        </div>
      );
    case "body":
      return (
        <div
          style={{
            fontSize: 11,
            color: context.theme.zoneSubtext,
            lineHeight: 1.4,
          }}
        >
          {context.path.rule
            ? context.path.rule.payload
              ? JSON.stringify(context.path.rule.payload)
              : "No payload"
            : "No rule configured"}
        </div>
      );
  }
}

function renderZonePreview(props: PreviewHostProps) {
  const {
    frame,
    camera,
    model,
    layoutModel,
    target,
    editorTheme,
    zoneComponents,
  } = props;

  if (target.kind !== "zone") return null;

  const zoneVisual = frame.pipeline.graphLayout.zonesById[target.zoneId];
  const componentLayout = frame.pipeline.componentLayout.zonesById[target.zoneId];
  const visibility = frame.pipeline.visibility.zoneVisibilityById[target.zoneId];
  const density = frame.pipeline.density.zoneDensityById[target.zoneId];
  if (!zoneVisual || !componentLayout || !visibility || !density) return null;

  const worldRect = zoneVisual.rect;
  const context: ZoneComponentRendererContext = {
    model,
    layoutModel,
    zone: zoneVisual.zone,
    zoneVisual,
    density,
    visibility,
    componentLayout,
    camera,
    theme: editorTheme.preview,
    textScale: "md",
  };

  return (
    <div
      style={{
        ...previewHostBaseStyle,
        background: editorTheme.previewHost.background,
        boxShadow: editorTheme.previewHost.shadow,
        left: `${worldRect.x}px`,
        top: `${worldRect.y}px`,
        width: `${worldRect.width}px`,
        height: `${worldRect.height}px`,
        borderRadius: zoneVisual.zone.zoneType === "action" ? 18 : 22,
        border: `1px solid ${
          zoneVisual.zone.zoneType === "action"
            ? editorTheme.preview.zoneActionBorder
            : editorTheme.preview.zoneContainerBorder
        }`,
        overflow: "hidden",
      }}
    >
      {(Object.keys(componentLayout.slots) as ZoneComponentSlotName[]).map(
        (slot) => {
          const slotRect = componentLayout.slots[slot];
          if (!slotRect) return null;

          const localRect = toLocalRect(worldRect, slotRect);
          const Component = zoneComponents?.[slot];
          const mount: ZoneComponentMount = {
            key: `editor-preview:${target.zoneId}:${slot}`,
            zoneId: target.zoneId,
            slot,
            host: createPreviewHost(),
            rect: slotRect,
            context,
          };

          return (
            <div
              key={mount.key}
              style={{
                position: "absolute",
                left: `${localRect.x}px`,
                top: `${localRect.y}px`,
                width: `${localRect.width}px`,
                height: `${localRect.height}px`,
                boxSizing: "border-box",
                fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
              }}
            >
              {Component ? (
                <Component mount={mount} />
              ) : (
                renderZoneFallback(slot, context)
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

function renderPathPreview(props: PreviewHostProps) {
  const {
    frame,
    camera,
    model,
    layoutModel,
    target,
    editorTheme,
    editorStrings,
    pathComponents,
  } = props;

  if (target.kind !== "path") return null;

  const pathVisual = frame.pipeline.graphLayout.pathsById[target.pathId];
  const componentLayout = frame.pipeline.componentLayout.pathsById[target.pathId];
  const visibility = frame.pipeline.visibility.pathVisibilityById[target.pathId];
  const density = frame.pipeline.density.pathDensityById[target.pathId];
  if (!pathVisual?.rect || !componentLayout || !visibility || !density) {
    return null;
  }

  const worldRect = pathVisual.rect;
  const context: PathComponentRendererContext = {
    model,
    layoutModel,
    path: pathVisual.path,
    pathVisual,
    density,
    visibility,
    componentLayout,
    camera,
    theme: editorTheme.preview,
    textScale: "md",
  };
  const targetDisplay = resolvePathTargetDisplay(context);

  return (
    <div
      style={{
        ...previewHostBaseStyle,
        background: editorTheme.previewHost.background,
        boxShadow: editorTheme.previewHost.shadow,
        left: `${worldRect.x}px`,
        top: `${worldRect.y}px`,
        width: `${worldRect.width}px`,
        height: `${worldRect.height}px`,
        borderRadius: 16,
        border: `1px solid ${editorTheme.preview.pathEdge}`,
        overflow: "hidden",
      }}
    >
      {targetDisplay.status !== "resolved"
        ? renderPathStatusBadge(targetDisplay.status, editorTheme, editorStrings)
        : null}
      {(Object.keys(componentLayout.slots) as PathComponentSlotName[]).map(
        (slot) => {
          const slotRect = componentLayout.slots[slot];
          if (!slotRect) return null;

          const localRect = toLocalRect(worldRect, slotRect);
          const Component = pathComponents?.[slot];
          const mount: PathComponentMount = {
            key: `editor-preview:${target.pathId}:${slot}`,
            pathId: target.pathId,
            slot,
            host: createPreviewHost(),
            rect: slotRect,
            context,
          };

          return (
            <div
              key={mount.key}
              style={{
                position: "absolute",
                left: `${localRect.x}px`,
                top: `${localRect.y}px`,
                width: `${localRect.width}px`,
                height: `${localRect.height}px`,
                boxSizing: "border-box",
                fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
              }}
            >
              {Component ? (
                <Component mount={mount} />
              ) : (
                renderPathFallback(slot, context)
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

export function ZoneMoveEditorOverlay(props: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  frame: RendererFrame | null;
  zoneComponents?: ZoneSlotComponentMap;
  pathComponents?: PathSlotComponentMap;
  editor?: ZoneMoveEditorConfig;
  resolveZoneShape?: ResolveZoneShape;
  onExclusionStateChange?: (next: RendererExclusionState | undefined) => void;
}) {
  const {
    model,
    layoutModel,
    camera,
    frame,
    zoneComponents,
    pathComponents,
    editor,
    resolveZoneShape,
    onExclusionStateChange,
  } = props;
  const permissions = useMemo(
    () => resolvePermissions(editor?.permissions),
    [editor?.permissions]
  );
  const resolvedEditorTheme = useMemo(
    () => resolveEditorTheme(editor?.theme),
    [editor?.theme]
  );
  const hudButtonStyle = useMemo<CSSProperties>(
    () => ({
      border: resolvedEditorTheme.hud.buttonBorder,
      borderRadius: 10,
      background: resolvedEditorTheme.hud.buttonBackground,
      color: resolvedEditorTheme.hud.buttonText,
      minHeight: 34,
      padding: "8px 10px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
    }),
    [resolvedEditorTheme]
  );
  const hudActiveButtonStyle = useMemo<CSSProperties>(
    () => ({
      background: resolvedEditorTheme.hud.buttonActiveBackground,
      border: resolvedEditorTheme.hud.buttonActiveBorder,
      color: resolvedEditorTheme.hud.buttonActiveText,
    }),
    [resolvedEditorTheme]
  );
  const floatingToolbarButtonStyle = useMemo<CSSProperties>(
    () => ({
      border: resolvedEditorTheme.overlay.floatingToolbar.buttonBorder,
      background: resolvedEditorTheme.overlay.floatingToolbar.buttonBackground,
      color: resolvedEditorTheme.overlay.floatingToolbar.buttonText,
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 11,
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }),
    [resolvedEditorTheme]
  );
  const floatingToolbarDangerButtonStyle = useMemo<CSSProperties>(
    () => ({
      ...floatingToolbarButtonStyle,
      border: resolvedEditorTheme.overlay.floatingToolbar.dangerButtonBorder,
      background: resolvedEditorTheme.overlay.floatingToolbar.dangerButtonBackground,
      color: resolvedEditorTheme.overlay.floatingToolbar.dangerButtonText,
      fontWeight: 800,
    }),
    [floatingToolbarButtonStyle, resolvedEditorTheme]
  );
  const dialogSecondaryButtonStyle = useMemo<CSSProperties>(
    () => ({
      border: resolvedEditorTheme.overlay.dialog.secondaryButton.border,
      background: resolvedEditorTheme.overlay.dialog.secondaryButton.background,
      color: resolvedEditorTheme.overlay.dialog.secondaryButton.color,
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 11,
      fontWeight: 700,
      cursor: "pointer",
    }),
    [resolvedEditorTheme]
  );
  const dialogDangerButtonStyle = useMemo<CSSProperties>(
    () => ({
      border: resolvedEditorTheme.overlay.dialog.dangerButton.border,
      background: resolvedEditorTheme.overlay.dialog.dangerButton.background,
      color: resolvedEditorTheme.overlay.dialog.dangerButton.color,
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 11,
      fontWeight: 800,
      cursor: "pointer",
    }),
    [resolvedEditorTheme]
  );
  const editorLocale = useMemo(resolveEditorLocale, []);
  const editorStrings = useMemo(
    () => getZoneflowEditorStrings(editorLocale),
    [editorLocale]
  );
  const [isHelpPanelExpanded, setIsHelpPanelExpanded] = useState(() => {
    if (typeof window === "undefined") return true;

    try {
      return window.localStorage.getItem(HELP_PANEL_STORAGE_KEY) !== "collapsed";
    } catch {
      return true;
    }
  });

  const [draggingTarget, setDraggingTarget] = useState<MoveEditorTarget | null>(null);
  const [draggingZoneGroupIds, setDraggingZoneGroupIds] = useState<ZoneId[]>([]);
  const [draggingPathGroupIds, setDraggingPathGroupIds] = useState<PathId[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredTargetKey, setHoveredTargetKey] = useState<string | null>(null);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<ZoneId[]>([]);
  const [selectedPathIds, setSelectedPathIds] = useState<PathId[]>([]);
  const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelectionState | null>(null);
  const [deleteArmedTargetKey, setDeleteArmedTargetKey] = useState<string | null>(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState | null>(null);
  const [deleteUndoState, setDeleteUndoState] = useState<DeleteUndoState | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<ZoneId | null>(null);
  const [editingPathState, setEditingPathState] = useState<{
    pathId: PathId;
    sourceZoneId: ZoneId;
  } | null>(null);
  const [creatingPath, setCreatingPath] = useState<PathCreateDragState | null>(null);
  const [pathCreateTargetZoneId, setPathCreateTargetZoneId] = useState<ZoneId | null>(null);
  const [retargetingPath, setRetargetingPath] = useState<PathRetargetDragState | null>(null);
  const [retargetPathTargetZoneId, setRetargetPathTargetZoneId] = useState<ZoneId | null>(null);
  const [objectSnapGuideLines, setObjectSnapGuideLines] =
    useState<ObjectSnapGuideLineState | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const zoneToolbarRef = useRef<HTMLDivElement | null>(null);
  const pathToolbarRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const pathResizeRef = useRef<PathResizeState | null>(null);
  const pathCreateRef = useRef<PathCreateDragState | null>(null);
  const pathRetargetRef = useRef<PathRetargetDragState | null>(null);
  const marqueeSelectionRef = useRef<MarqueeSelectionState | null>(null);
  const selectedZoneIdsRef = useRef<ZoneId[]>([]);
  const selectedPathIdsRef = useRef<PathId[]>([]);
  const notifiedZoneSelectionRef = useRef<ZoneId[]>([]);
  const notifiedPathSelectionRef = useRef<PathId[]>([]);
  const longPressRef = useRef<LongPressState | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const deleteUndoTimerRef = useRef<number | null>(null);
  const activeTransactionRef = useRef<EditorTransactionMeta | null>(null);
  const suppressedPathLabelClickRef = useRef<{
    targetKey: string | null;
    until: number;
  }>({
    targetKey: null,
    until: 0,
  });
  const latestRef = useRef({
    model,
    layoutModel,
    camera,
    frame,
    permissions,
    includeRoot: editor?.includeRoot,
    gridSnap: editor?.gridSnap,
    objectSnap: editor?.objectSnap,
    onModelChange: editor?.onModelChange,
    onLayoutModelChange: editor?.onLayoutModelChange,
    onTransactionStart: editor?.onTransactionStart,
    onTransactionCommit: editor?.onTransactionCommit,
    onTransactionCancel: editor?.onTransactionCancel,
    canConnectPath: editor?.canConnectPath,
    onPathCreated: editor?.onPathCreated,
    onPathDropOnEmptySpace: editor?.onPathDropOnEmptySpace,
    onZoneSelectionChange: editor?.onZoneSelectionChange,
    onPathSelectionChange: editor?.onPathSelectionChange,
    onZoneResize: editor?.onZoneResize,
    resolveZoneShape,
    onExclusionStateChange,
  });

  useEffect(() => {
    latestRef.current = {
      model,
      layoutModel,
      camera,
      frame,
      permissions,
      includeRoot: editor?.includeRoot,
      gridSnap: editor?.gridSnap,
      objectSnap: editor?.objectSnap,
      onModelChange: editor?.onModelChange,
      onLayoutModelChange: editor?.onLayoutModelChange,
      onTransactionStart: editor?.onTransactionStart,
      onTransactionCommit: editor?.onTransactionCommit,
      onTransactionCancel: editor?.onTransactionCancel,
      canConnectPath: editor?.canConnectPath,
      onPathCreated: editor?.onPathCreated,
      onPathDropOnEmptySpace: editor?.onPathDropOnEmptySpace,
      onZoneSelectionChange: editor?.onZoneSelectionChange,
      onPathSelectionChange: editor?.onPathSelectionChange,
    onZoneResize: editor?.onZoneResize,
      resolveZoneShape,
      onExclusionStateChange,
    };
  }, [
    model,
    layoutModel,
    camera,
    frame,
    editor,
    resolveZoneShape,
    onExclusionStateChange,
  ]);

  useEffect(() => {
    selectedZoneIdsRef.current = selectedZoneIds;
  }, [selectedZoneIds]);

  useEffect(() => {
    selectedPathIdsRef.current = selectedPathIds;
  }, [selectedPathIds]);

  // state 배열의 identity 가 아니라 내용이 바뀔 때만 외부에 알린다 —
  // 같은 선택을 유지한 채 새 배열로 set 되는 경로(모델 prune, 재클릭 등)가 많다.
  useEffect(() => {
    if (areIdListsEqual(notifiedZoneSelectionRef.current, selectedZoneIds)) {
      return;
    }
    notifiedZoneSelectionRef.current = selectedZoneIds;
    latestRef.current.onZoneSelectionChange?.([...selectedZoneIds]);
  }, [selectedZoneIds]);

  useEffect(() => {
    if (areIdListsEqual(notifiedPathSelectionRef.current, selectedPathIds)) {
      return;
    }
    notifiedPathSelectionRef.current = selectedPathIds;
    latestRef.current.onPathSelectionChange?.([...selectedPathIds]);
  }, [selectedPathIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        HELP_PANEL_STORAGE_KEY,
        isHelpPanelExpanded ? "expanded" : "collapsed"
      );
    } catch {
      // ignore storage failures
    }
  }, [isHelpPanelExpanded]);

  useEffect(() => {
    if (editor?.enabled) return;
    cancelTransaction();
    dragRef.current = null;
    resizeRef.current = null;
    pathResizeRef.current = null;
    pathCreateRef.current = null;
    pathRetargetRef.current = null;
    marqueeSelectionRef.current = null;
    setDraggingTarget(null);
    setDraggingZoneGroupIds([]);
    setDraggingPathGroupIds([]);
    setIsResizing(false);
    setCreatingPath(null);
    setPathCreateTargetZoneId(null);
    setRetargetingPath(null);
    setRetargetPathTargetZoneId(null);
    setObjectSnapGuideLines(null);
    setHoveredTargetKey(null);
    setSelectedTargetKey(null);
    setSelectedZoneIds([]);
    setSelectedPathIds([]);
    setMarqueeSelection(null);
    setDeleteArmedTargetKey(null);
    setDeleteConfirmState(null);
    setDeleteUndoState(null);
    setEditingZoneId(null);
    setEditingPathState(null);
    onExclusionStateChange?.(undefined);
  }, [editor?.enabled, onExclusionStateChange]);

  useEffect(() => {
    return () => {
      if (deleteUndoTimerRef.current !== null) {
        window.clearTimeout(deleteUndoTimerRef.current);
      }
      cancelTransaction();
    };
  }, []);

  useEffect(() => {
    if (!editingZoneId) return;
    if (model.zonesById[editingZoneId]) return;
    setEditingZoneId(null);
  }, [editingZoneId, model]);

  useEffect(() => {
    if (!editingPathState) return;
    const sourceZoneId = findPathSourceZoneId(model, editingPathState.pathId);
    if (sourceZoneId && sourceZoneId === editingPathState.sourceZoneId) return;
    setEditingPathState(null);
  }, [editingPathState, model]);

  useEffect(() => {
    if (!deleteUndoState) return;
    if (editor?.history?.canUndo ?? false) return;
    clearDeleteUndoTimer();
    setDeleteUndoState(null);
  }, [deleteUndoState, editor?.history?.canUndo]);

  useEffect(() => {
    setSelectedZoneIds((current) =>
      current.filter((zoneId) => Boolean(model.zonesById[zoneId]))
    );
  }, [model]);

  useEffect(() => {
    setSelectedPathIds((current) =>
      current.filter((pathId) => Boolean(frame?.pipeline.graphLayout.pathsById[pathId]))
    );
  }, [frame]);

  const isPathLabelClickSuppressed = (targetKey: string) => {
    const current = suppressedPathLabelClickRef.current;
    return current.targetKey === targetKey && Date.now() < current.until;
  };

  const shouldAnimateDeleteUi = editor?.deleteInteraction?.animation ?? true;
  const deleteLongPressMs =
    editor?.deleteInteraction?.longPressMs ?? DELETE_LONG_PRESS_MS;
  const deleteUndoMs = editor?.deleteInteraction?.undoMs ?? DELETE_UNDO_MS;
  const shouldConfirmDelete = editor?.deleteInteraction?.confirm ?? true;
  const overlayControlsEnabled = editor?.overlayControls?.enabled ?? false;
  const overlayControls = editor?.overlayControls;
  // 종류 배지는 기본 "선택 시" 노출, 상태 표기(DRAG/MOVING/RESIZE)는 기본 숨김.
  const targetBadgeVisibility = editor?.targetMeta?.badgeVisibility ?? "selected";
  const resolveTargetBadgeLabel = editor?.targetMeta?.resolveBadgeLabel;
  const showTargetStateChip = editor?.targetMeta?.showStateChip === true;

  const startTransaction = (transaction: EditorTransactionMeta) => {
    if (activeTransactionRef.current) return;
    activeTransactionRef.current = transaction;
    latestRef.current.onTransactionStart?.(transaction);
  };

  const commitTransaction = () => {
    const transaction = activeTransactionRef.current;
    if (!transaction) return;
    activeTransactionRef.current = null;
    latestRef.current.onTransactionCommit?.(transaction);
  };

  const cancelTransaction = () => {
    const transaction = activeTransactionRef.current;
    if (!transaction) return;
    activeTransactionRef.current = null;
    latestRef.current.onTransactionCancel?.(transaction);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    longPressRef.current = null;
  };

  const armDeleteTarget = (target: MoveEditorTarget) => {
    if (
      target.kind === "zone"
        ? !latestRef.current.permissions.deleteZone
        : !latestRef.current.permissions.deletePath
    )
      return;
    dragRef.current = null;
    setDraggingTarget(null);
    setObjectSnapGuideLines(null);
    setIsResizing(false);
    setDeleteConfirmState(null);
    latestRef.current.onExclusionStateChange?.(undefined);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setDeleteArmedTargetKey(target.key);
    setSelectedTargetKey(target.key);
    setHoveredTargetKey(target.key);
  };

  const clearDeleteUndoTimer = () => {
    if (deleteUndoTimerRef.current !== null) {
      window.clearTimeout(deleteUndoTimerRef.current);
      deleteUndoTimerRef.current = null;
    }
  };

  const pushDeleteUndoState = (next: DeleteUndoState) => {
    clearDeleteUndoTimer();
    setDeleteUndoState(next);
    deleteUndoTimerRef.current = window.setTimeout(() => {
      deleteUndoTimerRef.current = null;
      setDeleteUndoState((current) =>
        current?.targetKey === next.targetKey ? null : current
      );
    }, deleteUndoMs);
  };

  const commitDeleteTarget = (target: MoveEditorTarget) => {
    const perms = latestRef.current.permissions;
    if (target.kind === "zone" ? !perms.deleteZone : !perms.deletePath) return;
    const previousModel = latestRef.current.model;
    const previousLayoutModel = latestRef.current.layoutModel;

    if (target.kind === "zone") {
      const nextModel = removeZone(previousModel, target.zoneId);
      const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

      latestRef.current.onModelChange?.(nextModel);
      latestRef.current.onLayoutModelChange?.(nextLayoutModel);
      pushDeleteUndoState({
        targetKey: target.key,
        label: formatDeleteTargetLabel(editorLocale, target),
      });
      setEditingZoneId((current) => (current === target.zoneId ? null : current));
    } else {
      const sourceZoneId = findPathSourceZoneId(previousModel, target.pathId);
      if (!sourceZoneId) return;

      const nextModel = removePath(previousModel, sourceZoneId, target.pathId);
      const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

      latestRef.current.onModelChange?.(nextModel);
      latestRef.current.onLayoutModelChange?.(nextLayoutModel);
      pushDeleteUndoState({
        targetKey: target.key,
        label: formatDeleteTargetLabel(editorLocale, target),
      });
    }

    setDeleteConfirmState(null);
    setDeleteArmedTargetKey(null);
    setSelectedTargetKey(null);
    setHoveredTargetKey(null);
  };

  const commitDeleteZoneSelection = (zoneIds: ZoneId[]) => {
    if (zoneIds.length === 0) return;
    if (!latestRef.current.permissions.deleteZone) return;

    const previousModel = latestRef.current.model;
    const previousLayoutModel = latestRef.current.layoutModel;
    const topLevelZoneIds = collectTopLevelSelectedZoneIds(previousModel, zoneIds);

    let nextModel = previousModel;
    for (const zoneId of topLevelZoneIds) {
      nextModel = removeZone(nextModel, zoneId);
    }

    const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

    latestRef.current.onModelChange?.(nextModel);
    latestRef.current.onLayoutModelChange?.(nextLayoutModel);
    pushDeleteUndoState({
      targetKey: `selection:zones:${topLevelZoneIds.join(",")}`,
      label: formatDeleteSelectionLabel({
        locale: editorLocale,
        kind: "zone",
        count: topLevelZoneIds.length,
      }),
    });
    setSelectedZoneIds([]);
    setSelectedTargetKey(null);
    setHoveredTargetKey(null);
    setDeleteArmedTargetKey(null);
    setDeleteConfirmState(null);
    setEditingZoneId((current) =>
      current && topLevelZoneIds.includes(current) ? null : current
    );
  };

  const commitDeletePathSelection = (pathIds: PathId[]) => {
    if (pathIds.length === 0) return;
    if (!latestRef.current.permissions.deletePath) return;

    const previousModel = latestRef.current.model;
    const previousLayoutModel = latestRef.current.layoutModel;
    let nextModel = previousModel;

    for (const pathId of pathIds) {
      const sourceZoneId = findPathSourceZoneId(nextModel, pathId);
      if (!sourceZoneId) continue;
      nextModel = removePath(nextModel, sourceZoneId, pathId);
    }

    const nextLayoutModel = pruneLayoutModel(nextModel, previousLayoutModel);

    latestRef.current.onModelChange?.(nextModel);
    latestRef.current.onLayoutModelChange?.(nextLayoutModel);
    pushDeleteUndoState({
      targetKey: `selection:paths:${pathIds.join(",")}`,
      label: formatDeleteSelectionLabel({
        locale: editorLocale,
        kind: "path",
        count: pathIds.length,
      }),
    });
    setSelectedPathIds([]);
    setSelectedTargetKey(null);
    setHoveredTargetKey(null);
    setDeleteArmedTargetKey(null);
    setDeleteConfirmState(null);
  };

  const requestDeleteZoneSelection = () => {
    if (selectedZoneIds.length < 2) return;

    if (shouldConfirmDelete) {
      setDeleteConfirmState({
        kind: "zone-selection",
        zoneIds: [...selectedZoneIds],
      });
      return;
    }

    commitDeleteZoneSelection(selectedZoneIds);
  };

  const requestDeletePathSelection = () => {
    if (selectedPathIds.length < 2) return;

    if (shouldConfirmDelete) {
      setDeleteConfirmState({
        kind: "path-selection",
        pathIds: [...selectedPathIds],
      });
      return;
    }

    commitDeletePathSelection(selectedPathIds);
  };

  useEffect(() => {
    const safeCanConnectPath: CanConnectPath = (params) => {
      const fn = latestRef.current.canConnectPath;
      if (!fn) return true;
      try {
        return fn(params);
      } catch (err) {
        console.error("[zoneflow] canConnectPath threw:", err);
        return false;
      }
    };

    const buildHoverCanConnect = (
      sourceZoneId: ZoneId,
      mode: "create" | "retarget",
      pathId?: PathId
    ) =>
      (targetZoneId: ZoneId): boolean => {
        const liveModel = latestRef.current.model;
        const sourceZone = liveModel.zonesById[sourceZoneId];
        const targetZone = liveModel.zonesById[targetZoneId];
        if (!sourceZone || !targetZone) return false;
        return safeCanConnectPath({
          mode,
          sourceZoneId,
          targetZoneId,
          sourceZone,
          targetZone,
          model: liveModel,
          pathId,
          path: pathId ? sourceZone.pathsById[pathId] : undefined,
        });
      };

    const stopDragging = () => {
      cancelLongPress();

      const drag = dragRef.current;
      const resize = resizeRef.current;
      const pathResize = pathResizeRef.current;
      const pathCreate = pathCreateRef.current;
      const pathRetarget = pathRetargetRef.current;
      const marquee = marqueeSelectionRef.current;

      if (drag?.hasMoved && drag.target.kind === "path") {
        suppressedPathLabelClickRef.current = {
          targetKey: drag.target.key,
          until: Date.now() + 180,
        };
      }

      if (pathResize?.target.kind === "path") {
        suppressedPathLabelClickRef.current = {
          targetKey: pathResize.target.key,
          until: Date.now() + 180,
        };
      }

      if (
        drag?.target.kind === "zone" &&
        drag.hasMoved &&
        !resize &&
        !pathResize &&
        latestRef.current.permissions.reparentZone
      ) {
        const reparented =
          drag.origin.kind === "zone-group"
            ? commitZoneGroupReparentAtCurrentPosition({
                model: latestRef.current.model,
                layoutModel: latestRef.current.layoutModel,
                zoneIds: Object.keys(drag.origin.originsByZoneId) as ZoneId[],
              })
            : commitZoneReparentAtCurrentPosition({
                model: latestRef.current.model,
                layoutModel: latestRef.current.layoutModel,
                zoneId: drag.target.zoneId,
              });

        if (reparented.didReparent) {
          latestRef.current.onModelChange?.(reparented.model);
          latestRef.current.onLayoutModelChange?.(reparented.layoutModel);
        }
      }

      if (
        pathCreate?.hasMoved &&
        latestRef.current.frame &&
        latestRef.current.permissions.createPath
      ) {
        const targetZoneId = resolveInputAnchorTargetZoneId({
          model: latestRef.current.model,
          frame: latestRef.current.frame,
          camera: latestRef.current.camera,
          point: pathCreate.currentScreenPoint,
          canConnect: buildHoverCanConnect(pathCreate.sourceZoneId, "create"),
          resolveZoneShape: latestRef.current.resolveZoneShape,
        });

        const createdPath = createPathFromOutputAnchorDrag({
          model: latestRef.current.model,
          layoutModel: latestRef.current.layoutModel,
          frame: latestRef.current.frame,
          sourceZoneId: pathCreate.sourceZoneId,
          dropWorldPoint: screenPointToWorldPoint(
            pathCreate.currentScreenPoint,
            latestRef.current.camera
          ),
          targetZoneId,
          gridSnap: latestRef.current.gridSnap,
          canConnect: safeCanConnectPath,
        });

        if (createdPath) {
          let finalModel = createdPath.model;
          let finalLayoutModel = createdPath.layoutModel;

          if (latestRef.current.onPathCreated) {
            const result = latestRef.current.onPathCreated({
              pathId: createdPath.pathId,
              sourceZoneId: pathCreate.sourceZoneId,
              targetZoneId,
              model: finalModel,
              layoutModel: finalLayoutModel,
            });
            if (result) {
              if (result.model) finalModel = result.model;
              if (result.layoutModel) finalLayoutModel = result.layoutModel;
            }
          }

          latestRef.current.onModelChange?.(finalModel);
          latestRef.current.onLayoutModelChange?.(finalLayoutModel);
          setSelectedTargetKey(`path:${createdPath.pathId}`);
        }
      }

      if (
        pathRetarget?.hasMoved &&
        latestRef.current.frame &&
        latestRef.current.permissions.retargetPath
      ) {
        let workingModel = latestRef.current.model;
        let workingLayoutModel = latestRef.current.layoutModel;
        let targetZoneId = resolveInputAnchorTargetZoneId({
          model: workingModel,
          frame: latestRef.current.frame,
          camera: latestRef.current.camera,
          point: pathRetarget.currentScreenPoint,
          canConnect: buildHoverCanConnect(
            pathRetarget.sourceZoneId,
            "retarget",
            pathRetarget.pathId
          ),
          resolveZoneShape: latestRef.current.resolveZoneShape,
        });

        if (
          targetZoneId === null &&
          latestRef.current.onPathDropOnEmptySpace &&
          latestRef.current.permissions.createZone
        ) {
          const dropWorldPoint = screenPointToWorldPoint(
            pathRetarget.currentScreenPoint,
            latestRef.current.camera
          );
          const created = latestRef.current.onPathDropOnEmptySpace({
            sourceZoneId: pathRetarget.sourceZoneId,
            pathId: pathRetarget.pathId,
            worldPoint: dropWorldPoint,
            screenPoint: pathRetarget.currentScreenPoint,
            model: workingModel,
            layoutModel: workingLayoutModel,
          });
          if (created) {
            workingModel = created.model;
            workingLayoutModel = created.layoutModel;
            targetZoneId = created.targetZoneId;
          }
        }

        const nextModel = retargetPathFromOutputAnchorDrag({
          model: workingModel,
          sourceZoneId: pathRetarget.sourceZoneId,
          pathId: pathRetarget.pathId,
          targetZoneId,
          canConnect: safeCanConnectPath,
        });

        if (nextModel) {
          latestRef.current.onModelChange?.(nextModel);
          if (workingLayoutModel !== latestRef.current.layoutModel) {
            latestRef.current.onLayoutModelChange?.(workingLayoutModel);
          }
          setSelectedTargetKey(`path:${pathRetarget.pathId}`);
        }
      }

      if (marquee && latestRef.current.frame) {
        const marqueeRect = normalizeMarqueeRect(marquee);
        const didMarqueeSelect =
          marqueeRect.width >= DRAG_START_DISTANCE ||
          marqueeRect.height >= DRAG_START_DISTANCE;

        if (didMarqueeSelect) {
          const matchedTargets = getMoveEditorTargets({
            model: latestRef.current.model,
            layoutModel: latestRef.current.layoutModel,
            frame: latestRef.current.frame,
            camera: latestRef.current.camera,
            options: {
              includeRoot: latestRef.current.includeRoot,
            },
          }).filter((target) => intersectsRect(target.rect, marqueeRect));

          const matchedZoneIds = matchedTargets
            .filter(
              (target): target is Extract<MoveEditorTarget, { kind: "zone" }> =>
                target.kind === "zone"
            )
            .map((target) => target.zoneId);
          const matchedPathIds = matchedTargets
            .filter(
              (target): target is Extract<MoveEditorTarget, { kind: "path" }> =>
                target.kind === "path"
            )
            .map((target) => target.pathId);

          const shouldPreferZones = matchedZoneIds.length > 0;
          const nextZoneIds = shouldPreferZones
            ? marquee.appendToSelection
              ? Array.from(new Set([...selectedZoneIdsRef.current, ...matchedZoneIds]))
              : matchedZoneIds
            : [];
          const nextPathIds = shouldPreferZones
            ? []
            : marquee.appendToSelection
              ? Array.from(new Set([...selectedPathIdsRef.current, ...matchedPathIds]))
              : matchedPathIds;
          const selectedKeys = [
            ...nextZoneIds.map((zoneId) => `zone:${zoneId}`),
            ...nextPathIds.map((pathId) => `path:${pathId}`),
          ];

          setSelectedZoneIds(nextZoneIds);
          setSelectedPathIds(nextPathIds);
          setSelectedTargetKey(
            selectedKeys.length === 1 ? selectedKeys[0] : null
          );
        } else if (!marquee.appendToSelection) {
          setSelectedZoneIds([]);
          setSelectedPathIds([]);
          setSelectedTargetKey(null);
        }
      }

      // Notify on a completed handle resize, with the start/end sizes. Read the
      // final size from the live layout model (the gesture wrote it there).
      if (resize) {
        const finalLayout =
          latestRef.current.layoutModel.zoneLayoutsById[resize.origin.zoneId];
        const toWidth = finalLayout?.width ?? resize.origin.originWidth;
        const toHeight = finalLayout?.height ?? resize.origin.originHeight;
        if (
          toWidth !== resize.origin.originWidth ||
          toHeight !== resize.origin.originHeight
        ) {
          latestRef.current.onZoneResize?.({
            zoneId: resize.origin.zoneId,
            from: {
              width: resize.origin.originWidth,
              height: resize.origin.originHeight,
            },
            to: { width: toWidth, height: toHeight },
          });
        }
      }

      commitTransaction();

      dragRef.current = null;
      resizeRef.current = null;
      pathResizeRef.current = null;
      pathCreateRef.current = null;
      pathRetargetRef.current = null;
      marqueeSelectionRef.current = null;
      setDraggingTarget(null);
      setDraggingZoneGroupIds([]);
      setDraggingPathGroupIds([]);
      setIsResizing(false);
      setCreatingPath(null);
      setPathCreateTargetZoneId(null);
      setRetargetingPath(null);
      setRetargetPathTargetZoneId(null);
      setMarqueeSelection(null);
      setHoveredTargetKey(null);
      latestRef.current.onExclusionStateChange?.(undefined);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const handlePointerMove = (event: PointerEvent) => {
      const longPress = longPressRef.current;
      if (longPress) {
        const moved =
          getScreenDistance({
            startClientX: longPress.startClientX,
            startClientY: longPress.startClientY,
            nextClientX: event.clientX,
            nextClientY: event.clientY,
          }) >= DRAG_START_DISTANCE;

        if (moved) {
          cancelLongPress();
        }
      }

      const resize = resizeRef.current;
      if (resize) {
        const onLayoutModelChange = latestRef.current.onLayoutModelChange;
        if (!onLayoutModelChange) return;

        event.preventDefault();
        setObjectSnapGuideLines(null);

        const resizingZone =
          latestRef.current.model.zonesById[resize.origin.zoneId];
        const nextLayoutModel = resizeZoneByScreenDelta({
          layoutModel: latestRef.current.layoutModel,
          camera: latestRef.current.camera,
          origin: resize.origin,
          deltaX: event.clientX - resize.startClientX,
          deltaY: event.clientY - resize.startClientY,
          lockWidth: !!resizingZone?.fixedWidth,
          lockHeight: !!resizingZone?.fixedHeight,
          // Per-zone floor (undefined → editor's built-in default).
          minWidth: resizingZone?.minWidth,
          minHeight: resizingZone?.minHeight,
          gridSnap: latestRef.current.gridSnap,
        });

        onLayoutModelChange(nextLayoutModel);
        return;
      }

      const marquee = marqueeSelectionRef.current;
      if (marquee) {
        event.preventDefault();
        setObjectSnapGuideLines(null);

        const nextSelection: MarqueeSelectionState = {
          ...marquee,
          currentX: toCanvasScreenPoint(
            overlayRef.current,
            event.clientX,
            event.clientY
          ).x,
          currentY: toCanvasScreenPoint(
            overlayRef.current,
            event.clientX,
            event.clientY
          ).y,
        };

        marqueeSelectionRef.current = nextSelection;
        setMarqueeSelection(nextSelection);
        return;
      }

      const pathResize = pathResizeRef.current;
      if (pathResize) {
        const onLayoutModelChange = latestRef.current.onLayoutModelChange;
        if (!onLayoutModelChange) return;

        event.preventDefault();
        setObjectSnapGuideLines(null);

        const nextLayoutModel = resizePathNodeByScreenDelta({
          layoutModel: latestRef.current.layoutModel,
          camera: latestRef.current.camera,
          origin: pathResize.origin,
          deltaX: event.clientX - pathResize.startClientX,
          deltaY: event.clientY - pathResize.startClientY,
          gridSnap: latestRef.current.gridSnap,
        });

        onLayoutModelChange(nextLayoutModel);
        return;
      }

      const drag = dragRef.current;
      if (drag) {
        const onLayoutModelChange = latestRef.current.onLayoutModelChange;
        if (!onLayoutModelChange) return;

        const hasMoved =
          drag.hasMoved ||
          getScreenDistance({
            startClientX: drag.startClientX,
            startClientY: drag.startClientY,
            nextClientX: event.clientX,
            nextClientY: event.clientY,
          }) >= DRAG_START_DISTANCE;

        if (!hasMoved) {
          return;
        }

        event.preventDefault();

        if (!drag.hasMoved) {
          startTransaction(resolveDragTransactionMeta(drag));
          dragRef.current = {
            ...drag,
            hasMoved: true,
          };
          setDraggingTarget(drag.target);
          if (drag.origin.kind === "zone-group") {
            setDraggingZoneGroupIds(Object.keys(drag.origin.originsByZoneId) as ZoneId[]);
            setDraggingPathGroupIds([]);
            latestRef.current.onExclusionStateChange?.(undefined);
          } else if (drag.origin.kind === "path-group") {
            setDraggingZoneGroupIds([]);
            setDraggingPathGroupIds(Object.keys(drag.origin.originsByPathId) as PathId[]);
            latestRef.current.onExclusionStateChange?.(undefined);
          } else {
            setDraggingZoneGroupIds([]);
            setDraggingPathGroupIds([]);
            latestRef.current.onExclusionStateChange?.(getExclusionState(drag.target));
          }
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
        }

        const nextLayoutModel = moveEditorTargetByScreenDelta({
          layoutModel: latestRef.current.layoutModel,
          camera: latestRef.current.camera,
          origin: drag.origin,
          deltaX: event.clientX - drag.startClientX,
          deltaY: event.clientY - drag.startClientY,
          gridSnap: latestRef.current.gridSnap,
          objectSnap: latestRef.current.objectSnap,
        });

        if (drag.origin.kind === "zone" || drag.origin.kind === "path") {
          const snappedGuides = resolveMoveEditorObjectSnapGuides({
            camera: latestRef.current.camera,
            origin: drag.origin,
            deltaX: event.clientX - drag.startClientX,
            deltaY: event.clientY - drag.startClientY,
            gridSnap: latestRef.current.gridSnap,
            objectSnap: latestRef.current.objectSnap,
          });

          setObjectSnapGuideLines(
            snappedGuides.guideX !== undefined || snappedGuides.guideY !== undefined
              ? {
                  x:
                    snappedGuides.guideX !== undefined
                      ? latestRef.current.camera.x +
                        snappedGuides.guideX * latestRef.current.camera.zoom
                      : undefined,
                  y:
                    snappedGuides.guideY !== undefined
                      ? latestRef.current.camera.y +
                        snappedGuides.guideY * latestRef.current.camera.zoom
                      : undefined,
                }
              : null
          );
        } else {
          setObjectSnapGuideLines(null);
        }

        onLayoutModelChange(nextLayoutModel);
        return;
      }

      const pathRetarget = pathRetargetRef.current;
      if (pathRetarget && latestRef.current.frame) {
        event.preventDefault();
        setObjectSnapGuideLines(null);

        const currentScreenPoint = toCanvasScreenPoint(
          overlayRef.current,
          event.clientX,
          event.clientY
        );
        const hasMoved =
          pathRetarget.hasMoved ||
          getScreenDistance({
            startClientX: pathRetarget.startClientX,
            startClientY: pathRetarget.startClientY,
            nextClientX: event.clientX,
            nextClientY: event.clientY,
          }) >= 10;
        const nextState: PathRetargetDragState = {
          ...pathRetarget,
          currentScreenPoint,
          hasMoved,
        };

        pathRetargetRef.current = nextState;
        setRetargetingPath(nextState);
        setRetargetPathTargetZoneId(
          resolveInputAnchorTargetZoneId({
            model: latestRef.current.model,
            frame: latestRef.current.frame,
            camera: latestRef.current.camera,
            point: currentScreenPoint,
            canConnect: buildHoverCanConnect(
              pathRetarget.sourceZoneId,
              "retarget",
              pathRetarget.pathId
            ),
            resolveZoneShape: latestRef.current.resolveZoneShape,
          })
        );
        return;
      }

      const pathCreate = pathCreateRef.current;
      if (!pathCreate || !latestRef.current.frame) return;

      event.preventDefault();
      setObjectSnapGuideLines(null);

      const currentScreenPoint = toCanvasScreenPoint(
        overlayRef.current,
        event.clientX,
        event.clientY
      );
      const hasMoved =
        pathCreate.hasMoved ||
        getScreenDistance({
          startClientX: pathCreate.startClientX,
          startClientY: pathCreate.startClientY,
          nextClientX: event.clientX,
          nextClientY: event.clientY,
        }) >= 10;
      const nextState: PathCreateDragState = {
        ...pathCreate,
        currentScreenPoint,
        hasMoved,
      };

      pathCreateRef.current = nextState;
      setCreatingPath(nextState);
      setPathCreateTargetZoneId(
        resolveInputAnchorTargetZoneId({
          model: latestRef.current.model,
          frame: latestRef.current.frame,
          camera: latestRef.current.camera,
          point: currentScreenPoint,
          canConnect: buildHoverCanConnect(pathCreate.sourceZoneId, "create"),
          resolveZoneShape: latestRef.current.resolveZoneShape,
        })
      );
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      stopDragging();
    };
  }, []);

  const targets = useMemo<MoveEditorTarget[]>(() => {
    if (!frame || !editor?.enabled || !editor.onLayoutModelChange) {
      return [];
    }

    return getMoveEditorTargets({
      model,
      layoutModel,
      frame,
      camera,
      options: {
        includeRoot: editor.includeRoot,
      },
    });
  }, [camera, editor, frame, model]);

  const selectedZoneTargets = useMemo(
    () =>
      targets.filter(
        (target): target is Extract<MoveEditorTarget, { kind: "zone" }> =>
          target.kind === "zone" && selectedZoneIds.includes(target.zoneId)
      ),
    [selectedZoneIds, targets]
  );

  const selectedPathTargets = useMemo(
    () =>
      targets.filter(
        (target): target is Extract<MoveEditorTarget, { kind: "path" }> =>
          target.kind === "path" && selectedPathIds.includes(target.pathId)
      ),
    [selectedPathIds, targets]
  );

  // Resolved selected objects + the custom actions common to the whole
  // selection (an action shows only when every selected item passes its
  // isAvailable predicate). Recomputed only when the selection or the
  // injected action lists change.
  const selectedZones = useMemo(
    () =>
      selectedZoneIds
        .map((zoneId) => model.zonesById[zoneId])
        .filter((zone): zone is Zone => Boolean(zone)),
    [selectedZoneIds, model]
  );

  const commonZoneSelectionActions = useMemo(() => {
    const actions = editor?.zoneSelectionActions;
    if (!actions?.length || selectedZones.length === 0) return [];
    return actions.filter(
      (action) =>
        !action.isAvailable || selectedZones.every((zone) => action.isAvailable!(zone))
    );
  }, [editor?.zoneSelectionActions, selectedZones]);

  const selectedPathRefs = useMemo(
    () =>
      selectedPathIds
        .map((pathId) => {
          const visual = frame?.pipeline.graphLayout.pathsById[pathId];
          return visual
            ? { path: visual.path, sourceZoneId: visual.sourceZoneId }
            : null;
        })
        .filter((ref): ref is { path: Path; sourceZoneId: ZoneId } =>
          Boolean(ref)
        ),
    [selectedPathIds, frame]
  );

  const commonPathSelectionActions = useMemo(() => {
    const actions = editor?.pathSelectionActions;
    if (!actions?.length || selectedPathRefs.length === 0) return [];
    return actions.filter(
      (action) =>
        !action.isAvailable ||
        selectedPathRefs.every((ref) =>
          action.isAvailable!(ref.path, ref.sourceZoneId)
        )
    );
  }, [editor?.pathSelectionActions, selectedPathRefs]);

  const selectionBounds = useMemo(() => {
    if (selectedZoneTargets.length === 0) return null;

    const minX = Math.min(...selectedZoneTargets.map((target) => target.rect.x));
    const minY = Math.min(...selectedZoneTargets.map((target) => target.rect.y));
    const maxX = Math.max(
      ...selectedZoneTargets.map((target) => target.rect.x + target.rect.width)
    );
    const maxY = Math.max(
      ...selectedZoneTargets.map((target) => target.rect.y + target.rect.height)
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedZoneTargets]);

  const pathSelectionBounds = useMemo(() => {
    if (selectedPathTargets.length === 0) return null;

    const minX = Math.min(...selectedPathTargets.map((target) => target.rect.x));
    const minY = Math.min(...selectedPathTargets.map((target) => target.rect.y));
    const maxX = Math.max(
      ...selectedPathTargets.map((target) => target.rect.x + target.rect.width)
    );
    const maxY = Math.max(
      ...selectedPathTargets.map((target) => target.rect.y + target.rect.height)
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedPathTargets]);

  const canRunZoneSelectionCommandsBase = useMemo(() => {
    if (selectedZoneTargets.length < 2) return false;

    const parentIds = new Set(
      selectedZoneTargets.map((target) => model.zonesById[target.zoneId]?.parentZoneId ?? null)
    );

    return parentIds.size === 1;
  }, [model, selectedZoneTargets]);

  // 정렬·분배·순서(zorder)는 위치/순서 레이아웃 변경이므로 zone=moveZone, path=routePath 권한을 따른다.
  const canRunZoneSelectionCommands =
    canRunZoneSelectionCommandsBase && permissions.moveZone;
  const canRunPathSelectionCommands =
    selectedPathTargets.length >= 2 && permissions.routePath;
  const canRunZoneZOrderCommands =
    selectedZoneTargets.length >= 1 && permissions.moveZone;
  const canRunPathZOrderCommands =
    selectedPathTargets.length >= 1 && permissions.routePath;
  // 줄바꿈된 툴바에서 줄 맨 앞에 오게 된 그룹 구분선을 숨긴다(zone/path 각각).
  // (early return 보다 위에서 호출해야 hook 순서가 항상 일정하다.)
  useHideRowStartGroupDividers(zoneToolbarRef, [
    selectedZoneTargets.length,
    commonZoneSelectionActions.length,
    canRunZoneZOrderCommands,
    permissions.deleteZone,
    editorLocale,
  ]);
  useHideRowStartGroupDividers(pathToolbarRef, [
    selectedPathTargets.length,
    commonPathSelectionActions.length,
    canRunPathZOrderCommands,
    permissions.deletePath,
    editorLocale,
  ]);
  const selectedTarget = useMemo(
    () =>
      selectedTargetKey
        ? targets.find((target) => target.key === selectedTargetKey) ?? null
        : null,
    [selectedTargetKey, targets]
  );

  const dropTargetZoneIds = useMemo(() => {
    if (isResizing || draggingTarget?.kind !== "zone") {
      return [];
    }

    const zoneIdsToEvaluate =
      draggingZoneGroupIds.length > 0
        ? draggingZoneGroupIds
        : [draggingTarget.zoneId];
    const nextZoneIds = new Set<ZoneId>();

    for (const zoneId of zoneIdsToEvaluate) {
      const resolved = resolveZoneReparentCandidate({
        model,
        layoutModel,
        zoneId,
      });

      if (
        resolved.candidateParentZoneId !== null &&
        resolved.candidateParentZoneId !== resolved.currentParentZoneId
      ) {
        nextZoneIds.add(resolved.candidateParentZoneId);
      }
    }

    return Array.from(nextZoneIds);
  }, [draggingTarget, draggingZoneGroupIds, isResizing, layoutModel, model]);

  const openZoneEditor = (zoneId: ZoneId, targetKey: string) => {
    if (editor?.onZoneEditClick) {
      editor.onZoneEditClick(zoneId);
    } else {
      setEditingZoneId(zoneId);
    }

    setSelectedTargetKey(targetKey);
  };

  const openPathEditor = (
    payload: PathLabelEventPayload,
    targetKey: string,
    trigger?: (event: PathLabelEventPayload) => void
  ) => {
    if (trigger) {
      trigger(payload);
    } else if (editor?.renderPathEditor) {
      setEditingPathState({
        pathId: payload.pathId,
        sourceZoneId: payload.sourceZoneId,
      });
    }

    setSelectedTargetKey(targetKey);
  };

  const runZoneSelectionCommand = (
    command:
      | "align-left"
      | "align-right"
      | "align-top"
      | "align-bottom"
      | "align-center-horizontal"
      | "align-center-vertical"
      | "distribute-horizontal"
      | "distribute-vertical"
  ) => {
    if (!latestRef.current.onLayoutModelChange) return;
    if (selectedZoneIds.length < 2) return;
    if (!canRunZoneSelectionCommands) return;

    const nextLayoutModel =
      command === "align-left"
        ? alignZonesByMode({
            layoutModel: latestRef.current.layoutModel,
            zoneIds: selectedZoneIds,
            mode: "left",
            gridSnap: latestRef.current.gridSnap,
          })
        : command === "align-right"
          ? alignZonesByMode({
              layoutModel: latestRef.current.layoutModel,
              zoneIds: selectedZoneIds,
              mode: "right",
              gridSnap: latestRef.current.gridSnap,
            })
        : command === "align-top"
          ? alignZonesByMode({
              layoutModel: latestRef.current.layoutModel,
              zoneIds: selectedZoneIds,
              mode: "top",
              gridSnap: latestRef.current.gridSnap,
            })
          : command === "align-bottom"
            ? alignZonesByMode({
                layoutModel: latestRef.current.layoutModel,
                zoneIds: selectedZoneIds,
                mode: "bottom",
                gridSnap: latestRef.current.gridSnap,
              })
            : command === "align-center-horizontal"
              ? alignZonesByMode({
                  layoutModel: latestRef.current.layoutModel,
                  zoneIds: selectedZoneIds,
                  mode: "center-horizontal",
                  gridSnap: latestRef.current.gridSnap,
                })
              : command === "align-center-vertical"
                ? alignZonesByMode({
                    layoutModel: latestRef.current.layoutModel,
                    zoneIds: selectedZoneIds,
                    mode: "center-vertical",
                    gridSnap: latestRef.current.gridSnap,
                  })
          : command === "distribute-horizontal"
            ? distributeZonesByMode({
                layoutModel: latestRef.current.layoutModel,
                zoneIds: selectedZoneIds,
                mode: "horizontal",
                gridSnap: latestRef.current.gridSnap,
              })
            : distributeZonesByMode({
                layoutModel: latestRef.current.layoutModel,
                zoneIds: selectedZoneIds,
                mode: "vertical",
                gridSnap: latestRef.current.gridSnap,
              });

    latestRef.current.onLayoutModelChange(nextLayoutModel);
  };

  const runZoneZOrderCommand = (mode: ZOrderMode) => {
    if (!latestRef.current.onLayoutModelChange) return;
    if (!canRunZoneZOrderCommands) return;

    latestRef.current.onLayoutModelChange(
      reorderZonesByZOrderMode({
        model: latestRef.current.model,
        layoutModel: latestRef.current.layoutModel,
        zoneIds: selectedZoneIds,
        mode,
      })
    );
  };

  const runPathSelectionCommand = (
    command:
      | "align-left"
      | "align-right"
      | "align-top"
      | "align-bottom"
      | "align-center-horizontal"
      | "align-center-vertical"
      | "distribute-horizontal"
      | "distribute-vertical"
  ) => {
    if (!latestRef.current.onLayoutModelChange) return;
    if (!latestRef.current.frame) return;
    if (selectedPathIds.length < 2) return;
    if (!canRunPathSelectionCommands) return;

    const nextLayoutModel =
      command === "align-left"
        ? alignPathsByMode({
            frame: latestRef.current.frame,
            layoutModel: latestRef.current.layoutModel,
            pathIds: selectedPathIds,
            mode: "left",
            gridSnap: latestRef.current.gridSnap,
          })
        : command === "align-right"
          ? alignPathsByMode({
              frame: latestRef.current.frame,
              layoutModel: latestRef.current.layoutModel,
              pathIds: selectedPathIds,
              mode: "right",
              gridSnap: latestRef.current.gridSnap,
            })
        : command === "align-top"
          ? alignPathsByMode({
              frame: latestRef.current.frame,
              layoutModel: latestRef.current.layoutModel,
              pathIds: selectedPathIds,
              mode: "top",
              gridSnap: latestRef.current.gridSnap,
            })
          : command === "align-bottom"
            ? alignPathsByMode({
                frame: latestRef.current.frame,
                layoutModel: latestRef.current.layoutModel,
                pathIds: selectedPathIds,
                mode: "bottom",
                gridSnap: latestRef.current.gridSnap,
              })
            : command === "align-center-horizontal"
              ? alignPathsByMode({
                  frame: latestRef.current.frame,
                  layoutModel: latestRef.current.layoutModel,
                  pathIds: selectedPathIds,
                  mode: "center-horizontal",
                  gridSnap: latestRef.current.gridSnap,
                })
              : command === "align-center-vertical"
                ? alignPathsByMode({
                    frame: latestRef.current.frame,
                    layoutModel: latestRef.current.layoutModel,
                    pathIds: selectedPathIds,
                    mode: "center-vertical",
                    gridSnap: latestRef.current.gridSnap,
                  })
                : command === "distribute-horizontal"
                  ? distributePathsByMode({
                      frame: latestRef.current.frame,
                      layoutModel: latestRef.current.layoutModel,
                      pathIds: selectedPathIds,
                      mode: "horizontal",
                      gridSnap: latestRef.current.gridSnap,
                    })
                  : distributePathsByMode({
                      frame: latestRef.current.frame,
                      layoutModel: latestRef.current.layoutModel,
                      pathIds: selectedPathIds,
                      mode: "vertical",
                      gridSnap: latestRef.current.gridSnap,
                    });

    latestRef.current.onLayoutModelChange(nextLayoutModel);
  };

  const runPathZOrderCommand = (mode: ZOrderMode) => {
    if (!latestRef.current.onLayoutModelChange) return;
    if (!canRunPathZOrderCommands) return;

    latestRef.current.onLayoutModelChange(
      reorderPathsByZOrderMode({
        model: latestRef.current.model,
        layoutModel: latestRef.current.layoutModel,
        pathIds: selectedPathIds,
        mode,
      })
    );
  };

  const requestDeleteCurrentSelection = () => {
    if (deleteConfirmState) return;

    if (selectedZoneIds.length > 1) {
      if (!permissions.deleteZone) return;
      requestDeleteZoneSelection();
      return;
    }

    if (selectedPathIds.length > 1) {
      if (!permissions.deletePath) return;
      requestDeletePathSelection();
      return;
    }

    if (selectedZoneIds.length === 1) {
      if (!permissions.deleteZone) return;
      const target =
        targets.find(
          (candidate) =>
            candidate.kind === "zone" && candidate.zoneId === selectedZoneIds[0]
        ) ??
        (selectedTarget?.kind === "zone" ? selectedTarget : null);

      if (!target) return;
      if (shouldConfirmDelete) {
        setDeleteConfirmState({ kind: "target", target });
      } else {
        commitDeleteTarget(target);
      }
      return;
    }

    if (selectedPathIds.length === 1) {
      if (!permissions.deletePath) return;
      const target =
        targets.find(
          (candidate) =>
            candidate.kind === "path" && candidate.pathId === selectedPathIds[0]
        ) ??
        (selectedTarget?.kind === "path" ? selectedTarget : null);

      if (!target) return;
      if (shouldConfirmDelete) {
        setDeleteConfirmState({ kind: "target", target });
      } else {
        commitDeleteTarget(target);
      }
      return;
    }

    if (!selectedTarget) return;
    if (
      selectedTarget.kind === "zone"
        ? !permissions.deleteZone
        : !permissions.deletePath
    )
      return;
    if (shouldConfirmDelete) {
      setDeleteConfirmState({ kind: "target", target: selectedTarget });
    } else {
      commitDeleteTarget(selectedTarget);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (isEditableTarget) return;

      const hasSelection =
        selectedZoneIds.length > 0 ||
        selectedPathIds.length > 0 ||
        selectedTarget !== null;

      if (!hasSelection) return;

      event.preventDefault();
      event.stopPropagation();
      requestDeleteCurrentSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    deleteConfirmState,
    requestDeleteCurrentSelection,
    selectedPathIds,
    selectedTarget,
    selectedZoneIds,
  ]);

  if (!editor?.enabled || !frame) return null;

  const marqueeRect = marqueeSelection
    ? normalizeMarqueeRect(marqueeSelection)
    : null;
  const overlayWidth =
    overlayRef.current?.clientWidth ??
    (typeof window === "undefined" ? 0 : window.innerWidth);
  const canDeleteSelection =
    !deleteConfirmState &&
    ((permissions.deleteZone &&
      (selectedZoneIds.length > 0 || selectedTarget?.kind === "zone")) ||
      (permissions.deletePath &&
        (selectedPathIds.length > 0 || selectedTarget?.kind === "path")));

  const editingZone = editingZoneId ? model.zonesById[editingZoneId] : undefined;
  const editingPathSourceZone = editingPathState
    ? model.zonesById[editingPathState.sourceZoneId]
    : undefined;
  const editingPath =
    editingPathState && editingPathSourceZone
      ? editingPathSourceZone.pathsById[editingPathState.pathId]
      : undefined;
  const dropTargetScreenRects = dropTargetZoneIds
    .map((zoneId) => {
      const rect = frame.pipeline.graphLayout.zonesById[zoneId]?.rect;

      if (!rect) {
        return null;
      }

      return {
        zoneId,
        rect: toScreenRect(rect, camera),
      };
    })
    .filter(
      (
        value
      ): value is {
        zoneId: ZoneId;
        rect: Rect;
      } => value !== null
    );
  const pathCreateSourceAnchorRect =
    creatingPath
      ? resolveZoneAnchorScreenRect({
          frame,
          camera,
          zoneId: creatingPath.sourceZoneId,
          kind: "outlet",
          resolveZoneShape,
        })
      : undefined;
  const pathCreateTargetAnchorRect =
    creatingPath && pathCreateTargetZoneId
      ? resolveZoneAnchorScreenRect({
          frame,
          camera,
          zoneId: pathCreateTargetZoneId,
          kind: "inlet",
          resolveZoneShape,
        })
      : undefined;
  const pathRetargetSourceAnchorRect =
    retargetingPath
      ? resolvePathOutputAnchorScreenRect({
          frame,
          camera,
          pathId: retargetingPath.pathId,
        })
      : undefined;
  const pathRetargetTargetAnchorRect =
    retargetingPath && retargetPathTargetZoneId
      ? resolveZoneAnchorScreenRect({
          frame,
          camera,
          zoneId: retargetPathTargetZoneId,
          kind: "inlet",
          resolveZoneShape,
        })
      : undefined;

  // 정렬/분배는 두 그룹으로 나뉘므로(각각 ToolbarGroup) 버튼 렌더를 헬퍼로 공유한다.
  const renderZoneSelectionButton = (command: string) => (
    <button
      key={command}
      type="button"
      disabled={
        !canRunZoneSelectionCommands ||
        (command.includes("distribute") && selectedZoneTargets.length < 3)
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        runZoneSelectionCommand(
          command as
            | "align-left"
            | "align-right"
            | "align-top"
            | "align-bottom"
            | "align-center-horizontal"
            | "align-center-vertical"
            | "distribute-horizontal"
            | "distribute-vertical"
        );
      }}
      style={{
        ...floatingToolbarButtonStyle,
        background: canRunZoneSelectionCommands
          ? floatingToolbarButtonStyle.background
          : resolvedEditorTheme.overlay.floatingToolbar.background,
        color: canRunZoneSelectionCommands
          ? floatingToolbarButtonStyle.color
          : resolvedEditorTheme.overlay.floatingToolbar.buttonDisabledText,
        cursor: canRunZoneSelectionCommands ? "pointer" : "not-allowed",
      }}
      title={
        canRunZoneSelectionCommands
          ? getSelectionCommandLabel({
              locale: editorLocale,
              command: command as SelectionCommandKey,
            })
          : editorStrings.selectionToolbar.sameParentOnlyHint
      }
    >
      {getSelectionCommandLabel({
        locale: editorLocale,
        command: command as SelectionCommandKey,
      })}
    </button>
  );
  const renderPathSelectionButton = (command: string) => (
    <button
      key={command}
      type="button"
      disabled={
        !canRunPathSelectionCommands ||
        (command.includes("distribute") && selectedPathTargets.length < 3)
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        runPathSelectionCommand(
          command as
            | "align-left"
            | "align-right"
            | "align-top"
            | "align-bottom"
            | "align-center-horizontal"
            | "align-center-vertical"
            | "distribute-horizontal"
            | "distribute-vertical"
        );
      }}
      style={{
        ...floatingToolbarButtonStyle,
        background: canRunPathSelectionCommands
          ? floatingToolbarButtonStyle.background
          : resolvedEditorTheme.overlay.floatingToolbar.background,
        color: canRunPathSelectionCommands
          ? floatingToolbarButtonStyle.color
          : resolvedEditorTheme.overlay.floatingToolbar.buttonDisabledText,
        cursor: canRunPathSelectionCommands ? "pointer" : "not-allowed",
      }}
      title={
        canRunPathSelectionCommands
          ? getSelectionCommandLabel({
              locale: editorLocale,
              command: command as SelectionCommandKey,
            })
          : editorStrings.selectionToolbar.sameParentOnlyHint
      }
    >
      {getSelectionCommandLabel({
        locale: editorLocale,
        command: command as SelectionCommandKey,
      })}
    </button>
  );

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
        zIndex: OVERLAY_Z_INDEX.root,
      }}
    >
      {shouldAnimateDeleteUi ? (
        <style>
          {`
            @keyframes zoneflow-delete-shake {
              0% { transform: translate3d(-1px, 0, 0) rotate(-0.85deg); }
              100% { transform: translate3d(1px, 0, 0) rotate(0.85deg); }
            }
            @keyframes zoneflow-delete-pop {
              0% { opacity: 0; transform: scale(0.84); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes zoneflow-delete-toast-in {
              0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.96); }
              100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
            }
          `}
        </style>
      ) : null}
      <div
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (event.pointerType === "touch") return;
          if (event.altKey) return;
          if (event.target !== event.currentTarget) return;
          const currentCursor = window.getComputedStyle(
            event.currentTarget
          ).cursor;
          if (currentCursor === "grab" || currentCursor === "grabbing") {
            return;
          }
          if (
            dragRef.current ||
            resizeRef.current ||
            pathResizeRef.current ||
            pathCreateRef.current ||
            pathRetargetRef.current
          ) {
            return;
          }

          cancelLongPress();
          setDeleteArmedTargetKey(null);
          setDeleteConfirmState(null);
          setHoveredTargetKey(null);

          const start = toCanvasScreenPoint(
            overlayRef.current,
            event.clientX,
            event.clientY
          );
          const nextSelection: MarqueeSelectionState = {
            startX: start.x,
            startY: start.y,
            currentX: start.x,
            currentY: start.y,
            appendToSelection:
              event.shiftKey || event.metaKey || event.ctrlKey,
          };

          marqueeSelectionRef.current = nextSelection;
          setMarqueeSelection(nextSelection);
          document.body.style.cursor = "crosshair";
          document.body.style.userSelect = "none";
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "auto",
          background: "transparent",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {draggingTarget &&
        draggingZoneGroupIds.length === 0 &&
        draggingPathGroupIds.length === 0
          ? renderZonePreview({
              frame,
              camera,
              model,
              layoutModel,
              target: draggingTarget,
              editorTheme: resolvedEditorTheme,
              editorStrings,
              zoneComponents,
              pathComponents,
            }) ??
            renderPathPreview({
              frame,
              camera,
              model,
              layoutModel,
              target: draggingTarget,
              editorTheme: resolvedEditorTheme,
              editorStrings,
              zoneComponents,
              pathComponents,
            })
          : null}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {objectSnapGuideLines?.x !== undefined ? (
          <div
            style={{
              position: "absolute",
              left: objectSnapGuideLines.x,
              top: 0,
              bottom: 0,
              width: 1,
              transform: "translateX(-0.5px)",
              background: resolvedEditorTheme.overlay.guide.objectSnapStroke,
              opacity: resolvedEditorTheme.overlay.guide.objectSnapOpacity,
            }}
          />
        ) : null}

        {objectSnapGuideLines?.y !== undefined ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: objectSnapGuideLines.y,
              height: 1,
              transform: "translateY(-0.5px)",
              background: resolvedEditorTheme.overlay.guide.objectSnapStroke,
              opacity: resolvedEditorTheme.overlay.guide.objectSnapOpacity,
            }}
          />
        ) : null}

        {creatingPath && pathCreateSourceAnchorRect ? (
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <line
              x1={pathCreateSourceAnchorRect.x + pathCreateSourceAnchorRect.width}
              y1={pathCreateSourceAnchorRect.y + pathCreateSourceAnchorRect.height / 2}
              x2={creatingPath.currentScreenPoint.x}
              y2={creatingPath.currentScreenPoint.y}
              stroke={
                pathCreateTargetZoneId
                  ? resolvedEditorTheme.overlay.guide.validStroke
                  : resolvedEditorTheme.overlay.guide.invalidStroke
              }
              strokeWidth={resolvedEditorTheme.overlay.guide.strokeWidth}
              strokeDasharray={
                pathCreateTargetZoneId
                  ? "0"
                  : resolvedEditorTheme.overlay.guide.invalidDashArray
              }
              strokeLinecap="round"
              opacity={resolvedEditorTheme.overlay.guide.opacity}
            />
          </svg>
        ) : null}

        {retargetingPath && pathRetargetSourceAnchorRect ? (
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <line
              x1={pathRetargetSourceAnchorRect.x + pathRetargetSourceAnchorRect.width}
              y1={pathRetargetSourceAnchorRect.y + pathRetargetSourceAnchorRect.height / 2}
              x2={retargetingPath.currentScreenPoint.x}
              y2={retargetingPath.currentScreenPoint.y}
              stroke={
                retargetPathTargetZoneId
                  ? resolvedEditorTheme.overlay.guide.validStroke
                  : resolvedEditorTheme.overlay.guide.invalidStroke
              }
              strokeWidth={resolvedEditorTheme.overlay.guide.strokeWidth}
              strokeDasharray={
                retargetPathTargetZoneId
                  ? "0"
                  : resolvedEditorTheme.overlay.guide.invalidDashArray
              }
              strokeLinecap="round"
              opacity={resolvedEditorTheme.overlay.guide.opacity}
            />
          </svg>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 16,
            top: 16,
            pointerEvents: "auto",
            zIndex: OVERLAY_Z_INDEX.hud,
          }}
        >
          {isHelpPanelExpanded ? (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: resolvedEditorTheme.overlay.helpPanel.background,
                border: resolvedEditorTheme.overlay.helpPanel.border,
                color: resolvedEditorTheme.overlay.helpPanel.titleText,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "0.04em",
                boxShadow: resolvedEditorTheme.overlay.helpPanel.shadow,
                maxWidth: 420,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>{editorStrings.helpPanel.title}</span>
                <button
                  type="button"
                  onClick={() => setIsHelpPanelExpanded(false)}
                  aria-label={editorStrings.helpPanel.collapse}
                  style={{
                    border: resolvedEditorTheme.overlay.helpPanel.border,
                    background: "transparent",
                    color: resolvedEditorTheme.overlay.helpPanel.mutedText,
                    borderRadius: 999,
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: 0,
                  }}
                >
                  {editorStrings.helpPanel.collapse}
                </button>
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 0,
                  color: resolvedEditorTheme.overlay.helpPanel.mutedText,
                }}
              >
                {editorStrings.helpPanel.body}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsHelpPanelExpanded(true)}
              aria-label={editorStrings.helpPanel.expand}
              style={{
                border: resolvedEditorTheme.overlay.helpPanel.border,
                background: resolvedEditorTheme.overlay.helpPanel.background,
                color: resolvedEditorTheme.overlay.helpPanel.titleText,
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                boxShadow: resolvedEditorTheme.overlay.helpPanel.shadow,
                cursor: "pointer",
              }}
            >
              {editorStrings.helpPanel.summary}
            </button>
          )}
        </div>

        {overlayControlsEnabled ? (
          <div
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              display: "grid",
              gap: 8,
              padding: 10,
              minWidth: 198,
              borderRadius: 14,
              border: resolvedEditorTheme.hud.panelBorder,
              background: resolvedEditorTheme.hud.panelBackground,
              boxShadow: resolvedEditorTheme.hud.panelShadow,
              pointerEvents: "auto",
              zIndex: OVERLAY_Z_INDEX.hud,
            }}
          >
            {overlayControls?.showHistory !== false ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => editor.history?.onUndo?.()}
                  disabled={!editor.history?.canUndo}
                  style={{
                    ...hudButtonStyle,
                    opacity: editor.history?.canUndo
                      ? 1
                      : resolvedEditorTheme.hud.buttonDisabledOpacity,
                    cursor: editor.history?.canUndo ? "pointer" : "not-allowed",
                  }}
                >
                  {editorStrings.hud.undo}
                </button>
                <button
                  type="button"
                  onClick={() => editor.history?.onRedo?.()}
                  disabled={!editor.history?.canRedo}
                  style={{
                    ...hudButtonStyle,
                    opacity: editor.history?.canRedo
                      ? 1
                      : resolvedEditorTheme.hud.buttonDisabledOpacity,
                    cursor: editor.history?.canRedo ? "pointer" : "not-allowed",
                  }}
                >
                  {editorStrings.hud.redo}
                </button>
              </div>
            ) : null}

            {overlayControls?.showDelete !== false ? (
              <button
                type="button"
                onClick={() => requestDeleteCurrentSelection()}
                disabled={!canDeleteSelection}
                style={{
                  ...hudButtonStyle,
                  background: canDeleteSelection
                    ? resolvedEditorTheme.hud.buttonDangerBackground
                    : resolvedEditorTheme.hud.buttonBackground,
                  border: canDeleteSelection
                    ? resolvedEditorTheme.hud.buttonDangerBorder
                    : hudButtonStyle.border,
                  color: canDeleteSelection
                    ? resolvedEditorTheme.hud.buttonDangerText
                    : resolvedEditorTheme.hud.buttonText,
                  opacity: canDeleteSelection
                    ? 1
                    : resolvedEditorTheme.hud.buttonDisabledOpacity,
                  cursor: canDeleteSelection ? "pointer" : "not-allowed",
                }}
              >
                {editorStrings.hud.deleteSelection}
              </button>
            ) : null}

            {overlayControls?.showFitToView !== false ? (
              <button
                type="button"
                onClick={() => overlayControls?.onFitToView?.()}
                style={hudButtonStyle}
              >
                {editorStrings.hud.fitToView}
              </button>
            ) : null}

            {(overlayControls?.showGridToggle !== false ||
              overlayControls?.showGridSnapToggle !== false ||
              overlayControls?.showSnapToggle !== false ||
              overlayControls?.showObjectSnapToggle !== false) ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {overlayControls?.showGridToggle !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onToggleGridVisible?.()}
                    style={{
                      ...hudButtonStyle,
                      ...(overlayControls?.gridVisible ? hudActiveButtonStyle : null),
                    }}
                >
                  {getGridToggleLabel({
                    locale: editorLocale,
                    enabled: Boolean(overlayControls?.gridVisible),
                  })}
                  </button>
                ) : null}
                {(overlayControls?.showGridSnapToggle !== false ||
                  overlayControls?.showSnapToggle !== false) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toggleGridSnap =
                        overlayControls?.onToggleGridSnap ?? overlayControls?.onToggleSnap;
                      toggleGridSnap?.();
                    }}
                    style={{
                      ...hudButtonStyle,
                      ...(
                        (overlayControls?.gridSnapEnabled ?? overlayControls?.snapEnabled)
                          ? hudActiveButtonStyle
                          : null
                      ),
                    }}
                  >
                    {getGridSnapToggleLabel({
                      locale: editorLocale,
                      enabled: Boolean(
                        overlayControls?.gridSnapEnabled ?? overlayControls?.snapEnabled
                      ),
                    })}
                  </button>
                ) : null}
                {overlayControls?.showObjectSnapToggle !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onToggleObjectSnap?.()}
                    style={{
                      ...hudButtonStyle,
                      ...(overlayControls?.objectSnapEnabled ? hudActiveButtonStyle : null),
                    }}
                  >
                    {getObjectSnapToggleLabel({
                      locale: editorLocale,
                      enabled: Boolean(overlayControls?.objectSnapEnabled),
                    })}
                  </button>
                ) : null}
              </div>
            ) : null}

            {(overlayControls?.showZoomControls !== false ||
              overlayControls?.showZoomValue !== false) ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px minmax(0, 1fr) 36px",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {overlayControls?.showZoomControls !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onZoomOut?.()}
                    style={hudButtonStyle}
                  >
                    -
                  </button>
                ) : (
                  <div />
                )}
                {overlayControls?.showZoomValue !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onResetZoom?.()}
                    style={{
                      ...hudButtonStyle,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.round((overlayControls?.zoom ?? 1) * 100)}%
                  </button>
                ) : (
                  <div />
                )}
                {overlayControls?.showZoomControls !== false ? (
                  <button
                    type="button"
                    onClick={() => overlayControls?.onZoomIn?.()}
                    style={hudButtonStyle}
                  >
                    +
                  </button>
                ) : (
                  <div />
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {selectionBounds &&
        selectedZoneTargets.length > 0 &&
        (permissions.moveZone || permissions.deleteZone) ? (
          <div
            ref={zoneToolbarRef}
            style={{
              position: "absolute",
              left: `${clamp(selectionBounds.x + selectionBounds.width / 2, 96, overlayWidth - 96)}px`,
              top: `${Math.max(18, selectionBounds.y - 18)}px`,
              transform: "translate(-50%, -100%)",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              rowGap: 6,
              gap: 8,
              maxWidth: `${Math.max(160, overlayWidth - 32)}px`,
              padding: "8px 10px",
              borderRadius: 14,
              border: resolvedEditorTheme.overlay.floatingToolbar.border,
              background: resolvedEditorTheme.overlay.floatingToolbar.background,
              color: resolvedEditorTheme.overlay.floatingToolbar.buttonText,
              boxShadow: resolvedEditorTheme.overlay.floatingToolbar.shadow,
              pointerEvents: "auto",
              zIndex: OVERLAY_Z_INDEX.floatingToolbar,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: resolvedEditorTheme.overlay.floatingToolbar.zoneLabelText,
                paddingRight: 4,
                whiteSpace: "nowrap",
              }}
            >
              {getSelectionToolbarCountLabel({
                locale: editorLocale,
                kind: "zone",
                count: selectedZoneTargets.length,
              })}
            </span>
            {selectedZoneTargets.length > 1 ? (
              <>
                <ToolbarGroup divider>
                  {ALIGN_COMMANDS.map(renderZoneSelectionButton)}
                </ToolbarGroup>
                <ToolbarGroup divider>
                  {DISTRIBUTE_COMMANDS.map(renderZoneSelectionButton)}
                </ToolbarGroup>
              </>
            ) : null}
            <ToolbarGroup divider>
              {ZORDER_COMMANDS.map((command) => (
                <button
                  key={command}
                  type="button"
                  disabled={!canRunZoneZOrderCommands}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    runZoneZOrderCommand(command as ZOrderMode);
                  }}
                  style={{
                    ...floatingToolbarButtonStyle,
                    color: canRunZoneZOrderCommands
                      ? floatingToolbarButtonStyle.color
                      : resolvedEditorTheme.overlay.floatingToolbar.buttonDisabledText,
                    cursor: canRunZoneZOrderCommands ? "pointer" : "not-allowed",
                  }}
                  title={getSelectionCommandLabel({
                    locale: editorLocale,
                    command: command as SelectionCommandKey,
                  })}
                >
                  {getSelectionCommandLabel({
                    locale: editorLocale,
                    command: command as SelectionCommandKey,
                  })}
                </button>
              ))}
            </ToolbarGroup>
            {commonZoneSelectionActions.length > 0 ? (
              <ToolbarGroup divider>
                {commonZoneSelectionActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    title={action.title}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      action.onClick({
                        zoneIds: [...selectedZoneIds],
                        zones: selectedZones,
                      });
                    }}
                    style={
                      action.variant === "danger"
                        ? floatingToolbarDangerButtonStyle
                        : floatingToolbarButtonStyle
                    }
                  >
                    {action.label}
                  </button>
                ))}
              </ToolbarGroup>
            ) : null}
            {permissions.deleteZone ? (
              <ToolbarGroup divider>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    requestDeleteCurrentSelection();
                  }}
                  style={{
                    ...floatingToolbarDangerButtonStyle,
                  }}
                >
                  {editorStrings.selectionToolbar.delete}
                </button>
              </ToolbarGroup>
            ) : null}
          </div>
        ) : null}

        {pathSelectionBounds &&
        selectedPathTargets.length > 0 &&
        (permissions.routePath || permissions.deletePath) ? (
          <div
            ref={pathToolbarRef}
            style={{
              position: "absolute",
              left: `${clamp(pathSelectionBounds.x + pathSelectionBounds.width / 2, 96, overlayWidth - 96)}px`,
              top: `${Math.max(18, pathSelectionBounds.y - 18)}px`,
              transform: "translate(-50%, -100%)",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              rowGap: 6,
              gap: 8,
              maxWidth: `${Math.max(160, overlayWidth - 32)}px`,
              padding: "8px 10px",
              borderRadius: 14,
              border: resolvedEditorTheme.overlay.floatingToolbar.border,
              background: resolvedEditorTheme.overlay.floatingToolbar.background,
              color: resolvedEditorTheme.overlay.floatingToolbar.buttonText,
              boxShadow: resolvedEditorTheme.overlay.floatingToolbar.shadow,
              pointerEvents: "auto",
              zIndex: OVERLAY_Z_INDEX.floatingToolbar,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: resolvedEditorTheme.overlay.floatingToolbar.pathLabelText,
                paddingRight: 4,
                whiteSpace: "nowrap",
              }}
            >
              {getSelectionToolbarCountLabel({
                locale: editorLocale,
                kind: "path",
                count: selectedPathTargets.length,
              })}
            </span>
            {selectedPathTargets.length > 1 ? (
              <>
                <ToolbarGroup divider>
                  {ALIGN_COMMANDS.map(renderPathSelectionButton)}
                </ToolbarGroup>
                <ToolbarGroup divider>
                  {DISTRIBUTE_COMMANDS.map(renderPathSelectionButton)}
                </ToolbarGroup>
              </>
            ) : null}
            <ToolbarGroup divider>
              {ZORDER_COMMANDS.map((command) => (
                <button
                  key={command}
                  type="button"
                  disabled={!canRunPathZOrderCommands}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    runPathZOrderCommand(command as ZOrderMode);
                  }}
                  style={{
                    ...floatingToolbarButtonStyle,
                    color: canRunPathZOrderCommands
                      ? floatingToolbarButtonStyle.color
                      : resolvedEditorTheme.overlay.floatingToolbar.buttonDisabledText,
                    cursor: canRunPathZOrderCommands ? "pointer" : "not-allowed",
                  }}
                  title={getSelectionCommandLabel({
                    locale: editorLocale,
                    command: command as SelectionCommandKey,
                  })}
                >
                  {getSelectionCommandLabel({
                    locale: editorLocale,
                    command: command as SelectionCommandKey,
                  })}
                </button>
              ))}
            </ToolbarGroup>
            {commonPathSelectionActions.length > 0 ? (
              <ToolbarGroup divider>
                {commonPathSelectionActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    title={action.title}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      action.onClick({
                        pathIds: [...selectedPathIds],
                        paths: selectedPathRefs,
                      });
                    }}
                    style={
                      action.variant === "danger"
                        ? floatingToolbarDangerButtonStyle
                        : floatingToolbarButtonStyle
                    }
                  >
                    {action.label}
                  </button>
                ))}
              </ToolbarGroup>
            ) : null}
            {permissions.deletePath ? (
              <ToolbarGroup divider>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    requestDeleteCurrentSelection();
                  }}
                  style={{
                    ...floatingToolbarDangerButtonStyle,
                  }}
                >
                  {editorStrings.selectionToolbar.delete}
                </button>
              </ToolbarGroup>
            ) : null}
          </div>
        ) : null}

        {deleteConfirmState?.kind === "zone-selection" &&
        selectionBounds &&
        deleteConfirmState.zoneIds.length > 1 ? (
          <div
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{
              position: "absolute",
              left: `${clamp(selectionBounds.x + selectionBounds.width / 2, 120, overlayWidth - 120)}px`,
              top: `${Math.max(72, selectionBounds.y - 88)}px`,
              transform: "translate(-50%, -100%)",
              minWidth: 196,
              padding: "12px 12px 10px",
              borderRadius: 14,
              border: resolvedEditorTheme.overlay.dialog.border,
              background: resolvedEditorTheme.overlay.dialog.background,
              boxShadow: resolvedEditorTheme.overlay.dialog.shadow,
              pointerEvents: "auto",
              zIndex: OVERLAY_Z_INDEX.selectionDialog,
              animation: shouldAnimateDeleteUi
                ? DELETE_ICON_POP_ANIMATION
                : undefined,
            }}
          >
            <div
              style={{
                color: resolvedEditorTheme.overlay.dialog.titleText,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 10,
                whiteSpace: "nowrap",
              }}
              >
              {editorStrings.deleteDialog.confirmSelection(
                formatDeleteSelectionLabel({
                  locale: editorLocale,
                  kind: "zone",
                  count: deleteConfirmState.zoneIds.length,
                })
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDeleteConfirmState(null);
                }}
                style={dialogSecondaryButtonStyle}
              >
                {editorStrings.deleteDialog.cancel}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  commitDeleteZoneSelection(deleteConfirmState.zoneIds);
                }}
                style={dialogDangerButtonStyle}
              >
                {editorStrings.deleteDialog.confirm}
              </button>
            </div>
          </div>
        ) : null}

        {deleteConfirmState?.kind === "path-selection" &&
        pathSelectionBounds &&
        deleteConfirmState.pathIds.length > 1 ? (
          <div
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{
              position: "absolute",
              left: `${clamp(pathSelectionBounds.x + pathSelectionBounds.width / 2, 120, overlayWidth - 120)}px`,
              top: `${Math.max(72, pathSelectionBounds.y - 88)}px`,
              transform: "translate(-50%, -100%)",
              minWidth: 196,
              padding: "12px 12px 10px",
              borderRadius: 14,
              border: resolvedEditorTheme.overlay.dialog.border,
              background: resolvedEditorTheme.overlay.dialog.background,
              boxShadow: resolvedEditorTheme.overlay.dialog.shadow,
              pointerEvents: "auto",
              zIndex: OVERLAY_Z_INDEX.selectionDialog,
              animation: shouldAnimateDeleteUi
                ? DELETE_ICON_POP_ANIMATION
                : undefined,
            }}
          >
            <div
              style={{
                color: resolvedEditorTheme.overlay.dialog.titleText,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 10,
                whiteSpace: "nowrap",
              }}
              >
              {editorStrings.deleteDialog.confirmSelection(
                formatDeleteSelectionLabel({
                  locale: editorLocale,
                  kind: "path",
                  count: deleteConfirmState.pathIds.length,
                })
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDeleteConfirmState(null);
                }}
                style={dialogSecondaryButtonStyle}
              >
                {editorStrings.deleteDialog.cancel}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  commitDeletePathSelection(deleteConfirmState.pathIds);
                }}
                style={dialogDangerButtonStyle}
              >
                {editorStrings.deleteDialog.confirm}
              </button>
            </div>
          </div>
        ) : null}

        {marqueeRect ? (
          <div
            style={{
              position: "absolute",
              left: `${marqueeRect.x}px`,
              top: `${marqueeRect.y}px`,
              width: `${marqueeRect.width}px`,
              height: `${marqueeRect.height}px`,
              border: resolvedEditorTheme.overlay.marquee.border,
              background: resolvedEditorTheme.overlay.marquee.background,
              boxShadow: resolvedEditorTheme.overlay.marquee.boxShadow,
              borderRadius: 12,
              pointerEvents: "none",
            }}
          />
        ) : null}

        {creatingPath && pathCreateTargetAnchorRect ? (
          <div
            style={{
              position: "absolute",
              left: `${pathCreateTargetAnchorRect.x}px`,
              top: `${pathCreateTargetAnchorRect.y}px`,
              width: `${pathCreateTargetAnchorRect.width}px`,
              height: `${pathCreateTargetAnchorRect.height}px`,
              borderRadius: 999,
              border: resolvedEditorTheme.overlay.connectTarget.border,
              background: resolvedEditorTheme.overlay.connectTarget.background,
              boxShadow: resolvedEditorTheme.overlay.connectTarget.boxShadow,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -12,
                padding: "4px 8px",
                borderRadius: 999,
                background: resolvedEditorTheme.overlay.connectTarget.badgeBackground,
                color: resolvedEditorTheme.overlay.connectTarget.badgeColor,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                boxShadow: resolvedEditorTheme.overlay.connectTarget.badgeShadow,
              }}
            >
              {editorStrings.target.connect}
            </div>
          </div>
        ) : null}

        {retargetingPath && pathRetargetTargetAnchorRect ? (
          <div
            style={{
              position: "absolute",
              left: `${pathRetargetTargetAnchorRect.x}px`,
              top: `${pathRetargetTargetAnchorRect.y}px`,
              width: `${pathRetargetTargetAnchorRect.width}px`,
              height: `${pathRetargetTargetAnchorRect.height}px`,
              borderRadius: 999,
              border: resolvedEditorTheme.overlay.connectTarget.border,
              background: resolvedEditorTheme.overlay.connectTarget.background,
              boxShadow: resolvedEditorTheme.overlay.connectTarget.boxShadow,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -12,
                padding: "4px 8px",
                borderRadius: 999,
                background: resolvedEditorTheme.overlay.connectTarget.badgeBackground,
                color: resolvedEditorTheme.overlay.connectTarget.badgeColor,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                boxShadow: resolvedEditorTheme.overlay.connectTarget.badgeShadow,
              }}
            >
              {editorStrings.target.reconnect}
            </div>
          </div>
        ) : null}

        {dropTargetScreenRects.map(({ zoneId, rect }) => (
          <div
            key={`drop-target-${zoneId}`}
            style={{
              position: "absolute",
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              borderRadius: 22,
              border: resolvedEditorTheme.overlay.dropTarget.border,
              background: resolvedEditorTheme.overlay.dropTarget.background,
              boxShadow: resolvedEditorTheme.overlay.dropTarget.boxShadow,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 10,
                top: -12,
                padding: "4px 8px",
                borderRadius: 999,
                background: resolvedEditorTheme.overlay.dropTarget.badgeBackground,
                color: resolvedEditorTheme.overlay.dropTarget.badgeColor,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                boxShadow: resolvedEditorTheme.overlay.dropTarget.badgeShadow,
              }}
            >
              {editorStrings.target.dropTarget}
            </div>
          </div>
        ))}

        {targets.map((target) => {
          const isDragging = draggingTarget?.key === target.key;
          const isResizingTarget = isResizing && isDragging;
          const isZoneSelected =
            target.kind === "zone" && selectedZoneIds.includes(target.zoneId);
          const isPathSelected =
            target.kind === "path" && selectedPathIds.includes(target.pathId);
          const isSelected =
            target.kind === "zone"
              ? isZoneSelected
              : isPathSelected;
          const visualState = getTargetVisualState({
            target,
            hoveredTargetKey,
            isSelected,
            draggingTargetKey: draggingTarget?.key ?? null,
          });
          const zone = target.kind === "zone" ? model.zonesById[target.zoneId] : undefined;
          // 종류 배지(좌상단)의 라벨/표시 여부를 타깃별로 결정.
          let badgePath: Path | undefined;
          if (resolveTargetBadgeLabel && target.kind === "path") {
            const badgeSourceZoneId = findPathSourceZoneId(model, target.pathId);
            badgePath = badgeSourceZoneId
              ? model.zonesById[badgeSourceZoneId]?.pathsById[target.pathId]
              : undefined;
          }
          const defaultBadgeLabel = getTargetBadgeLabelText({
            locale: editorLocale,
            kind: target.kind,
          });
          const resolvedBadgeLabel = resolveTargetBadgeLabel
            ? resolveTargetBadgeLabel({
                kind: target.kind,
                zone,
                path: badgePath,
                zoneId: target.kind === "zone" ? target.zoneId : undefined,
                pathId: target.kind === "path" ? target.pathId : undefined,
                model,
                locale: editorLocale,
                defaultLabel: defaultBadgeLabel,
              })
            : undefined;
          const badgeLabel =
            resolvedBadgeLabel === null
              ? null
              : typeof resolvedBadgeLabel === "string" && resolvedBadgeLabel.length > 0
                ? resolvedBadgeLabel
                : defaultBadgeLabel;
          const shouldShowBadge =
            badgeLabel !== null &&
            (targetBadgeVisibility === "always"
              ? true
              : targetBadgeVisibility === "hidden"
                ? false
                : shouldShowTargetMeta(visualState));
          const isEditingZone =
            target.kind === "zone" && editingZoneId === target.zoneId;
          const sourceAnchorScreenRect =
            target.kind === "zone"
              ? resolveZoneAnchorScreenRect({
                  frame,
                  camera,
                  zoneId: target.zoneId,
                  kind: "outlet",
                  resolveZoneShape,
                })
              : undefined;
          const sourceAnchorLocalRect =
            sourceAnchorScreenRect && target.kind === "zone"
              ? toLocalRect(target.rect, sourceAnchorScreenRect)
              : undefined;
          const pathLabelRect =
            target.kind === "path"
              ? frame.pipeline.componentLayout.pathsById[target.pathId]?.slots.label
              : undefined;
          const pathLabelScreenRect = pathLabelRect
            ? toScreenRect(pathLabelRect, camera)
            : undefined;
          const pathLabelLocalRect =
            pathLabelScreenRect && target.kind === "path"
              ? toLocalRect(target.rect, pathLabelScreenRect)
              : undefined;
          const pathOutputAnchorScreenRect =
            target.kind === "path"
              ? resolvePathOutputAnchorScreenRect({
                  frame,
                  camera,
                  pathId: target.pathId,
                })
              : undefined;
          const pathOutputAnchorLocalRect =
            pathOutputAnchorScreenRect && target.kind === "path"
              ? toLocalRect(target.rect, pathOutputAnchorScreenRect)
              : undefined;
          const cornerResizeHandleRect = getCornerResizeHandleRect(target.rect);
          const deleteButtonPosition = resolveDeleteButtonPosition(target);
          const isDeleteArmed = deleteArmedTargetKey === target.key;
          const isDeleteConfirmOpen =
            deleteConfirmState?.kind === "target" &&
            deleteConfirmState.target.key === target.key;
          const pathVisual =
            target.kind === "path"
              ? frame.pipeline.graphLayout.pathsById[target.pathId]
              : undefined;
          const shouldShowPathRetargetHandle =
            permissions.retargetPath &&
            target.kind === "path" &&
            !creatingPath &&
            !retargetingPath &&
            !isDeleteArmed &&
            !!pathOutputAnchorLocalRect &&
            (visualState === "hover" || visualState === "selected");
          const shouldShowPathResizeHandle =
            permissions.routePath &&
            target.kind === "path" &&
            !creatingPath &&
            !retargetingPath &&
            !isDeleteArmed &&
            (visualState === "hover" ||
              visualState === "selected" ||
              isResizingTarget);
          const zoneLockWidth = target.kind === "zone" && !!zone?.fixedWidth;
          const zoneLockHeight = target.kind === "zone" && !!zone?.fixedHeight;
          const zoneFullyLocked = zoneLockWidth && zoneLockHeight;
          const resizeCursor: "nwse-resize" | "ns-resize" | "ew-resize" =
            zoneLockWidth
              ? "ns-resize"
              : zoneLockHeight
                ? "ew-resize"
                : "nwse-resize";
          const shouldShowResizeHandle =
            permissions.resizeZone &&
            target.kind === "zone" &&
            !creatingPath &&
            !isDeleteArmed &&
            !zoneFullyLocked &&
            (visualState === "hover" ||
              visualState === "selected" ||
              isResizingTarget);
          const shouldShowPathEditTrigger =
            target.kind === "path" &&
            (!!editor.renderPathEditor ||
              !!editor.onPathLabelClick ||
              !!editor.onPathLabelDoubleClick ||
              !!editor.onPathLabelContextMenu) &&
            !isDeleteArmed &&
            !!pathLabelLocalRect &&
            !isDragging;
          const zoneOverlays =
            target.kind === "zone" && zone && editor.renderZoneOverlays
              ? editor.renderZoneOverlays({
                  zoneId: target.zoneId,
                  zone,
                  model,
                  layoutModel,
                  rect: target.rect,
                  isSelected: visualState === "selected",
                  isHovered: visualState === "hover",
                  isEditing: isEditingZone,
                  isDragging,
                  theme: resolvedEditorTheme,
                  openEditor: () => {
                    openZoneEditor(target.zoneId, target.key);
                  },
                  closeEditor: () => {
                    setEditingZoneId((current) =>
                      current === target.zoneId ? null : current
                    );
                  },
                })
              : null;

          return (
            <div
              key={target.key}
              title={`${target.label} move`}
              onPointerEnter={() => {
                if (isDragging) return;
                setHoveredTargetKey(target.key);
              }}
              onPointerLeave={() => {
                if (isDragging) return;
                setHoveredTargetKey((current) =>
                  current === target.key ? null : current
                );
              }}
              onDoubleClick={(event) => {
                if (target.kind !== "zone") return;
                if (!editor.onZoneEditClick && !editor.renderZoneEditor) return;

                event.preventDefault();
                event.stopPropagation();
                openZoneEditor(target.zoneId, target.key);
              }}
              onPointerDown={(event) => {
                if (isDeleteArmed) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }

                const isToggleSelection =
                  (target.kind === "zone" || target.kind === "path") &&
                  (event.shiftKey || event.metaKey || event.ctrlKey);

                if (isToggleSelection) {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelLongPress();
                  setDeleteArmedTargetKey(null);
                  setDeleteConfirmState(null);
                  if (target.kind === "zone") {
                    setSelectedPathIds([]);
                    setSelectedZoneIds((current) => {
                      const nextZoneIds = toggleZoneSelection(current, target.zoneId);
                      const selectedKeys = nextZoneIds.map((zoneId) => `zone:${zoneId}`);
                      setSelectedTargetKey(
                        selectedKeys.length === 1 ? selectedKeys[0] : null
                      );
                      return nextZoneIds;
                    });
                  } else {
                    setSelectedZoneIds([]);
                    setSelectedPathIds((current) => {
                      const nextPathIds = togglePathSelection(current, target.pathId);
                      const selectedKeys = nextPathIds.map((pathId) => `path:${pathId}`);
                      setSelectedTargetKey(
                        selectedKeys.length === 1 ? selectedKeys[0] : null
                      );
                      return nextPathIds;
                    });
                  }
                  return;
                }

                const shouldStartZoneGroupDrag =
                  target.kind === "zone" &&
                  selectedZoneIds.includes(target.zoneId) &&
                  selectedZoneIds.length > 1;
                const shouldStartPathGroupDrag =
                  target.kind === "path" &&
                  selectedPathIds.includes(target.pathId) &&
                  selectedPathIds.length > 1;
                const origin = shouldStartZoneGroupDrag
                  ? resolveGroupZoneDragOrigin({
                      model,
                      layoutModel,
                      zoneIds: selectedZoneIds,
                      primaryZoneId: target.zoneId,
                    })
                  : shouldStartPathGroupDrag
                  ? resolveGroupPathDragOrigin({
                      frame,
                      layoutModel,
                      pathIds: selectedPathIds,
                      primaryPathId: target.pathId,
                    })
                  : resolveMoveEditorDragOrigin({
                      model,
                      layoutModel,
                      target,
                      frame,
                    });
                if (!origin) return;

                cancelLongPress();
                setDeleteArmedTargetKey((current) =>
                  current === target.key ? current : null
                );
                setDeleteConfirmState((current) =>
                  current?.kind === "target" && current.target.key === target.key
                    ? current
                    : null
                );

                if (target.kind === "zone") {
                  event.preventDefault();
                  if (!shouldStartZoneGroupDrag || !isZoneSelected) {
                    setSelectedZoneIds([target.zoneId]);
                  }
                  setSelectedPathIds([]);
                } else {
                  setSelectedZoneIds([]);
                  if (!shouldStartPathGroupDrag || !isPathSelected) {
                    setSelectedPathIds([target.pathId]);
                  }
                }
                event.stopPropagation();

                if (
                  target.kind === "zone"
                    ? permissions.moveZone
                    : permissions.routePath
                ) {
                  dragRef.current = {
                    target,
                    origin,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                    hasMoved: false,
                  };
                }

                setSelectedTargetKey(target.key);
                setHoveredTargetKey(target.key);
                longPressRef.current = {
                  target,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                };
                longPressTimerRef.current = window.setTimeout(() => {
                  const active = longPressRef.current;
                  if (!active || active.target.key !== target.key) return;
                  if (
                    active.target.kind === "zone"
                      ? !permissions.deleteZone
                      : !permissions.deletePath
                  )
                    return;
                  cancelLongPress();
                  armDeleteTarget(target);
                }, deleteLongPressMs);
                if (target.kind === "zone") {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                }
              }}
              style={{
                position: "absolute",
                left: `${target.rect.x}px`,
                top: `${target.rect.y}px`,
                width: `${target.rect.width}px`,
                height: `${target.rect.height}px`,
                pointerEvents: "auto",
                cursor: isResizingTarget
                  ? resizeCursor
                  : isDragging
                    ? "grabbing"
                    : "grab",
                touchAction: "none",
                animation:
                  isDeleteArmed && shouldAnimateDeleteUi
                    ? DELETE_SHAKE_ANIMATION
                    : undefined,
                transformOrigin: "center center",
                ...getTargetOutlineStyle(target, visualState, resolvedEditorTheme),
              }}
            >
              {sourceAnchorLocalRect &&
              target.kind === "zone" &&
              permissions.createPath ? (
                <button
                  type="button"
                  title={`${target.label} add path`}
                  onPointerDown={(event) => {
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);
                    const currentScreenPoint = toCanvasScreenPoint(
                      overlayRef.current,
                      event.clientX,
                      event.clientY
                    );

                    event.preventDefault();
                    event.stopPropagation();

                    const nextState: PathCreateDragState = {
                      sourceZoneId: target.zoneId,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      currentScreenPoint,
                      hasMoved: false,
                    };
                    startTransaction({
                      kind: "create-path",
                      sourceZoneId: target.zoneId,
                    });

                    pathCreateRef.current = nextState;
                    setCreatingPath(nextState);
                    setPathCreateTargetZoneId(null);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    document.body.style.cursor = "crosshair";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    left: `${sourceAnchorLocalRect.x}px`,
                    top: `${sourceAnchorLocalRect.y}px`,
                    width: `${sourceAnchorLocalRect.width}px`,
                    height: `${sourceAnchorLocalRect.height}px`,
                    border: 0,
                    borderRadius: 999,
                    background: "transparent",
                    cursor: "crosshair",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                />
              ) : null}

              {shouldShowPathRetargetHandle ? (
                <button
                  type="button"
                  title={`${target.label} reconnect`}
                  onPointerDown={(event) => {
                    if (target.kind !== "path") return;
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);

                    const currentScreenPoint = toCanvasScreenPoint(
                      overlayRef.current,
                      event.clientX,
                      event.clientY
                    );
                    if (!pathVisual) return;

                    event.preventDefault();
                    event.stopPropagation();

                    const nextState: PathRetargetDragState = {
                      pathId: target.pathId,
                      sourceZoneId: pathVisual.sourceZoneId,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      currentScreenPoint,
                      hasMoved: false,
                    };
                    startTransaction({
                      kind: "retarget-path",
                      pathIds: [target.pathId],
                      sourceZoneId: pathVisual.sourceZoneId,
                    });

                    pathRetargetRef.current = nextState;
                    setRetargetingPath(nextState);
                    setRetargetPathTargetZoneId(null);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    document.body.style.cursor = "crosshair";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    left: `${pathOutputAnchorLocalRect?.x ?? 0}px`,
                    top: `${pathOutputAnchorLocalRect?.y ?? 0}px`,
                    width: `${pathOutputAnchorLocalRect?.width ?? 0}px`,
                    height: `${pathOutputAnchorLocalRect?.height ?? 0}px`,
                    border: resolvedEditorTheme.overlay.handles.connect.border,
                    borderRadius: 999,
                    background: resolvedEditorTheme.overlay.handles.connect.background,
                    boxShadow: resolvedEditorTheme.overlay.handles.connect.shadow,
                    cursor: "crosshair",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: resolvedEditorTheme.overlay.handles.connect.color,
                      fontSize: 13,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    →
                  </span>
                </button>
              ) : null}

              {shouldShowResizeHandle ? (
                <button
                  type="button"
                  title={`${target.label} resize`}
                  onPointerDown={(event) => {
                    if (target.kind !== "zone") return;
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);

                    const origin = resolveZoneResizeOrigin(
                      layoutModel,
                      target.zoneId
                    );
                    if (!origin) return;

                    event.preventDefault();
                    event.stopPropagation();

                    resizeRef.current = {
                      target,
                      origin,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                    };
                    startTransaction({
                      kind: "resize-zone",
                      zoneIds: [target.zoneId],
                    });

                    setDraggingTarget(target);
                    setIsResizing(true);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    onExclusionStateChange?.(getExclusionState(target));
                    document.body.style.cursor = resizeCursor;
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    right: -7,
                    bottom: -7,
                    width: 18,
                    height: 18,
                    border: resolvedEditorTheme.overlay.handles.zoneResize.border,
                    borderRadius: 999,
                    background: resolvedEditorTheme.overlay.handles.zoneResize.background,
                    boxShadow: resolvedEditorTheme.overlay.handles.zoneResize.shadow,
                    cursor: resizeCursor,
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      right: 4,
                      bottom: 3,
                      width: 7,
                      height: 7,
                      borderRight: `2px solid ${resolvedEditorTheme.overlay.handles.zoneResize.color}`,
                      borderBottom: `2px solid ${resolvedEditorTheme.overlay.handles.zoneResize.color}`,
                    }}
                  />
                </button>
              ) : null}

              {shouldShowPathResizeHandle ? (
                <button
                  type="button"
                  title={`${target.label} resize`}
                  onPointerDown={(event) => {
                    if (target.kind !== "path") return;
                    cancelLongPress();
                    setDeleteArmedTargetKey(null);
                    setDeleteConfirmState(null);

                    const origin = resolvePathResizeOrigin({
                      frame,
                      layoutModel,
                      pathId: target.pathId,
                    });
                    if (!origin) return;

                    event.preventDefault();
                    event.stopPropagation();

                    pathResizeRef.current = {
                      target,
                      origin,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                    };
                    startTransaction({
                      kind: "resize-path",
                      pathIds: [target.pathId],
                    });

                    setDraggingTarget(target);
                    setIsResizing(true);
                    setSelectedTargetKey(target.key);
                    setHoveredTargetKey(target.key);
                    onExclusionStateChange?.(getExclusionState(target));
                    document.body.style.cursor = "nwse-resize";
                    document.body.style.userSelect = "none";
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  style={{
                    position: "absolute",
                    left: `${cornerResizeHandleRect.x}px`,
                    top: `${cornerResizeHandleRect.y}px`,
                    width: `${cornerResizeHandleRect.size}px`,
                    height: `${cornerResizeHandleRect.size}px`,
                    border: resolvedEditorTheme.overlay.handles.pathResize.border,
                    borderRadius: 999,
                    background: resolvedEditorTheme.overlay.handles.pathResize.background,
                    boxShadow: resolvedEditorTheme.overlay.handles.pathResize.shadow,
                    cursor: "nwse-resize",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      right: 4,
                      bottom: 3,
                      width: 7,
                      height: 7,
                      borderRight: `2px solid ${resolvedEditorTheme.overlay.handles.pathResize.color}`,
                      borderBottom: `2px solid ${resolvedEditorTheme.overlay.handles.pathResize.color}`,
                    }}
                  />
                </button>
              ) : null}

              {isDeleteArmed ? (
                <button
                  type="button"
                  title={`${target.label} delete`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (shouldConfirmDelete) {
                      setDeleteConfirmState({ kind: "target", target });
                      return;
                    }

                    commitDeleteTarget(target);
                  }}
                  style={{
                    position: "absolute",
                    left: `${deleteButtonPosition.x}px`,
                    top: `${deleteButtonPosition.y}px`,
                    width: 24,
                    height: 24,
                    border: resolvedEditorTheme.overlay.handles.delete.border,
                    borderRadius: 999,
                    background: resolvedEditorTheme.overlay.handles.delete.background,
                    color: resolvedEditorTheme.overlay.handles.delete.color,
                    boxShadow: resolvedEditorTheme.overlay.handles.delete.shadow,
                    cursor: "pointer",
                    pointerEvents: "auto",
                    fontSize: 14,
                    fontWeight: 900,
                    lineHeight: 1,
                    animation: shouldAnimateDeleteUi
                      ? DELETE_ICON_POP_ANIMATION
                      : undefined,
                  }}
                >
                  ×
                </button>
              ) : null}

              {isDeleteConfirmOpen ? (
                <div
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  style={{
                    position: "absolute",
                    right: -6,
                    top: -64,
                    minWidth: 196,
                    padding: "12px 12px 10px",
                    borderRadius: 14,
                    border: resolvedEditorTheme.overlay.dialog.border,
                    background: resolvedEditorTheme.overlay.dialog.background,
                    boxShadow: resolvedEditorTheme.overlay.dialog.shadow,
                    pointerEvents: "auto",
                    zIndex: OVERLAY_Z_INDEX.itemDialog,
                    animation: shouldAnimateDeleteUi
                      ? DELETE_ICON_POP_ANIMATION
                      : undefined,
                  }}
                >
                  <div
                    style={{
                      color: resolvedEditorTheme.overlay.dialog.titleText,
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editorStrings.deleteDialog.confirmTarget(
                      formatDeleteTargetLabel(editorLocale, target)
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDeleteConfirmState(null);
                      }}
                      style={dialogSecondaryButtonStyle}
                    >
                      {editorStrings.deleteDialog.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        commitDeleteTarget(target);
                      }}
                      style={dialogDangerButtonStyle}
                    >
                      {editorStrings.deleteDialog.confirm}
                    </button>
                  </div>
                </div>
              ) : null}

              {zoneOverlays !== null ? (
                // 소비자가 그린 오버레이 레이어. 컨테이너는 pointer-events:none 라
                // 빈 영역 클릭은 존(드래그)으로 통과하고, 소비자가 pointerEvents:
                // "auto" 를 준 버튼만 상호작용한다. 그 클릭이 드래그/마퀴를 시작하지
                // 않도록 여기서 전파만 막는다(기본 동작은 막지 않음).
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  {zoneOverlays}
                </div>
              ) : null}
              {shouldShowPathEditTrigger && pathLabelLocalRect ? (
                <button
                  type="button"
                  title={`${target.label} edit`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedTargetKey(target.key);
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (isPathLabelClickSuppressed(target.key)) return;
                    setSelectedTargetKey(target.key);
                    const payload = resolvePathLabelEventPayload({
                      model,
                      pathId: target.pathId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
                    if (!payload) return;
                    const trigger = editor.onPathLabelDoubleClick ?? editor.onPathLabelClick;
                    openPathEditor(payload, target.key, trigger);
                  }}
                  onContextMenu={(event) => {
                    if (!editor.onPathLabelContextMenu && !editor.renderPathEditor) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    if (isPathLabelClickSuppressed(target.key)) return;
                    setSelectedTargetKey(target.key);
                    const payload = resolvePathLabelEventPayload({
                      model,
                      pathId: target.pathId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    });
                    if (!payload) return;
                    openPathEditor(payload, target.key, editor.onPathLabelContextMenu);
                  }}
                  style={{
                    position: "absolute",
                    left: `${pathLabelLocalRect.x}px`,
                    top: `${pathLabelLocalRect.y}px`,
                    width: `${pathLabelLocalRect.width}px`,
                    height: `${pathLabelLocalRect.height}px`,
                    border: 0,
                    borderRadius: 10,
                    background: "transparent",
                    color: "transparent",
                    cursor: "pointer",
                    pointerEvents: "auto",
                  }}
                >
                  {editorStrings.target.editPath}
                </button>
              ) : null}
              {shouldShowBadge ||
              (shouldShowTargetMeta(visualState) && showTargetStateChip) ? (
                <>
                  {shouldShowBadge ? (
                  <div
                    style={{
                      position: "absolute",
                      left: 10,
                      top: -12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      boxShadow: resolvedEditorTheme.overlay.metaChip.shadow,
                      ...getTargetBadgeStyle(visualState, resolvedEditorTheme),
                    }}
                  >
                    {badgeLabel}
                  </div>
                  ) : null}
                  {shouldShowTargetMeta(visualState) && showTargetStateChip ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 10,
                      bottom: 8,
                      padding: "3px 7px",
                      borderRadius: 999,
                      background: resolvedEditorTheme.overlay.metaChip.background,
                      color: resolvedEditorTheme.overlay.metaChip.color,
                      fontSize: 10,
                      fontWeight: 700,
                      boxShadow: resolvedEditorTheme.overlay.metaChip.shadow,
                    }}
                  >
                    {getTargetMetaStateLabel({
                      locale: editorLocale,
                      isDragging,
                      isResizing: isResizingTarget,
                    })}
                  </div>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {deleteUndoState ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 16,
            border: resolvedEditorTheme.overlay.toast.border,
            background: resolvedEditorTheme.overlay.toast.background,
            color: resolvedEditorTheme.overlay.toast.text,
            boxShadow: resolvedEditorTheme.overlay.toast.shadow,
            pointerEvents: "auto",
            zIndex: OVERLAY_Z_INDEX.toast,
            animation: shouldAnimateDeleteUi
              ? DELETE_TOAST_IN_ANIMATION
              : undefined,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {editorStrings.deleteDialog.deleted(deleteUndoState.label)}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              clearDeleteUndoTimer();
              editor.history?.onUndo?.();
              setDeleteUndoState(null);
            }}
            style={{
              border: resolvedEditorTheme.overlay.toast.actionButton.border,
              background: resolvedEditorTheme.overlay.toast.actionButton.background,
              color: resolvedEditorTheme.overlay.toast.actionButton.color,
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 800,
              cursor: editor.history?.canUndo ? "pointer" : "not-allowed",
              opacity: editor.history?.canUndo ? 1 : 0.56,
            }}
            disabled={!editor.history?.canUndo}
          >
            {editorStrings.hud.undo}
          </button>
        </div>
      ) : null}

      {editingZone && editor.renderZoneEditor
        ? editor.renderZoneEditor({
            zoneId: editingZone.id,
            zone: editingZone,
            model,
            layoutModel,
            onModelChange: editor.onModelChange,
            onLayoutModelChange: editor.onLayoutModelChange,
            closeEditor: () => {
              setEditingZoneId(null);
            },
          })
        : null}

      {editingPath && editingPathSourceZone && editor.renderPathEditor
        ? editor.renderPathEditor({
            pathId: editingPath.id,
            path: editingPath,
            sourceZoneId: editingPathSourceZone.id,
            sourceZone: editingPathSourceZone,
            model,
            layoutModel,
            onModelChange: editor.onModelChange,
            onLayoutModelChange: editor.onLayoutModelChange,
            closeEditor: () => {
              setEditingPathState(null);
            },
          })
        : null}
    </div>
  );
}
