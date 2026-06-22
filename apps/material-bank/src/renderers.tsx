import {
  Pathed,
  Zoned,
  type PathSlotComponentMap,
  type PathSlotComponentProps,
  type ZoneSlotComponentMap,
  type ZoneSlotComponentProps,
} from "@zoneflow/react";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";
const mono = "'IBM Plex Mono', 'SFMono-Regular', monospace";

export const zoneComponents: ZoneSlotComponentMap = {
  title({ mount }: ZoneSlotComponentProps) {
    return (
      <Zoned style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            color: mount.context.theme.zoneTitle,
            fontFamily: sans,
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {mount.context.zone.name}
        </div>
      </Zoned>
    );
  },

  body({ mount }: ZoneSlotComponentProps) {
    const zone = mount.context.zone;
    const summary = zone.action?.type
      ? `action: ${zone.action.type}`
      : `${zone.childZoneIds.length} child · ${zone.pathIds.length} paths`;

    return (
      <Zoned
        style={{
          display: "grid",
          alignContent: "start",
          gap: 8,
          fontFamily: sans,
          color: mount.context.theme.zoneSubtext,
        }}
      >
        <div style={{ fontSize: 12, lineHeight: 1.45 }}>{summary}</div>
        <div
          style={{
            justifySelf: "start",
            padding: "4px 9px",
            borderRadius: 999,
            border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
            background: mount.context.theme.zoneBadgeBg,
            color: mount.context.theme.zoneTitle,
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.04em",
          }}
        >
          {zone.zoneType.toUpperCase()}
        </div>
      </Zoned>
    );
  },
};

export const pathComponents: PathSlotComponentMap = {
  label({ mount }: PathSlotComponentProps) {
    const label = mount.context.path.name.trim() || "Empty";
    return (
      <Pathed style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            color: mount.context.pathColor ?? mount.context.theme.pathLabel,
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </Pathed>
    );
  },
};
