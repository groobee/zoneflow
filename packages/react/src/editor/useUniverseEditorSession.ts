import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import type { EditorTransactionMeta } from "./ZoneMoveEditorOverlay";

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
  const presentRef = useRef<UniverseSnapshot>(presentSnapshot);
  const historyRef = useRef<HistoryState>(history);
  const pendingBaselineRef = useRef<UniverseSnapshot | null>(null);
  const pendingFlushScheduledRef = useRef(false);
  const activeTransactionRef = useRef<{
    meta: EditorTransactionMeta;
    baseline: UniverseSnapshot;
  } | null>(null);

  useEffect(() => {
    presentRef.current = presentSnapshot;
  }, [presentSnapshot]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    if (draftSnapshot) return;
    presentRef.current = committedSnapshot;
  }, [committedSnapshot, draftSnapshot]);

  const replaceDraftSnapshot = useCallback((nextSnapshot: UniverseSnapshot) => {
    presentRef.current = nextSnapshot;
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
      if (!draftSnapshot && !activeTransactionRef.current) {
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
    [draftSnapshot, replaceDraftSnapshot, scheduleImmediateHistory]
  );

  const resetSessionState = useCallback(
    (nextCommitted?: UniverseSnapshot) => {
      clearPendingHistory();
      activeTransactionRef.current = null;
      setActiveTransaction(null);
      setHistory(EMPTY_HISTORY);
      historyRef.current = EMPTY_HISTORY;
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
      model: structuredClone(model),
      layoutModel: structuredClone(layoutModel),
    };

    replaceDraftSnapshot(nextSnapshot);
  }, [clearPendingHistory, layoutModel, model, replaceDraftSnapshot]);

  const applyEdit = useCallback(() => {
    if (!draftSnapshot) return;

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
    draftSnapshot,
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
      if (!draftSnapshot) return;
      flushPendingHistory();
      if (activeTransactionRef.current) return;

      activeTransactionRef.current = {
        meta: transaction,
        baseline: presentRef.current,
      };
      setActiveTransaction(transaction);
    },
    [draftSnapshot, flushPendingHistory]
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

  const canUndo = draftSnapshot !== null && history.past.length > 0;
  const canRedo = draftSnapshot !== null && history.future.length > 0;

  const undo = useCallback(() => {
    if (!draftSnapshot) return;
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
  }, [draftSnapshot, flushPendingHistory, replaceDraftSnapshot]);

  const redo = useCallback(() => {
    if (!draftSnapshot) return;
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
  }, [draftSnapshot, flushPendingHistory, replaceDraftSnapshot]);

  useEffect(() => {
    if (!draftSnapshot) return;

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
  }, [draftSnapshot, redo, undo]);

  return {
    isEditMode: draftSnapshot !== null,
    model: presentSnapshot.model,
    layoutModel: presentSnapshot.layoutModel,
    activeTransaction,
    canUndo,
    canRedo,
    startEdit,
    applyEdit,
    cancelEdit,
    resetForSampleChange,
    updateDraftModel: (nextModel: UniverseModel) =>
      updateDraftSnapshot({ model: nextModel }),
    updateDraftLayoutModel: (nextLayoutModel: UniverseLayoutModel) =>
      updateDraftSnapshot({ layoutModel: nextLayoutModel }),
    beginTransaction,
    commitTransaction,
    cancelTransaction,
    undo,
    redo,
  };
}
