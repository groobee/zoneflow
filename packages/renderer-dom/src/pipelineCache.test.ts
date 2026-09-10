import { describe, expect, it } from "vitest";
import type {
  Path,
  UniverseLayoutModel,
  UniverseModel,
  Zone,
  ZoneLayout,
} from "@zoneflow/core";
import { createPipelineFrontCache } from "./pipelineCache.js";
import { runRenderPipeline } from "./pipeline.js";
import { defaultGraphLayoutEngine } from "./engines/graphLayoutEngine.js";
import { defaultDensityEngine } from "./engines/densityEngine.js";
import { defaultVisibilityEngine } from "./engines/visibilityEngine.js";
import { defaultComponentLayoutEngine } from "./engines/componentLayoutEngine.js";
import { resolveTheme } from "./themes/defaultTheme.js";
import type {
  CameraState,
  DensityEngine,
  GraphLayoutEngine,
  RenderPipelineInput,
} from "./types.js";

function buildUniverse(zoneCount: number) {
  const zonesById: Record<string, Zone> = {};
  const zoneLayoutsById: Record<string, ZoneLayout> = {};
  const pathLayoutsById: UniverseLayoutModel["pathLayoutsById"] = {};
  const rootZoneIds: string[] = [];
  const cols = Math.ceil(Math.sqrt(zoneCount));

  for (let i = 0; i < zoneCount; i += 1) {
    const zoneId = `z${i}`;
    const pathId = `p${i}`;
    const path: Path = {
      id: pathId,
      key: `k${i}`,
      name: `path ${i}`,
      target:
        i + 1 < zoneCount
          ? { universeId: "u", zoneId: `z${i + 1}` }
          : null,
      rule: { type: "always", payload: {} },
    };

    zonesById[zoneId] = {
      id: zoneId,
      parentZoneId: null,
      name: `zone ${i}`,
      zoneType: "action",
      childZoneIds: [],
      pathIds: [pathId],
      pathsById: { [pathId]: path },
    };
    zoneLayoutsById[zoneId] = {
      x: (i % cols) * 360,
      y: Math.floor(i / cols) * 240,
      width: 240,
      height: 120,
      anchors: {
        inlet: { point: { x: 0, y: 60 } },
        outlet: { point: { x: 240, y: 60 } },
      },
    };
    pathLayoutsById[pathId] = {};
    rootZoneIds.push(zoneId);
  }

  return {
    model: { version: "1", universeId: "u", rootZoneIds, zonesById } satisfies UniverseModel,
    layoutModel: {
      version: "1",
      universeId: "u",
      zoneLayoutsById,
      pathLayoutsById,
    } satisfies UniverseLayoutModel,
  };
}

const theme = resolveTheme(undefined);

function makeInput(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel,
  camera: CameraState
): RenderPipelineInput {
  return {
    model,
    layoutModel,
    camera,
    viewportInfo: {
      host: { x: 0, y: 0, width: 1200, height: 800 },
      effective: { x: 0, y: 0, width: 1200, height: 800 },
      world: {
        x: -camera.x / camera.zoom,
        y: -camera.y / camera.zoom,
        width: 1200 / camera.zoom,
        height: 800 / camera.zoom,
      },
    },
    theme,
    textScale: "md",
  };
}

/** 캐시를 끼운 파이프라인 — renderer.update() 가 엔진을 감싸는 방식과 동일. */
function runCached(
  cache: ReturnType<typeof createPipelineFrontCache>,
  base: RenderPipelineInput
) {
  return runRenderPipeline(base, {
    graphLayoutEngine: {
      compute: (input) =>
        cache.computeGraphLayout(defaultGraphLayoutEngine, input),
    },
    densityEngine: {
      compute: ({ base: b, graphLayout }) =>
        cache.computeDensity(defaultDensityEngine, b, graphLayout),
    },
    visibilityEngine: defaultVisibilityEngine,
    componentLayoutEngine: defaultComponentLayoutEngine,
  });
}

function runUncached(base: RenderPipelineInput) {
  return runRenderPipeline(base, {
    graphLayoutEngine: defaultGraphLayoutEngine,
    densityEngine: defaultDensityEngine,
    visibilityEngine: defaultVisibilityEngine,
    componentLayoutEngine: defaultComponentLayoutEngine,
  });
}

