import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "../internal/hooks.js";
import type { Dispatch, SetStateAction } from "react";
import {
  resizeZoneLayout,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import type { EditorTransactionMeta } from "./ZoneMoveEditorOverlay.js";

/** Target size for {@link useUniverseEditorSession}'s `resizeZone`. */
export type ZoneSizeInput = {
  width?: number;
  height?: number;
};

type UniverseSnapshot = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
};

type HistoryState = {
  past: UniverseSnapshot[];
  future: UniverseSnapshot[];
};

const EMPTY_HISTORY: HistoryState = {
  past: [],
  future: [],
};

const HISTORY_LIMIT = 100;

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

function trimHistory(entries: UniverseSnapshot[]): UniverseSnapshot[] {
  if (entries.length <= HISTORY_LIMIT) return entries;
  return entries.slice(entries.length - HISTORY_LIMIT);
}

function isSameSnapshot(a: UniverseSnapshot, b: UniverseSnapshot): boolean {
  return a.model === b.model && a.layoutModel === b.layoutModel;
}

// The draft is a detached copy so consumer-side mutation of the committed
// objects cannot leak into it. Values structuredClone rejects (functions or
// class instances in `meta`) fall back to sharing — every zoneflow mutation
// is immutable, so sharing is safe.
function cloneForDraft<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

