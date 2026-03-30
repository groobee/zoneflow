export type ZoneflowTheme = {
  background: string;

  zoneTitle: string;
  zoneSubtext: string;

  zoneContainerBorder: string;
  zoneActionBorder: string;

  zoneBadgeBg: string;

  pathLabel: string;
  pathEdge: string;

  selection: string;

  // 👇 추가
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
