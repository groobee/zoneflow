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

function resolveZoneBadgeTone(actionType?: string) {
  if (!actionType) {
    return {
      background: "linear-gradient(135deg, #e0f2fe 0%, #eef6ff 100%)",
      color: "#0f4c81",
      borderColor: "rgba(14, 116, 144, 0.14)",
    };
  }

  return {
    background: "linear-gradient(135deg, #fff1d6 0%, #fff7e8 100%)",
    color: "#9a4d00",
    borderColor: "rgba(217, 119, 6, 0.14)",
  };
}

function StatCard(props: { label: string; value: string | number }) {
  return (
    <div
      style={{
        minWidth: 0,
        display: "grid",
        gap: 3,
        padding: "9px 10px",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.12)",
        background: "rgba(248, 250, 252, 0.96)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      <span
        style={{
          color: "#7b8798",
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
          color: "#0f172a",
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
            color: "#0f172a",
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
            border: "1px solid rgba(148, 163, 184, 0.12)",
            background: "rgba(255, 255, 255, 0.68)",
            color: "#6b7280",
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
                mount.context.zone.zoneType === "action" ? "#f59e0b" : "#3b82f6",
              boxShadow:
                mount.context.zone.zoneType === "action"
                  ? "0 0 0 4px rgba(245,158,11,0.12)"
                  : "0 0 0 4px rgba(59,130,246,0.12)",
            }}
          />
          {mount.context.zone.zoneType}
        </span>
      </Zoned>
    );
  },

  badge({ mount }: ZoneSlotComponentProps) {
    const label = mount.context.zone.action?.type ?? "group";
    const tone = resolveZoneBadgeTone(mount.context.zone.action?.type);

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
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.58)",
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
            color: "#4b5563",
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
          <StatCard label="Children" value={mount.context.zone.childZoneIds.length} />
          <StatCard label="Conditions" value={mount.context.zone.pathIds.length} />
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
            color: "#64748b",
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
            color: "#94a3b8",
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
            color: "#0f172a",
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
            background: "linear-gradient(135deg, #eef2ff 0%, #f8f5ff 100%)",
            border: "1px solid rgba(99, 102, 241, 0.14)",
            color: "#5b5bd6",
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
            color: "#94a3b8",
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
                ? "#b45309"
                : targetDisplay.status === "unconfigured"
                  ? "#b45309"
                  : "#334155",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              color:
                targetDisplay.status === "missing"
                  ? "#f59e0b"
                  : targetDisplay.status === "unconfigured"
                    ? "#f59e0b"
                    : "#60a5fa",
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
          color: "#475569",
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
            border: "1px solid rgba(148, 163, 184, 0.12)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
            color: "#526173",
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
