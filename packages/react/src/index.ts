"use client";
// Components and hooks only run on the client. The directive lets a React
// Server Component (Next.js App Router) import this package and render its
// components as client components instead of failing on the hook imports.

export * from "./canvas/UniverseCanvas.js";
export * from "./editor/DefaultEditorToolbar.js";
export {
  createPathFromZone,
  defaultEditorTheme,
  resolveEditorTheme,
  type CanDropZone,
  type CanDropZoneParams,
  type CellSnapOptions,
  type FloatingLayoutOptions,
  type GridSnapOptions,
  type ObjectSnapOptions,
  type ZoneflowEditorTheme,
  type ZoneflowEditorThemeInput,
} from "@zoneflow/editor-dom";
// Types that appear in this package's public props, so consumers can name
// them without a direct dependency on the lower-level renderer package.
export type {
  BackgroundRenderer,
  CameraState,
  ComponentLayoutEngine,
  DensityEngine,
  DrawEngine,
  GraphLayoutEngine,
  GridOptions,
  PathComponentRendererMap,
  RendererDebugOptions,
  RendererFrame,
  RendererInteractionHandlers,
  ResolvePathColor,
  ResolvePathDisplay,
  ResolvePathLineColor,
  ResolvePathStyle,
  ResolveZoneColor,
  ResolveZoneIcon,
  ResolveZoneShape,
  ResolveZoneStyle,
  TextScaleLevel,
  ViewportConfig,
  VisibilityEngine,
  ZoneComponentRendererMap,
  ZoneflowThemeInput,
} from "@zoneflow/renderer-dom";
export * from "./editor/strings.js";
export * from "./editor/editorRenderProps.js";
export * from "./editor/UniverseEditorCanvas.js";
export * from "./editor/ZoneMoveEditorOverlay.js";
export * from "./editor/useUniverseEditor.js";
export * from "./editor/useUniverseEditorSession.js";
export * from "./editor/useFloatingLayout.js";
export * from "./editor/editorPermissions.js";
export * from "./editor/zoneCreateHelpers.js";
export * from "./slots/slotComponents.js";
