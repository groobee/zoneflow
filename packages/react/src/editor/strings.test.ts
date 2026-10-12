import { describe, expect, it } from "vitest";
import { getHelpPanelBody, getZoneflowEditorStrings } from "./strings";

describe("getHelpPanelBody", () => {
  it("panOnBackgroundDrag 꺼짐 — 빈 캔버스 드래그는 올가미", () => {
    const body = getHelpPanelBody(getZoneflowEditorStrings("ko"), false);
    expect(body).toContain("빈 캔버스를 드래그하면 올가미 선택이 됩니다.");
    expect(body).not.toContain("화면이 이동");
  });

  it("panOnBackgroundDrag 켜짐 — 화면 이동, 수정키 드래그는 올가미", () => {
    const body = getHelpPanelBody(getZoneflowEditorStrings("ko"), true);
    expect(body).toContain("화면이 이동합니다");
    expect(body).toContain("Shift/Ctrl/⌘");
    expect(body).not.toContain("빈 캔버스를 드래그하면 올가미");
  });

  it("en 도 같은 규칙", () => {
    const strings = getZoneflowEditorStrings("en");
    expect(getHelpPanelBody(strings, false)).toContain("Drag empty canvas space to marquee-select");
    expect(getHelpPanelBody(strings, true)).toContain("pan the view");
  });
});
