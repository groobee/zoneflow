import type {
  DensityLevel,
  RenderMountRegistry,
  RendererDrawInput,
  ZoneComponentLayout,
  ZoneComponentRendererContext,
  ZoneComponentSlotName,
  ZoneVisualNode,
} from "../types.js";
import type {
  ResolvedZoneShape,
  ZoneResolveContext,
  ZoneStyleOverride,
} from "../zoneShape.js";
import {
  ZONE_CLIP_SHADOW,
  applyStyles,
  createSurfaceChrome,
  toLocalRect,
} from "./drawShared.js";

/**
 * 라이브러리가 기본 제공하는 zone 카드의 슬롯 기본 내용(title / type / badge /
 * body / footer). 소비자가 zoneComponentRenderers / zoneComponents 로 해당 슬롯을
 * 덮어쓰지 않았을 때만 쓰인다. 이 슬롯 목록은 "기본 렌더러의 구현 디테일"이지
 * 코어 엔진의 고정 개념이 아니다 — 통째로 바꾸려면 resolveZoneRenderer 로 풀바디
 * 렌더러를 주면 된다.
 */
function renderZoneFallback(
  host: HTMLElement,
  slot: ZoneComponentSlotName,
  context: ZoneComponentRendererContext
) {
  const fontSize = context.theme.typography.zoneFontSize;
  const base: Record<string, string | number> = {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: context.theme.zoneTitle,
    boxSizing: "border-box",
    fontFamily: context.theme.typography.fontFamily,
  };

  if (slot === "title") {
    host.textContent = context.zone.name;
    applyStyles(host, {
      ...base,
      fontSize:
        context.textScale === "lg"
          ? `${fontSize.titleLg}px`
          : context.textScale === "sm"
            ? `${fontSize.titleSm}px`
            : `${fontSize.title}px`,
      fontWeight: 700,
    });
    return;
  }

  if (slot === "type") {
    host.textContent = context.zone.zoneType;
    applyStyles(host, {
      ...base,
      color: context.theme.zoneSubtext,
      fontSize: `${fontSize.type}px`,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    });
    return;
  }

  if (slot === "badge") {
    const badge = document.createElement("div");
    badge.textContent = context.zone.action?.type ?? "zone";
    applyStyles(badge, {
      display: "inline-flex",
      alignItems: "center",
      height: "100%",
      maxWidth: "100%",
      padding: "0 8px",
      borderRadius: "999px",
      background: context.theme.zoneBadgeBg,
      color: context.theme.zoneTitle,
      fontFamily: context.theme.typography.fontFamily,
      fontSize: `${fontSize.badge}px`,
      fontWeight: 600,
      boxSizing: "border-box",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    host.appendChild(badge);
    return;
  }

  if (slot === "body") {
    host.textContent = context.zone.action?.type
      ? `Action: ${context.zone.action.type}`
      : `${context.zone.childZoneIds.length} child zones`;
    applyStyles(host, {
      ...base,
      whiteSpace: "normal",
      color: context.theme.zoneSubtext,
      fontSize: `${fontSize.body}px`,
      lineHeight: "1.4",
    });
    return;
  }

  if (slot === "footer") {
    host.textContent =
      context.zone.zoneType === "action"
        ? "action node"
        : `${context.zone.pathIds.length} conditions`;
    applyStyles(host, {
      ...base,
      color: context.theme.zoneSubtext,
      fontSize: `${fontSize.footer}px`,
    });
  }
}

function createZoneSlotHost(params: {
  zoneVisual: ZoneVisualNode;
  componentLayout: ZoneComponentLayout;
  slot: ZoneComponentSlotName;
  input: RendererDrawInput;
  mounts: RenderMountRegistry;
  owner: HTMLElement;
}) {
  const { zoneVisual, componentLayout, slot, input, mounts, owner } = params;

  const rect = componentLayout.slots[slot];
  if (!rect) return;

  const localRect = toLocalRect(zoneVisual.rect, rect);
  const host = document.createElement("div");
  host.dataset.zoneflowZoneId = zoneVisual.zoneId;
  host.dataset.zoneflowSlot = slot;

  applyStyles(host, {
    position: "absolute",
    left: `${localRect.x}px`,
    top: `${localRect.y}px`,
    width: `${localRect.width}px`,
    height: `${localRect.height}px`,
    pointerEvents: "auto",
  });

  const visibility =
    input.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];
  const density = input.pipeline.density.zoneDensityById[zoneVisual.zoneId];
  const context: ZoneComponentRendererContext = {
    model: input.model,
    layoutModel: input.layoutModel,
    zone: zoneVisual.zone,
    zoneVisual,
    density,
    visibility,
    componentLayout,
    camera: input.camera,
    theme: input.theme,
    zoneColor:
      input.resolveZoneColor?.(zoneVisual.zone, { density }) ?? undefined,
    textScale: input.textScale,
  };

  const renderer = input.zoneComponentRenderers?.[slot];
  if (renderer) {
    renderer(host, context);
  } else {
    renderZoneFallback(host, slot, context);
  }

  owner.appendChild(host);
  mounts.zones.push({
    key: `${zoneVisual.zoneId}:${slot}`,
    zoneId: zoneVisual.zoneId,
    slot,
    host,
    rect,
    context,
  });
}

/**
 * 도킹 슬롯 레인의 기본 드로우 — 존 좌측에서 선언 순서대로 쌓이는 배경 레이어.
 * 멤버십은 모델(`Zone.slotKey`)이, 기하는 파이프라인(`zoneVisual.slotRegions`,
 * 에디터 히트테스트와 동일한 소스)이 결정하고 여기는 순수 표현 계층이다.
 *
 * export 되어 있으므로 풀바디 `renderZone` 렌더러가 자기 카드 위에 기본 레인만
 * 재사용할 수도 있고, 반대로 기본 카드를 쓰면서 레인만 직접 그리고 싶으면 이
 * 함수를 쓰지 않고 `context.slotRegions`(존 로컬 좌표)로 직접 그리면 된다.
 */
export function renderZoneSlotLanes(params: {
  owner: HTMLElement;
  zoneVisual: ZoneVisualNode;
  input: RendererDrawInput;
  /**
   * false 면 기본 스냅 포인트 링을 그리지 않는다 — 레인은 기본값을 쓰되
   * 포인트만 `context.slotRegions[].snapPoints` 로 직접 그리는 조합용.
   */
  showSnapPoints?: boolean;
}) {
  const { owner, zoneVisual, input, showSnapPoints = true } = params;
  const theme = input.theme;
  const regions = zoneVisual.slotRegions ?? [];
  if (regions.length === 0) return;

  const slotDefsByKey = new Map(
    (zoneVisual.zone.slots ?? []).map((slot) => [slot.key, slot])
  );
  const laneBackground =
    theme.surface.zone.slotBackground ?? "rgba(37, 99, 235, 0.05)";
  const laneBorder = theme.surface.zone.slotBorder ?? "rgba(37, 99, 235, 0.30)";
  const laneLabelColor =
    theme.surface.zone.slotLabel ?? "rgba(37, 99, 235, 0.72)";

  // entry 슬롯 — 컨테이너 인렛에서 레인 왼쪽 중앙으로 점선 커넥터를 그려
  // "진입 = 이 슬롯 활성화"를 표현한다. 레인이 왼쪽 엣지에 붙어 있으면
  // (거리 < 8) 생략.
  const inletLocal = {
    x: zoneVisual.anchors.inlet.point.x - zoneVisual.rect.x,
    y: zoneVisual.anchors.inlet.point.y - zoneVisual.rect.y,
  };
  const entryTargets = regions
    .filter((region) => slotDefsByKey.get(region.key)?.entry)
    .map((region) => {
      const localRect = toLocalRect(zoneVisual.rect, region.rect);
      return {
        x: localRect.x,
        y: localRect.y + localRect.height / 2,
      };
    })
    .filter((target) => Math.hypot(target.x - inletLocal.x, target.y - inletLocal.y) >= 8);

  if (entryTargets.length > 0) {
    const connectorSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    applyStyles(connectorSvg, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      overflow: "visible",
      pointerEvents: "none",
    });
    for (const target of entryTargets) {
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", String(inletLocal.x));
      line.setAttribute("y1", String(inletLocal.y));
      line.setAttribute("x2", String(target.x));
      line.setAttribute("y2", String(target.y));
      line.setAttribute("stroke", laneLabelColor);
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-dasharray", "2 6");
      connectorSvg.appendChild(line);
    }
    owner.appendChild(connectorSvg);
  }

  for (const region of regions) {
    const localRect = toLocalRect(zoneVisual.rect, region.rect);
    if (localRect.width <= 0) continue;

    const lane = document.createElement("div");
    lane.dataset.zoneflowZoneSlot = region.key;
    applyStyles(lane, {
      position: "absolute",
      left: `${localRect.x}px`,
      top: `${localRect.y}px`,
      width: `${localRect.width}px`,
      height: `${localRect.height}px`,
      background: laneBackground,
      borderRight: `1.5px dashed ${laneBorder}`,
      boxSizing: "border-box",
      pointerEvents: "none",
    });

    // 도킹 스냅 포인트 — 빈 자리를 시각적으로 안내하는 점 마커. 존이 위에
    // 앉으면 자연히 가려지므로 "남아 있는 점 = 빈 자리"로 읽힌다.
    if (showSnapPoints) {
      const snapPointColor = theme.surface.zone.slotSnapPoint ?? laneBorder;
      for (const point of region.snapPoints ?? []) {
        const dot = document.createElement("div");
        applyStyles(dot, {
          position: "absolute",
          left: `${point.x - region.rect.x - 3}px`,
          top: `${point.y - region.rect.y - 3}px`,
          width: "6px",
          height: "6px",
          borderRadius: "999px",
          border: `1.5px dashed ${snapPointColor}`,
          boxSizing: "border-box",
          pointerEvents: "none",
        });
        lane.appendChild(dot);
      }
    }

    if (localRect.width >= 72 && localRect.height >= 64) {
      const slotDef = slotDefsByKey.get(region.key);
      const label = document.createElement("div");
      label.textContent = slotDef?.label ?? region.key.toUpperCase();
      applyStyles(label, {
        position: "absolute",
        left: "8px",
        bottom: "6px",
        color: laneLabelColor,
        fontSize: `${theme.typography.zoneFontSize.slotLabel}px`,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        overflow: "hidden",
        maxWidth: `${localRect.width - 16}px`,
        textOverflow: "ellipsis",
        fontFamily: theme.typography.fontFamily,
        pointerEvents: "none",
      });
      lane.appendChild(label);
    }

    owner.appendChild(lane);
  }
}

