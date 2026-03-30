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

  selection: "#2e90fa",

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
