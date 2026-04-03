import {
  resolveTheme as resolveRendererTheme,
  type ZoneflowTheme,
} from "@zoneflow/renderer-dom";

type OutlineTone = {
  border: string;
  background: string;
  boxShadow?: string;
};

type BadgeTone = {
  background: string;
  color: string;
};

type ButtonTone = {
  background: string;
  border: string;
  color: string;
  shadow?: string;
};

type HandleTone = {
  background: string;
  border: string;
  color: string;
  shadow: string;
};

type HighlightTone = {
  border: string;
  background: string;
  boxShadow: string;
  badgeBackground: string;
  badgeColor: string;
  badgeShadow: string;
};

type HudTone = {
  panelBackground: string;
  panelBorder: string;
  panelShadow: string;
  buttonBackground: string;
  buttonBorder: string;
  buttonText: string;
  buttonActiveBackground: string;
  buttonActiveBorder: string;
  buttonActiveText: string;
  buttonDangerBackground: string;
  buttonDangerBorder: string;
  buttonDangerText: string;
  buttonDisabledOpacity: number;
};

type HelpPanelTone = {
  background: string;
  border: string;
  shadow: string;
  titleText: string;
  bodyText: string;
  mutedText: string;
};

type FloatingToolbarTone = {
  background: string;
  border: string;
  shadow: string;
  zoneLabelText: string;
  pathLabelText: string;
  buttonBackground: string;
  buttonBorder: string;
  buttonText: string;
  buttonDisabledText: string;
  dangerButtonBackground: string;
  dangerButtonBorder: string;
  dangerButtonText: string;
};

type DialogTone = {
  background: string;
  border: string;
  shadow: string;
  titleText: string;
  secondaryButton: ButtonTone;
  dangerButton: ButtonTone;
};

type ToastTone = {
  background: string;
  border: string;
  shadow: string;
  text: string;
  actionButton: ButtonTone;
};

type GuideTone = {
  validStroke: string;
  invalidStroke: string;
  objectSnapStroke: string;
  invalidDashArray: string;
  strokeWidth: number;
  opacity: number;
  objectSnapOpacity: number;
};

type MetaChipTone = {
  background: string;
  color: string;
  shadow: string;
};

type OverlayTone = {
  helpPanel: HelpPanelTone;
  floatingToolbar: FloatingToolbarTone;
  dialog: DialogTone;
  toast: ToastTone;
  marquee: OutlineTone;
  connectTarget: HighlightTone;
  dropTarget: HighlightTone;
  guide: GuideTone;
  editButton: {
    idle: ButtonTone;
    active: ButtonTone;
  };
  handles: {
    connect: HandleTone;
    zoneResize: HandleTone;
    pathResize: HandleTone;
    delete: HandleTone;
  };
  metaChip: MetaChipTone;
};

export type ZoneflowEditorThemeInput = {
  preview?: Partial<ZoneflowTheme>;
  previewHost?: Partial<{
    background: string;
    shadow: string;
  }>;
  targetOutline?: Partial<{
    idle: Partial<OutlineTone>;
    hover: Partial<OutlineTone>;
    selected: Partial<OutlineTone>;
    dragging: Partial<OutlineTone>;
  }>;
  targetBadge?: Partial<{
    idle: Partial<BadgeTone>;
    hover: Partial<BadgeTone>;
    selected: Partial<BadgeTone>;
    dragging: Partial<BadgeTone>;
  }>;
  hud?: Partial<HudTone>;
  overlay?: Partial<{
    helpPanel: Partial<HelpPanelTone>;
    floatingToolbar: Partial<FloatingToolbarTone>;
    dialog: Partial<{
      background: string;
      border: string;
      shadow: string;
      titleText: string;
      secondaryButton: Partial<ButtonTone>;
      dangerButton: Partial<ButtonTone>;
    }>;
    toast: Partial<{
      background: string;
      border: string;
      shadow: string;
      text: string;
      actionButton: Partial<ButtonTone>;
    }>;
    marquee: Partial<OutlineTone>;
    connectTarget: Partial<HighlightTone>;
    dropTarget: Partial<HighlightTone>;
    guide: Partial<GuideTone>;
    editButton: Partial<{
      idle: Partial<ButtonTone>;
      active: Partial<ButtonTone>;
    }>;
    handles: Partial<{
      connect: Partial<HandleTone>;
      zoneResize: Partial<HandleTone>;
      pathResize: Partial<HandleTone>;
      delete: Partial<HandleTone>;
    }>;
    metaChip: Partial<MetaChipTone>;
  }>;
};

