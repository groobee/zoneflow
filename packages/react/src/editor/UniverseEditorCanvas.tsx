import { UniverseCanvas, type UniverseCanvasProps } from "../canvas/UniverseCanvas";
import type { ZoneMoveEditorConfig } from "./ZoneMoveEditorOverlay";
import type { UniverseEditorController } from "./useUniverseEditor";

type ControlledZoneMoveEditorConfig = Omit<
  ZoneMoveEditorConfig,
  | "enabled"
  | "gridSnap"
  | "onModelChange"
  | "onLayoutModelChange"
  | "onTransactionStart"
  | "onTransactionCommit"
  | "onTransactionCancel"
  | "history"
>;

export type UniverseEditorCanvasProps = Omit<
  UniverseCanvasProps,
  "model" | "layoutModel" | "zoneMoveEditor"
> & {
  editor: UniverseEditorController;
  editorConfig?: ControlledZoneMoveEditorConfig;
};

export function UniverseEditorCanvas(props: UniverseEditorCanvasProps) {
  const { editor, editorConfig, grid, ...canvasProps } = props;

  const zoneMoveEditor: ZoneMoveEditorConfig | undefined = editor.isEditMode
    ? {
        ...editorConfig,
        enabled: true,
        gridSnap: {
          enabled: editor.gridSnapEnabled,
          size: editor.gridSnapSize,
        },
        onModelChange: editor.updateDraftModel,
        onLayoutModelChange: editor.updateDraftLayoutModel,
        onTransactionStart: editor.beginTransaction,
        onTransactionCommit: editor.commitTransaction,
        onTransactionCancel: editor.cancelTransaction,
        history: {
          canUndo: editor.canUndo,
          onUndo: editor.undo,
        },
      }
    : undefined;

  return (
    <UniverseCanvas
      {...canvasProps}
      model={editor.model}
      layoutModel={editor.layoutModel}
      grid={{
        ...(grid ?? {}),
        enabled: editor.gridVisible,
        size: editor.gridSnapSize,
      }}
      zoneMoveEditor={zoneMoveEditor}
    />
  );
}
