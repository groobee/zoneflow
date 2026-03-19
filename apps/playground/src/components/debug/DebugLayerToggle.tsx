import React from "react";
import type { DebugLayer } from "../../hooks/useDebugState";
import { checkboxLabelStyle } from "./debug.styles";

type Props = {
  layer: DebugLayer;
  checked: boolean;
  disabled?: boolean;
  onToggle: (layer: DebugLayer) => void;
};

/**
 * Debug Layer는 renderer 내부 상태를 시각적으로 확인하기 위한 기능입니다.
 *
 * 예:
 * - graph-layout: zone/path bounding box
 * - edges: 연결선
 * - anchors: 입출력 포인트
 */
export function DebugLayerToggle({
                                   layer,
                                   checked,
                                   disabled,
                                   onToggle,
                                 }: Props) {
  return (
    <label style={checkboxLabelStyle}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(layer)}
      />
      {layer}
    </label>
  );
}