import {
  zoneflowThemePresets,
  type ZoneflowThemePreset,
  type ZoneflowThemePresetId,
} from "@zoneflow/themes";
import type { SampleType } from "../hooks/useSampleSwitcher";

export type PlaygroundThemePresetId = ZoneflowThemePresetId;

export type PlaygroundThemePreset = ZoneflowThemePreset & {
  sampleType: Exclude<SampleType, "custom">;
  topbar: ZoneflowThemePreset["surfacePalette"]["topbar"];
  sidebar: ZoneflowThemePreset["surfacePalette"]["sidebar"];
};

export const playgroundThemePresets: Record<
  PlaygroundThemePresetId,
  PlaygroundThemePreset
> = {
  dark: {
    ...zoneflowThemePresets.dark,
    sampleType: "large",
    topbar: zoneflowThemePresets.dark.surfacePalette.topbar,
    sidebar: zoneflowThemePresets.dark.surfacePalette.sidebar,
  },
  ocean: {
    ...zoneflowThemePresets.ocean,
    sampleType: "tiny",
    topbar: zoneflowThemePresets.ocean.surfacePalette.topbar,
    sidebar: zoneflowThemePresets.ocean.surfacePalette.sidebar,
  },
  sunset: {
    ...zoneflowThemePresets.sunset,
    sampleType: "small",
    topbar: zoneflowThemePresets.sunset.surfacePalette.topbar,
    sidebar: zoneflowThemePresets.sunset.surfacePalette.sidebar,
  },
  light: {
    ...zoneflowThemePresets.light,
    sampleType: "tiny",
    topbar: zoneflowThemePresets.light.surfacePalette.topbar,
    sidebar: zoneflowThemePresets.light.surfacePalette.sidebar,
  },
  party: {
    ...zoneflowThemePresets.party,
    sampleType: "small",
    topbar: zoneflowThemePresets.party.surfacePalette.topbar,
    sidebar: zoneflowThemePresets.party.surfacePalette.sidebar,
  },
  "korean-culture": {
    ...zoneflowThemePresets["korean-culture"],
    sampleType: "large",
    topbar: zoneflowThemePresets["korean-culture"].surfacePalette.topbar,
    sidebar: zoneflowThemePresets["korean-culture"].surfacePalette.sidebar,
  },
};

export const defaultPlaygroundThemePresetId: PlaygroundThemePresetId = "sunset";
