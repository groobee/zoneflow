import type {
  Path,
  PathId,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneId,
} from "@zoneflow/core";
import type { Rect } from "@zoneflow/renderer-dom";
import type { ZoneflowEditorTheme } from "@zoneflow/editor-dom";

/**
 * 소비자가 에디터에 주입하는 "그리기 훅"들의 prop 계약. 존 배치/이동을 다루는
 * ZoneMoveEditorOverlay 구현과 분리해, 무엇을 그릴지에 대한 계약만 모아둔다.
 */

export type ZoneEditorButtonRenderProps = {
  zoneId: ZoneId;
  zone: Zone;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  rect: Rect;
  isSelected: boolean;
  isEditing: boolean;
  theme?: ZoneflowEditorTheme;
  openEditor: () => void;
  closeEditor: () => void;
};

/**
 * `renderZoneOverlays` 에 넘어가는 컨텍스트. 라이브러리는 편집 버튼 같은 걸
 * 강제로 그리지 않는다 — 대신 존마다 본문 위를 덮는 오버레이 레이어(존 rect
 * 전체)를 주고, 소비자가 원하는 버튼/배지/컨트롤을 직접 그린다.
 *
 * - 오버레이 컨테이너는 `pointer-events: none` 이라 빈 영역 클릭은 존(드래그)으로
 *   통과한다. 소비자는 자기 버튼에 `pointerEvents: "auto"` 를 주면 되고, 그
 *   클릭이 드래그를 시작하지 않도록 라이브러리가 컨테이너에서 막아준다.
 * - `openEditor()` 는 `renderZoneEditor` 패널(또는 `onZoneEditClick`)을 여는
 *   헬퍼. 편집과 무관한 오버레이라면 무시하면 된다.
 * - hover/선택/편집/드래그 상태를 받아 언제 무엇을 그릴지 소비자가 결정한다
 *   (안 그릴 땐 `null` 반환).
 */
export type ZoneOverlayRenderProps = {
  zoneId: ZoneId;
  zone: Zone;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  rect: Rect;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  isDragging: boolean;
  theme: ZoneflowEditorTheme;
  openEditor: () => void;
  closeEditor: () => void;
};

export type ZoneEditorRenderProps = {
  zoneId: ZoneId;
  zone: Zone;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  onModelChange?: (nextModel: UniverseModel) => void;
  onLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  closeEditor: () => void;
};

export type PathEditorRenderProps = {
  pathId: PathId;
  path: Path;
  sourceZoneId: ZoneId;
  sourceZone: Zone;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  onModelChange?: (nextModel: UniverseModel) => void;
  onLayoutModelChange: (nextLayoutModel: UniverseLayoutModel) => void;
  closeEditor: () => void;
};
