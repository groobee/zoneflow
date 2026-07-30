import { describe, expect, it } from "vitest";
import { resolveEditorTheme } from "./theme.js";

describe("resolveEditorTheme — dialog follows the theme", () => {
  it("derives the dialog tone from the theme's HUD when no dialog is given", () => {
    // An "ocean-like" theme: styles its HUD/control panel but never spells
    // out overlay.dialog (the exact gap most presets had).
    const resolved = resolveEditorTheme({
      hud: {
        panelBackground: "rgba(8, 47, 73, 0.92)",
        panelBorder: "1px solid rgba(103, 232, 249, 0.28)",
        panelShadow: "0 16px 32px rgba(8, 47, 73, 0.3)",
        buttonBackground: "rgba(14, 116, 144, 0.78)",
        buttonBorder: "1px solid rgba(103, 232, 249, 0.24)",
        buttonText: "#ecfeff",
        buttonDangerBackground: "rgba(127, 29, 29, 0.8)",
        buttonDangerBorder: "1px solid rgba(248, 113, 113, 0.5)",
        buttonDangerText: "#fee2e2",
      },
    });

    const { dialog } = resolved.overlay;
    // Panel surface comes straight from the HUD — no more static white box.
    expect(dialog.background).toBe("rgba(8, 47, 73, 0.92)");
    expect(dialog.border).toBe("1px solid rgba(103, 232, 249, 0.28)");
    expect(dialog.shadow).toBe("0 16px 32px rgba(8, 47, 73, 0.3)");
    expect(dialog.titleText).toBe("#ecfeff");
    expect(dialog.secondaryButton).toEqual({
      background: "rgba(14, 116, 144, 0.78)",
      border: "1px solid rgba(103, 232, 249, 0.24)",
      color: "#ecfeff",
    });
    expect(dialog.dangerButton).toEqual({
      background: "rgba(127, 29, 29, 0.8)",
      border: "1px solid rgba(248, 113, 113, 0.5)",
      color: "#fee2e2",
    });
  });

  it("does not return the static light default for a themed HUD", () => {
    const resolved = resolveEditorTheme({
      hud: { panelBackground: "#001018" },
    });
    // The pre-fix bug: dialog stayed rgba(255,255,255,0.98) regardless of theme.
    expect(resolved.overlay.dialog.background).not.toBe(
      "rgba(255, 255, 255, 0.98)"
    );
    expect(resolved.overlay.dialog.background).toBe("#001018");
  });

  it("still lets an explicit overlay.dialog win field-by-field", () => {
    const resolved = resolveEditorTheme({
      hud: { panelBackground: "#001018", buttonText: "#ecfeff" },
      overlay: {
        dialog: {
          background: "#123456",
          dangerButton: { background: "#ff0000" },
        },
      },
    });

    const { dialog } = resolved.overlay;
    // explicit background wins…
    expect(dialog.background).toBe("#123456");
    // …explicit danger background wins…
    expect(dialog.dangerButton.background).toBe("#ff0000");
    // …unspecified fields still fall back to the HUD-derived tone.
    expect(dialog.titleText).toBe("#ecfeff");
  });

  it("derives the floating toolbar from the HUD when not given", () => {
    const resolved = resolveEditorTheme({
      hud: {
        panelBackground: "rgba(8, 47, 73, 0.92)",
        panelBorder: "1px solid rgba(103, 232, 249, 0.28)",
        buttonText: "#ecfeff",
        buttonDangerBackground: "rgba(127, 29, 29, 0.8)",
      },
    });

    const { floatingToolbar } = resolved.overlay;
    expect(floatingToolbar.background).toBe("rgba(8, 47, 73, 0.92)");
    expect(floatingToolbar.zoneLabelText).toBe("#ecfeff");
    expect(floatingToolbar.dangerButtonBackground).toBe("rgba(127, 29, 29, 0.8)");
    // not the static default any more
    expect(floatingToolbar.background).not.toBe("rgba(15, 23, 42, 0.94)");
  });

  it("derives the toast (action button = HUD active tone) when not given", () => {
    const resolved = resolveEditorTheme({
      hud: {
        panelBackground: "rgba(8, 47, 73, 0.92)",
        buttonText: "#ecfeff",
        buttonActiveBackground: "#0891b2",
        buttonActiveBorder: "1px solid rgba(165, 243, 252, 0.4)",
        buttonActiveText: "#ecfeff",
      },
    });

    const { toast } = resolved.overlay;
    expect(toast.background).toBe("rgba(8, 47, 73, 0.92)");
    expect(toast.text).toBe("#ecfeff");
    expect(toast.actionButton).toEqual({
      background: "#0891b2",
      border: "1px solid rgba(165, 243, 252, 0.4)",
      color: "#ecfeff",
    });
  });

  it("lets explicit toolbar/toast still win", () => {
    const resolved = resolveEditorTheme({
      hud: { panelBackground: "#001018" },
      overlay: {
        floatingToolbar: { background: "#abcdef" },
        toast: { background: "#fedcba", actionButton: { background: "#111" } },
      },
    });
    expect(resolved.overlay.floatingToolbar.background).toBe("#abcdef");
    expect(resolved.overlay.toast.background).toBe("#fedcba");
    expect(resolved.overlay.toast.actionButton.background).toBe("#111");
  });
});

describe("resolveEditorTheme — dropRejected tone", () => {
  it("provides library defaults when unspecified", () => {
    const tone = resolveEditorTheme({}).overlay.dropRejected;
    expect(tone.badgeBackground).toBe("#e11d48");
    expect(tone.border).toContain("rgba(225, 29, 72");
  });

  it("merges partial overrides over the defaults", () => {
    const tone = resolveEditorTheme({
      overlay: { dropRejected: { badgeBackground: "#7f1d1d" } },
    }).overlay.dropRejected;
    expect(tone.badgeBackground).toBe("#7f1d1d");
    // 나머지 토큰은 기본값 유지
    expect(tone.badgeColor).toBe("#fff1f2");
  });
});
