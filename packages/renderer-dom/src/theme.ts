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

/** 기본 zone 렌더러의 슬롯별 폰트 크기(px). title 은 textScale(sm/md/lg)별. */
export type ZoneflowZoneFontSizes = {
  titleSm: number;
  title: number;
  titleLg: number;
  type: number;
  badge: number;
  body: number;
  footer: number;
  /** 도킹 슬롯 레인 라벨 */
  slotLabel: number;
};

/** 기본 path 렌더러의 슬롯별 폰트 크기(px). */
export type ZoneflowPathFontSizes = {
  label: number;
  rule: number;
  target: number;
  body: number;
};

/**
 * 기본 렌더러(존/패스 슬롯, 레인 라벨, 에디터 드래그 프리뷰)의 타이포그래피.
 * 소비자가 슬롯/풀바디 렌더러를 직접 주입하면 그 안의 폰트는 소비자 몫이고,
 * 이 토큰은 라이브러리 기본 드로우에만 적용된다.
 */
export type ZoneflowTypographyTheme = {
  fontFamily: string;
  zoneFontSize: ZoneflowZoneFontSizes;
  pathFontSize: ZoneflowPathFontSizes;
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
      /**
       * clip-path 존(diamond/hexagon/커스텀 clip)의 drop-shadow filter.
       * box-shadow 는 clip 에 잘려나가므로 이 토큰이 `shadow` 대신 쓰인다.
       * 미지정 시 라이브러리 기본 그림자로 폴백.
       */
      clipShadow?: string;
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
      /**
       * 슬래브(edge) 앵커의 가로폭(px). 미지정 시 기본 24. **비주얼 전용** —
       * 클릭/드래그 히트 영역(editor-dom)은 기본 폭을 유지해 조작성을 해치지 않는다.
       */
      width?: number;
    };
  };

  status: {
    info: ZoneflowStatusTone;
    warning: ZoneflowStatusTone;
  };

  edgeFlow: ZoneflowEdgeFlowTheme;

  typography: ZoneflowTypographyTheme;

  /**
   * 캔버스 그리드 기본색. `gridOptions.color / majorColor` 가 항상 우선이고,
   * 이 토큰은 그 미지정 시의 폴백이다 (그마저 없으면 라이브러리 기본색).
   * 일반 그리드와 모듈러 그리드가 같은 토큰을 공유한다.
   */
  grid?: {
    /** 가는(minor) 그리드 선 색 */
    line?: string;
    /** major 선(일반 그리드) / 셀 경계선(모듈러 그리드) 색 */
    majorLine?: string;
  };

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
 * except nested groups(`surface` / `status` / `edgeFlow` / `density` /
 * `typography`)도 부분 지정을 허용한다 — `{ surface: { zone: { background } } }`
 * 나 `{ typography: { fontFamily: "Inter, sans-serif" } }` 처럼 한 토큰만 주면
 * 나머지는 기본값으로 폴백한다 (`resolveTheme` 이 그룹별로 머지).
 */
export type ZoneflowThemeInput = Partial<
  Omit<
    ZoneflowTheme,
    "surface" | "status" | "edgeFlow" | "density" | "typography"
  >
> & {
  surface?: {
    chrome?: Partial<ZoneflowTheme["surface"]["chrome"]>;
    zone?: Partial<ZoneflowTheme["surface"]["zone"]>;
    path?: Partial<ZoneflowTheme["surface"]["path"]>;
    anchor?: Partial<ZoneflowTheme["surface"]["anchor"]>;
  };
  status?: {
    info?: Partial<ZoneflowStatusTone>;
    warning?: Partial<ZoneflowStatusTone>;
  };
  edgeFlow?: Partial<ZoneflowEdgeFlowTheme>;
  density?: {
    zone?: Partial<ZoneDensityThresholds>;
    path?: Partial<PathDensityThresholds>;
  };
  typography?: {
    fontFamily?: string;
    zoneFontSize?: Partial<ZoneflowZoneFontSizes>;
    pathFontSize?: Partial<ZoneflowPathFontSizes>;
  };
};

export type TextScaleLevel = "sm" | "md" | "lg";
