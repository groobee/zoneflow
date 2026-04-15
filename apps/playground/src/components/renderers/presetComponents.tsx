import {
  Pathed,
  Zoned,
  type PathSlotComponentMap,
  type PathSlotComponentProps,
  type ZoneSlotComponentMap,
  type ZoneSlotComponentProps,
} from "@zoneflow/react";
import type { PlaygroundThemePresetId } from "../../theme/playgroundThemes";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";
const serif = "'Cormorant Garamond', 'Times New Roman', serif";
const mono = "'IBM Plex Mono', 'SFMono-Regular', monospace";

type Variant = PlaygroundThemePresetId;

function summarizePayload(value: unknown) {
  if (value === undefined) return "No payload";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 88 ? `${text.slice(0, 85)}...` : text;
}

function isNocturneVariant(variant: Variant) {
  return (
    variant === "dark" ||
    variant === "party" ||
    variant === "sci-fi" ||
    variant === "dystopia"
  );
}

function isSerifVariant(variant: Variant) {
  return (
    variant === "sunset" ||
    variant === "korean-culture" ||
    variant === "fantasy" ||
    variant === "desert"
  );
}

function resolvePathTargetDisplay(params: PathSlotComponentProps["mount"]["context"]) {
  const targetZoneId = params.pathVisual.targetZoneId;
  if (!targetZoneId) {
    return { label: "—", status: "unconfigured" as const };
  }
  const targetZone = params.model.zonesById[targetZoneId];
  if (!targetZone) {
    return { label: "—", status: "missing" as const };
  }
  return { label: targetZone.name, status: "resolved" as const };
}

function zoneTitleStyle(
  variant: Variant,
  context: ZoneSlotComponentProps["mount"]["context"]
): React.CSSProperties {
  switch (variant) {
    case "sunset":
    case "korean-culture":
    case "fantasy":
    case "desert":
      return {
        margin: 0,
        color: context.theme.zoneTitle,
        fontFamily: serif,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "-0.01em",
      };
    case "ocean":
    case "light":
    case "garden":
    case "utopia":
      return {
        margin: 0,
        color: context.theme.zoneTitle,
        fontFamily: sans,
        fontSize: 15,
        fontWeight: 760,
        lineHeight: 1.1,
        letterSpacing: "-0.03em",
      };
    case "dark":
    case "party":
    case "sci-fi":
    case "dystopia":
      return {
        margin: 0,
        color: context.theme.zoneTitle,
        fontFamily: variant === "sci-fi" ? mono : sans,
        fontSize: 14,
        fontWeight: 720,
        lineHeight: 1.05,
        letterSpacing: "0.01em",
        textTransform: "uppercase",
      };
    case "mono":
      return {
        margin: 0,
        color: context.theme.zoneTitle,
        fontFamily: mono,
        fontSize: 14,
        fontWeight: 760,
        lineHeight: 1.05,
        letterSpacing: "-0.02em",
      };
  }
  return {
    margin: 0,
    color: context.theme.zoneTitle,
    fontFamily: sans,
    fontSize: 15,
    fontWeight: 760,
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  };
}

