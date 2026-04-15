import type { ZoneflowEditorThemeInput } from "@zoneflow/react";
import type { ZoneflowTheme } from "@zoneflow/renderer-dom";

export type ZoneflowThemePresetId =
  | "dark"
  | "ocean"
  | "sunset"
  | "light"
  | "party"
  | "korean-culture"
  | "sci-fi"
  | "fantasy"
  | "mono"
  | "garden"
  | "utopia"
  | "dystopia"
  | "desert";

export type ZoneflowThemePreset = {
  id: ZoneflowThemePresetId;
  label: string;
  description: string;
  rendererTheme: Partial<ZoneflowTheme>;
  editorTheme: ZoneflowEditorThemeInput;
  surfacePalette: {
    canvasBackground: string;
    topbar: {
      background: string;
      border: string;
      controlBackground: string;
      controlBorder: string;
      controlText: string;
    };
    sidebar: {
      background: string;
      border: string;
      text: string;
      mutedText: string;
      sectionTitle: string;
      cardBackground: string;
      cardBorder: string;
      controlBackground: string;
      controlBorder: string;
      controlText: string;
      accent: string;
    };
  };
};

const chromeOverlay =
  "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0) 100%)";
const chromeGlow =
  "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.22) 36%, rgba(255,255,255,0) 72%)";

const darkPreset: ZoneflowThemePreset = {
  id: "dark",
  label: "Dark",
  description: "Dense dark operations board.",
  rendererTheme: {
    background: "#020617",
    zoneTitle: "#f8fafc",
    zoneSubtext: "#94a3b8",
    zoneContainerBorder: "#334155",
    zoneActionBorder: "#38bdf8",
    zoneBadgeBg: "#0f172a",
    pathLabel: "#f8fafc",
    pathEdge: "#64748b",
    pathInboundEdge: "#22c55e",
    selection: "#38bdf8",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0.04) 36%, rgba(56,189,248,0) 72%)",
        accentFade: "rgba(15, 23, 42, 0.2)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(2, 6, 23, 0.42), 0 3px 8px rgba(2, 6, 23, 0.26)",
        containerAccent: "rgba(56, 189, 248, 0.18)",
        actionAccent: "rgba(34, 197, 94, 0.18)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)",
        shadow:
          "0 16px 26px rgba(2, 6, 23, 0.42), 0 3px 8px rgba(2, 6, 23, 0.26)",
        accent: "rgba(56, 189, 248, 0.18)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.99) 0%, rgba(3,7,18,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,0.04)",
        containerAccent: "#38bdf8",
        actionAccent: "#22c55e",
      },
    },
    status: {
      info: {
        border: "1px solid rgba(250, 204, 21, 0.28)",
        background:
          "linear-gradient(180deg, rgba(113,63,18,0.88) 0%, rgba(120,53,15,0.82) 100%)",
        color: "#fde68a",
        shadow: "0 6px 14px rgba(120, 53, 15, 0.18)",
      },
      warning: {
        border: "1px solid rgba(248, 113, 113, 0.28)",
        background:
          "linear-gradient(180deg, rgba(127,29,29,0.88) 0%, rgba(153,27,27,0.82) 100%)",
        color: "#fecaca",
        shadow: "0 6px 14px rgba(127, 29, 29, 0.18)",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(2, 6, 23, 0.92)",
      panelBorder: "1px solid rgba(71, 85, 105, 0.42)",
      buttonBackground: "rgba(15, 23, 42, 0.86)",
      buttonBorder: "1px solid rgba(71, 85, 105, 0.42)",
      buttonText: "#e2e8f0",
      buttonActiveBackground: "#0f766e",
      buttonActiveBorder: "1px solid rgba(52, 211, 153, 0.44)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(2, 6, 23, 0.92)",
        border: "1px solid rgba(71, 85, 105, 0.42)",
      },
      floatingToolbar: {
        background: "rgba(2, 6, 23, 0.96)",
        border: "1px solid rgba(71, 85, 105, 0.32)",
      },
      dialog: {
        background: "rgba(15, 23, 42, 0.98)",
        border: "1px solid rgba(51, 65, 85, 0.4)",
        titleText: "#f8fafc",
        secondaryButton: {
          background: "#0f172a",
          border: "1px solid rgba(71, 85, 105, 0.42)",
          color: "#cbd5e1",
        },
      },
      toast: {
        background: "rgba(2, 6, 23, 0.98)",
        border: "1px solid rgba(51, 65, 85, 0.38)",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#020617",
    topbar: {
      background: "#020617",
      border: "1px solid rgba(71, 85, 105, 0.38)",
      controlBackground: "#0f172a",
      controlBorder: "1px solid rgba(71, 85, 105, 0.42)",
      controlText: "#e2e8f0",
    },
    sidebar: {
      background: "#0b1220",
      border: "1px solid rgba(71, 85, 105, 0.24)",
      text: "#e2e8f0",
      mutedText: "#94a3b8",
      sectionTitle: "#cbd5e1",
      cardBackground: "rgba(15, 23, 42, 0.72)",
      cardBorder: "rgba(148, 163, 184, 0.16)",
      controlBackground: "#1e293b",
      controlBorder: "1px solid rgba(148, 163, 184, 0.2)",
      controlText: "#e2e8f0",
      accent: "#22c55e",
    },
  },
};

