import { useMemo, useState } from "react";
import type { DebugLayer, DebugViewportOverride } from "@zoneflow/renderer-dom";

export const ALL_DEBUG_LAYERS: DebugLayer[] = [
  "graph-layout",
  "edges",
  "anchors",
  "density",
  "visibility",
  "component-layout",
  "viewport",
];

export type ViewportPresetKey =
  | "desktop"
  | "laptop"
  | "tablet"
  | "mobile"
  | "custom";

export type ViewportPreset = {
  label: string;
  width: number;
  height: number;
};

export const VIEWPORT_PRESETS: Record<
  Exclude<ViewportPresetKey, "custom">,
  ViewportPreset
> = {
  desktop: {
    label: "Desktop 1440×900",
    width: 1440,
    height: 900,
  },
  laptop: {
    label: "Laptop 1280×800",
    width: 1280,
    height: 800,
  },
  tablet: {
    label: "Tablet 768×1024",
    width: 768,
    height: 1024,
  },
  mobile: {
    label: "Mobile 375×812",
    width: 375,
    height: 812,
  },
};

export type DebugViewportState = {
  enabled: boolean;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  presetKey: ViewportPresetKey;
  label: string;
};

export type DebugState = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;

  layers: DebugLayer[];
  toggleLayer: (layer: DebugLayer) => void;
  enableAll: () => void;
  clearAll: () => void;

  viewport: DebugViewportState;
  viewportOverride: DebugViewportOverride;

  setViewportEnabled: (value: boolean) => void;
  setViewportWidth: (value: number) => void;
  setViewportHeight: (value: number) => void;
  setViewportOffsetX: (value: number) => void;
  setViewportOffsetY: (value: number) => void;
  setViewportPreset: (preset: ViewportPresetKey) => void;
  setViewportLabel: (label: string) => void;
  resetViewportOverride: () => void;
};

function getPresetLabel(presetKey: ViewportPresetKey): string {
  if (presetKey === "custom") {
    return "Custom";
  }

  return VIEWPORT_PRESETS[presetKey].label;
}

export function useDebugState(initialLayers: DebugLayer[]): DebugState {
  const [enabled, setEnabled] = useState(true);
  const [layers, setLayers] = useState<DebugLayer[]>(initialLayers);

  const [viewport, setViewport] = useState<DebugViewportState>({
    enabled: false,
    width: VIEWPORT_PRESETS.desktop.width,
    height: VIEWPORT_PRESETS.desktop.height,
    offsetX: 0,
    offsetY: 0,
    presetKey: "desktop",
    label: VIEWPORT_PRESETS.desktop.label,
  });

  const toggleLayer = (layer: DebugLayer) => {
    setLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((item) => item !== layer)
        : [...prev, layer]
    );
  };

  const enableAll = () => {
    setLayers(ALL_DEBUG_LAYERS);
  };

  const clearAll = () => {
    setLayers([]);
  };

  const setViewportEnabled = (value: boolean) => {
    setViewport((prev) => ({
      ...prev,
      enabled: value,
    }));
  };

  const setViewportWidth = (value: number) => {
    setViewport((prev) => ({
      ...prev,
      width: Number.isFinite(value) ? Math.max(1, value) : prev.width,
      presetKey: "custom",
      label: "Custom",
    }));
  };

  const setViewportHeight = (value: number) => {
    setViewport((prev) => ({
      ...prev,
      height: Number.isFinite(value) ? Math.max(1, value) : prev.height,
      presetKey: "custom",
      label: "Custom",
    }));
  };

  const setViewportOffsetX = (value: number) => {
    setViewport((prev) => ({
      ...prev,
      offsetX: Number.isFinite(value) ? value : prev.offsetX,
    }));
  };

  const setViewportOffsetY = (value: number) => {
    setViewport((prev) => ({
      ...prev,
      offsetY: Number.isFinite(value) ? value : prev.offsetY,
    }));
  };

  const setViewportPreset = (preset: ViewportPresetKey) => {
    if (preset === "custom") {
      setViewport((prev) => ({
        ...prev,
        presetKey: "custom",
        label: "Custom",
      }));
      return;
    }

    const next = VIEWPORT_PRESETS[preset];

    setViewport((prev) => ({
      ...prev,
      presetKey: preset,
      width: next.width,
      height: next.height,
      label: next.label,
    }));
  };

  const setViewportLabel = (label: string) => {
    setViewport((prev) => ({
      ...prev,
      label: label.trim() || getPresetLabel(prev.presetKey),
    }));
  };

  const resetViewportOverride = () => {
    setViewport({
      enabled: false,
      width: VIEWPORT_PRESETS.desktop.width,
      height: VIEWPORT_PRESETS.desktop.height,
      offsetX: 0,
      offsetY: 0,
      presetKey: "desktop",
      label: VIEWPORT_PRESETS.desktop.label,
    });
  };

  const viewportOverride = useMemo<DebugViewportOverride>(
    () => ({
      enabled: viewport.enabled,
      width: viewport.width,
      height: viewport.height,
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
    }),
    [
      viewport.enabled,
      viewport.width,
      viewport.height,
      viewport.offsetX,
      viewport.offsetY,
    ]
  );

  return {
    enabled,
    setEnabled,
    layers,
    toggleLayer,
    enableAll,
    clearAll,

    viewport,
    viewportOverride,

    setViewportEnabled,
    setViewportWidth,
    setViewportHeight,
    setViewportOffsetX,
    setViewportOffsetY,
    setViewportPreset,
    setViewportLabel,
    resetViewportOverride,
  };
}