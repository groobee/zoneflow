import { describe, expect, it } from "vitest";
import { resolveTheme } from "./themes/defaultTheme.js";
import { ZONE_CLIP_SHADOW } from "./engines/drawShared.js";
import { resolveEdgeFlowMotion } from "./engines/edgeFlow.js";

describe("resolveTheme — typography tokens", () => {
  it("defaults to the library font stack and slot sizes", () => {
    const theme = resolveTheme();
    expect(theme.typography.fontFamily).toBe(
      "'IBM Plex Sans', 'Pretendard', sans-serif"
    );
    expect(theme.typography.zoneFontSize).toEqual({
      titleSm: 12,
      title: 13,
      titleLg: 15,
      type: 11,
      badge: 11,
      body: 12,
      footer: 11,
      slotLabel: 10,
    });
    expect(theme.typography.pathFontSize).toEqual({
      label: 12,
      rule: 10,
      target: 11,
      body: 11,
    });
  });

  it("overrides fontFamily alone, keeping every size default", () => {
    const theme = resolveTheme({
      typography: { fontFamily: "'Inter', sans-serif" },
    });
    expect(theme.typography.fontFamily).toBe("'Inter', sans-serif");
    expect(theme.typography.zoneFontSize.title).toBe(13);
    expect(theme.typography.pathFontSize.label).toBe(12);
  });

  it("merges partial slot sizes over the defaults", () => {
    const theme = resolveTheme({
      typography: {
        zoneFontSize: { title: 14, titleLg: 16 },
        pathFontSize: { rule: 11 },
      },
    });
    expect(theme.typography.zoneFontSize.title).toBe(14);
    expect(theme.typography.zoneFontSize.titleLg).toBe(16);
    expect(theme.typography.zoneFontSize.titleSm).toBe(12); // default kept
    expect(theme.typography.pathFontSize.rule).toBe(11);
    expect(theme.typography.pathFontSize.label).toBe(12); // default kept
    expect(theme.typography.fontFamily).toContain("IBM Plex Sans");
  });
});

describe("resolveTheme — zone clip shadow token", () => {
  it("defaults to the library clip shadow", () => {
    expect(resolveTheme().surface.zone.clipShadow).toBe(ZONE_CLIP_SHADOW);
  });

  it("overrides via surface.zone.clipShadow without touching siblings", () => {
    const custom = "drop-shadow(0 2px 4px rgba(0,0,0,0.4))";
    const theme = resolveTheme({
      surface: { zone: { clipShadow: custom } },
    });
    expect(theme.surface.zone.clipShadow).toBe(custom);
    // 같은 그룹의 다른 토큰은 기본값 유지 (deep merge)
    expect(theme.surface.zone.background).toBe(
      resolveTheme().surface.zone.background
    );
  });
});

describe("resolveTheme — grid tokens", () => {
  it("leaves grid tokens unset by default (per-mode library fallbacks apply)", () => {
    const theme = resolveTheme();
    expect(theme.grid?.line).toBeUndefined();
    expect(theme.grid?.majorLine).toBeUndefined();
  });

  it("carries consumer grid colors through", () => {
    const theme = resolveTheme({
      grid: { line: "rgba(0,0,0,0.1)" },
    });
    expect(theme.grid?.line).toBe("rgba(0,0,0,0.1)");
    expect(theme.grid?.majorLine).toBeUndefined();
  });
});

describe("resolveTheme — deep-partial surface input", () => {
  it("accepts a single-token surface group (README example shape)", () => {
    const theme = resolveTheme({
      surface: { zone: { background: "#fff" } },
    });
    expect(theme.surface.zone.background).toBe("#fff");
    expect(theme.surface.zone.shadow).toBe(
      resolveTheme().surface.zone.shadow
    );
    expect(theme.surface.path).toEqual(resolveTheme().surface.path);
  });
});

describe("resolveTheme — explicit undefined keeps defaults", () => {
  it("treats undefined-valued keys as unset at every level", () => {
    const defaults = resolveTheme();
    const theme = resolveTheme({
      background: undefined,
      density: { zone: { far: undefined } },
      typography: { zoneFontSize: { title: undefined } },
      edgeFlow: { durationMs: undefined },
    });

    expect(theme.background).toBe(defaults.background);
    expect(theme.density.zone.far).toBe(defaults.density.zone.far);
    expect(theme.typography.zoneFontSize.title).toBe(
      defaults.typography.zoneFontSize.title
    );
    expect(theme.edgeFlow.durationMs).toBe(defaults.edgeFlow.durationMs);
  });
});

describe("resolveEdgeFlowMotion — per-value animation id", () => {
  it("gives different motions different CSS-safe ids", () => {
    const a = resolveEdgeFlowMotion(resolveTheme());
    const b = resolveEdgeFlowMotion(
      resolveTheme({ edgeFlow: { durationMs: 5000.5 } })
    );

    expect(a.id).not.toBe(b.id);
    expect(b.id).toMatch(/^[\w-]+$/);
  });
});
