import { createContext, useContext } from "react";
import type { ZoneId } from "@zoneflow/core";
import {
  createExtensibleComponentLayoutEngine,
  type ExtensibleZoneSlot,
} from "@zoneflow/renderer-dom";
import {
  Zoned,
  type ZoneRenderComponentProps,
  type ZoneSlotComponentMap,
  type ZoneSlotComponentProps,
} from "@zoneflow/react";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";

/**
 * 뷰모드(간략/필수/자세히) → 존 크기 매핑. density 기본 임계값
 * (detail≥200, near≥140, mid≥90; 화면 크기 = max(w,h)×zoom) 을 넘도록
 * 잡아, 모드만 바꿔도 슬롯이 자동으로 더/덜 보이게 한다.
 */
export type ZoneViewMode = "brief" | "essential" | "detail";
export const VIEW_MODE_SIZES: Record<
  ZoneViewMode,
  { width: number; height: number }
> = {
  brief: { width: 130, height: 64 },
  essential: { width: 200, height: 132 },
  detail: { width: 320, height: 208 },
};

/**
 * 슬롯 컴포넌트는 mount 만 받으므로, 존 내 버튼이 호출할 프로그래매틱
 * resize(=editor.resizeZone)를 context 로 주입한다. React context 는
 * createPortal 경계를 넘어 전달되므로 슬롯 포털에서도 읽을 수 있다.
 */
export const ZoneResizeContext = createContext<
  ((zoneId: ZoneId, size: { width: number; height: number }) => void) | null
>(null);

export const customZoneSlots: ExtensibleZoneSlot[] = [
  {
    name: "viewMode",
    placement: { kind: "top", height: 24 },
    // 항상 노출(leaf 한정) — 작은 모드에서도 다시 키울 수 있어야 하니까.
    shouldRender: ({ zone }) => zone.childZoneIds.length === 0,
  },
  {
    name: "comment",
    placement: { kind: "top", height: 22 },
    shouldRender: ({ density, zone }) =>
      zone.childZoneIds.length === 0 &&
      (density === "near" || density === "detail"),
  },
  {
    name: "convStats",
    placement: { kind: "bottom", height: 26 },
    shouldRender: ({ density, zone }) =>
      zone.childZoneIds.length === 0 && density === "detail",
  },
];

export const customZoneLayoutEngine = createExtensibleComponentLayoutEngine({
  extraSlots: customZoneSlots,
});

function pseudoRandomConv(zoneId: string): { count: number; amount: number } {
  let hash = 0;
  for (let i = 0; i < zoneId.length; i++) {
    hash = (hash * 31 + zoneId.charCodeAt(i)) >>> 0;
  }
  return {
    count: hash % 1000,
    amount: (hash % 50000) * 100,
  };
}

export function CommentSlot({ mount }: ZoneSlotComponentProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    console.log("[zoneflow custom slot] comment clicked", {
      zoneId: mount.context.zone.id,
      zoneName: mount.context.zone.name,
    });
    window.alert(`코멘트: ${mount.context.zone.name}`);
  };

  return (
    <Zoned style={{ display: "flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={handleClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: "100%",
          padding: "0 10px",
          borderRadius: 999,
          border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
          background: "rgba(255, 255, 255, 0.78)",
          color: mount.context.theme.zoneTitle,
          fontFamily: sans,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <span aria-hidden="true">💬</span>
        <span>코멘트</span>
      </button>
    </Zoned>
  );
}

export function ConvStatsSlot({ mount }: ZoneSlotComponentProps) {
  const stats = pseudoRandomConv(mount.context.zone.id);
  const numberFmt = new Intl.NumberFormat("ko-KR");

  return (
    <Zoned
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          fontFamily: sans,
          fontSize: 10,
          color: mount.context.theme.zoneSubtext,
        }}
      >
        <span style={{ fontWeight: 800, letterSpacing: "0.04em" }}>전환수</span>
        <span style={{ color: mount.context.theme.zoneTitle, fontWeight: 700, fontSize: 12 }}>
          {numberFmt.format(stats.count)}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          fontFamily: sans,
          fontSize: 10,
          color: mount.context.theme.zoneSubtext,
          justifyContent: "flex-end",
        }}
      >
        <span style={{ fontWeight: 800, letterSpacing: "0.04em" }}>전환금액</span>
        <span style={{ color: mount.context.theme.zoneTitle, fontWeight: 700, fontSize: 12 }}>
          ₩{numberFmt.format(stats.amount)}
        </span>
      </div>
    </Zoned>
  );
}

/**
 * 존 안에 들어가는 뷰모드 토글. 클릭하면 context 의 resize(=editor.resizeZone)
 * 로 그 존만 해당 모드 크기로 바꾼다 — 크기가 바뀌면 density 엔진이 알아서
 * comment/convStats 슬롯을 더/덜 보여준다. 색·라벨은 앱(consumer)이 결정.
 */
export function ViewModeSlot({ mount }: ZoneSlotComponentProps) {
  const resize = useContext(ZoneResizeContext);
  const zoneId = mount.context.zone.id;
  const theme = mount.context.theme;
  const modes: { mode: ZoneViewMode; label: string }[] = [
    { mode: "brief", label: "간략" },
    { mode: "essential", label: "필수" },
    { mode: "detail", label: "자세히" },
  ];

  return (
    <Zoned style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {modes.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            resize?.(zoneId, VIEW_MODE_SIZES[mode]);
          }}
          style={{
            flex: 1,
            height: "100%",
            padding: "0 4px",
            borderRadius: 6,
            border: `1px solid ${theme.zoneActionBorder}`,
            background: "rgba(255, 255, 255, 0.7)",
            color: theme.zoneTitle,
            fontFamily: sans,
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            boxSizing: "border-box",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </button>
      ))}
    </Zoned>
  );
}

/**
 * 레벨별 존 렌더러 데모: far 레벨에선 기본 카드 대신 이 컴포넌트가 존 몸체
 * 전체(테두리·배경·내용)를 직접 그린다 — 좌측 accent 바 + 굵은 이름의 컴팩트
 * 카드. 기본 카드와 명확히 다른 모습으로 "통째 교체"를 보여준다.
 */
export function FarZoneCard({ mount }: ZoneRenderComponentProps) {
  const { zone, zoneColor, theme } = mount.context;
  const accent = zoneColor ?? theme.zoneActionBorder;

  return (
    <Zoned
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        borderRadius: 10,
        border: `2px solid ${accent}`,
        background: "rgba(255, 255, 255, 0.92)",
        boxShadow: "0 6px 16px rgba(2, 6, 23, 0.12)",
      }}
    >
      <span
        style={{
          width: 6,
          height: "56%",
          borderRadius: 3,
          background: accent,
          flex: "0 0 auto",
        }}
      />
      <span
        style={{
          fontFamily: sans,
          fontSize: 13,
          fontWeight: 700,
          color: theme.zoneTitle,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {zone.name}
      </span>
    </Zoned>
  );
}

export const customZoneComponents: ZoneSlotComponentMap = {
  viewMode: ViewModeSlot,
  comment: CommentSlot,
  convStats: ConvStatsSlot,
};
