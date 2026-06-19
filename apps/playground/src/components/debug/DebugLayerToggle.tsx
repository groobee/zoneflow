import React from "react";
import type { DebugLayer } from "@zoneflow/renderer-dom";
import { DEBUG_LAYER_META } from "../../hooks/useDebugState";
import { checkboxLabelStyle } from "./debug.styles";

type Props = {
  layer: DebugLayer;
  checked: boolean;
  disabled?: boolean;
  onToggle: (layer: DebugLayer) => void;
};

/**
 * 디버그 레이어 토글. 라벨/설명은 DEBUG_LAYER_META 한 곳에서 온다 — renderer
 * 내부 상태(배치 · LOD · 컬링 · 슬롯 박스 등)를 줌 단계별로 시각 확인하는 용도.
 */
export function DebugLayerToggle({
  layer,
  checked,
  disabled,
  onToggle,
}: Props) {
  const meta = DEBUG_LAYER_META[layer];

  return (
    <label
      style={{
        ...checkboxLabelStyle,
        alignItems: "flex-start",
        gap: 8,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(layer)}
        style={{ marginTop: 2 }}
      />
      <span style={{ display: "grid", gap: 2 }}>
        <span style={{ fontWeight: 600 }}>{meta.label}</span>
        <span
          style={{
            fontSize: 11,
            lineHeight: 1.4,
            color: "var(--pg-panel-muted, #94a3b8)",
          }}
        >
          {meta.description}
        </span>
      </span>
    </label>
  );
}
