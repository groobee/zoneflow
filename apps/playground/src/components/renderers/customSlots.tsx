import {
  createExtensibleComponentLayoutEngine,
  type ExtensibleZoneSlot,
} from "@zoneflow/renderer-dom";
import {
  Pathed,
  type PathRenderComponentProps,
  Zoned,
  type ZoneRenderComponentProps,
  type ZoneSlotComponentMap,
  type ZoneSlotComponentProps,
} from "@zoneflow/react";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";

export const customZoneSlots: ExtensibleZoneSlot[] = [
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

/**
 * renderPath 데모: 패스 노드 전체(테두리+배경+내용)를 직접 그린다 —
 * 좌측 점 + 패스 이름의 알약형 칩. 기본 칩과 다른 모습으로 "통째 교체"를 보여줌.
 */
export function CustomPathNode({ mount }: PathRenderComponentProps) {
  const { path, pathColor, theme } = mount.context;
  const accent = pathColor ?? theme.pathEdge;

  return (
    <Pathed
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px",
        borderRadius: 999,
        border: `2px solid ${accent}`,
        background: "rgba(255, 255, 255, 0.92)",
        boxShadow: "0 4px 12px rgba(2, 6, 23, 0.12)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: accent,
          flex: "0 0 auto",
        }}
      />
      <span
        style={{
          fontFamily: sans,
          fontSize: 12,
          fontWeight: 700,
          color: theme.pathLabel,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {path.name?.trim() || path.key}
      </span>
    </Pathed>
  );
}

export const customZoneComponents: ZoneSlotComponentMap = {
  comment: CommentSlot,
  convStats: ConvStatsSlot,
};
