import type {
  DensityEngine,
  DensityResult,
  GraphLayoutEngine,
  GraphLayoutResult,
  RenderPipelineInput,
} from "./types.js";

/**
 * 파이프라인 앞 두 단계(graph layout · density)의 프레임 간 재사용 캐시.
 *
 * 카메라만 바뀐 프레임에서도 두 단계는 같은 결과를 낸다 — 다만 그건 **엔진의
 * 성질**이지 파이프라인의 성질이 아니다. 그래서 엔진이 스스로
 * {@link GraphLayoutEngine.cameraIndependent} / {@link DensityEngine.zoomOnly}
 * 를 선언한 경우에만 캐시가 걸리고, 미선언 엔진은 매번 재계산한다.
 *
 * 키는 전부 참조 동일성이다 — 모델을 제자리에서 변형하면(mutate) 캐시가 낡은
 * 결과를 돌려준다. 이 라이브러리의 뮤테이션은 전부 새 객체를 만들므로 성립한다.
 *
 * @internal
 */
export type PipelineFrontCache = {
  computeGraphLayout(
    engine: GraphLayoutEngine,
    input: RenderPipelineInput
  ): GraphLayoutResult;
  computeDensity(
    engine: DensityEngine,
    base: RenderPipelineInput,
    graphLayout: GraphLayoutResult
  ): DensityResult;
  reset(): void;
};

type GraphEntry = {
  engine: GraphLayoutEngine;
  model: RenderPipelineInput["model"];
  layoutModel: RenderPipelineInput["layoutModel"];
  theme: RenderPipelineInput["theme"];
  textScale: RenderPipelineInput["textScale"];
  resolvePathDisplay: RenderPipelineInput["resolvePathDisplay"];
  result: GraphLayoutResult;
};

type DensityEntry = {
  engine: DensityEngine;
  graphLayout: GraphLayoutResult;
  theme: RenderPipelineInput["theme"];
  zoom: number;
  result: DensityResult;
};

/** @internal */
export function createPipelineFrontCache(): PipelineFrontCache {
  let graph: GraphEntry | null = null;
  let density: DensityEntry | null = null;

  return {
    computeGraphLayout(engine, input) {
      if (!engine.cameraIndependent) return engine.compute(input);

      if (
        graph &&
        graph.engine === engine &&
        graph.model === input.model &&
        graph.layoutModel === input.layoutModel &&
        graph.theme === input.theme &&
        graph.textScale === input.textScale &&
        graph.resolvePathDisplay === input.resolvePathDisplay
      ) {
        return graph.result;
      }

      const result = engine.compute(input);
      graph = {
        engine,
        model: input.model,
        layoutModel: input.layoutModel,
        theme: input.theme,
        textScale: input.textScale,
        resolvePathDisplay: input.resolvePathDisplay,
        result,
      };
      return result;
    },

    computeDensity(engine, base, graphLayout) {
      if (!engine.zoomOnly) return engine.compute({ base, graphLayout });

      if (
        density &&
        density.engine === engine &&
        density.graphLayout === graphLayout &&
        density.theme === base.theme &&
        density.zoom === base.camera.zoom
      ) {
        return density.result;
      }

      const result = engine.compute({ base, graphLayout });
      density = {
        engine,
        graphLayout,
        theme: base.theme,
        zoom: base.camera.zoom,
        result,
      };
      return result;
    },

    reset() {
      graph = null;
      density = null;
    },
  };
}
