import { useState } from "react";

export type DebugLayer =
  | "graph-layout"
  | "edges"
  | "anchors"
  | "density"
  | "visibility"
  | "component-layout";

export const ALL_DEBUG_LAYERS: DebugLayer[] = [
  "graph-layout",
  "edges",
  "anchors",
  "density",
  "visibility",
  "component-layout",
];

export function useDebugState(initial: DebugLayer[]) {
  const [enabled, setEnabled] = useState(true);
  const [layers, setLayers] = useState<DebugLayer[]>(initial);

  const toggleLayer = (layer: DebugLayer) => {
    setLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((l) => l !== layer)
        : [...prev, layer]
    );
  };

  const enableAll = () => setLayers(ALL_DEBUG_LAYERS);
  const clearAll = () => setLayers([]);

  return {
    enabled,
    setEnabled,
    layers,
    toggleLayer,
    enableAll,
    clearAll,
  };
}