import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import type { EditorTransactionMeta } from "./ZoneMoveEditorOverlay";
import { useUniverseEditorSession } from "./useUniverseEditorSession";

export type UniverseEditorGridSize = 8 | 12 | 16 | 24;

export type UniverseEditorController = {
  isEditMode: boolean;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  activeTransaction: EditorTransactionMeta | null;
  canUndo: boolean;
  canRedo: boolean;
  gridSnapEnabled: boolean;
  gridSnapSize: UniverseEditorGridSize;
  gridVisible: boolean;
  setGridSnapEnabled: Dispatch<SetStateAction<boolean>>;
  setGridSnapSize: Dispatch<SetStateAction<UniverseEditorGridSize>>;
  setGridVisible: Dispatch<SetStateAction<boolean>>;
  toggleGridSnap: () => void;
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
  undo: () => void;
  redo: () => void;
};

export function useUniverseEditor(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  setModel: Dispatch<SetStateAction<UniverseModel>>;
  setLayoutModel: Dispatch<SetStateAction<UniverseLayoutModel>>;
  initialGridSnapEnabled?: boolean;
  initialGridSnapSize?: UniverseEditorGridSize;
  initialGridVisible?: boolean;
}): UniverseEditorController {
  const {
    model,
    layoutModel,
    setModel,
    setLayoutModel,
    initialGridSnapEnabled = true,
    initialGridSnapSize = 16,
    initialGridVisible = false,
  } = params;

  const session = useUniverseEditorSession({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
  });
  const [gridSnapEnabled, setGridSnapEnabled] = useState(initialGridSnapEnabled);
  const [gridSnapSize, setGridSnapSize] =
    useState<UniverseEditorGridSize>(initialGridSnapSize);
  const [gridVisible, setGridVisible] = useState(initialGridVisible);

  const toggleGridSnap = useCallback(() => {
    setGridSnapEnabled((current) => !current);
  }, []);

  const toggleGridVisible = useCallback(() => {
    setGridVisible((current) => !current);
  }, []);

  return {
    ...session,
    gridSnapEnabled,
    gridSnapSize,
    gridVisible,
    setGridSnapEnabled,
    setGridSnapSize,
    setGridVisible,
    toggleGridSnap,
    toggleGridVisible,
  };
}
