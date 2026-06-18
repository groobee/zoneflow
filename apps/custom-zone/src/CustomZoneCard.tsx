import { Zoned, type ZoneRenderComponentProps } from "@zoneflow/react";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";

type TypeStyle = { icon: string; accent: string; kicker: string };

/** zoneType → 우리가 정한 비주얼. 빌트인과 무관하게 우리 마음대로 매핑한다. */
const TYPE_STYLES: Record<string, TypeStyle> = {
  trigger: { icon: "⚡", accent: "#f59e0b", kicker: "TRIGGER" },
  send: { icon: "✉", accent: "#2563eb", kicker: "SEND" },
  branch: { icon: "⑂", accent: "#9333ea", kicker: "BRANCH" },
  wait: { icon: "⏳", accent: "#0d9488", kicker: "WAIT" },
  exit: { icon: "■", accent: "#64748b", kicker: "EXIT" },
};

const FALLBACK: TypeStyle = { icon: "●", accent: "#475569", kicker: "ZONE" };

/**
 * 존 전체를 직접 그리는 "풀바디" 렌더러.
 *
 * `renderZone` 가 컴포넌트를 반환하면 renderer-dom 은 그 존을 풀바디 mount 로
 * 처리하고 빌트인 슬롯(title / type / badge / body / footer)을 아예 만들지
 * 않는다. 즉 이 컴포넌트 하나가 존 rect 전체를 차지하고 우리가 원하는 모양을
 * 100% 직접 그린다 — slot 맵(zoneComponents)을 전혀 쓰지 않는다.
 *
 * `mount.context` 로 zone / theme / density / rect / zoneColor 등을 받는다.
 * 예) density 로 작게 렌더링할 때 컴팩트 디자인으로 분기할 수도 있다:
 *   const { density } = mount.context;
 *   if (density === "far" || density === "farest") return <IconOnly ... />;
 */
export function CustomZoneCard({ mount }: ZoneRenderComponentProps) {
  const { zone } = mount.context;
  const style = TYPE_STYLES[zone.zoneType] ?? FALLBACK;
  const summary =
    (zone.meta?.summary as string | undefined) ??
    zone.action?.type ??
    `${zone.pathIds.length} paths`;

  return (
    <Zoned
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "12px 14px",
        borderRadius: 14,
        background: "#ffffff",
        borderLeft: `4px solid ${style.accent}`,
        boxShadow: "0 8px 20px rgba(2, 6, 23, 0.10)",
        fontFamily: sans,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 7,
            background: `${style.accent}1a`,
            color: style.accent,
            fontSize: 13,
            flex: "0 0 auto",
          }}
        >
          {style.icon}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: style.accent,
          }}
        >
          {style.kicker}
        </span>
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#0f172a",
          lineHeight: 1.15,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {zone.name}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {summary}
      </div>
    </Zoned>
  );
}
