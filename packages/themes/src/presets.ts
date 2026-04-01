import type { ZoneflowEditorThemeInput } from "@zoneflow/react";
import type { ZoneflowTheme } from "@zoneflow/renderer-dom";

export type ZoneflowThemePresetId =
  | "dark"
  | "ocean"
  | "sunset"
  | "light"
  | "party"
  | "korean-culture";

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

export const zoneflowThemePresets = {
  dark: darkPreset,
  ocean: oceanPreset,
  sunset: sunsetPreset,
  light: lightPreset,
  party: partyPreset,
  "korean-culture": koreanCulturePreset,
} satisfies Record<ZoneflowThemePresetId, ZoneflowThemePreset>;

export {
  darkPreset,
  oceanPreset,
  sunsetPreset,
  lightPreset,
  partyPreset,
  koreanCulturePreset,
};
