import type { ZoneflowTheme } from "../theme";

/**
 * 기본 테마 (모든 필수 값 포함)
 */
export const defaultTheme: ZoneflowTheme = {
  background: "#ffffff",

  zoneTitle: "#111111",
  zoneSubtext: "#666666",

  zoneContainerBorder: "#d0d5dd",
  zoneActionBorder: "#7f56d9",

  zoneBadgeBg: "#f4f3ff",

  pathLabel: "#344054",
  pathEdge: "#98a2b3",

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