export type DefaultZoneBodyInput = {
  /** 존 본문 host (zoneEl 안의 zoneBodyEl). 기본 렌더러가 이 안을 모두 채운다. */
  host: HTMLElement;
  zoneVisual: ZoneVisualNode;
  componentLayout: ZoneComponentLayout | undefined;
  shape: ResolvedZoneShape;
  zoneBorderColor: string;
  zoneAccentColor: string;
  zoneStyle: ZoneStyleOverride | undefined;
  zoneDensity: DensityLevel;
  zoneColor: string | undefined;
  zoneResolveContext: ZoneResolveContext;
  input: RendererDrawInput;
  mounts: RenderMountRegistry;
  /**
   * 슬롯 레인/스냅 포인트 기본 드로우 제어 — 기본 카드는 그대로 쓰면서 레인
   * (또는 포인트)만 직접 그리는 조합용. 미지정 시 모두 그린다.
   * - `slotLanes: false` — 레인+포인트 전부 생략 (직접 그리기)
   * - `slotSnapPoints: false` — 레인은 그리되 포인트 링만 생략
   */
  slotLanes?: boolean;
  slotSnapPoints?: boolean;
};

/**
 * 라이브러리 기본 zone 렌더러. 존 본문(border/background/chrome + 슬롯 + farest
 * 아이콘)을 그린다. drawEngine 은 `resolveZoneRenderer` 가 풀바디 렌더러를
 * 돌려주지 않은 모든 존에 대해 이 함수를 호출한다 — 즉 "기본 모양"은 코어 엔진에
 * 박힌 분기가 아니라 교체 가능한 이 렌더러가 담당한다.
 *
 * 소비자가 기본 모양 위에 무언가 얹고 싶으면 자신의 renderZone 안에서 이 함수를
 * 호출해 재사용할 수 있다.
 */
