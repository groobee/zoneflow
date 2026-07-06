import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FlowDirection, UniverseLayoutModel, UniverseModel, ZoneId } from "@zoneflow/core";
import type { EditorTransactionMeta } from "./ZoneMoveEditorOverlay";
import {
  useUniverseEditorSession,
  type ZoneSizeInput,
} from "./useUniverseEditorSession";

export type UniverseEditorGridSize = 8 | 12 | 16 | 24;

export type UniverseEditorController = {
  isEditMode: boolean;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  activeTransaction: EditorTransactionMeta | null;
  canUndo: boolean;
  canRedo: boolean;
  gridSnapEnabled: boolean;
  objectSnapEnabled: boolean;
  gridSnapSize: UniverseEditorGridSize;
  gridVisible: boolean;
  setGridSnapEnabled: Dispatch<SetStateAction<boolean>>;
  setObjectSnapEnabled: Dispatch<SetStateAction<boolean>>;
  setGridSnapSize: Dispatch<SetStateAction<UniverseEditorGridSize>>;
  setGridVisible: Dispatch<SetStateAction<boolean>>;
  toggleGridSnap: () => void;
  toggleObjectSnap: () => void;
  toggleGridVisible: () => void;
  startEdit: () => void;
  applyEdit: () => void;
  cancelEdit: () => void;
  resetForSampleChange: () => void;
  updateDraftModel: (nextModel: UniverseModel) => void;
  updateDraftLayoutModel: (nextLayoutModel: UniverseLayoutModel) => void;
  beginTransaction: (transaction: EditorTransactionMeta) => void;
  commitTransaction: (transaction?: EditorTransactionMeta) => void;
  cancelTransaction: (transaction?: EditorTransactionMeta) => void;
  /**
   * Programmatically resize a zone (e.g. a view-mode toggle). Lands as one
   * undo step in edit mode, or commits directly to the layout model otherwise.
   */
  resizeZone: (zoneId: ZoneId, size: ZoneSizeInput) => void;
  undo: () => void;
  redo: () => void;
};

export type { ZoneSizeInput };

export function useUniverseEditor(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  setModel: Dispatch<SetStateAction<UniverseModel>>;
  setLayoutModel: Dispatch<SetStateAction<UniverseLayoutModel>>;
  initialGridSnapEnabled?: boolean;
  initialObjectSnapEnabled?: boolean;
  initialGridSnapSize?: UniverseEditorGridSize;
  initialGridVisible?: boolean;
  /** 흐름 방향 — 캔버스 flowDirection 과 같은 값을 준다(기본 leftToRight). */
  flowDirection?: FlowDirection;
}): UniverseEditorController {
  const {
    model,
    layoutModel,
    setModel,
    setLayoutModel,
    initialGridSnapEnabled = true,
    initialObjectSnapEnabled = true,
    initialGridSnapSize = 16,
    initialGridVisible = false,
    flowDirection,
  } = params;

  const session = useUniverseEditorSession({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
    flowDirection,
  });
  const [gridSnapEnabled, setGridSnapEnabled] = useState(initialGridSnapEnabled);
  const [objectSnapEnabled, setObjectSnapEnabled] = useState(initialObjectSnapEnabled);
  const [gridSnapSize, setGridSnapSize] =
    useState<UniverseEditorGridSize>(initialGridSnapSize);
  const [gridVisible, setGridVisible] = useState(initialGridVisible);

  const toggleGridSnap = useCallback(() => {
    setGridSnapEnabled((current) => !current);
  }, []);

  const toggleGridVisible = useCallback(() => {
    setGridVisible((current) => !current);
  }, []);

  const toggleObjectSnap = useCallback(() => {
    setObjectSnapEnabled((current) => !current);
  }, []);

  return {
    ...session,
    gridSnapEnabled,
    objectSnapEnabled,
    gridSnapSize,
    gridVisible,
    setGridSnapEnabled,
    setObjectSnapEnabled,
    setGridSnapSize,
    setGridVisible,
    toggleGridSnap,
    toggleObjectSnap,
    toggleGridVisible,
  };
}
