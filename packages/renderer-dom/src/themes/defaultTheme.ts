import type { ZoneflowTheme, ZoneflowThemeInput } from "../theme.js";
import { ZONE_CLIP_SHADOW } from "../engines/drawShared.js";

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
      slotBackground: "rgba(37, 99, 235, 0.05)",
      slotBorder: "rgba(37, 99, 235, 0.30)",
      slotLabel: "rgba(37, 99, 235, 0.72)",
      slotSnapPoint: "rgba(37, 99, 235, 0.38)",
      clipShadow: ZONE_CLIP_SHADOW,
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

  typography: {
    fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
    zoneFontSize: {
      titleSm: 12,
      title: 13,
      titleLg: 15,
      type: 11,
      badge: 11,
      body: 12,
      footer: 11,
      slotLabel: 10,
    },
    pathFontSize: {
      label: 12,
      rule: 10,
      target: 11,
      body: 11,
    },
  },

  // grid 는 의도적으로 미지정 — 일반/모듈러 그리드의 기본색이 서로 달라
  // (drawEngine 참조) 토큰 미지정 시 각자의 기본색으로 폴백한다.

  density: {
    zone: {
      detail: 200,
      near: 140,
      mid: 90,
      far: 56,
    },
    path: {
      full: 120,
      chip: 60,
    },
  },
};

// 스프레드 병합은 명시적 undefined(예: `{ background: props.bg }`)로 기본값을
// 지워 버린다 — undefined 값 키를 걸러 "미지정 = 기본값"을 보장한다.
function definedOnly<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {};
  const result: Partial<T> = {};
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

/**
 * Partial theme을 받아서 완전한 theme으로 보정
 */
export function resolveTheme(
  theme?: ZoneflowThemeInput
): ZoneflowTheme {
  if (!theme) return defaultTheme;

  return {
    ...defaultTheme,
    ...definedOnly(theme),
    surface: {
      chrome: {
        ...defaultTheme.surface.chrome,
        ...definedOnly(theme.surface?.chrome),
      },
      zone: {
        ...defaultTheme.surface.zone,
        ...definedOnly(theme.surface?.zone),
      },
      path: {
        ...defaultTheme.surface.path,
        ...definedOnly(theme.surface?.path),
      },
      anchor: {
        ...defaultTheme.surface.anchor,
        ...definedOnly(theme.surface?.anchor),
      },
    },
    status: {
      info: {
        ...defaultTheme.status.info,
        ...definedOnly(theme.status?.info),
      },
      warning: {
        ...defaultTheme.status.warning,
        ...definedOnly(theme.status?.warning),
      },
    },
    edgeFlow: {
      ...defaultTheme.edgeFlow,
      ...definedOnly(theme.edgeFlow),
    },
    typography: {
      fontFamily:
        theme.typography?.fontFamily ?? defaultTheme.typography.fontFamily,
      zoneFontSize: {
        ...defaultTheme.typography.zoneFontSize,
        ...definedOnly(theme.typography?.zoneFontSize),
      },
      pathFontSize: {
        ...defaultTheme.typography.pathFontSize,
        ...definedOnly(theme.typography?.pathFontSize),
      },
    },
    grid: {
      ...defaultTheme.grid,
      ...definedOnly(theme.grid),
    },
    density: {
      zone: {
        ...defaultTheme.density.zone,
        ...definedOnly(theme.density?.zone),
      },
      path: {
        ...defaultTheme.density.path,
        ...definedOnly(theme.density?.path),
      },
    },
  };
}
