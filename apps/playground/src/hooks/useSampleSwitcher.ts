import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FlowDirection, UniverseModel, UniverseLayoutModel } from "@zoneflow/core";
import type { CanConnectPath } from "@zoneflow/react";

import {
  sampleUniverse,
  sampleUniverseLayout,
} from "../mock/sampleUniverse";

import {
  sampleLargeUniverse,
  sampleLargeUniverseLayout,
} from "../mock/sampleLargeUniverse";
import {
  sampleTinyUniverse,
  sampleTinyUniverseLayout,
} from "../mock/sampleTinyUniverse";
import {
  sampleDagUniverse,
  sampleDagUniverseLayout,
} from "../mock/sampleDagUniverse";
import {
  sampleParallelUniverse,
  sampleParallelUniverseLayout,
} from "../mock/sampleParallelUniverse";
import {
  sampleVerticalUniverse,
  sampleVerticalUniverseLayout,
} from "../mock/sampleVerticalUniverse";
import { dagCanConnectPath } from "../canConnectStrategies";

export type SampleType =
  | "tiny"
  | "small"
  | "large"
  | "dag"
  | "parallel"
  | "vertical"
  | "custom";

type SampleSet = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
};

const SAMPLE_MAP: Record<Exclude<SampleType, "custom">, SampleSet> = {
  tiny: {
    model: sampleTinyUniverse,
    layoutModel: sampleTinyUniverseLayout,
  },
  small: {
    model: sampleUniverse,
    layoutModel: sampleUniverseLayout,
  },
  large: {
    model: sampleLargeUniverse,
    layoutModel: sampleLargeUniverseLayout,
  },
  dag: {
    model: sampleDagUniverse,
    layoutModel: sampleDagUniverseLayout,
  },
  parallel: {
    model: sampleParallelUniverse,
    layoutModel: sampleParallelUniverseLayout,
  },
  vertical: {
    model: sampleVerticalUniverse,
    layoutModel: sampleVerticalUniverseLayout,
  },
};

// 샘플별 흐름 방향 — vertical 샘플은 위→아래(topToBottom)로 렌더한다.
// custom(파일 로드)은 마지막 프리셋의 방향을 따르지 않고 기본(가로)으로 둔다.
const SAMPLE_FLOW_DIRECTION: Partial<Record<SampleType, FlowDirection>> = {
  vertical: "topToBottom",
};

const SAMPLE_CAN_CONNECT: Partial<Record<SampleType, CanConnectPath>> = {
  dag: dagCanConnectPath,
};

function cloneSampleSet(sampleType: SampleType): SampleSet {
  if (sampleType === "custom") {
    throw new Error('Cannot clone custom sample without explicit snapshot.');
  }

  return structuredClone(SAMPLE_MAP[sampleType]);
}

export function useSampleSwitcher(initial: SampleType = "small") {
  const [sampleType, setSampleType] = useState<SampleType>(initial);
  const [sample, setSample] = useState<SampleSet>(() =>
    initial === "custom"
      ? structuredClone(SAMPLE_MAP.small)
      : cloneSampleSet(initial)
  );

  const handleSampleTypeChange = (nextSampleType: SampleType) => {
    if (nextSampleType === "custom") {
      setSampleType("custom");
      return;
    }

    setSampleType(nextSampleType);
    setSample(cloneSampleSet(nextSampleType));
  };

  const setCustomSample = (nextSample: SampleSet) => {
    setSampleType("custom");
    setSample(structuredClone(nextSample));
  };

  const setLayoutModel: Dispatch<SetStateAction<UniverseLayoutModel>> = (
    nextLayoutModel
  ) => {
    setSample((prev) => ({
      ...prev,
      layoutModel:
        typeof nextLayoutModel === "function"
          ? nextLayoutModel(prev.layoutModel)
          : nextLayoutModel,
    }));
  };

  const setModel: Dispatch<SetStateAction<UniverseModel>> = (nextModel) => {
    setSample((prev) => ({
      ...prev,
      model:
        typeof nextModel === "function"
          ? nextModel(prev.model)
          : nextModel,
    }));
  };

  return {
    sampleType,
    setSampleType: handleSampleTypeChange,
    setCustomSample,
    model: sample.model,
    layoutModel: sample.layoutModel,
    setModel,
    setLayoutModel,
    canConnectPath: SAMPLE_CAN_CONNECT[sampleType],
    flowDirection: SAMPLE_FLOW_DIRECTION[sampleType],
  };
}
