import React from "react";
import { Card } from "../common/Card";
import { buttonStyle, checkboxLabelStyle, gridStyle } from "./debug.styles";
import type { DebugLayer } from "../../hooks/useDebugState";
import { ALL_DEBUG_LAYERS } from "../../hooks/useDebugState";
import { DebugLayerToggle } from "./DebugLayerToggle";

type Props = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  layers: DebugLayer[];
  toggleLayer: (l: DebugLayer) => void;
  enableAll: () => void;
  clearAll: () => void;
};

export function DebugPanel({
                             enabled,
                             setEnabled,
                             layers,
                             toggleLayer,
                             enableAll,
                             clearAll,
                           }: Props) {
  return (
    <Card>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Debug</div>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable
      </label>

      <div style={{ ...gridStyle, marginTop: 10, marginBottom: 12 }}>
        {ALL_DEBUG_LAYERS.map((layer) => (
          <DebugLayerToggle
            key={layer}
            layer={layer}
            checked={layers.includes(layer)}
            disabled={!enabled}
            onToggle={toggleLayer}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button style={buttonStyle} onClick={enableAll} disabled={!enabled}>
          All
        </button>
        <button style={buttonStyle} onClick={clearAll} disabled={!enabled}>
          Clear
        </button>
      </div>
    </Card>
  );
}