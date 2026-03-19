import { useMemo, useState } from "react";
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

export function useSampleSwitcher(initial: SampleType = "small") {
  const [sampleType, setSampleType] = useState<SampleType>(initial);

  const { model, layoutModel } = useMemo(() => {
    return SAMPLE_MAP[sampleType];
  }, [sampleType]);

  return {
    sampleType,
    setSampleType,
    model,
    layoutModel,
  };
}