const oceanPreset: ZoneflowThemePreset = {
  id: "ocean",
  label: "Ocean",
  description: "Clean cyan workflow preset.",
  rendererTheme: {
    background: "#effcfb",
    zoneTitle: "#082f49",
    zoneSubtext: "#155e75",
    zoneContainerBorder: "#67e8f9",
    zoneActionBorder: "#06b6d4",
    zoneBadgeBg: "#cffafe",
    pathLabel: "#0f172a",
    pathEdge: "#0891b2",
    pathInboundEdge: "#0f766e",
    selection: "#0ea5e9",
    surface: {
      chrome: {
        overlay: chromeOverlay,
        glow: chromeGlow,
        accentFade: "rgba(207, 250, 254, 0.18)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,254,255,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(8, 47, 73, 0.08), 0 3px 8px rgba(8, 47, 73, 0.05)",
        containerAccent: "rgba(14, 165, 233, 0.14)",
        actionAccent: "rgba(6, 182, 212, 0.18)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(240,253,250,0.98) 100%)",
        shadow:
          "0 16px 26px rgba(8, 47, 73, 0.08), 0 3px 8px rgba(8, 47, 73, 0.05)",
        accent: "rgba(45, 212, 191, 0.16)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,254,255,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(8, 47, 73, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        containerAccent: "#0ea5e9",
        actionAccent: "#06b6d4",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(8, 47, 73, 0.92)",
      panelBorder: "1px solid rgba(103, 232, 249, 0.28)",
      buttonBackground: "rgba(14, 116, 144, 0.78)",
      buttonBorder: "1px solid rgba(103, 232, 249, 0.24)",
      buttonText: "#ecfeff",
      buttonActiveBackground: "#0891b2",
      buttonActiveBorder: "1px solid rgba(165, 243, 252, 0.4)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(8, 47, 73, 0.9)",
        border: "1px solid rgba(103, 232, 249, 0.28)",
      },
      connectTarget: {
        badgeBackground: "#0f766e",
      },
      dropTarget: {
        badgeBackground: "#0891b2",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#effcfb",
    topbar: {
      background: "#082f49",
      border: "1px solid rgba(103, 232, 249, 0.2)",
      controlBackground: "#0e7490",
      controlBorder: "1px solid rgba(103, 232, 249, 0.24)",
      controlText: "#ecfeff",
    },
    sidebar: {
      background: "#082f49",
      border: "1px solid rgba(103, 232, 249, 0.16)",
      text: "#ecfeff",
      mutedText: "#a5f3fc",
      sectionTitle: "#cffafe",
      cardBackground: "rgba(14, 116, 144, 0.34)",
      cardBorder: "rgba(103, 232, 249, 0.16)",
      controlBackground: "#0e7490",
      controlBorder: "1px solid rgba(103, 232, 249, 0.24)",
      controlText: "#ecfeff",
      accent: "#06b6d4",
    },
  },
};

const sunsetPreset: ZoneflowThemePreset = {
  id: "sunset",
  label: "Sunset",
  description: "Warm retention-oriented preset.",
  rendererTheme: {
    background: "#fff7ed",
    zoneTitle: "#431407",
    zoneSubtext: "#7c2d12",
    zoneContainerBorder: "#fdba74",
    zoneActionBorder: "#fb923c",
    zoneBadgeBg: "#ffedd5",
    pathLabel: "#431407",
    pathEdge: "#c2410c",
    pathInboundEdge: "#ea580c",
    selection: "#ea580c",
    surface: {
      chrome: {
        overlay: chromeOverlay,
        glow: chromeGlow,
        accentFade: "rgba(255, 237, 213, 0.14)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(154, 52, 18, 0.10), 0 3px 8px rgba(154, 52, 18, 0.06)",
        containerAccent: "rgba(251, 146, 60, 0.14)",
        actionAccent: "rgba(249, 115, 22, 0.2)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,251,235,0.98) 100%)",
        shadow:
          "0 16px 26px rgba(154, 52, 18, 0.10), 0 3px 8px rgba(154, 52, 18, 0.06)",
        accent: "rgba(251, 146, 60, 0.18)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(154, 52, 18, 0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
        containerAccent: "#ea580c",
        actionAccent: "#c2410c",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(67, 20, 7, 0.92)",
      panelBorder: "1px solid rgba(251, 146, 60, 0.28)",
      buttonBackground: "rgba(124, 45, 18, 0.78)",
      buttonBorder: "1px solid rgba(253, 186, 116, 0.28)",
      buttonText: "#ffedd5",
      buttonActiveBackground: "#ea580c",
      buttonActiveBorder: "1px solid rgba(254, 215, 170, 0.46)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(67, 20, 7, 0.9)",
        border: "1px solid rgba(251, 146, 60, 0.28)",
      },
      connectTarget: {
        badgeBackground: "#ea580c",
      },
      dropTarget: {
        badgeBackground: "#f97316",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#fff7ed",
    topbar: {
      background: "#431407",
      border: "1px solid rgba(251, 146, 60, 0.22)",
      controlBackground: "#7c2d12",
      controlBorder: "1px solid rgba(253, 186, 116, 0.28)",
      controlText: "#ffedd5",
    },
    sidebar: {
      background: "#3b1c10",
      border: "1px solid rgba(251, 146, 60, 0.18)",
      text: "#ffedd5",
      mutedText: "#fdba74",
      sectionTitle: "#fed7aa",
      cardBackground: "rgba(124, 45, 18, 0.42)",
      cardBorder: "rgba(251, 146, 60, 0.18)",
      controlBackground: "#7c2d12",
      controlBorder: "1px solid rgba(253, 186, 116, 0.24)",
      controlText: "#ffedd5",
      accent: "#f97316",
    },
  },
};

const lightPreset: ZoneflowThemePreset = {
  id: "light",
  label: "Light",
  description: "Neutral product UI preset.",
  rendererTheme: {
    background: "#f8fafc",
    zoneTitle: "#0f172a",
    zoneSubtext: "#64748b",
    zoneContainerBorder: "#cbd5e1",
    zoneActionBorder: "#2563eb",
    zoneBadgeBg: "#eff6ff",
    pathLabel: "#0f172a",
    pathEdge: "#94a3b8",
    pathInboundEdge: "#2563eb",
    selection: "#2563eb",
    surface: {
      chrome: {
        overlay: chromeOverlay,
        glow: chromeGlow,
        accentFade: "rgba(226, 232, 240, 0.08)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(15, 23, 42, 0.08), 0 3px 8px rgba(15, 23, 42, 0.05)",
        containerAccent: "rgba(37, 99, 235, 0.10)",
        actionAccent: "rgba(37, 99, 235, 0.16)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,248,252,0.98) 100%)",
        shadow:
          "0 16px 26px rgba(15, 23, 42, 0.08), 0 3px 8px rgba(15, 23, 42, 0.05)",
        accent: "rgba(37, 99, 235, 0.12)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,250,253,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        containerAccent: "#2563eb",
        actionAccent: "#2563eb",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(255, 255, 255, 0.92)",
      panelBorder: "1px solid rgba(148, 163, 184, 0.26)",
      panelShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
      buttonBackground: "rgba(255, 255, 255, 0.92)",
      buttonBorder: "1px solid rgba(148, 163, 184, 0.26)",
      buttonText: "#0f172a",
      buttonActiveBackground: "#2563eb",
      buttonActiveBorder: "1px solid rgba(59, 130, 246, 0.42)",
      buttonActiveText: "#eff6ff",
      buttonDangerBackground: "#dc2626",
      buttonDangerBorder: "1px solid rgba(239, 68, 68, 0.42)",
      buttonDangerText: "#fff7f7",
    },
    overlay: {
      helpPanel: {
        background: "rgba(255, 255, 255, 0.96)",
        border: "1px solid rgba(148, 163, 184, 0.28)",
        titleText: "#0f172a",
        bodyText: "#334155",
        mutedText: "#64748b",
        shadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
      },
      floatingToolbar: {
        background: "rgba(255, 255, 255, 0.98)",
        border: "1px solid rgba(148, 163, 184, 0.22)",
        shadow: "0 18px 30px rgba(15, 23, 42, 0.12)",
        zoneLabelText: "#1d4ed8",
        pathLabelText: "#2563eb",
        buttonBackground: "rgba(241, 245, 249, 0.96)",
        buttonBorder: "1px solid rgba(148, 163, 184, 0.22)",
        buttonText: "#0f172a",
        buttonDisabledText: "rgba(100, 116, 139, 0.48)",
      },
      dialog: {
        background: "rgba(255, 255, 255, 0.98)",
        border: "1px solid rgba(148, 163, 184, 0.26)",
        shadow: "0 18px 32px rgba(15, 23, 42, 0.14)",
      },
      toast: {
        background: "rgba(255, 255, 255, 0.98)",
        border: "1px solid rgba(148, 163, 184, 0.26)",
        shadow: "0 18px 36px rgba(15, 23, 42, 0.16)",
        text: "#0f172a",
      },
      metaChip: {
        background: "rgba(255, 255, 255, 0.92)",
        color: "#0f172a",
        shadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#f8fafc",
    topbar: {
      background: "#ffffff",
      border: "1px solid rgba(148, 163, 184, 0.22)",
      controlBackground: "#ffffff",
      controlBorder: "1px solid rgba(148, 163, 184, 0.26)",
      controlText: "#0f172a",
    },
    sidebar: {
      background: "#f8fafc",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      text: "#0f172a",
      mutedText: "#64748b",
      sectionTitle: "#334155",
      cardBackground: "rgba(255, 255, 255, 0.92)",
      cardBorder: "rgba(148, 163, 184, 0.16)",
      controlBackground: "#ffffff",
      controlBorder: "1px solid rgba(148, 163, 184, 0.24)",
      controlText: "#0f172a",
      accent: "#2563eb",
    },
  },
};

const partyPreset: ZoneflowThemePreset = {
  id: "party",
  label: "Party",
  description: "Playful high-contrast neon preset.",
  rendererTheme: {
    background: "#12061f",
    zoneTitle: "#fff7fb",
    zoneSubtext: "#f5d0fe",
    zoneContainerBorder: "#d946ef",
    zoneActionBorder: "#22d3ee",
    zoneBadgeBg: "#2a113a",
    pathLabel: "#fff7fb",
    pathEdge: "#f472b6",
    pathInboundEdge: "#22d3ee",
    selection: "#facc15",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(244,114,182,0.18) 0%, rgba(34,211,238,0.08) 36%, rgba(34,211,238,0) 72%)",
        accentFade: "rgba(45, 14, 56, 0.24)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(46,16,63,0.98) 0%, rgba(24,9,37,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(17, 24, 39, 0.42), 0 3px 8px rgba(17, 24, 39, 0.26)",
        containerAccent: "rgba(217, 70, 239, 0.22)",
        actionAccent: "rgba(34, 211, 238, 0.20)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(45,14,56,0.98) 0%, rgba(24,9,37,0.98) 100%)",
        shadow:
          "0 16px 26px rgba(17, 24, 39, 0.42), 0 3px 8px rgba(17, 24, 39, 0.26)",
        accent: "rgba(250, 204, 21, 0.18)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(46,16,63,0.98) 0%, rgba(24,9,37,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(17, 24, 39, 0.36), inset 0 1px 0 rgba(255,255,255,0.06)",
        containerAccent: "#d946ef",
        actionAccent: "#22d3ee",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(24, 9, 37, 0.94)",
      panelBorder: "1px solid rgba(217, 70, 239, 0.34)",
      buttonBackground: "rgba(46, 16, 63, 0.84)",
      buttonBorder: "1px solid rgba(34, 211, 238, 0.28)",
      buttonText: "#fff7fb",
      buttonActiveBackground: "#d946ef",
      buttonActiveBorder: "1px solid rgba(250, 204, 21, 0.42)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(24, 9, 37, 0.92)",
        border: "1px solid rgba(217, 70, 239, 0.34)",
      },
      connectTarget: {
        badgeBackground: "#22d3ee",
        badgeColor: "#082f49",
      },
      dropTarget: {
        badgeBackground: "#d946ef",
        badgeColor: "#fff7fb",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#12061f",
    topbar: {
      background: "#1e0b2e",
      border: "1px solid rgba(217, 70, 239, 0.28)",
      controlBackground: "#2e103f",
      controlBorder: "1px solid rgba(34, 211, 238, 0.24)",
      controlText: "#fff7fb",
    },
    sidebar: {
      background: "#1a0b28",
      border: "1px solid rgba(217, 70, 239, 0.18)",
      text: "#fff7fb",
      mutedText: "#f5d0fe",
      sectionTitle: "#f9a8d4",
      cardBackground: "rgba(46, 16, 63, 0.46)",
      cardBorder: "rgba(217, 70, 239, 0.18)",
      controlBackground: "#2e103f",
      controlBorder: "1px solid rgba(34, 211, 238, 0.22)",
      controlText: "#fff7fb",
      accent: "#facc15",
    },
  },
};

const koreanCulturePreset: ZoneflowThemePreset = {
  id: "korean-culture",
  label: "Korean Culture",
  description: "Dancheong-inspired jade and lacquer preset.",
  rendererTheme: {
    background: "#f8f3e7",
    zoneTitle: "#3d1f14",
    zoneSubtext: "#6c4a3f",
    zoneContainerBorder: "#0f766e",
    zoneActionBorder: "#9f1239",
    zoneBadgeBg: "#fef3c7",
    pathLabel: "#3d1f14",
    pathEdge: "#15803d",
    pathInboundEdge: "#9f1239",
    selection: "#2563eb",
    surface: {
      chrome: {
        overlay: chromeOverlay,
        glow:
          "radial-gradient(circle, rgba(15,118,110,0.16) 0%, rgba(159,18,57,0.08) 36%, rgba(159,18,57,0) 72%)",
        accentFade: "rgba(245, 222, 179, 0.14)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(248,243,231,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(61, 31, 20, 0.10), 0 3px 8px rgba(61, 31, 20, 0.06)",
        containerAccent: "rgba(15, 118, 110, 0.14)",
        actionAccent: "rgba(159, 18, 57, 0.14)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(254,243,199,0.98) 100%)",
        shadow:
          "0 16px 26px rgba(61, 31, 20, 0.10), 0 3px 8px rgba(61, 31, 20, 0.06)",
        accent: "rgba(37, 99, 235, 0.12)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(248,243,231,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(61, 31, 20, 0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
        containerAccent: "#0f766e",
        actionAccent: "#9f1239",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(61, 31, 20, 0.92)",
      panelBorder: "1px solid rgba(15, 118, 110, 0.26)",
      buttonBackground: "rgba(120, 53, 15, 0.8)",
      buttonBorder: "1px solid rgba(180, 83, 9, 0.24)",
      buttonText: "#fef3c7",
      buttonActiveBackground: "#0f766e",
      buttonActiveBorder: "1px solid rgba(37, 99, 235, 0.36)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(61, 31, 20, 0.92)",
        border: "1px solid rgba(15, 118, 110, 0.24)",
      },
      connectTarget: {
        badgeBackground: "#9f1239",
      },
      dropTarget: {
        badgeBackground: "#0f766e",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#f8f3e7",
    topbar: {
      background: "#3d1f14",
      border: "1px solid rgba(15, 118, 110, 0.18)",
      controlBackground: "#78350f",
      controlBorder: "1px solid rgba(180, 83, 9, 0.24)",
      controlText: "#fef3c7",
    },
    sidebar: {
      background: "#4a2418",
      border: "1px solid rgba(15, 118, 110, 0.16)",
      text: "#fef3c7",
      mutedText: "#fcd34d",
      sectionTitle: "#fde68a",
      cardBackground: "rgba(120, 53, 15, 0.42)",
      cardBorder: "rgba(180, 83, 9, 0.18)",
      controlBackground: "#78350f",
      controlBorder: "1px solid rgba(180, 83, 9, 0.24)",
      controlText: "#fef3c7",
      accent: "#0f766e",
    },
  },
};

const sciFiPreset: ZoneflowThemePreset = {
  id: "sci-fi",
  label: "Sci-fi",
  description: "Neon command-deck preset.",
  rendererTheme: {
    background: "#050816",
    zoneTitle: "#e6fbff",
    zoneSubtext: "#8ee7ff",
    zoneContainerBorder: "#22d3ee",
    zoneActionBorder: "#a78bfa",
    zoneBadgeBg: "#0b1024",
    pathLabel: "#e6fbff",
    pathEdge: "#38bdf8",
    pathInboundEdge: "#a78bfa",
    selection: "#f0abfc",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(125,211,252,0.18) 0%, rgba(168,85,247,0.04) 44%, rgba(125,211,252,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(34,211,238,0.24) 0%, rgba(168,85,247,0.10) 38%, rgba(34,211,238,0) 74%)",
        accentFade: "rgba(8, 47, 73, 0.28)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(8,13,31,0.98) 0%, rgba(3,7,18,0.98) 100%)",
        shadow:
          "0 20px 38px rgba(0, 0, 0, 0.48), 0 0 28px rgba(34, 211, 238, 0.12)",
        containerAccent: "rgba(34, 211, 238, 0.22)",
        actionAccent: "rgba(167, 139, 250, 0.22)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(8,13,31,0.98) 0%, rgba(7,10,24,0.98) 100%)",
        shadow:
          "0 18px 30px rgba(0, 0, 0, 0.46), 0 0 22px rgba(167, 139, 250, 0.12)",
        accent: "rgba(240, 171, 252, 0.18)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(12,18,38,0.99) 0%, rgba(3,7,18,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(125,211,252,0.14)",
        containerAccent: "#22d3ee",
        actionAccent: "#a78bfa",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(3, 7, 18, 0.94)",
      panelBorder: "1px solid rgba(34, 211, 238, 0.32)",
      buttonBackground: "rgba(8, 13, 31, 0.86)",
      buttonBorder: "1px solid rgba(167, 139, 250, 0.28)",
      buttonText: "#e6fbff",
      buttonActiveBackground: "#0891b2",
      buttonActiveBorder: "1px solid rgba(240, 171, 252, 0.42)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(3, 7, 18, 0.94)",
        border: "1px solid rgba(34, 211, 238, 0.32)",
        titleText: "#e6fbff",
        mutedText: "#8ee7ff",
      },
      floatingToolbar: {
        background: "rgba(3, 7, 18, 0.96)",
        border: "1px solid rgba(34, 211, 238, 0.26)",
        zoneLabelText: "#67e8f9",
        pathLabelText: "#c4b5fd",
      },
      guide: {
        objectSnapStroke: "rgba(240, 171, 252, 0.94)",
      },
      connectTarget: {
        badgeBackground: "#7c3aed",
      },
      dropTarget: {
        badgeBackground: "#0891b2",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#050816",
    topbar: {
      background: "#030712",
      border: "1px solid rgba(34, 211, 238, 0.24)",
      controlBackground: "#0b1024",
      controlBorder: "1px solid rgba(167, 139, 250, 0.28)",
      controlText: "#e6fbff",
    },
    sidebar: {
      background: "#070a18",
      border: "1px solid rgba(34, 211, 238, 0.16)",
      text: "#e6fbff",
      mutedText: "#8ee7ff",
      sectionTitle: "#67e8f9",
      cardBackground: "rgba(11, 16, 36, 0.74)",
      cardBorder: "rgba(34, 211, 238, 0.18)",
      controlBackground: "#0b1024",
      controlBorder: "1px solid rgba(167, 139, 250, 0.24)",
      controlText: "#e6fbff",
      accent: "#f0abfc",
    },
  },
};

const fantasyPreset: ZoneflowThemePreset = {
  id: "fantasy",
  label: "Fantasy",
  description: "Parchment, brass, and arcane violet preset.",
  rendererTheme: {
    background: "#f6ecd2",
    zoneTitle: "#3b2412",
    zoneSubtext: "#72512c",
    zoneContainerBorder: "#b7791f",
    zoneActionBorder: "#7c3aed",
    zoneBadgeBg: "#fef3c7",
    pathLabel: "#3b2412",
    pathEdge: "#92400e",
    pathInboundEdge: "#047857",
    selection: "#7c3aed",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(255,251,235,0.82) 0%, rgba(245,222,179,0.16) 44%, rgba(245,222,179,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(124,58,237,0.08) 38%, rgba(124,58,237,0) 72%)",
        accentFade: "rgba(254, 243, 199, 0.18)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(246,236,210,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(92, 53, 15, 0.14), 0 3px 8px rgba(92, 53, 15, 0.08)",
        containerAccent: "rgba(180, 83, 9, 0.16)",
        actionAccent: "rgba(124, 58, 237, 0.14)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(253,230,138,0.94) 100%)",
        shadow:
          "0 16px 26px rgba(92, 53, 15, 0.12), 0 3px 8px rgba(92, 53, 15, 0.07)",
        accent: "rgba(4, 120, 87, 0.12)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(246,236,210,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(92, 53, 15, 0.12), inset 0 1px 0 rgba(255,255,255,0.86)",
        containerAccent: "#b7791f",
        actionAccent: "#7c3aed",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(59, 36, 18, 0.92)",
      panelBorder: "1px solid rgba(180, 83, 9, 0.28)",
      buttonBackground: "rgba(114, 81, 44, 0.82)",
      buttonBorder: "1px solid rgba(251, 191, 36, 0.28)",
      buttonText: "#fef3c7",
      buttonActiveBackground: "#7c3aed",
      buttonActiveBorder: "1px solid rgba(216, 180, 254, 0.42)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(59, 36, 18, 0.92)",
        border: "1px solid rgba(180, 83, 9, 0.28)",
      },
      connectTarget: {
        badgeBackground: "#047857",
      },
      dropTarget: {
        badgeBackground: "#7c3aed",
      },
      guide: {
        objectSnapStroke: "rgba(124, 58, 237, 0.88)",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#f6ecd2",
    topbar: {
      background: "#3b2412",
      border: "1px solid rgba(251, 191, 36, 0.22)",
      controlBackground: "#72512c",
      controlBorder: "1px solid rgba(251, 191, 36, 0.28)",
      controlText: "#fef3c7",
    },
    sidebar: {
      background: "#472b16",
      border: "1px solid rgba(251, 191, 36, 0.18)",
      text: "#fef3c7",
      mutedText: "#fde68a",
      sectionTitle: "#facc15",
      cardBackground: "rgba(114, 81, 44, 0.44)",
      cardBorder: "rgba(251, 191, 36, 0.18)",
      controlBackground: "#72512c",
      controlBorder: "1px solid rgba(251, 191, 36, 0.24)",
      controlText: "#fef3c7",
      accent: "#c084fc",
    },
  },
};

const monoPreset: ZoneflowThemePreset = {
  id: "mono",
  label: "Mono",
  description: "Minimal monochrome drafting preset.",
  rendererTheme: {
    background: "#f4f4f5",
    zoneTitle: "#111111",
    zoneSubtext: "#525252",
    zoneContainerBorder: "#a3a3a3",
    zoneActionBorder: "#171717",
    zoneBadgeBg: "#e5e5e5",
    pathLabel: "#111111",
    pathEdge: "#737373",
    pathInboundEdge: "#262626",
    selection: "#000000",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.08) 44%, rgba(255,255,255,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(23,23,23,0.08) 0%, rgba(23,23,23,0.02) 42%, rgba(23,23,23,0) 76%)",
        accentFade: "rgba(229, 229, 229, 0.16)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(244,244,245,0.98) 100%)",
        shadow:
          "0 16px 28px rgba(23, 23, 23, 0.08), 0 2px 6px rgba(23, 23, 23, 0.05)",
        containerAccent: "rgba(82, 82, 82, 0.10)",
        actionAccent: "rgba(23, 23, 23, 0.14)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.98) 100%)",
        shadow:
          "0 14px 22px rgba(23, 23, 23, 0.08), 0 2px 6px rgba(23, 23, 23, 0.05)",
        accent: "rgba(23, 23, 23, 0.10)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(244,244,245,0.98) 100%)",
        shadow:
          "0 16px 24px rgba(23, 23, 23, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        containerAccent: "#525252",
        actionAccent: "#111111",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(255, 255, 255, 0.94)",
      panelBorder: "1px solid rgba(23, 23, 23, 0.18)",
      panelShadow: "0 16px 32px rgba(23, 23, 23, 0.12)",
      buttonBackground: "rgba(250, 250, 250, 0.96)",
      buttonBorder: "1px solid rgba(23, 23, 23, 0.18)",
      buttonText: "#111111",
      buttonActiveBackground: "#111111",
      buttonActiveBorder: "1px solid rgba(23, 23, 23, 0.52)",
      buttonActiveText: "#ffffff",
      buttonDangerBackground: "#111111",
      buttonDangerBorder: "1px solid rgba(23, 23, 23, 0.52)",
      buttonDangerText: "#ffffff",
    },
    overlay: {
      helpPanel: {
        background: "rgba(255, 255, 255, 0.96)",
        border: "1px solid rgba(23, 23, 23, 0.18)",
        titleText: "#111111",
        bodyText: "#262626",
        mutedText: "#525252",
      },
      floatingToolbar: {
        background: "rgba(255, 255, 255, 0.98)",
        border: "1px solid rgba(23, 23, 23, 0.16)",
        zoneLabelText: "#111111",
        pathLabelText: "#262626",
        buttonBackground: "#f5f5f5",
        buttonBorder: "1px solid rgba(23, 23, 23, 0.16)",
        buttonText: "#111111",
      },
      connectTarget: {
        border: "2px solid rgba(23, 23, 23, 0.92)",
        background: "rgba(23, 23, 23, 0.08)",
        badgeBackground: "#111111",
      },
      dropTarget: {
        border: "2px solid rgba(82, 82, 82, 0.9)",
        background: "rgba(82, 82, 82, 0.08)",
        badgeBackground: "#262626",
      },
      guide: {
        validStroke: "#111111",
        objectSnapStroke: "rgba(23, 23, 23, 0.84)",
      },
      metaChip: {
        background: "rgba(255, 255, 255, 0.92)",
        color: "#111111",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#f4f4f5",
    topbar: {
      background: "#ffffff",
      border: "1px solid rgba(23, 23, 23, 0.14)",
      controlBackground: "#f5f5f5",
      controlBorder: "1px solid rgba(23, 23, 23, 0.18)",
      controlText: "#111111",
    },
    sidebar: {
      background: "#fafafa",
      border: "1px solid rgba(23, 23, 23, 0.12)",
      text: "#111111",
      mutedText: "#525252",
      sectionTitle: "#262626",
      cardBackground: "rgba(255, 255, 255, 0.92)",
      cardBorder: "rgba(23, 23, 23, 0.12)",
      controlBackground: "#f5f5f5",
      controlBorder: "1px solid rgba(23, 23, 23, 0.16)",
      controlText: "#111111",
      accent: "#111111",
    },
  },
};

const gardenPreset: ZoneflowThemePreset = {
  id: "garden",
  label: "Garden",
  description: "Soft botanical workspace preset.",
  rendererTheme: {
    background: "#f3f7ec",
    zoneTitle: "#1f351f",
    zoneSubtext: "#557153",
    zoneContainerBorder: "#86a86b",
    zoneActionBorder: "#d97706",
    zoneBadgeBg: "#edf7d7",
    pathLabel: "#1f351f",
    pathEdge: "#6b8f3f",
    pathInboundEdge: "#2f855a",
    selection: "#65a30d",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(220,252,231,0.16) 44%, rgba(220,252,231,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(132,204,22,0.22) 0%, rgba(251,191,36,0.08) 38%, rgba(132,204,22,0) 72%)",
        accentFade: "rgba(220, 252, 231, 0.18)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,255,247,0.99) 0%, rgba(243,247,236,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(47, 83, 47, 0.10), 0 3px 8px rgba(47, 83, 47, 0.06)",
        containerAccent: "rgba(101, 163, 13, 0.14)",
        actionAccent: "rgba(217, 119, 6, 0.16)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,255,247,0.99) 0%, rgba(236,253,245,0.97) 100%)",
        shadow:
          "0 16px 26px rgba(47, 83, 47, 0.10), 0 3px 8px rgba(47, 83, 47, 0.05)",
        accent: "rgba(47, 133, 90, 0.14)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,255,247,0.99) 0%, rgba(243,247,236,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(47, 83, 47, 0.10), inset 0 1px 0 rgba(255,255,255,0.88)",
        containerAccent: "#65a30d",
        actionAccent: "#d97706",
      },
    },
    status: {
      info: {
        border: "1px solid rgba(132, 204, 22, 0.34)",
        background:
          "linear-gradient(180deg, rgba(236,253,245,0.98) 0%, rgba(220,252,231,0.94) 100%)",
        color: "#365314",
        shadow: "0 6px 14px rgba(101, 163, 13, 0.14)",
      },
      warning: {
        border: "1px solid rgba(217, 119, 6, 0.34)",
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.98) 0%, rgba(254,243,199,0.94) 100%)",
        color: "#92400e",
        shadow: "0 6px 14px rgba(217, 119, 6, 0.14)",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(31, 53, 31, 0.92)",
      panelBorder: "1px solid rgba(132, 168, 107, 0.34)",
      buttonBackground: "rgba(73, 104, 67, 0.82)",
      buttonBorder: "1px solid rgba(187, 214, 143, 0.30)",
      buttonText: "#f7fee7",
      buttonActiveBackground: "#65a30d",
      buttonActiveBorder: "1px solid rgba(217, 249, 157, 0.46)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(31, 53, 31, 0.92)",
        border: "1px solid rgba(132, 168, 107, 0.34)",
        titleText: "#f7fee7",
        mutedText: "#d9f99d",
      },
      connectTarget: {
        badgeBackground: "#2f855a",
      },
      dropTarget: {
        badgeBackground: "#65a30d",
      },
      guide: {
        objectSnapStroke: "rgba(217, 119, 6, 0.86)",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#f3f7ec",
    topbar: {
      background: "#1f351f",
      border: "1px solid rgba(132, 168, 107, 0.26)",
      controlBackground: "#496843",
      controlBorder: "1px solid rgba(187, 214, 143, 0.30)",
      controlText: "#f7fee7",
    },
    sidebar: {
      background: "#263d25",
      border: "1px solid rgba(132, 168, 107, 0.18)",
      text: "#f7fee7",
      mutedText: "#d9f99d",
      sectionTitle: "#ecfccb",
      cardBackground: "rgba(73, 104, 67, 0.44)",
      cardBorder: "rgba(187, 214, 143, 0.18)",
      controlBackground: "#496843",
      controlBorder: "1px solid rgba(187, 214, 143, 0.24)",
      controlText: "#f7fee7",
      accent: "#f59e0b",
    },
  },
};

const utopiaPreset: ZoneflowThemePreset = {
  id: "utopia",
  label: "Utopia",
  description: "Bright civic future preset with glass and mint accents.",
  rendererTheme: {
    background: "#eefdf8",
    zoneTitle: "#073b3a",
    zoneSubtext: "#3f7b75",
    zoneContainerBorder: "#8be9d6",
    zoneActionBorder: "#38bdf8",
    zoneBadgeBg: "#dffdf5",
    pathLabel: "#073b3a",
    pathEdge: "#14b8a6",
    pathInboundEdge: "#0284c7",
    selection: "#06b6d4",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(204,251,241,0.24) 44%, rgba(204,251,241,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(45,212,191,0.24) 0%, rgba(125,211,252,0.12) 38%, rgba(45,212,191,0) 72%)",
        accentFade: "rgba(204, 251, 241, 0.18)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(240,253,250,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(8, 145, 178, 0.10), 0 3px 8px rgba(15, 118, 110, 0.05)",
        containerAccent: "rgba(20, 184, 166, 0.14)",
        actionAccent: "rgba(56, 189, 248, 0.16)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,254,255,0.98) 100%)",
        shadow:
          "0 16px 26px rgba(8, 145, 178, 0.09), 0 3px 8px rgba(15, 118, 110, 0.05)",
        accent: "rgba(6, 182, 212, 0.14)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(240,253,250,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(8, 145, 178, 0.09), inset 0 1px 0 rgba(255,255,255,0.92)",
        containerAccent: "#14b8a6",
        actionAccent: "#38bdf8",
      },
    },
    status: {
      info: {
        border: "1px solid rgba(20, 184, 166, 0.32)",
        background:
          "linear-gradient(180deg, rgba(240,253,250,0.98) 0%, rgba(204,251,241,0.94) 100%)",
        color: "#0f766e",
        shadow: "0 6px 14px rgba(20, 184, 166, 0.12)",
      },
      warning: {
        border: "1px solid rgba(245, 158, 11, 0.34)",
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.98) 0%, rgba(254,243,199,0.94) 100%)",
        color: "#92400e",
        shadow: "0 6px 14px rgba(245, 158, 11, 0.12)",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(7, 59, 58, 0.92)",
      panelBorder: "1px solid rgba(139, 233, 214, 0.34)",
      buttonBackground: "rgba(15, 118, 110, 0.78)",
      buttonBorder: "1px solid rgba(153, 246, 228, 0.30)",
      buttonText: "#ecfeff",
      buttonActiveBackground: "#0891b2",
      buttonActiveBorder: "1px solid rgba(186, 230, 253, 0.46)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(7, 59, 58, 0.92)",
        border: "1px solid rgba(139, 233, 214, 0.34)",
        titleText: "#ecfeff",
        mutedText: "#99f6e4",
      },
      connectTarget: {
        badgeBackground: "#0284c7",
      },
      dropTarget: {
        badgeBackground: "#14b8a6",
      },
      guide: {
        objectSnapStroke: "rgba(6, 182, 212, 0.9)",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#eefdf8",
    topbar: {
      background: "#073b3a",
      border: "1px solid rgba(139, 233, 214, 0.24)",
      controlBackground: "#0f766e",
      controlBorder: "1px solid rgba(153, 246, 228, 0.30)",
      controlText: "#ecfeff",
    },
    sidebar: {
      background: "#0b4b49",
      border: "1px solid rgba(139, 233, 214, 0.18)",
      text: "#ecfeff",
      mutedText: "#99f6e4",
      sectionTitle: "#ccfbf1",
      cardBackground: "rgba(15, 118, 110, 0.38)",
      cardBorder: "rgba(153, 246, 228, 0.18)",
      controlBackground: "#0f766e",
      controlBorder: "1px solid rgba(153, 246, 228, 0.24)",
      controlText: "#ecfeff",
      accent: "#7dd3fc",
    },
  },
};

const dystopiaPreset: ZoneflowThemePreset = {
  id: "dystopia",
  label: "Dystopia",
  description: "Industrial dark preset with rust and warning tones.",
  rendererTheme: {
    background: "#140f0c",
    zoneTitle: "#fff1e6",
    zoneSubtext: "#c4a18a",
    zoneContainerBorder: "#7c2d12",
    zoneActionBorder: "#ef4444",
    zoneBadgeBg: "#291612",
    pathLabel: "#fff1e6",
    pathEdge: "#b45309",
    pathInboundEdge: "#ef4444",
    selection: "#f97316",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(248,113,113,0.12) 0%, rgba(180,83,9,0.04) 44%, rgba(180,83,9,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(239,68,68,0.18) 0%, rgba(180,83,9,0.10) 38%, rgba(239,68,68,0) 72%)",
        accentFade: "rgba(41, 22, 18, 0.28)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(41,22,18,0.98) 0%, rgba(20,15,12,0.98) 100%)",
        shadow:
          "0 20px 38px rgba(0, 0, 0, 0.52), 0 0 24px rgba(239, 68, 68, 0.10)",
        containerAccent: "rgba(180, 83, 9, 0.22)",
        actionAccent: "rgba(239, 68, 68, 0.20)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(41,22,18,0.98) 0%, rgba(28,18,14,0.98) 100%)",
        shadow:
          "0 18px 30px rgba(0, 0, 0, 0.48), 0 0 20px rgba(180, 83, 9, 0.12)",
        accent: "rgba(249, 115, 22, 0.18)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(47,24,18,0.99) 0%, rgba(20,15,12,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(0, 0, 0, 0.46), inset 0 1px 0 rgba(248,113,113,0.10)",
        containerAccent: "#b45309",
        actionAccent: "#ef4444",
      },
    },
    status: {
      info: {
        border: "1px solid rgba(245, 158, 11, 0.30)",
        background:
          "linear-gradient(180deg, rgba(69,36,16,0.92) 0%, rgba(41,22,18,0.88) 100%)",
        color: "#fcd34d",
        shadow: "0 6px 14px rgba(180, 83, 9, 0.16)",
      },
      warning: {
        border: "1px solid rgba(248, 113, 113, 0.36)",
        background:
          "linear-gradient(180deg, rgba(127,29,29,0.92) 0%, rgba(69,10,10,0.88) 100%)",
        color: "#fecaca",
        shadow: "0 6px 14px rgba(127, 29, 29, 0.20)",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(20, 15, 12, 0.94)",
      panelBorder: "1px solid rgba(239, 68, 68, 0.30)",
      buttonBackground: "rgba(41, 22, 18, 0.86)",
      buttonBorder: "1px solid rgba(249, 115, 22, 0.28)",
      buttonText: "#fff1e6",
      buttonActiveBackground: "#b45309",
      buttonActiveBorder: "1px solid rgba(248, 113, 113, 0.46)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(20, 15, 12, 0.94)",
        border: "1px solid rgba(239, 68, 68, 0.30)",
        titleText: "#fff1e6",
        mutedText: "#c4a18a",
      },
      floatingToolbar: {
        background: "rgba(20, 15, 12, 0.96)",
        border: "1px solid rgba(249, 115, 22, 0.24)",
        zoneLabelText: "#fed7aa",
        pathLabelText: "#fecaca",
      },
      connectTarget: {
        badgeBackground: "#ef4444",
      },
      dropTarget: {
        badgeBackground: "#b45309",
      },
      guide: {
        objectSnapStroke: "rgba(249, 115, 22, 0.92)",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#140f0c",
    topbar: {
      background: "#140f0c",
      border: "1px solid rgba(239, 68, 68, 0.24)",
      controlBackground: "#291612",
      controlBorder: "1px solid rgba(249, 115, 22, 0.28)",
      controlText: "#fff1e6",
    },
    sidebar: {
      background: "#1d1410",
      border: "1px solid rgba(239, 68, 68, 0.16)",
      text: "#fff1e6",
      mutedText: "#c4a18a",
      sectionTitle: "#fed7aa",
      cardBackground: "rgba(41, 22, 18, 0.62)",
      cardBorder: "rgba(249, 115, 22, 0.16)",
      controlBackground: "#291612",
      controlBorder: "1px solid rgba(249, 115, 22, 0.24)",
      controlText: "#fff1e6",
      accent: "#ef4444",
    },
  },
};

const desertPreset: ZoneflowThemePreset = {
  id: "desert",
  label: "Desert",
  description: "Warm sand and oasis preset.",
  rendererTheme: {
    background: "#fbf1d3",
    zoneTitle: "#4a2c13",
    zoneSubtext: "#87633d",
    zoneContainerBorder: "#d6a85f",
    zoneActionBorder: "#0f766e",
    zoneBadgeBg: "#fdecc8",
    pathLabel: "#4a2c13",
    pathEdge: "#b7791f",
    pathInboundEdge: "#0f766e",
    selection: "#c2410c",
    surface: {
      chrome: {
        overlay:
          "linear-gradient(180deg, rgba(255,251,235,0.84) 0%, rgba(254,215,170,0.18) 44%, rgba(254,215,170,0) 100%)",
        glow:
          "radial-gradient(circle, rgba(251,191,36,0.24) 0%, rgba(20,184,166,0.08) 38%, rgba(251,191,36,0) 72%)",
        accentFade: "rgba(254, 215, 170, 0.18)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(251,241,211,0.98) 100%)",
        shadow:
          "0 18px 34px rgba(146, 64, 14, 0.12), 0 3px 8px rgba(146, 64, 14, 0.06)",
        containerAccent: "rgba(214, 168, 95, 0.18)",
        actionAccent: "rgba(15, 118, 110, 0.14)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(254,243,199,0.97) 100%)",
        shadow:
          "0 16px 26px rgba(146, 64, 14, 0.11), 0 3px 8px rgba(146, 64, 14, 0.05)",
        accent: "rgba(15, 118, 110, 0.12)",
      },
      anchor: {
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.99) 0%, rgba(251,241,211,0.98) 100%)",
        shadow:
          "0 18px 28px rgba(146, 64, 14, 0.10), inset 0 1px 0 rgba(255,255,255,0.88)",
        containerAccent: "#d6a85f",
        actionAccent: "#0f766e",
      },
    },
    status: {
      info: {
        border: "1px solid rgba(15, 118, 110, 0.30)",
        background:
          "linear-gradient(180deg, rgba(240,253,250,0.96) 0%, rgba(204,251,241,0.88) 100%)",
        color: "#0f766e",
        shadow: "0 6px 14px rgba(15, 118, 110, 0.12)",
      },
      warning: {
        border: "1px solid rgba(194, 65, 12, 0.34)",
        background:
          "linear-gradient(180deg, rgba(255,247,237,0.98) 0%, rgba(254,215,170,0.92) 100%)",
        color: "#9a3412",
        shadow: "0 6px 14px rgba(194, 65, 12, 0.14)",
      },
    },
  },
  editorTheme: {
    hud: {
      panelBackground: "rgba(74, 44, 19, 0.92)",
      panelBorder: "1px solid rgba(214, 168, 95, 0.34)",
      buttonBackground: "rgba(135, 99, 61, 0.82)",
      buttonBorder: "1px solid rgba(253, 186, 116, 0.30)",
      buttonText: "#fff7ed",
      buttonActiveBackground: "#0f766e",
      buttonActiveBorder: "1px solid rgba(153, 246, 228, 0.42)",
    },
    overlay: {
      helpPanel: {
        background: "rgba(74, 44, 19, 0.92)",
        border: "1px solid rgba(214, 168, 95, 0.34)",
        titleText: "#fff7ed",
        mutedText: "#fed7aa",
      },
      connectTarget: {
        badgeBackground: "#0f766e",
      },
      dropTarget: {
        badgeBackground: "#c2410c",
      },
      guide: {
        objectSnapStroke: "rgba(194, 65, 12, 0.88)",
      },
    },
  },
  surfacePalette: {
    canvasBackground: "#fbf1d3",
    topbar: {
      background: "#4a2c13",
      border: "1px solid rgba(214, 168, 95, 0.28)",
      controlBackground: "#87633d",
      controlBorder: "1px solid rgba(253, 186, 116, 0.30)",
      controlText: "#fff7ed",
    },
    sidebar: {
      background: "#5a3518",
      border: "1px solid rgba(214, 168, 95, 0.18)",
      text: "#fff7ed",
      mutedText: "#fed7aa",
      sectionTitle: "#fde68a",
      cardBackground: "rgba(135, 99, 61, 0.44)",
      cardBorder: "rgba(253, 186, 116, 0.18)",
      controlBackground: "#87633d",
      controlBorder: "1px solid rgba(253, 186, 116, 0.24)",
      controlText: "#fff7ed",
      accent: "#2dd4bf",
    },
  },
};

export const zoneflowThemePresets = {
  dark: darkPreset,
  ocean: oceanPreset,
  sunset: sunsetPreset,
  light: lightPreset,
  party: partyPreset,
  "korean-culture": koreanCulturePreset,
  "sci-fi": sciFiPreset,
  fantasy: fantasyPreset,
  mono: monoPreset,
  garden: gardenPreset,
  utopia: utopiaPreset,
  dystopia: dystopiaPreset,
  desert: desertPreset,
} satisfies Record<ZoneflowThemePresetId, ZoneflowThemePreset>;

export {
  darkPreset,
  oceanPreset,
  sunsetPreset,
  lightPreset,
  partyPreset,
  koreanCulturePreset,
  sciFiPreset,
  fantasyPreset,
  monoPreset,
  gardenPreset,
  utopiaPreset,
  dystopiaPreset,
  desertPreset,
};
