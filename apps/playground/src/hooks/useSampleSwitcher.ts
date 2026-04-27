import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UniverseModel, UniverseLayoutModel } from "@zoneflow/core";
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
  sampleNoSelfLoopUniverse,
  sampleNoSelfLoopUniverseLayout,
} from "../mock/sampleNoSelfLoopUniverse";
import {
  sampleDagUniverse,
  sampleDagUniverseLayout,
} from "../mock/sampleDagUniverse";
import {
  dagCanConnectPath,
  noSelfLoopCanConnectPath,
} from "../canConnectStrategies";

export type SampleType =
  | "tiny"
  | "small"
  | "large"
  | "no-self-loop"
  | "dag"
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
  "no-self-loop": {
    model: sampleNoSelfLoopUniverse,
    layoutModel: sampleNoSelfLoopUniverseLayout,
  },
  dag: {
    model: sampleDagUniverse,
    layoutModel: sampleDagUniverseLayout,
  },
};

const SAMPLE_CAN_CONNECT: Partial<Record<SampleType, CanConnectPath>> = {
  "no-self-loop": noSelfLoopCanConnectPath,
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
  };
}
