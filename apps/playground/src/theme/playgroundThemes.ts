import type { ZoneflowEditorThemeInput } from "@zoneflow/react";
import type { ZoneflowTheme } from "@zoneflow/renderer-dom";
import type { SampleType } from "../hooks/useSampleSwitcher";

export type PlaygroundThemePresetId = "sunset" | "ocean" | "midnight";

export type PlaygroundThemePreset = {
  id: PlaygroundThemePresetId;
  label: string;
  description: string;
  sampleType: Exclude<SampleType, "custom">;
  rendererTheme: Partial<ZoneflowTheme>;
  editorTheme: ZoneflowEditorThemeInput;
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

export const playgroundThemePresets: Record<
  PlaygroundThemePresetId,
  PlaygroundThemePreset
> = {
  sunset: {
    id: "sunset",
    label: "Sunset",
    description: "Warm retention demo",
    sampleType: "small",
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
          overlay:
            "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0) 100%)",
          glow:
            "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.22) 36%, rgba(255,255,255,0) 72%)",
          accentFade: "rgba(255, 237, 213, 0.14)",
        },
        zone: {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)",
          containerAccent: "rgba(251, 146, 60, 0.14)",
          actionAccent: "rgba(249, 115, 22, 0.2)",
          shadow:
            "0 18px 34px rgba(154, 52, 18, 0.10), 0 3px 8px rgba(154, 52, 18, 0.06)",
        },
        path: {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,251,235,0.98) 100%)",
          accent: "rgba(251, 146, 60, 0.18)",
          shadow:
            "0 16px 26px rgba(154, 52, 18, 0.10), 0 3px 8px rgba(154, 52, 18, 0.06)",
        },
        anchor: {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)",
          containerAccent: "#ea580c",
          actionAccent: "#c2410c",
          shadow:
            "0 18px 28px rgba(154, 52, 18, 0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
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
  ocean: {
    id: "ocean",
    label: "Ocean",
    description: "Compact lead flow",
    sampleType: "tiny",
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
          overlay:
            "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0) 100%)",
          glow:
            "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.22) 36%, rgba(255,255,255,0) 72%)",
          accentFade: "rgba(207, 250, 254, 0.18)",
        },
        zone: {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,254,255,0.98) 100%)",
          containerAccent: "rgba(14, 165, 233, 0.14)",
          actionAccent: "rgba(6, 182, 212, 0.18)",
          shadow:
            "0 18px 34px rgba(8, 47, 73, 0.08), 0 3px 8px rgba(8, 47, 73, 0.05)",
        },
        path: {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(240,253,250,0.98) 100%)",
          accent: "rgba(45, 212, 191, 0.16)",
          shadow:
            "0 16px 26px rgba(8, 47, 73, 0.08), 0 3px 8px rgba(8, 47, 73, 0.05)",
        },
        anchor: {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,254,255,0.98) 100%)",
          containerAccent: "#0ea5e9",
          actionAccent: "#06b6d4",
          shadow:
            "0 18px 28px rgba(8, 47, 73, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
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
  midnight: {
    id: "midnight",
    label: "Midnight",
    description: "Dense operations board",
    sampleType: "large",
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
          containerAccent: "rgba(56, 189, 248, 0.18)",
          actionAccent: "rgba(34, 197, 94, 0.18)",
          shadow:
            "0 18px 34px rgba(2, 6, 23, 0.42), 0 3px 8px rgba(2, 6, 23, 0.26)",
        },
        path: {
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)",
          accent: "rgba(56, 189, 248, 0.18)",
          shadow:
            "0 16px 26px rgba(2, 6, 23, 0.42), 0 3px 8px rgba(2, 6, 23, 0.26)",
        },
        anchor: {
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.99) 0%, rgba(3,7,18,0.98) 100%)",
          containerAccent: "#38bdf8",
          actionAccent: "#22c55e",
          shadow:
            "0 18px 28px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,0.04)",
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

export const defaultPlaygroundThemePresetId: PlaygroundThemePresetId = "sunset";
