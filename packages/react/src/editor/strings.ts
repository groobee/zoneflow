export type ZoneflowEditorLocale = "ko" | "en";

export type SelectionCommandKey =
  | "align-left"
  | "align-right"
  | "align-top"
  | "align-bottom"
  | "align-center-horizontal"
  | "align-center-vertical"
  | "distribute-horizontal"
  | "distribute-vertical";

type EditorStrings = {
  helpPanel: {
    title: string;
    summary: string;
    collapse: string;
    expand: string;
    body: string;
  };
  hud: {
    undo: string;
    redo: string;
    deleteSelection: string;
    fitToView: string;
    grid: string;
    snap: string;
    on: string;
    off: string;
  };
  selectionToolbar: {
    zoneSelectionSuffix: string;
    pathSelectionSuffix: string;
    delete: string;
    sameParentOnlyHint: string;
    commands: Record<SelectionCommandKey, string>;
  };
  deleteDialog: {
    cancel: string;
    confirm: string;
    zoneNoun: string;
    pathNoun: string;
    confirmTarget: (label: string) => string;
    confirmSelection: (label: string) => string;
    deleted: (label: string) => string;
  };
  target: {
    zoneBadge: string;
    pathBadge: string;
    edit: string;
    open: string;
    editPath: string;
    connect: string;
    reconnect: string;
    dropTarget: string;
    resize: string;
    moving: string;
    drag: string;
  };
  pathStatus: {
    brokenTarget: string;
    targetNotSet: string;
  };
};

const EDITOR_STRINGS: Record<ZoneflowEditorLocale, EditorStrings> = {
  ko: {
    helpPanel: {
      title: "편집 모드",
      summary: "가이드",
      collapse: "접기",
      expand: "가이드 열기",
      body:
        "존을 드래그해서 이동할 수 있습니다. Shift를 누른 채 존이나 패스를 클릭하면 다중 선택이 되고, 떠 있는 툴바에서 정렬과 분배를 실행할 수 있습니다. 오른쪽 앵커를 끌면 조건 패스를 추가할 수 있고, 존 우하단 핸들로 크기를 조정할 수 있습니다. 존은 더블클릭으로 편집하고, 패스 오른쪽 앵커를 끌어 재연결하거나 모서리 핸들로 라벨 크기를 조정할 수 있습니다. 빈 캔버스를 드래그하면 올가미 선택이 됩니다.",
    },
    hud: {
      undo: "되돌리기",
      redo: "다시하기",
      deleteSelection: "선택 삭제",
      fitToView: "한눈에 보기",
      grid: "Grid",
      snap: "Snap",
      on: "On",
      off: "Off",
    },
    selectionToolbar: {
      zoneSelectionSuffix: "selected",
      pathSelectionSuffix: "paths",
      delete: "삭제",
      sameParentOnlyHint: "정렬/분배는 같은 부모를 가진 존들만 지원합니다.",
      commands: {
        "align-left": "좌측",
        "align-right": "우측",
        "align-top": "상단",
        "align-bottom": "하단",
        "align-center-horizontal": "가로중앙",
        "align-center-vertical": "세로중앙",
        "distribute-horizontal": "가로 분배",
        "distribute-vertical": "세로 분배",
      },
    },
    deleteDialog: {
      cancel: "취소",
      confirm: "삭제",
      zoneNoun: "존",
      pathNoun: "패스",
      confirmTarget: (label) => `${label} 삭제할까요?`,
      confirmSelection: (label) => `${label} 삭제할까요?`,
      deleted: (label) => `${label} 삭제됨`,
    },
    target: {
      zoneBadge: "ZONE",
      pathBadge: "PATH",
      edit: "수정",
      open: "열림",
      editPath: "Edit path",
      connect: "CONNECT",
      reconnect: "RECONNECT",
      dropTarget: "DROP TARGET",
      resize: "RESIZE",
      moving: "MOVING",
      drag: "DRAG",
    },
    pathStatus: {
      brokenTarget: "Broken path target",
      targetNotSet: "Path target not set",
    },
  },
  en: {
    helpPanel: {
      title: "Edit Mode",
      summary: "Guide",
      collapse: "Hide",
      expand: "Show guide",
      body:
        "Drag zones to move them. Shift-click zones or paths to multi-select, then align or distribute them from the floating toolbar. Drag the right anchor to add a condition path, and use the bottom-right handle to resize zones. Double-click a zone to edit it. Drag the right-side anchor on a path to reconnect it, and use the corner handle to resize the path label box. Drag empty canvas space to marquee-select zones and paths.",
    },
    hud: {
      undo: "Undo",
      redo: "Redo",
      deleteSelection: "Delete selection",
      fitToView: "Fit to view",
      grid: "Grid",
      snap: "Snap",
      on: "On",
      off: "Off",
    },
    selectionToolbar: {
      zoneSelectionSuffix: "selected",
      pathSelectionSuffix: "paths",
      delete: "Delete",
      sameParentOnlyHint: "Align and distribute support only zones that share the same parent.",
      commands: {
        "align-left": "Left",
        "align-right": "Right",
        "align-top": "Top",
        "align-bottom": "Bottom",
        "align-center-horizontal": "Center X",
        "align-center-vertical": "Center Y",
        "distribute-horizontal": "Distribute X",
        "distribute-vertical": "Distribute Y",
      },
    },
    deleteDialog: {
      cancel: "Cancel",
      confirm: "Delete",
      zoneNoun: "Zone",
      pathNoun: "Path",
      confirmTarget: (label) => `Delete ${label}?`,
      confirmSelection: (label) => `Delete ${label}?`,
      deleted: (label) => `${label} deleted`,
    },
    target: {
      zoneBadge: "ZONE",
      pathBadge: "PATH",
      edit: "Edit",
      open: "Open",
      editPath: "Edit path",
      connect: "CONNECT",
      reconnect: "RECONNECT",
      dropTarget: "DROP TARGET",
      resize: "RESIZE",
      moving: "MOVING",
      drag: "DRAG",
    },
    pathStatus: {
      brokenTarget: "Broken path target",
      targetNotSet: "Path target not set",
    },
  },
};

