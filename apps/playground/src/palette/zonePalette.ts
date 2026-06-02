import type { Zone, ZoneAction } from "@zoneflow/core";

export const PALETTE_ZONE_MIME = "application/x-zoneflow-zone-template";

export type PaletteZoneTemplate = {
  id: string;
  label: string;
  description: string;
  zoneType: Zone["zoneType"];
  width: number;
  height: number;
  action?: ZoneAction;
  inputDisabled?: boolean;
  outputDisabled?: boolean;
  fixedWidth?: boolean;
  fixedHeight?: boolean;
  meta?: Record<string, unknown>;
};

export const paletteZoneTemplates: PaletteZoneTemplate[] = [
  {
    id: "send-push",
    label: "Send Push",
    description: "Action · Push template",
    zoneType: "action",
    width: 190,
    height: 120,
    action: {
      type: "sendPush",
      payload: {
        templateId: "new-push-template",
      },
    },
    meta: {
      color: "#60a5fa",
    },
  },
  {
    id: "wait-timer",
    label: "Wait Timer",
    description: "Action · Delay branch",
    zoneType: "action",
    width: 190,
    height: 120,
    action: {
      type: "wait",
      payload: {
        seconds: 3600,
      },
    },
    meta: {
      color: "#f59e0b",
    },
  },
  {
    id: "condition-branch",
    label: "Condition Branch",
    description: "Action · Branch point",
    zoneType: "action",
    width: 210,
    height: 120,
    action: {
      type: "branch",
      payload: {},
    },
    meta: {
      color: "#a78bfa",
    },
  },
  {
    id: "coupon-action",
    label: "Coupon Action",
    description: "Action · Reward delivery",
    zoneType: "action",
    width: 200,
    height: 120,
    action: {
      type: "issueCoupon",
      payload: {
        couponId: "new-user-coupon",
      },
    },
    meta: {
      color: "#fb7185",
    },
  },
  {
    id: "container-zone",
    label: "Container Zone",
    description: "Container · Groups child zones",
    zoneType: "container",
    width: 520,
    height: 300,
    inputDisabled: true,
    meta: {
      color: "#2563eb",
    },
  },
  {
    id: "chip-tag",
    label: "Tag (Chip)",
    description: "Action · One-line, height locked",
    zoneType: "action",
    width: 140,
    height: 36,
    fixedHeight: true,
    action: {
      type: "tag",
      payload: {
        label: "new-tag",
      },
    },
    meta: {
      color: "#34d399",
    },
  },
  {
    id: "chip-flag",
    label: "Flag (Chip)",
    description: "Action · Compact, fully locked",
    zoneType: "action",
    width: 120,
    height: 32,
    fixedWidth: true,
    fixedHeight: true,
    action: {
      type: "flag",
      payload: {
        key: "feature-flag",
      },
    },
    meta: {
      color: "#f97316",
    },
  },
];

export function writePaletteZoneDragData(
  dataTransfer: DataTransfer,
  template: PaletteZoneTemplate
) {
  dataTransfer.setData(PALETTE_ZONE_MIME, JSON.stringify(template));
  dataTransfer.effectAllowed = "copy";
}

export function readPaletteZoneDragData(
  dataTransfer: DataTransfer | null
): PaletteZoneTemplate | null {
  if (!dataTransfer) return null;

  const raw = dataTransfer.getData(PALETTE_ZONE_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PaletteZoneTemplate;
    return paletteZoneTemplates.find((template) => template.id === parsed.id) ?? null;
  } catch {
    return null;
  }
}
