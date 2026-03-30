import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UniverseModel, UniverseLayoutModel } from "@zoneflow/core";

import {
  sampleUniverse,
  sampleUniverseLayout,
} from "../mock/sampleUniverse";

import {
  sampleLargeUniverse,
  sampleLargeUniverseLayout,
} from "../mock/sampleLargeUniverse";

export type SampleType = "small" | "large";

type SampleSet = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
};

const SAMPLE_MAP: Record<SampleType, SampleSet> = {
  small: {
    model: sampleUniverse,
    layoutModel: sampleUniverseLayout,
  },
  large: {
    model: sampleLargeUniverse,
    layoutModel: sampleLargeUniverseLayout,
  },
};

function cloneSampleSet(sampleType: SampleType): SampleSet {
  return structuredClone(SAMPLE_MAP[sampleType]);
}

export function useSampleSwitcher(initial: SampleType = "small") {
  const [sampleType, setSampleType] = useState<SampleType>(initial);
  const [sample, setSample] = useState<SampleSet>(() => cloneSampleSet(initial));

  const handleSampleTypeChange = (nextSampleType: SampleType) => {
    setSampleType(nextSampleType);
    setSample(cloneSampleSet(nextSampleType));
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
    model: sample.model,
    layoutModel: sample.layoutModel,
    setModel,
    setLayoutModel,
  };
}