export type ZoneflowEditorTheme = {
  preview: ZoneflowTheme;
  previewHost: {
    background: string;
    shadow: string;
  };
  targetOutline: {
    idle: OutlineTone;
    hover: OutlineTone;
    selected: OutlineTone;
    dragging: OutlineTone;
  };
  targetBadge: {
    idle: BadgeTone;
    hover: BadgeTone;
    selected: BadgeTone;
    dragging: BadgeTone;
  };
  hud: HudTone;
  overlay: OverlayTone;
};

const defaultPreviewTheme = resolveRendererTheme({
  background: "#020617",
  zoneTitle: "#0f172a",
  zoneSubtext: "#64748b",
  zoneContainerBorder: "#cbd5e1",
  zoneActionBorder: "#93c5fd",
  zoneBadgeBg: "#eff6ff",
  pathLabel: "#111827",
  pathEdge: "#334155",
  pathInboundEdge: "#0f766e",
  selection: "#2563eb",
});

export const defaultEditorTheme: ZoneflowEditorTheme = {
  preview: defaultPreviewTheme,
  previewHost: {
    background: "rgba(255, 255, 255, 0.74)",
    shadow: "0 18px 36px rgba(15, 23, 42, 0.22)",
  },
  targetOutline: {
    dragging: {
      border: "2px solid rgba(37, 99, 235, 0.95)",
      background: "rgba(37, 99, 235, 0.12)",
      boxShadow: "0 0 0 1px rgba(147, 197, 253, 0.35) inset",
    },
    selected: {
      border: "2px solid rgba(14, 165, 233, 0.9)",
      background: "rgba(14, 165, 233, 0.08)",
      boxShadow: "0 0 0 1px rgba(125, 211, 252, 0.28) inset",
    },
    hover: {
      border: "1px dashed rgba(125, 211, 252, 0.88)",
      background: "rgba(14, 165, 233, 0.05)",
    },
    idle: {
      border: "1px dashed rgba(148, 163, 184, 0.34)",
      background: "rgba(15, 23, 42, 0.02)",
    },
  },
  targetBadge: {
    dragging: {
      background: "#2563eb",
      color: "#eff6ff",
    },
    selected: {
      background: "#0f172a",
      color: "#e2e8f0",
    },
    hover: {
      background: "rgba(15, 23, 42, 0.9)",
      color: "#e2e8f0",
    },
    idle: {
      background: "rgba(15, 23, 42, 0.72)",
      color: "#cbd5e1",
    },
  },
  hud: {
    panelBackground: "rgba(15, 23, 42, 0.9)",
    panelBorder: "1px solid rgba(148, 163, 184, 0.22)",
    panelShadow: "0 16px 32px rgba(2, 6, 23, 0.22)",
    buttonBackground: "rgba(15, 23, 42, 0.74)",
    buttonBorder: "1px solid rgba(148, 163, 184, 0.22)",
    buttonText: "#e2e8f0",
    buttonActiveBackground: "rgba(37, 99, 235, 0.92)",
    buttonActiveBorder: "1px solid rgba(96, 165, 250, 0.4)",
    buttonActiveText: "#eff6ff",
    buttonDangerBackground: "rgba(127, 29, 29, 0.74)",
    buttonDangerBorder: "1px solid rgba(248, 113, 113, 0.44)",
    buttonDangerText: "#fee2e2",
    buttonDisabledOpacity: 0.48,
  },
  overlay: {
    helpPanel: {
      background: "rgba(15, 23, 42, 0.88)",
      border: "1px solid rgba(148, 163, 184, 0.22)",
      shadow: "0 12px 24px rgba(2, 6, 23, 0.18)",
      titleText: "#e2e8f0",
      bodyText: "#cbd5e1",
      mutedText: "#94a3b8",
    },
    floatingToolbar: {
      background: "rgba(15, 23, 42, 0.94)",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      shadow: "0 18px 30px rgba(2, 6, 23, 0.22)",
      zoneLabelText: "#bfdbfe",
      pathLabelText: "#c7d2fe",
      buttonBackground: "rgba(255, 255, 255, 0.08)",
      buttonBorder: "1px solid rgba(148, 163, 184, 0.18)",
      buttonText: "#f8fafc",
      buttonDisabledText: "rgba(226, 232, 240, 0.48)",
      dangerButtonBackground: "rgba(239, 68, 68, 0.16)",
      dangerButtonBorder: "1px solid rgba(239, 68, 68, 0.38)",
      dangerButtonText: "#fecaca",
    },
    dialog: {
      background: "rgba(255, 255, 255, 0.98)",
      border: "1px solid rgba(15, 23, 42, 0.12)",
      shadow: "0 18px 32px rgba(15, 23, 42, 0.18)",
      titleText: "#0f172a",
      secondaryButton: {
        border: "1px solid rgba(148, 163, 184, 0.3)",
        background: "#ffffff",
        color: "#334155",
      },
      dangerButton: {
        border: "1px solid rgba(239, 68, 68, 0.86)",
        background: "#ef4444",
        color: "#fff7f7",
      },
    },
    toast: {
      background: "rgba(15, 23, 42, 0.94)",
      border: "1px solid rgba(15, 23, 42, 0.08)",
      shadow: "0 18px 36px rgba(15, 23, 42, 0.28)",
      text: "#f8fafc",
      actionButton: {
        border: "1px solid rgba(96, 165, 250, 0.78)",
        background: "#2563eb",
        color: "#eff6ff",
      },
    },
    marquee: {
      border: "1.5px dashed rgba(37, 99, 235, 0.94)",
      background: "rgba(59, 130, 246, 0.12)",
      boxShadow: "0 0 0 1px rgba(191, 219, 254, 0.28) inset",
    },
    connectTarget: {
      border: "2px solid rgba(13, 148, 136, 0.92)",
      background: "rgba(45, 212, 191, 0.18)",
      boxShadow: "0 0 0 1px rgba(153, 246, 228, 0.22) inset",
      badgeBackground: "#0f766e",
      badgeColor: "#f0fdfa",
      badgeShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
    },
    dropTarget: {
      border: "2px solid rgba(34, 197, 94, 0.95)",
      background: "rgba(34, 197, 94, 0.08)",
      boxShadow: "0 0 0 1px rgba(134, 239, 172, 0.24) inset",
      badgeBackground: "#16a34a",
      badgeColor: "#f0fdf4",
      badgeShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
    },
    guide: {
      validStroke: "#0f766e",
      invalidStroke: "#0f172a",
      objectSnapStroke: "rgba(14, 165, 233, 0.92)",
      invalidDashArray: "6 6",
      strokeWidth: 2.5,
      opacity: 0.92,
      objectSnapOpacity: 0.86,
    },
    editButton: {
      idle: {
        border: "1px solid rgba(37, 99, 235, 0.28)",
        background: "rgba(255, 255, 255, 0.96)",
        color: "#0f172a",
        shadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
      },
      active: {
        border: "1px solid rgba(37, 99, 235, 0.28)",
        background: "#2563eb",
        color: "#eff6ff",
        shadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
      },
    },
    handles: {
      connect: {
        border: "1px solid rgba(13, 148, 136, 0.92)",
        background: "#f0fdfa",
        color: "#0f766e",
        shadow: "0 6px 14px rgba(15, 23, 42, 0.16)",
      },
      zoneResize: {
        border: "1px solid rgba(14, 165, 233, 0.92)",
        background: "#eff6ff",
        color: "#0f172a",
        shadow: "0 6px 14px rgba(15, 23, 42, 0.16)",
      },
      pathResize: {
        border: "1px solid rgba(51, 65, 85, 0.92)",
        background: "#f8fafc",
        color: "#0f172a",
        shadow: "0 6px 14px rgba(15, 23, 42, 0.16)",
      },
      delete: {
        border: "1px solid rgba(239, 68, 68, 0.42)",
        background: "#ef4444",
        color: "#fff7f7",
        shadow: "0 10px 20px rgba(127, 29, 29, 0.22)",
      },
    },
    metaChip: {
      background: "rgba(255, 255, 255, 0.84)",
      color: "#0f172a",
      shadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
    },
  },
};