function pathLabelStyle(
  variant: Variant,
  context: PathSlotComponentProps["mount"]["context"]
): React.CSSProperties {
  switch (variant) {
    case "sunset":
    case "korean-culture":
    case "fantasy":
    case "desert":
      return {
        color: context.theme.pathLabel,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        fontFamily: serif,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      };
    case "ocean":
    case "light":
    case "garden":
    case "utopia":
      return {
        color: context.theme.pathLabel,
        fontSize: 13,
        fontWeight: 760,
        letterSpacing: "-0.03em",
        fontFamily: sans,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      };
    case "dark":
    case "party":
    case "sci-fi":
    case "dystopia":
      return {
        color: context.theme.pathLabel,
        fontSize: 12,
        fontWeight: 720,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontFamily: mono,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      };
    case "mono":
      return {
        color: context.theme.pathLabel,
        fontSize: 12,
        fontWeight: 760,
        letterSpacing: "-0.02em",
        fontFamily: mono,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      };
  }
  return {
    color: context.theme.pathLabel,
    fontSize: 13,
    fontWeight: 760,
    letterSpacing: "-0.03em",
    fontFamily: sans,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

function createZoneComponents(variant: Variant): ZoneSlotComponentMap {
  return {
    title({ mount }: ZoneSlotComponentProps) {
      return (
        <Zoned style={{ display: "flex", alignItems: "flex-end" }}>
          <h3 style={zoneTitleStyle(variant, mount.context)}>
            {mount.context.zone.name}
          </h3>
        </Zoned>
      );
    },

    type({ mount }: ZoneSlotComponentProps) {
      const isAction = mount.context.zone.zoneType === "action";
      return (
        <Zoned style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: "100%",
              padding: isNocturneVariant(variant) ? "0 8px" : "0 10px",
              borderRadius: 999,
              border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
              background:
                isNocturneVariant(variant)
                  ? "rgba(2, 6, 23, 0.42)"
                  : "rgba(255, 255, 255, 0.68)",
              color: mount.context.theme.zoneSubtext,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: mono,
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: isAction
                  ? mount.context.theme.zoneActionBorder
                  : mount.context.theme.selection,
              }}
            />
            {mount.context.zone.zoneType}
          </span>
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
              gap: 8,
              height: "100%",
              padding: "0 12px",
              borderRadius: 999,
              border: `1px solid ${
                mount.context.zone.action
                  ? mount.context.theme.zoneActionBorder
                  : mount.context.theme.zoneContainerBorder
              }`,
              background: mount.context.theme.zoneBadgeBg,
              color: mount.context.zone.action
                ? mount.context.theme.zoneActionBorder
                : mount.context.theme.zoneTitle,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: isSerifVariant(variant) ? serif : sans,
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
            gap: 10,
            alignContent: "start",
            fontFamily: sans,
          }}
        >
          <div
            style={{
              color: mount.context.theme.zoneSubtext,
              fontSize: isNocturneVariant(variant) ? 10 : 11,
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
            {[
              ["Children", mount.context.zone.childZoneIds.length],
              ["Conditions", mount.context.zone.pathIds.length],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  minWidth: 0,
                  display: "grid",
                  gap: 3,
                  padding: "9px 10px",
                  borderRadius: 12,
                  border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
                  background:
                    isNocturneVariant(variant)
                      ? "rgba(2, 6, 23, 0.32)"
                      : "rgba(248, 250, 252, 0.96)",
                }}
              >
                <span
                  style={{
                    color: mount.context.theme.zoneSubtext,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: mono,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    color: mount.context.theme.zoneTitle,
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    fontFamily: sans,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
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
            fontFamily: mono,
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
}

function createPathComponents(variant: Variant): PathSlotComponentMap {
  return {
    label({ mount }: PathSlotComponentProps) {
      const label = mount.context.path.name.trim() || "Empty";
      return (
        <Pathed style={{ display: "flex", alignItems: "center" }}>
          <div style={pathLabelStyle(variant, mount.context)}>{label}</div>
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
              letterSpacing: isNocturneVariant(variant) ? "0.08em" : "0.06em",
              textTransform: "uppercase",
              fontFamily: mono,
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
      const tone =
        targetDisplay.status === "missing"
          ? mount.context.theme.status.warning.color
          : targetDisplay.status === "unconfigured"
            ? mount.context.theme.status.info.color
            : mount.context.theme.pathInboundEdge;
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
                targetDisplay.status === "resolved"
                  ? mount.context.theme.zoneTitle
                  : tone,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            <span>{targetDisplay.status === "resolved" ? "→" : targetDisplay.status === "missing" ? "⚠" : "?"}</span>
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
              background:
                isNocturneVariant(variant)
                  ? "rgba(2, 6, 23, 0.32)"
                  : "rgba(248, 250, 252, 0.98)",
              border: `1px solid ${mount.context.theme.zoneContainerBorder}`,
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
}

export function getThemePresetComponents(variant: Variant): {
  zoneComponents: ZoneSlotComponentMap;
  pathComponents: PathSlotComponentMap;
} {
  return {
    zoneComponents: createZoneComponents(variant),
    pathComponents: createPathComponents(variant),
  };
}
