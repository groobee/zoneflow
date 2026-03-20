import React, { useEffect, useRef } from "react";
import { UniverseCanvas } from "@zoneflow/react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import type { DebugState } from "../../hooks/useDebugState";
import { canvasHostStyle } from "./layout.styles";

type Props = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  debug: DebugState;
  onResize: (size: { width: number; height: number }) => void;
};

export function CanvasHost({
                             model,
                             layoutModel,
                             debug,
                             onResize,
                           }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;

      onResize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [onResize]);

  return (
    <main ref={ref} style={canvasHostStyle}>
      <UniverseCanvas
        model={model}
        layoutModel={layoutModel}
        viewport={debug.viewport}
        debug={{
          enabled: debug.enabled,
          layers: debug.layers,
        }}
      />
    </main>
  );
}