export function useUniverseEditorSession(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  setModel: Dispatch<SetStateAction<UniverseModel>>;
  setLayoutModel: Dispatch<SetStateAction<UniverseLayoutModel>>;
}) {
  const { model, layoutModel, setModel, setLayoutModel } = params;
  const [draftSnapshot, setDraftSnapshot] = useState<UniverseSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryState>(EMPTY_HISTORY);
  const [activeTransaction, setActiveTransaction] =
    useState<EditorTransactionMeta | null>(null);

  const committedSnapshot = useMemo(
    () => ({
      model,
      layoutModel,
    }),
    [layoutModel, model]
  );

  const presentSnapshot = draftSnapshot ?? committedSnapshot;
  // presentRef / historyRef / isEditingRef are written synchronously by every
  // handler that changes them, so a handler that runs before React re-renders
  // (startEdit(); updateDraftModel(x) in one click, or two patches from
  // separate pointer events) already sees the new value. Effects never write
  // them back from a render — a late effect would rewind a newer value.
  const presentRef = useRef<UniverseSnapshot>(presentSnapshot);
  const historyRef = useRef<HistoryState>(history);
  const isEditingRef = useRef(draftSnapshot !== null);
  const pendingBaselineRef = useRef<UniverseSnapshot | null>(null);
  const pendingFlushScheduledRef = useRef(false);
  const activeTransactionRef = useRef<{
    meta: EditorTransactionMeta;
    baseline: UniverseSnapshot;
  } | null>(null);

  // Outside edit mode the present snapshot follows the app's committed props.
  useIsomorphicLayoutEffect(() => {
    if (isEditingRef.current) return;
    presentRef.current = committedSnapshot;
  }, [committedSnapshot]);

  const replaceDraftSnapshot = useCallback((nextSnapshot: UniverseSnapshot) => {
    presentRef.current = nextSnapshot;
    isEditingRef.current = true;
    setDraftSnapshot(nextSnapshot);
  }, []);

  const clearPendingHistory = useCallback(() => {
    pendingBaselineRef.current = null;
    pendingFlushScheduledRef.current = false;
  }, []);

  const commitHistoryBaseline = useCallback((baseline: UniverseSnapshot) => {
    const current = presentRef.current;
    if (isSameSnapshot(baseline, current)) return;

    const nextHistory: HistoryState = {
      past: trimHistory([...historyRef.current.past, baseline]),
      future: [],
    };

    historyRef.current = nextHistory;
    setHistory(nextHistory);
  }, []);

  const flushPendingHistory = useCallback(() => {
    const baseline = pendingBaselineRef.current;
    pendingBaselineRef.current = null;
    pendingFlushScheduledRef.current = false;
    if (!baseline) return;
    commitHistoryBaseline(baseline);
  }, [commitHistoryBaseline]);

  const scheduleImmediateHistory = useCallback(
    (baseline: UniverseSnapshot) => {
      if (activeTransactionRef.current) return;

      if (!pendingBaselineRef.current) {
        pendingBaselineRef.current = baseline;
      }

      if (pendingFlushScheduledRef.current) return;
      pendingFlushScheduledRef.current = true;

      queueMicrotask(() => {
        flushPendingHistory();
      });
    },
    [flushPendingHistory]
  );

  const updateDraftSnapshot = useCallback(
    (patch: {
      model?: UniverseModel;
      layoutModel?: UniverseLayoutModel;
    }) => {
      if (!isEditingRef.current && !activeTransactionRef.current) {
        return;
      }

      const current = presentRef.current;
      const nextSnapshot: UniverseSnapshot = {
        model: patch.model ?? current.model,
        layoutModel: patch.layoutModel ?? current.layoutModel,
      };

      if (isSameSnapshot(current, nextSnapshot)) return;

      replaceDraftSnapshot(nextSnapshot);

      if (!activeTransactionRef.current) {
        scheduleImmediateHistory(current);
      }
    },
    [replaceDraftSnapshot, scheduleImmediateHistory]
  );

  const resetSessionState = useCallback(
    (nextCommitted?: UniverseSnapshot) => {
      clearPendingHistory();
      activeTransactionRef.current = null;
      setActiveTransaction(null);
      setHistory(EMPTY_HISTORY);
      historyRef.current = EMPTY_HISTORY;
      isEditingRef.current = false;
      setDraftSnapshot(null);
      presentRef.current = nextCommitted ?? committedSnapshot;
    },
    [clearPendingHistory, committedSnapshot]
  );

  const startEdit = useCallback(() => {
    clearPendingHistory();
    activeTransactionRef.current = null;
    setActiveTransaction(null);
    setHistory(EMPTY_HISTORY);
    historyRef.current = EMPTY_HISTORY;

    const nextSnapshot: UniverseSnapshot = {
      model: cloneForDraft(model),
      layoutModel: cloneForDraft(layoutModel),
    };

    replaceDraftSnapshot(nextSnapshot);
  }, [clearPendingHistory, layoutModel, model, replaceDraftSnapshot]);

  const applyEdit = useCallback(() => {
    if (!isEditingRef.current) return;

    flushPendingHistory();

    if (activeTransactionRef.current) {
      commitHistoryBaseline(activeTransactionRef.current.baseline);
      activeTransactionRef.current = null;
      setActiveTransaction(null);
    }

    const snapshot = presentRef.current;
    setModel(snapshot.model);
    setLayoutModel(snapshot.layoutModel);
    resetSessionState(snapshot);
  }, [
    commitHistoryBaseline,
    flushPendingHistory,
    resetSessionState,
    setLayoutModel,
    setModel,
  ]);

  const cancelEdit = useCallback(() => {
    resetSessionState();
  }, [resetSessionState]);

  const resetForSampleChange = useCallback(() => {
    resetSessionState();
  }, [resetSessionState]);

  const beginTransaction = useCallback(
    (transaction: EditorTransactionMeta) => {
      if (!isEditingRef.current) return;
      flushPendingHistory();
      if (activeTransactionRef.current) return;

      activeTransactionRef.current = {
        meta: transaction,
        baseline: presentRef.current,
      };
      setActiveTransaction(transaction);
    },
    [flushPendingHistory]
  );

  const commitTransaction = useCallback(
    (transaction?: EditorTransactionMeta) => {
      const active = activeTransactionRef.current;
      if (!active) return;
      if (transaction && active.meta.kind !== transaction.kind) return;

      activeTransactionRef.current = null;
      setActiveTransaction(null);
      commitHistoryBaseline(active.baseline);
    },
    [commitHistoryBaseline]
  );

  const cancelTransaction = useCallback(
    (transaction?: EditorTransactionMeta) => {
      const active = activeTransactionRef.current;
      if (!active) return;
      if (transaction && active.meta.kind !== transaction.kind) return;

      activeTransactionRef.current = null;
      setActiveTransaction(null);
      replaceDraftSnapshot(active.baseline);
    },
    [replaceDraftSnapshot]
  );

  /**
   * Programmatically resize a zone — the counterpart to dragging the resize
   * handle. Built for app-driven sizing such as a "brief / essential / detail"
   * view-mode toggle: pair it with the size-based density engine and the zone
   * reveals more or less automatically.
   *
   * - In edit mode it lands as a single `resize-zone` transaction (one undo
   *   step), so it composes with the editor's history just like a handle drag.
   * - Outside edit mode it commits straight to the app's layout model.
   *
   * No-ops when the zone has no layout or the size is unchanged.
   */
  const resizeZone = useCallback(
    (zoneId: ZoneId, size: ZoneSizeInput) => {
      const current = presentRef.current;
      const layout = current.layoutModel.zoneLayoutsById[zoneId];
      if (!layout) return;

      // Honor the zone's declared minimum (same floor the resize handle uses),
      // so programmatic sizing — e.g. a "brief" view mode — can't shrink a zone
      // below where its minimal info fits.
      const zone = current.model.zonesById[zoneId];
      const clampW = (w: number | undefined) =>
        w != null && zone?.minWidth != null ? Math.max(zone.minWidth, w) : w;
      const clampH = (h: number | undefined) =>
        h != null && zone?.minHeight != null ? Math.max(zone.minHeight, h) : h;

      const nextWidth = clampW(size.width ?? layout.width);
      const nextHeight = clampH(size.height ?? layout.height);
      if (nextWidth === layout.width && nextHeight === layout.height) return;

      // resizeZoneLayout (not updateZoneLayout) so the inlet/outlet anchors
      // follow the new edges — otherwise they'd detach from the resized zone.
      const nextLayoutModel = resizeZoneLayout(current.layoutModel, zoneId, {
        width: nextWidth,
        height: nextHeight,
      });

      if (isEditingRef.current) {
        // Group as one undo step alongside the rest of the edit session.
        const meta: EditorTransactionMeta = {
          kind: "resize-zone",
          zoneIds: [zoneId],
        };
        beginTransaction(meta);
        updateDraftSnapshot({ layoutModel: nextLayoutModel });
        commitTransaction(meta);
      } else {
        // Not editing — apply directly to the committed layout model. Functional
        // form so several resizeZone calls in one tick (e.g. a batch view-mode
        // toggle) accumulate instead of clobbering each other.
        setLayoutModel((prev) =>
          resizeZoneLayout(prev, zoneId, {
            width: nextWidth,
            height: nextHeight,
          })
        );
      }
    },
    [beginTransaction, commitTransaction, setLayoutModel, updateDraftSnapshot]
  );

  const canUndo = draftSnapshot !== null && history.past.length > 0;
  const canRedo = draftSnapshot !== null && history.future.length > 0;

  const undo = useCallback(() => {
    if (!isEditingRef.current) return;
    if (activeTransactionRef.current) return;

    flushPendingHistory();

    const currentHistory = historyRef.current;
    const previous = currentHistory.past[currentHistory.past.length - 1];
    if (!previous) return;

    const current = presentRef.current;
    const nextHistory: HistoryState = {
      past: currentHistory.past.slice(0, -1),
      future: trimHistory([current, ...currentHistory.future]),
    };

    historyRef.current = nextHistory;
    setHistory(nextHistory);
    replaceDraftSnapshot(previous);
  }, [flushPendingHistory, replaceDraftSnapshot]);

  const redo = useCallback(() => {
    if (!isEditingRef.current) return;
    if (activeTransactionRef.current) return;

    flushPendingHistory();

    const currentHistory = historyRef.current;
    const next = currentHistory.future[0];
    if (!next) return;

    const current = presentRef.current;
    const nextHistory: HistoryState = {
      past: trimHistory([...currentHistory.past, current]),
      future: currentHistory.future.slice(1),
    };

    historyRef.current = nextHistory;
    setHistory(nextHistory);
    replaceDraftSnapshot(next);
  }, [flushPendingHistory, replaceDraftSnapshot]);

  const isEditMode = draftSnapshot !== null;

  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (key === "y") {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, redo, undo]);

  const updateDraftModel = useCallback(
    (nextModel: UniverseModel) => updateDraftSnapshot({ model: nextModel }),
    [updateDraftSnapshot]
  );
  const updateDraftLayoutModel = useCallback(
    (nextLayoutModel: UniverseLayoutModel) =>
      updateDraftSnapshot({ layoutModel: nextLayoutModel }),
    [updateDraftSnapshot]
  );

  return {
    isEditMode,
    model: presentSnapshot.model,
    layoutModel: presentSnapshot.layoutModel,
    activeTransaction,
    canUndo,
    canRedo,
    startEdit,
    applyEdit,
    cancelEdit,
    resetForSampleChange,
    updateDraftModel,
    updateDraftLayoutModel,
    beginTransaction,
    commitTransaction,
    cancelTransaction,
    resizeZone,
    undo,
    redo,
  };
}
