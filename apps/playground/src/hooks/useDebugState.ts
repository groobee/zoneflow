import { useMemo, useState } from "react";
import type { DebugLayer } from "@zoneflow/renderer-dom";

/**
 * 디버그 레이어별 표시 라벨 + 설명.
 *
 * `Record<DebugLayer, …>` 이므로 라이브러리가 DebugLayer 를 추가/변경하면 여기서
 * 타입 에러로 잡힌다 — 패널이 라이브러리를 자동으로 따라가도록 강제하는 장치.
 * 설명은 현재 렌더러 개념(풀바디 renderZone, 5단계 density 등)을 반영한다.
 */
export const DEBUG_LAYER_META: Record<
  DebugLayer,
  { label: string; description: string }
> = {
  "graph-layout": {
    label: "Graph layout",
    description: "존·패스 bounding box — 배치 엔진이 계산한 골격",
  },
  edges: {
    label: "Edges",
    description: "존 사이 연결선(패스 경로)",
  },
  anchors: {
    label: "Anchors",
    description: "입력·출력 앵커 포인트",
  },
  density: {
    label: "Density (LOD)",
    description: "줌별 LOD 레벨 — farest · far · mid · near · detail",
  },
  visibility: {
    label: "Visibility",
    description: "뷰포트 컬링 — 그릴/생략할 존 판정",
  },
  "component-layout": {
    label: "Component layout",
    description:
      "빌트인 슬롯 박스(title·type·badge·body·footer). 풀바디 renderZone 존은 슬롯이 없어 표시되지 않음",
  },
  viewport: {
    label: "Viewport",
    description: "Focus Viewport 시뮬레이션 영역",
  },
};

/** 표시 순서 = DEBUG_LAYER_META 정의 순서. 한 곳에서 관리해 드리프트를 막는다. */
export const ALL_DEBUG_LAYERS = Object.keys(DEBUG_LAYER_META) as DebugLayer[];

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
  anchorPreset: ViewportAnchorPreset;
};

export type DebugState = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;

  layers: DebugLayer[];
  toggleLayer: (layer: DebugLayer) => void;
  enableAll: () => void;
  clearAll: () => void;

  viewport: DebugViewportState;

  setViewportEnabled: (value: boolean) => void;
  setViewportWidth: (value: number) => void;
  setViewportHeight: (value: number) => void;
  setViewportOffsetX: (value: number) => void;
  setViewportOffsetY: (value: number) => void;
  setViewportPreset: (preset: ViewportPresetKey) => void;
  setViewportLabel: (label: string) => void;
  setViewportAnchorPreset: (preset: ViewportAnchorPreset, hostWidth: number, hostHeight: number) => void;
  resetViewportOverride: () => void;
};

function getPresetLabel(presetKey: ViewportPresetKey): string {
  if (presetKey === "custom") {
    return "Custom";
  }

  return VIEWPORT_PRESETS[presetKey].label;
}

export type ViewportAnchorPreset =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";


function resolveViewportOffsetByPreset(params: {
  preset: ViewportAnchorPreset;
  hostWidth: number;
  hostHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const { preset, hostWidth, hostHeight, viewportWidth, viewportHeight } = params;

  const centerX = (hostWidth - viewportWidth) / 2;
  const centerY = (hostHeight - viewportHeight) / 2;
  const rightX = hostWidth - viewportWidth;
  const bottomY = hostHeight - viewportHeight;

  switch (preset) {
    case "top-left":
      return { offsetX: 0, offsetY: 0 };
    case "top":
      return { offsetX: centerX, offsetY: 0 };
    case "top-right":
      return { offsetX: rightX, offsetY: 0 };
    case "left":
      return { offsetX: 0, offsetY: centerY };
    case "center":
      return { offsetX: centerX, offsetY: centerY };
    case "right":
      return { offsetX: rightX, offsetY: centerY };
    case "bottom-left":
      return { offsetX: 0, offsetY: bottomY };
    case "bottom":
      return { offsetX: centerX, offsetY: bottomY };
    case "bottom-right":
      return { offsetX: rightX, offsetY: bottomY };
  }
}


export function useDebugState(initialLayers: DebugLayer[]): DebugState {
  const [enabled, setEnabled] = useState(false);
  const [layers, setLayers] = useState<DebugLayer[]>(initialLayers);

  const [viewport, setViewport] = useState<DebugViewportState>({
    enabled: false,
    width: VIEWPORT_PRESETS.desktop.width,
    height: VIEWPORT_PRESETS.desktop.height,
    offsetX: 0,
    offsetY: 0,
    presetKey: "desktop",
    label: VIEWPORT_PRESETS.desktop.label,
    anchorPreset: "top-left",
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

  const setViewportAnchorPreset = (
    preset: ViewportAnchorPreset,
    hostWidth: number,
    hostHeight: number
  ) => {
    setViewport((prev) => {
      const nextOffset = resolveViewportOffsetByPreset({
        preset,
        hostWidth,
        hostHeight,
        viewportWidth: prev.width,
        viewportHeight: prev.height,
      });

      return {
        ...prev,
        offsetX: Math.round(nextOffset.offsetX),
        offsetY: Math.round(nextOffset.offsetY),
        anchorPreset: preset,
      };
    });
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
      anchorPreset: "top-left",
    });
  };

  return {
    enabled,
    setEnabled,
    layers,
    toggleLayer,
    enableAll,
    clearAll,

    viewport,

    setViewportEnabled,
    setViewportWidth,
    setViewportHeight,
    setViewportOffsetX,
    setViewportOffsetY,
    setViewportPreset,
    setViewportLabel,
    setViewportAnchorPreset,
    resetViewportOverride
  };
}
