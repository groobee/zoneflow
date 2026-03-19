import React from "react";
import { Card } from "../common/Card";
import { DebugLayerToggle } from "./DebugLayerToggle";
import {
  ALL_DEBUG_LAYERS,
  VIEWPORT_PRESETS,
  type DebugState,
} from "../../hooks/useDebugState";
import {
  buttonStyle,
  checkboxLabelStyle,
  columnStyle,
  inputStyle,
  rowStyle,
  sectionHeaderStyle,
  selectStyle,
  subsectionTitleStyle,
} from "./debug.styles";

type Props = {
  debug: DebugState;
};

export function DebugPanel({ debug }: Props) {
  const {
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
    setViewportPreset,
    resetViewportOverride,
  } = debug;

  return (
    <Card>
      <div style={sectionHeaderStyle}>Debug</div>

      <div style={columnStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable
        </label>

        <div>
          <div style={subsectionTitleStyle}>Layers</div>

          <div style={{ ...columnStyle, marginBottom: 12 }}>
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

          <div style={rowStyle}>
            <button
              style={buttonStyle}
              onClick={enableAll}
              disabled={!enabled}
            >
              All
            </button>
            <button
              style={buttonStyle}
              onClick={clearAll}
              disabled={!enabled}
            >
              Clear
            </button>
          </div>
        </div>

        <div>
          <div style={subsectionTitleStyle}>Viewport Override</div>

          <div style={{ ...columnStyle, marginBottom: 10 }}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={viewport.enabled}
                disabled={!enabled}
                onChange={(e) => setViewportEnabled(e.target.checked)}
              />
              Enable viewport simulation
            </label>

            <select
              value={viewport.preset}
              disabled={!enabled}
              onChange={(e) =>
                setViewportPreset(
                  e.target.value as keyof typeof VIEWPORT_PRESETS | "custom"
                )
              }
              style={selectStyle}
            >
              {Object.entries(VIEWPORT_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>

            <div style={rowStyle}>
              <input
                type="number"
                min={1}
                value={viewport.width}
                disabled={!enabled}
                onChange={(e) => setViewportWidth(Number(e.target.value))}
                style={inputStyle}
                placeholder="width"
              />
              <input
                type="number"
                min={1}
                value={viewport.height}
                disabled={!enabled}
                onChange={(e) => setViewportHeight(Number(e.target.value))}
                style={inputStyle}
                placeholder="height"
              />
            </div>

            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Current: {viewport.enabled ? "override on" : "real host size"} /{" "}
              {viewport.width} × {viewport.height}
            </div>
          </div>

          <div style={rowStyle}>
            <button
              style={buttonStyle}
              onClick={resetViewportOverride}
              disabled={!enabled}
            >
              Reset viewport
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}