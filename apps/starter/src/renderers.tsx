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

function resolvePathTarget(
  mount: PathSlotComponentProps["mount"]
) {
  const targetZoneId = mount.context.pathVisual.targetZoneId;
  if (!targetZoneId) return "Not connected";

  const targetZone = mount.context.model.zonesById[targetZoneId];
  return targetZone?.name ?? "Missing target";
}

export const starterZoneComponents: ZoneSlotComponentMap = {
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
      : `${zone.childZoneIds.length} child zones · ${zone.pathIds.length} paths`;

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
            padding: "8px 10px",
            borderRadius: 10,
            border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
            background: mount.context.theme.zoneBadgeBg,
            color: mount.context.theme.zoneTitle,
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.02em",
          }}
        >
          {zone.zoneType.toUpperCase()}
        </div>
      </Zoned>
    );
  },
};

export const starterPathComponents: PathSlotComponentMap = {
  label({ mount }: PathSlotComponentProps) {
    const label = mount.context.path.name.trim() || "Empty";
    return (
      <Pathed style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            color: mount.context.theme.pathLabel,
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

  rule({ mount }: PathSlotComponentProps) {
    return (
      <Pathed style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            border: `1px solid ${mount.context.theme.pathInboundEdge}`,
            color: mount.context.theme.pathInboundEdge,
            fontFamily: mono,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            boxSizing: "border-box",
          }}
        >
          {mount.context.path.rule?.type ?? "empty"}
        </div>
      </Pathed>
    );
  },

  target({ mount }: PathSlotComponentProps) {
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
            textTransform: "uppercase",
          }}
        >
          Next
        </span>
        <span
          style={{
            color: mount.context.theme.zoneTitle,
            fontSize: 11,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {resolvePathTarget(mount)}
        </span>
      </Pathed>
    );
  },
};
