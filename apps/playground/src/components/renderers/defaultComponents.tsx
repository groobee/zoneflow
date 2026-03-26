import {
  Pathed,
  type PathSlotComponentProps,
  type PathSlotComponentMap,
  Zoned,
  type ZoneSlotComponentProps,
  type ZoneSlotComponentMap,
} from "@zoneflow/react";

const zoneTitleBase = {
  margin: 0,
  color: "#0f172a",
  fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
};

export const zoneComponents: ZoneSlotComponentMap = {
  title({ mount }: ZoneSlotComponentProps) {
    return (
      <Zoned style={{ display: "flex", alignItems: "center" }}>
        <h3
          style={{
            ...zoneTitleBase,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {mount.context.zone.name}
        </h3>
      </Zoned>
    );
  },

  type({ mount }: ZoneSlotComponentProps) {
    return (
      <Zoned
        style={{
          display: "flex",
          alignItems: "center",
          color: "#64748b",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
        }}
      >
        {mount.context.zone.zoneType}
      </Zoned>
    );
  },

  badge({ mount }: ZoneSlotComponentProps) {
    const label = mount.context.zone.action?.type ?? "group";

    return (
      <Zoned style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            background: "#eff6ff",
            color: "#1d4ed8",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
            boxSizing: "border-box",
          }}
        >
          {label}
        </span>
      </Zoned>
    );
  },

  body({ mount }: ZoneSlotComponentProps) {
    return (
      <Zoned
        style={{
          display: "grid",
          alignContent: "start",
          gap: 6,
          color: "#475569",
          fontSize: 11,
          lineHeight: 1.45,
          fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
        }}
      >
        <div>{mount.context.zone.childZoneIds.length} child zones</div>
        <div>{mount.context.zone.pathIds.length} conditions</div>
      </Zoned>
    );
  },

  footer({ mount }: ZoneSlotComponentProps) {
    return (
      <Zoned
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#94a3b8",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
        }}
      >
        <span>{mount.context.visibility.emphasis}</span>
        <span>{mount.context.density}</span>
      </Zoned>
    );
  },
};

export const pathComponents: PathSlotComponentMap = {
  label({ mount }: PathSlotComponentProps) {
    return (
      <Pathed style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            color: "#111827",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
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
    return (
      <Pathed
        style={{
          display: "flex",
          alignItems: "center",
          color: "#7c3aed",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
        }}
      >
        {mount.context.path.rule?.type ?? mount.context.path.key}
      </Pathed>
    );
  },

  target({ mount }: PathSlotComponentProps) {
    const targetName = mount.context.pathVisual.targetZoneId
      ? mount.context.model.zonesById[mount.context.pathVisual.targetZoneId]?.name
      : "Unresolved";

    return (
      <Pathed
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#64748b",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
        }}
      >
        <span>next</span>
        <span>{targetName}</span>
      </Pathed>
    );
  },

  body({ mount }: PathSlotComponentProps) {
    return (
      <Pathed
        style={{
          color: "#475569",
          fontSize: 11,
          lineHeight: 1.4,
          fontFamily: "'IBM Plex Sans', 'Pretendard', sans-serif",
          whiteSpace: "normal",
        }}
      >
        {mount.context.path.rule?.payload
          ? JSON.stringify(mount.context.path.rule.payload)
          : "No payload"}
      </Pathed>
    );
  },
};
