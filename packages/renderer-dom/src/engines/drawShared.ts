import type { Rect, RendererDrawInput } from "../types";

/**
 * 저수준 DOM 그리기 헬퍼들. drawEngine(라이브러리 코어)과 defaultZoneRenderer
 * (교체 가능한 기본 zone 렌더러) 양쪽에서 쓰여 순환 의존을 피하려 분리해 둔다.
 */

export function applyStyles(
  el: HTMLElement | SVGElement,
  styles: Record<string, string | number>
) {
  for (const [key, value] of Object.entries(styles)) {
    // @ts-expect-error CSSStyleDeclaration index access
    el.style[key] = String(value);
  }
}

export const ZONE_CLIP_SHADOW =
  "drop-shadow(0 14px 22px rgba(15, 23, 42, 0.12)) drop-shadow(0 3px 6px rgba(15, 23, 42, 0.08))";

/**
 * 카드 표면의 공통 chrome(상단 밴드 / 코너 글로우 또는 헤더리스 워시)을 그린다.
 */
export function createSurfaceChrome(params: {
  owner: HTMLElement;
  accent: string;
  radius: string;
  theme: RendererDrawInput["theme"];
  header?: boolean;
  topBandOpacity?: number;
}) {
  const { owner, accent, radius, theme, header = true, topBandOpacity = 0.64 } =
    params;
  const chrome = document.createElement("div");

  applyStyles(chrome, {
    position: "absolute",
    inset: "0",
    borderRadius: radius,
    pointerEvents: "none",
    background: theme.surface.chrome.overlay,
  });

  if (header) {
    const topBand = document.createElement("div");
    const cornerGlow = document.createElement("div");

    applyStyles(topBand, {
      position: "absolute",
      left: "0",
      top: "0",
      right: "0",
      height: "44px",
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      background: `linear-gradient(90deg, ${accent} 0%, ${theme.surface.chrome.accentFade} 72%)`,
      opacity: topBandOpacity,
      pointerEvents: "none",
    });

    applyStyles(cornerGlow, {
      position: "absolute",
      right: "-20px",
      top: "-24px",
      width: "116px",
      height: "116px",
      borderRadius: "999px",
      background: theme.surface.chrome.glow,
      pointerEvents: "none",
    });

    chrome.appendChild(topBand);
    chrome.appendChild(cornerGlow);
  } else {
    // Header-less shapes (circle/pill/diamond/…) keep their accent identity
    // via a soft top-centered wash instead of the rectangular band.
    const accentWash = document.createElement("div");
    applyStyles(accentWash, {
      position: "absolute",
      inset: "0",
      borderRadius: radius,
      background: `radial-gradient(135% 100% at 50% 0%, ${accent} 0%, ${theme.surface.chrome.accentFade} 70%)`,
      opacity: 0.85,
      pointerEvents: "none",
    });
    chrome.appendChild(accentWash);
  }

  owner.appendChild(chrome);
}

export function toLocalRect(ownerRect: Rect, slotRect: Rect): Rect {
  return {
    x: slotRect.x - ownerRect.x,
    y: slotRect.y - ownerRect.y,
    width: slotRect.width,
    height: slotRect.height,
  };
}