describe("pipeline front cache", () => {
  it("팬·줌 스윕 전 구간에서 캐시 유무의 결과가 동일하다", () => {
    const { model, layoutModel } = buildUniverse(40);
    const cache = createPipelineFrontCache();

    const cameras: CameraState[] = [];
    for (let i = 0; i < 25; i += 1) {
      cameras.push({ x: -i * 37, y: -i * 19, zoom: 1 });
    }
    // 줌도 섞는다 — density 캐시 키가 zoom 이라 여기서 갈라져야 한다.
    for (const zoom of [0.25, 0.4, 1, 1.7, 3]) {
      cameras.push({ x: -300, y: -120, zoom });
    }

    for (const camera of cameras) {
      const base = makeInput(model, layoutModel, camera);
      expect(runCached(cache, base)).toEqual(runUncached(base));
    }
  });

  it("카메라만 바뀌면 graphLayout 을 재계산하지 않고 같은 참조를 돌려준다", () => {
    const { model, layoutModel } = buildUniverse(10);
    const cache = createPipelineFrontCache();
    let computeCount = 0;

    const engine: GraphLayoutEngine = {
      cameraIndependent: true,
      compute(input) {
        computeCount += 1;
        return defaultGraphLayoutEngine.compute(input);
      },
    };

    const first = cache.computeGraphLayout(
      engine,
      makeInput(model, layoutModel, { x: 0, y: 0, zoom: 1 })
    );
    const second = cache.computeGraphLayout(
      engine,
      makeInput(model, layoutModel, { x: -800, y: -400, zoom: 2 })
    );

    expect(computeCount).toBe(1);
    expect(second).toBe(first);
  });

  it("모델이 바뀌면 캐시가 풀린다", () => {
    const a = buildUniverse(5);
    const b = buildUniverse(6);
    const cache = createPipelineFrontCache();
    let computeCount = 0;

    const engine: GraphLayoutEngine = {
      cameraIndependent: true,
      compute(input) {
        computeCount += 1;
        return defaultGraphLayoutEngine.compute(input);
      },
    };

    const camera = { x: 0, y: 0, zoom: 1 };
    cache.computeGraphLayout(engine, makeInput(a.model, a.layoutModel, camera));
    cache.computeGraphLayout(engine, makeInput(a.model, a.layoutModel, camera));
    expect(computeCount).toBe(1);

    cache.computeGraphLayout(engine, makeInput(b.model, b.layoutModel, camera));
    expect(computeCount).toBe(2);
  });

  it("선언하지 않은 커스텀 엔진은 절대 캐시하지 않는다", () => {
    const { model, layoutModel } = buildUniverse(5);
    const cache = createPipelineFrontCache();
    let graphCount = 0;
    let densityCount = 0;

    // cameraIndependent/zoomOnly 미선언 — 카메라를 읽는 엔진일 수 있으므로
    // 매 호출 재계산되어야 한다.
    const graphEngine: GraphLayoutEngine = {
      compute(input) {
        graphCount += 1;
        return defaultGraphLayoutEngine.compute(input);
      },
    };
    const densityEngine: DensityEngine = {
      compute(input) {
        densityCount += 1;
        return defaultDensityEngine.compute(input);
      },
    };

    const base = makeInput(model, layoutModel, { x: 0, y: 0, zoom: 1 });
    for (let i = 0; i < 3; i += 1) {
      const graphLayout = cache.computeGraphLayout(graphEngine, base);
      cache.computeDensity(densityEngine, base, graphLayout);
    }

    expect(graphCount).toBe(3);
    expect(densityCount).toBe(3);
  });

  it("density 는 팬에서 재사용되고 줌이 바뀌면 재계산된다", () => {
    const { model, layoutModel } = buildUniverse(8);
    const cache = createPipelineFrontCache();
    let densityCount = 0;

    const densityEngine: DensityEngine = {
      zoomOnly: true,
      compute(input) {
        densityCount += 1;
        return defaultDensityEngine.compute(input);
      },
    };

    const pan1 = makeInput(model, layoutModel, { x: 0, y: 0, zoom: 1 });
    const graphLayout = defaultGraphLayoutEngine.compute(pan1);

    cache.computeDensity(densityEngine, pan1, graphLayout);
    cache.computeDensity(
      densityEngine,
      makeInput(model, layoutModel, { x: -500, y: -250, zoom: 1 }),
      graphLayout
    );
    expect(densityCount).toBe(1);

    cache.computeDensity(
      densityEngine,
      makeInput(model, layoutModel, { x: -500, y: -250, zoom: 2 }),
      graphLayout
    );
    expect(densityCount).toBe(2);
  });

  it("reset 하면 다음 호출이 다시 계산한다", () => {
    const { model, layoutModel } = buildUniverse(4);
    const cache = createPipelineFrontCache();
    let computeCount = 0;

    const engine: GraphLayoutEngine = {
      cameraIndependent: true,
      compute(input) {
        computeCount += 1;
        return defaultGraphLayoutEngine.compute(input);
      },
    };

    const base = makeInput(model, layoutModel, { x: 0, y: 0, zoom: 1 });
    cache.computeGraphLayout(engine, base);
    cache.computeGraphLayout(engine, base);
    expect(computeCount).toBe(1);

    cache.reset();
    cache.computeGraphLayout(engine, base);
    expect(computeCount).toBe(2);
  });

  it("기본 엔진들이 재사용 가능성을 선언하고 있다", () => {
    // 캐시가 걸리는 유일한 조건 — 선언이 사라지면 최적화가 조용히 죽는다.
    expect(defaultGraphLayoutEngine.cameraIndependent).toBe(true);
    expect(defaultDensityEngine.zoomOnly).toBe(true);
  });
});
