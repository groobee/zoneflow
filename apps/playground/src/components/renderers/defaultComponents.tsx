import {
  Pathed,
  type PathSlotComponentMap,
  type PathSlotComponentProps,
  Zoned,
  type ZoneSlotComponentMap,
  type ZoneSlotComponentProps,
} from "@zoneflow/react";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";
const mono = "'IBM Plex Mono', 'SFMono-Regular', monospace";

function summarizePayload(value: unknown) {
  if (value === undefined) return "No payload";

  const text =
    typeof value === "string" ? value : JSON.stringify(value);

  return text.length > 88 ? `${text.slice(0, 85)}...` : text;
}

function resolvePathTargetDisplay(params: PathSlotComponentProps["mount"]["context"]) {
  const targetZoneId = params.pathVisual.targetZoneId;
  if (!targetZoneId) {
    return {
      label: "—",
      status: "unconfigured" as const,
    };
  }

  const targetZone = params.model.zonesById[targetZoneId];
  if (!targetZone) {
    return {
      label: "—",
      status: "missing" as const,
    };
  }

  return {
    label: targetZone.name,
    status: "resolved" as const,
  };
}

function resolveZoneBadgeTone(params: {
  actionType?: string;
  badgeBg: string;
  actionBorder: string;
  containerBorder: string;
  titleColor: string;
}) {
  const { actionType, badgeBg, actionBorder, containerBorder, titleColor } = params;
  if (!actionType) {
    return {
      background: badgeBg,
      color: titleColor,
      borderColor: containerBorder,
    };
  }

  return {
    background: badgeBg,
    color: actionBorder,
    borderColor: actionBorder,
  };
}

function StatCard(props: {
  label: string;
  value: string | number;
  titleColor: string;
  subtextColor: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        display: "grid",
        gap: 3,
        padding: "9px 10px",
        borderRadius: 12,
        border: `1px solid ${props.borderColor}`,
        background: "rgba(248, 250, 252, 0.96)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      <span
        style={{
          color: props.subtextColor,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: sans,
        }}
      >
        {props.label}
      </span>
      <span
        style={{
          color: props.titleColor,
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.1,
          fontFamily: sans,
        }}
      >
        {props.value}
      </span>
    </div>
  );
}

export const zoneComponents: ZoneSlotComponentMap = {
  title({ mount }: ZoneSlotComponentProps) {
    return (
      <Zoned style={{ display: "flex", alignItems: "flex-end" }}>
        <h3
          style={{
            margin: 0,
            color: mount.context.theme.zoneTitle,
            fontFamily: sans,
            fontSize: 15,
            fontWeight: 720,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {mount.context.zone.name}
        </h3>
      </Zoned>
    );
  },

  type({ mount }: ZoneSlotComponentProps) {
    return (
      <Zoned style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
            background: "rgba(255, 255, 255, 0.68)",
            color: mount.context.theme.zoneSubtext,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: sans,
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background:
                mount.context.zone.zoneType === "action"
                  ? mount.context.theme.zoneActionBorder
                  : mount.context.theme.selection,
              boxShadow:
                mount.context.zone.zoneType === "action"
                  ? `0 0 0 4px color-mix(in srgb, ${mount.context.theme.zoneActionBorder} 18%, transparent)`
                  : `0 0 0 4px color-mix(in srgb, ${mount.context.theme.selection} 18%, transparent)`,
            }}
          />
          {mount.context.zone.zoneType}
        </span>
      </Zoned>
    );
  },

  badge({ mount }: ZoneSlotComponentProps) {
    const label = mount.context.zone.action?.type ?? "group";
    const tone = resolveZoneBadgeTone({
      actionType: mount.context.zone.action?.type,
      badgeBg: mount.context.theme.zoneBadgeBg,
      actionBorder: mount.context.theme.zoneActionBorder,
      containerBorder: mount.context.theme.zoneContainerBorder,
      titleColor: mount.context.theme.zoneTitle,
    });

    return (
      <Zoned style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: "100%",
            padding: "0 12px",
            borderRadius: 999,
            border: `1px solid ${tone.borderColor}`,
            background: tone.background,
            color: tone.color,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: sans,
            boxSizing: "border-box",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: tone.color,
              opacity: 0.9,
            }}
          />
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
          gap: 10,
          alignContent: "start",
          fontFamily: sans,
        }}
      >
        <div
          style={{
            color: mount.context.theme.zoneSubtext,
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          {mount.context.zone.action?.type
            ? `${mount.context.zone.action.type} action is prepared in this zone.`
            : "This zone groups children and condition paths."}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <StatCard
            label="Children"
            value={mount.context.zone.childZoneIds.length}
            titleColor={mount.context.theme.zoneTitle}
            subtextColor={mount.context.theme.zoneSubtext}
            borderColor={mount.context.theme.zoneContainerBorder}
          />
          <StatCard
            label="Conditions"
            value={mount.context.zone.pathIds.length}
            titleColor={mount.context.theme.zoneTitle}
            subtextColor={mount.context.theme.zoneSubtext}
            borderColor={mount.context.theme.zoneContainerBorder}
          />
        </div>
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
          {mount.context.visibility.emphasis}
        </span>
        <span
          style={{
            color: mount.context.theme.zoneSubtext,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {mount.context.density}
        </span>
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
            color: mount.context.theme.pathLabel,
            fontSize: 13,
            fontWeight: 730,
            letterSpacing: "-0.02em",
            fontFamily: sans,
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
    const label = mount.context.path.rule?.type ?? "Empty";

    return (
      <Pathed style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
            padding: "0 10px",
            borderRadius: 999,
            background: mount.context.theme.zoneBadgeBg,
            border: `1px solid ${mount.context.theme.pathInboundEdge}`,
            color: mount.context.theme.pathInboundEdge,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: sans,
            boxSizing: "border-box",
          }}
        >
          {label}
        </span>
      </Pathed>
    );
  },

  target({ mount }: PathSlotComponentProps) {
    const targetDisplay = resolvePathTargetDisplay(mount.context);

    return (
      <Pathed
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontFamily: sans,
        }}
      >
        <span
          style={{
            color: mount.context.theme.zoneSubtext,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Next
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            color:
              targetDisplay.status === "missing"
                ? mount.context.theme.status.warning.color
                : targetDisplay.status === "unconfigured"
                  ? mount.context.theme.status.info.color
                  : mount.context.theme.zoneTitle,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              color:
                targetDisplay.status === "missing"
                  ? mount.context.theme.status.warning.color
                  : targetDisplay.status === "unconfigured"
                    ? mount.context.theme.status.info.color
                    : mount.context.theme.pathInboundEdge,
            }}
          >
            {targetDisplay.status === "missing"
              ? "⚠"
              : targetDisplay.status === "unconfigured"
                ? "?"
                : "→"}
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {targetDisplay.label}
          </span>
        </span>
      </Pathed>
    );
  },

  body({ mount }: PathSlotComponentProps) {
    return (
      <Pathed
        style={{
          display: "grid",
          alignContent: "start",
          color: mount.context.theme.zoneSubtext,
          fontSize: 11,
          lineHeight: 1.45,
          fontFamily: sans,
        }}
      >
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 11,
            background: "rgba(248, 250, 252, 0.98)",
            border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
            color: mount.context.theme.zoneSubtext,
            fontFamily: mono,
            fontSize: 10,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {mount.context.path.rule
            ? summarizePayload(mount.context.path.rule.payload)
            : "No rule configured"}
        </div>
      </Pathed>
    );
  },
};
