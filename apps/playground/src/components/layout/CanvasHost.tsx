import React from "react";
import { UniverseCanvas } from "@zoneflow/react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import type { DebugState } from "../../hooks/useDebugState";
import { canvasHostStyle } from "./layout.styles";

type Props = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  debug: DebugState;
};

export function CanvasHost({ model, layoutModel, debug }: Props) {
  return (
    <main style={canvasHostStyle}>
      <UniverseCanvas
        model={model}
        layoutModel={layoutModel}
        debug={{
          enabled: debug.enabled,
          layers: debug.layers,
          viewport: debug.viewportOverride,
        }}
      />
    </main>
  );
}