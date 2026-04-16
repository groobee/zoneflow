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
    };
    path: {
      full: number;
      chip: number;
    };
  };
};

export type TextScaleLevel = "sm" | "md" | "lg";
