import {
  Pathed,
  Zoned,
  type PathSlotComponentMap,
  type ZoneSlotComponentMap,
  type ZoneSlotComponentProps,
  type PathSlotComponentProps,
} from "@zoneflow/react";
import { CATS_BY_ID, RELATION_STYLE, type RelationKind } from "./cats";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";
const mono = "'IBM Plex Mono', 'SFMono-Regular', monospace";

function resolveRelationKind(meta: Record<string, unknown> | undefined) {
  const kind = meta?.kind;
  return typeof kind === "string" && kind in RELATION_STYLE
    ? (kind as RelationKind)
    : null;
}

export function buildKittyZoneComponents(
  selectedCatId: string | null
): ZoneSlotComponentMap {
  return {
    // 기본 type/badge/footer 슬롯(ACTION · ZONE · action mode)은 관계도에선 노이즈라 비움
    type: () => null,
    badge: () => null,
    footer: () => null,

    title({ mount }: ZoneSlotComponentProps) {
      const cat = CATS_BY_ID[mount.context.zone.id];
      const isSelected = mount.context.zone.id === selectedCatId;

      return (
        <Zoned
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: sans,
              fontSize: 15,
              fontWeight: 800,
              color: mount.context.theme.zoneTitle,
              whiteSpace: "nowrap",
            }}
          >
            {cat?.name ?? mount.context.zone.name}
          </span>
          {cat ? (
            <span
              style={{
                fontFamily: sans,
                fontSize: 10,
                fontWeight: 700,
                color: mount.context.zoneColor ?? mount.context.theme.zoneSubtext,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {cat.age} · {cat.personality}
            </span>
          ) : null}
          {isSelected ? (
            <span
              style={{
                marginLeft: "auto",
                padding: "2px 8px",
                borderRadius: 999,
                background: mount.context.zoneColor ?? "#1c1917",
                color: "#fffbeb",
                fontFamily: sans,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
              }}
            >
              보는 중
            </span>
          ) : null}
        </Zoned>
      );
    },

    body({ mount }: ZoneSlotComponentProps) {
      const cat = CATS_BY_ID[mount.context.zone.id];
      if (!cat) return null;

      return (
        <Zoned
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            alignItems: "center",
            gap: 12,
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: mono,
              fontSize: 12,
              lineHeight: 1.25,
              fontWeight: 700,
              color: mount.context.zoneColor ?? mount.context.theme.zoneTitle,
            }}
          >
            {cat.miniFace}
          </pre>
          <div
            style={{
              fontFamily: sans,
              fontSize: 11,
              lineHeight: 1.5,
              color: mount.context.theme.zoneSubtext,
              overflow: "hidden",
            }}
          >
            "{cat.intro}"
          </div>
        </Zoned>
      );
    },
  };
}

export const kittyPathComponents: PathSlotComponentMap = {
  label({ mount }: PathSlotComponentProps) {
    return (
      <Pathed style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            color: mount.context.pathColor ?? mount.context.theme.pathLabel,
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {mount.context.path.name}
        </div>
      </Pathed>
    );
  },

  rule({ mount }: PathSlotComponentProps) {
    const kind = resolveRelationKind(mount.context.path.meta);
    const style = kind ? RELATION_STYLE[kind] : null;

    return (
      <Pathed style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            border: `1px solid ${style?.color ?? mount.context.theme.pathInboundEdge}`,
            color: style?.color ?? mount.context.theme.pathInboundEdge,
            fontFamily: mono,
            fontSize: 10,
            fontWeight: 700,
            boxSizing: "border-box",
            whiteSpace: "nowrap",
          }}
        >
          {style?.symbol ?? "(=.=)"}
        </div>
      </Pathed>
    );
  },

  target({ mount }: PathSlotComponentProps) {
    const targetZoneId = mount.context.pathVisual.targetZoneId;
    const targetCat = targetZoneId ? CATS_BY_ID[targetZoneId] : null;

    return (
      <Pathed
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: sans,
        }}
      >
        <span
          style={{
            color: mount.context.theme.zoneSubtext,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          상대
        </span>
        <span
          style={{
            color: targetCat?.color ?? mount.context.theme.zoneTitle,
            fontSize: 11,
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {targetCat?.name ?? "??"}
        </span>
      </Pathed>
    );
  },
};
