import type {
  ComponentLayoutEngine,
  DensityEngine,
  GraphLayoutEngine,
  RenderPipelineInput,
  RenderPipelineResult,
  VisibilityEngine,
} from "./types";

export type RenderPipelineEngines = {
  graphLayoutEngine: GraphLayoutEngine;
  densityEngine: DensityEngine;
  visibilityEngine: VisibilityEngine;
  componentLayoutEngine: ComponentLayoutEngine;
};

export function runRenderPipeline(
  input: RenderPipelineInput,
  engines: RenderPipelineEngines
): RenderPipelineResult {
  const graphLayout = engines.graphLayoutEngine.compute(input);

  const density = engines.densityEngine.compute({
    base: input,
    graphLayout,
  });

  const visibility = engines.visibilityEngine.compute({
    base: input,
    graphLayout,
    density,
  });

  const componentLayout = engines.componentLayoutEngine.compute({
    base: input,
    graphLayout,
    density,
    visibility,
  });

  return {
    graphLayout,
    density,
    visibility,
    componentLayout,
  };
}