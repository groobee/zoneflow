import {
  createExtensibleComponentLayoutEngine,
  type ExtensibleZoneSlot,
} from "@zoneflow/renderer-dom";
import { Zoned, type ZoneSlotComponentMap, type ZoneSlotComponentProps } from "@zoneflow/react";

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

export const customZoneComponents: ZoneSlotComponentMap = {
  comment: CommentSlot,
  convStats: ConvStatsSlot,
};
