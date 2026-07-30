import { describe, expect, it } from "vitest";
import { resolveTheme } from "./themes/defaultTheme.js";

describe("resolveTheme — customizable density thresholds", () => {
  it("merges a partial zone threshold set over the defaults", () => {
    // Retune only `detail`; the rest keep their defaults.
    const theme = resolveTheme({ density: { zone: { detail: 320 } } });
    expect(theme.density.zone).toEqual({
      detail: 320,
      near: 140,
      mid: 90,
      far: 56,
    });
  });

  it("merges partial path thresholds independently", () => {
    const theme = resolveTheme({ density: { path: { chip: 48 } } });
    expect(theme.density.path).toEqual({ full: 120, chip: 48 });
    // zone untouched
    expect(theme.density.zone.detail).toBe(200);
  });

  it("accepts a full custom threshold set", () => {
    const theme = resolveTheme({
      density: { zone: { detail: 300, near: 200, mid: 120, far: 60 } },
    });
    expect(theme.density.zone).toEqual({
      detail: 300,
      near: 200,
      mid: 120,
      far: 60,
    });
  });

  it("keeps defaults when no theme is given", () => {
    expect(resolveTheme().density.zone.far).toBe(56);
  });
});
