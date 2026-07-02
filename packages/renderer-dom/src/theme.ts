export type ZoneflowStatusTone = {
  border: string;
  background: string;
  color: string;
  shadow: string;
};

export type ZoneflowEdgeFlowTheme = {
  durationMs: number;
  segmentLength: number;
  gapLength: number;
};

export type ZoneflowTheme = {
  background: string;

  zoneTitle: string;
  zoneSubtext: string;

  zoneContainerBorder: string;
  zoneActionBorder: string;

  zoneBadgeBg: string;

  pathLabel: string;
  pathEdge: string;
  pathInboundEdge: string;

  selection: string;

  surface: {
    chrome: {
      overlay: string;
      glow: string;
      accentFade: string;
    };
    zone: {
      background: string;
      shadow: string;
      containerAccent: string;
      actionAccent: string;
      /**
       * Docking-slot lane tokens (containers declaring `Zone.slots`).
       * Optional — themes that omit them fall back to the library defaults,
       * so preset themes written before this feature keep type-checking.
       */
      slotBackground?: string;
      slotBorder?: string;
      slotLabel?: string;
      /** Empty docking snap-point ring color. Falls back to `slotBorder`. */
      slotSnapPoint?: string;
    };
    path: {
      background: string;
      shadow: string;
      accent: string;
    };
    anchor: {
      background: string;
      shadow: string;
      containerAccent: string;
      actionAccent: string;
    };
  };

  status: {
    info: ZoneflowStatusTone;
    warning: ZoneflowStatusTone;
  };

  edgeFlow: ZoneflowEdgeFlowTheme;

  density: {
    zone: {
      detail: number;
      near: number;
      mid: number;
      /**
       * Boundary between `far` and `farest`: at/above this effective size the
       * zone is `far` (card only), below it `farest` (icon only).
       */
      far: number;
    };
    path: {
      full: number;
      chip: number;
    };
  };
};

/** Per-level effective-size thresholds (farest < far < mid < near < detail). */
export type ZoneDensityThresholds = ZoneflowTheme["density"]["zone"];
export type PathDensityThresholds = ZoneflowTheme["density"]["path"];

/**
 * Input shape for the renderer `theme` prop. Same as a partial `ZoneflowTheme`,
 * except `density` accepts partial threshold sets — so a consumer can retune
 * just `{ density: { zone: { detail: 320 } } }` without restating every level
 * (the rest fall back to the defaults). The density engine reads these to
 * decide each zone's level (farest…detail).
 */
export type ZoneflowThemeInput = Partial<Omit<ZoneflowTheme, "density">> & {
  density?: {
    zone?: Partial<ZoneDensityThresholds>;
    path?: Partial<PathDensityThresholds>;
  };
};

export type TextScaleLevel = "sm" | "md" | "lg";