export function resolveEditorTheme(
  theme?: ZoneflowEditorThemeInput
): ZoneflowEditorTheme {
  if (!theme) return defaultEditorTheme;

  return {
    preview: resolveRendererTheme({
      ...defaultEditorTheme.preview,
      ...theme.preview,
    }),
    previewHost: {
      ...defaultEditorTheme.previewHost,
      ...theme.previewHost,
    },
    targetOutline: {
      idle: {
        ...defaultEditorTheme.targetOutline.idle,
        ...theme.targetOutline?.idle,
      },
      hover: {
        ...defaultEditorTheme.targetOutline.hover,
        ...theme.targetOutline?.hover,
      },
      selected: {
        ...defaultEditorTheme.targetOutline.selected,
        ...theme.targetOutline?.selected,
      },
      dragging: {
        ...defaultEditorTheme.targetOutline.dragging,
        ...theme.targetOutline?.dragging,
      },
    },
    targetBadge: {
      idle: {
        ...defaultEditorTheme.targetBadge.idle,
        ...theme.targetBadge?.idle,
      },
      hover: {
        ...defaultEditorTheme.targetBadge.hover,
        ...theme.targetBadge?.hover,
      },
      selected: {
        ...defaultEditorTheme.targetBadge.selected,
        ...theme.targetBadge?.selected,
      },
      dragging: {
        ...defaultEditorTheme.targetBadge.dragging,
        ...theme.targetBadge?.dragging,
      },
    },
    hud: {
      ...defaultEditorTheme.hud,
      ...theme.hud,
    },
    overlay: {
      helpPanel: {
        ...defaultEditorTheme.overlay.helpPanel,
        ...theme.overlay?.helpPanel,
      },
      floatingToolbar: {
        ...defaultEditorTheme.overlay.floatingToolbar,
        ...theme.overlay?.floatingToolbar,
      },
      dialog: {
        ...defaultEditorTheme.overlay.dialog,
        ...theme.overlay?.dialog,
        secondaryButton: {
          ...defaultEditorTheme.overlay.dialog.secondaryButton,
          ...theme.overlay?.dialog?.secondaryButton,
        },
        dangerButton: {
          ...defaultEditorTheme.overlay.dialog.dangerButton,
          ...theme.overlay?.dialog?.dangerButton,
        },
      },
      toast: {
        ...defaultEditorTheme.overlay.toast,
        ...theme.overlay?.toast,
        actionButton: {
          ...defaultEditorTheme.overlay.toast.actionButton,
          ...theme.overlay?.toast?.actionButton,
        },
      },
      marquee: {
        ...defaultEditorTheme.overlay.marquee,
        ...theme.overlay?.marquee,
      },
      connectTarget: {
        ...defaultEditorTheme.overlay.connectTarget,
        ...theme.overlay?.connectTarget,
      },
      dropTarget: {
        ...defaultEditorTheme.overlay.dropTarget,
        ...theme.overlay?.dropTarget,
      },
      guide: {
        ...defaultEditorTheme.overlay.guide,
        ...theme.overlay?.guide,
      },
      editButton: {
        idle: {
          ...defaultEditorTheme.overlay.editButton.idle,
          ...theme.overlay?.editButton?.idle,
        },
        active: {
          ...defaultEditorTheme.overlay.editButton.active,
          ...theme.overlay?.editButton?.active,
        },
      },
      handles: {
        connect: {
          ...defaultEditorTheme.overlay.handles.connect,
          ...theme.overlay?.handles?.connect,
        },
        zoneResize: {
          ...defaultEditorTheme.overlay.handles.zoneResize,
          ...theme.overlay?.handles?.zoneResize,
        },
        pathResize: {
          ...defaultEditorTheme.overlay.handles.pathResize,
          ...theme.overlay?.handles?.pathResize,
        },
        delete: {
          ...defaultEditorTheme.overlay.handles.delete,
          ...theme.overlay?.handles?.delete,
        },
      },
      metaChip: {
        ...defaultEditorTheme.overlay.metaChip,
        ...theme.overlay?.metaChip,
      },
    },
  };
}
