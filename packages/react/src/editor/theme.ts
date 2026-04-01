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
  };
}