export function renderDefaultZoneBody(params: DefaultZoneBodyInput) {
  const {
    host,
    zoneVisual,
    componentLayout,
    shape,
    zoneBorderColor,
    zoneAccentColor,
    zoneStyle,
    zoneDensity,
    zoneColor,
    zoneResolveContext,
    input,
    mounts,
    slotLanes = true,
    slotSnapPoints = true,
  } = params;
  const theme = input.theme;

  if (shape.clipPath) {
    // Clipped polygon (diamond/hexagon/custom). A CSS border would be cut by
    // clip-path, so the outline is synthesized: a border-colored base layer
    // with a 1px-inset fill layer on top. Depth comes from a drop-shadow
    // filter since box-shadow is clipped away.
    applyStyles(host, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      background: zoneBorderColor,
      clipPath: shape.clipPath,
      boxSizing: "border-box",
      overflow: "hidden",
      filter: theme.surface.zone.clipShadow ?? ZONE_CLIP_SHADOW,
    });

    const zoneFillEl = document.createElement("div");
    applyStyles(zoneFillEl, {
      position: "absolute",
      inset: "1px",
      background: theme.surface.zone.background,
      clipPath: shape.clipPath,
      boxSizing: "border-box",
      overflow: "hidden",
    });
    host.appendChild(zoneFillEl);

    createSurfaceChrome({
      owner: zoneFillEl,
      accent: zoneAccentColor,
      radius: "0",
      theme,
      header: shape.header,
    });

    if (zoneDensity !== "farest") {
      if (slotLanes) {
        renderZoneSlotLanes({
          owner: zoneFillEl,
          zoneVisual,
          input,
          showSnapPoints: slotSnapPoints,
        });
      }
    }
  } else {
    applyStyles(host, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      borderRadius: shape.borderRadius,
      border: `1px ${zoneStyle?.borderStyle ?? "solid"} ${zoneBorderColor}`,
      background: theme.surface.zone.background,
      boxSizing: "border-box",
      boxShadow: theme.surface.zone.shadow,
      overflow: "hidden",
    });

    const zoneChromeEl = document.createElement("div");
    createSurfaceChrome({
      owner: zoneChromeEl,
      accent: zoneAccentColor,
      radius: shape.borderRadius,
      theme,
      header: shape.header,
    });
    host.appendChild(zoneChromeEl);

    if (zoneDensity !== "farest") {
      if (slotLanes) {
        renderZoneSlotLanes({
          owner: host,
          zoneVisual,
          input,
          showSnapPoints: slotSnapPoints,
        });
      }
    }
  }

  // Built-in slots (title/type/badge/body/footer) — the default renderer's own
  // layout. Consumer overrides flow through zoneComponentRenderers inside
  // createZoneSlotHost.
  if (componentLayout) {
    for (const slot of Object.keys(
      componentLayout.slots
    ) as ZoneComponentSlotName[]) {
      createZoneSlotHost({
        zoneVisual,
        componentLayout,
        slot,
        input,
        mounts,
        owner: host,
      });
    }
  }

  // "farest" — the zone is too small for any slot, so show an icon-only marker
  // (consumer-resolved glyph, else the name's first character) so it never
  // reads as a blank card.
  if (zoneDensity === "farest") {
    const iconText =
      input.resolveZoneIcon?.(zoneVisual.zone, zoneResolveContext) ??
      Array.from(zoneVisual.zone.name.trim())[0] ??
      "";
    if (iconText) {
      const iconEl = document.createElement("div");
      const fontSize = Math.max(
        8,
        Math.min(zoneVisual.rect.width, zoneVisual.rect.height) * 0.5
      );
      applyStyles(iconEl, {
        position: "absolute",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: zoneColor ?? theme.zoneTitle,
        fontSize: `${fontSize}px`,
        fontWeight: "600",
        lineHeight: "1",
        overflow: "hidden",
        pointerEvents: "none",
      });
      iconEl.textContent = iconText;
      host.appendChild(iconEl);
    }
  }
}
