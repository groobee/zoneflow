import type { ZoneflowTheme } from "../theme";

/**
 * 기본 테마 (모든 필수 값 포함)
 */
export const defaultTheme: ZoneflowTheme = {
  background: "#f3f6fb",

  zoneTitle: "#0f172a",
  zoneSubtext: "#5f6f86",

  zoneContainerBorder: "#cbd5e1",
  zoneActionBorder: "#f59e0b",

  zoneBadgeBg: "#e0f2fe",

  pathLabel: "#1e293b",
  pathEdge: "#7a8aa0",
  pathInboundEdge: "#0f766e",

  selection: "#2e90fa",

  surface: {
    chrome: {
      overlay:
        "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0) 100%)",
      glow:
        "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.22) 36%, rgba(255,255,255,0) 72%)",
      accentFade: "rgba(255,255,255,0.04)",
    },
    zone: {
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%)",
      shadow:
        "0 18px 34px rgba(15, 23, 42, 0.08), 0 3px 8px rgba(15, 23, 42, 0.05)",
      containerAccent: "rgba(37, 99, 235, 0.12)",
      actionAccent: "rgba(245, 158, 11, 0.18)",
    },
    path: {
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,248,252,0.98) 100%)",
      shadow:
        "0 16px 26px rgba(15, 23, 42, 0.08), 0 3px 8px rgba(15, 23, 42, 0.05)",
      accent: "rgba(56, 189, 248, 0.16)",
    },
    anchor: {
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,250,253,0.98) 100%)",
      shadow:
        "0 18px 28px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
      containerAccent: "rgba(37, 99, 235, 0.96)",
      actionAccent: "rgba(245, 158, 11, 0.96)",
    },
  },

  status: {
    info: {
      border: "1px solid rgba(217, 119, 6, 0.24)",
      background:
        "linear-gradient(180deg, rgba(255,251,235,0.98) 0%, rgba(254,243,199,0.98) 100%)",
      color: "#b45309",
      shadow: "0 6px 14px rgba(180, 83, 9, 0.16)",
    },
    warning: {
      border: "1px solid rgba(217, 119, 6, 0.24)",
      background:
        "linear-gradient(180deg, rgba(255,251,235,0.98) 0%, rgba(254,243,199,0.98) 100%)",
      color: "#b45309",
      shadow: "0 6px 14px rgba(180, 83, 9, 0.16)",
    },
  },

  edgeFlow: {
    durationMs: 1320,
    segmentLength: 18,
    gapLength: 28,
  },

  density: {
    zone: {
      detail: 200,
      near: 140,
      mid: 90,
    },
    path: {
      full: 120,
      chip: 60,
    },
  },
};

/**
 * Partial theme을 받아서 완전한 theme으로 보정
 */
export function resolveTheme(
  theme?: Partial<ZoneflowTheme>
): ZoneflowTheme {
  if (!theme) return defaultTheme;

  return {
    ...defaultTheme,
    ...theme,
    surface: {
      chrome: {
        ...defaultTheme.surface.chrome,
        ...theme.surface?.chrome,
      },
      zone: {
        ...defaultTheme.surface.zone,
        ...theme.surface?.zone,
      },
      path: {
        ...defaultTheme.surface.path,
        ...theme.surface?.path,
      },
      anchor: {
        ...defaultTheme.surface.anchor,
        ...theme.surface?.anchor,
      },
    },
    status: {
      info: {
        ...defaultTheme.status.info,
        ...theme.status?.info,
      },
      warning: {
        ...defaultTheme.status.warning,
        ...theme.status?.warning,
      },
    },
    edgeFlow: {
      ...defaultTheme.edgeFlow,
      ...theme.edgeFlow,
    },
    density: {
      zone: {
        ...defaultTheme.density.zone,
        ...theme.density?.zone,
      },
      path: {
        ...defaultTheme.density.path,
        ...theme.density?.path,
      },
    },
  };
}