export function resolveEditorLocale(): ZoneflowEditorLocale {
  const locale =
    typeof navigator !== "undefined"
      ? navigator.language
      : Intl.DateTimeFormat().resolvedOptions().locale;

  return locale.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function getZoneflowEditorStrings(locale: ZoneflowEditorLocale) {
  return EDITOR_STRINGS[locale];
}

export function formatDeleteTargetLabel(
  locale: ZoneflowEditorLocale,
  target: { kind: "zone"; label: string } | { kind: "path"; label: string }
) {
  const strings = EDITOR_STRINGS[locale].deleteDialog;
  const noun = target.kind === "zone" ? strings.zoneNoun : strings.pathNoun;
  return locale === "ko" ? `${noun} "${target.label}"` : `${noun} "${target.label}"`;
}

export function formatDeleteSelectionLabel(params: {
  locale: ZoneflowEditorLocale;
  kind: "zone" | "path";
  count: number;
}) {
  const { locale, kind, count } = params;
  if (locale === "ko") {
    return kind === "zone" ? `존 ${count}개` : `패스 ${count}개`;
  }

  return kind === "zone"
    ? `${count} zone${count === 1 ? "" : "s"}`
    : `${count} path${count === 1 ? "" : "s"}`;
}

export function getSelectionToolbarCountLabel(params: {
  locale: ZoneflowEditorLocale;
  kind: "zone" | "path";
  count: number;
}) {
  const { locale, kind, count } = params;
  const strings = EDITOR_STRINGS[locale].selectionToolbar;
  return kind === "zone"
    ? `${count} ${strings.zoneSelectionSuffix}`
    : `${count} ${strings.pathSelectionSuffix}`;
}

export function getTargetBadgeLabel(params: {
  locale: ZoneflowEditorLocale;
  kind: "zone" | "path";
}) {
  return params.kind === "zone"
    ? EDITOR_STRINGS[params.locale].target.zoneBadge
    : EDITOR_STRINGS[params.locale].target.pathBadge;
}

export function getTargetMetaStateLabel(params: {
  locale: ZoneflowEditorLocale;
  isDragging: boolean;
  isResizing: boolean;
}) {
  const strings = EDITOR_STRINGS[params.locale].target;
  if (params.isResizing) return strings.resize;
  if (params.isDragging) return strings.moving;
  return strings.drag;
}

export function getGridToggleLabel(params: {
  locale: ZoneflowEditorLocale;
  enabled: boolean;
}) {
  const strings = EDITOR_STRINGS[params.locale].hud;
  return `${strings.grid} ${params.enabled ? strings.on : strings.off}`;
}

export function getSnapToggleLabel(params: {
  locale: ZoneflowEditorLocale;
  enabled: boolean;
}) {
  const strings = EDITOR_STRINGS[params.locale].hud;
  return `${strings.snap} ${params.enabled ? strings.on : strings.off}`;
}

export function getSelectionCommandLabel(params: {
  locale: ZoneflowEditorLocale;
  command: SelectionCommandKey;
}) {
  return EDITOR_STRINGS[params.locale].selectionToolbar.commands[params.command];
}
