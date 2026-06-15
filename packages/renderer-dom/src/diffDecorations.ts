import type { UniverseModelDiff } from "@zoneflow/core";
import type {
  PathStyleOverride,
  ResolvePathColor,
  ResolvePathLineColor,
  ResolvePathStyle,
} from "./types";
import type {
  ResolveZoneColor,
  ResolveZoneStyle,
  ZoneStyleOverride,
} from "./zoneShape";

export type DiffDecorationStatus = "removed" | "added" | "changed";

/** Default status colors — red / green / amber. */
export const DIFF_DECORATION_COLORS: Record<DiffDecorationStatus, string> = {
  removed: "#dc2626",
  added: "#16a34a",
  changed: "#d97706",
};

const DEFAULT_REMOVED_ZONE_STYLE: ZoneStyleOverride = {
  borderStyle: "dashed",
  opacity: 0.45,
};

export type DiffDecorationOptions = {
  /** Per-status color overrides. Defaults to {@link DIFF_DECORATION_COLORS}. */
  colors?: Partial<Record<DiffDecorationStatus, string>>;
  /**
   * Style applied to zones marked removed (the "ghost"). Defaults to a dashed
   * outline at 45% opacity. Pass `null` to disable the ghost and keep only
   * the accent color.
   */
  removedZoneStyle?: ZoneStyleOverride | null;
  /**
   * Blink elements marked removed (zones, path nodes/labels, connector
   * lines). On by default — colors alone are ambiguous when the app already
   * colors zones/paths for its own meaning. Set `false` for static colors
   * only. (Pulse is suppressed by the renderer under
   * `prefers-reduced-motion` regardless.)
   */
  pulseRemoved?: boolean;
  /**
   * Resolvers to fall back to for elements the diff does not mark — so the
   * decorations can wrap an app's existing presentation (e.g. `meta.color`
   * based resolvers) instead of replacing it.
   */
  base?: {
    resolveZoneColor?: ResolveZoneColor;
    resolveZoneStyle?: ResolveZoneStyle;
    resolvePathColor?: ResolvePathColor;
    resolvePathLineColor?: ResolvePathLineColor;
    resolvePathStyle?: ResolvePathStyle;
  };
};

export type DiffDecorations = {
  resolveZoneColor: ResolveZoneColor;
  resolveZoneStyle: ResolveZoneStyle;
  resolvePathColor: ResolvePathColor;
  resolvePathLineColor: ResolvePathLineColor;
  resolvePathStyle: ResolvePathStyle;
};

/**
 * Turn a {@link UniverseModelDiff} into the presentation resolvers that
 * paint diff status onto the canvas:
 *
 * - removed → red accent, red connector lines, dashed ghost zones, and a
 *   blink (pulse) so removal stands out even in apps that already use color
 *   for their own meaning
 * - added → green accent / lines
 * - changed → amber accent / lines
 *
 * The resolvers match purely by id, so they work with whichever side of the
 * diff you render: draw the `before` model to preview removals and changes
 * ("what will happen"), or the `after` model to review additions and changes
 * ("what just happened"). Ids absent from the rendered model simply never
 * come up.
 *
 * @example
 * const diff = diffUniverseModels(model, cleaned);
 * const deco = createDiffDecorations(diff, {
 *   base: { resolvePathColor: myMetaColorResolver },
 * });
 * <UniverseCanvas model={model} {...deco} />
 */
export function createDiffDecorations(
  diff: UniverseModelDiff,
  options: DiffDecorationOptions = {}
): DiffDecorations {
  const colors = { ...DIFF_DECORATION_COLORS, ...options.colors };
  const pulseRemoved = options.pulseRemoved ?? true;
  const baseRemovedZoneStyle =
    options.removedZoneStyle === undefined
      ? DEFAULT_REMOVED_ZONE_STYLE
      : options.removedZoneStyle;
  const removedZoneStyle: ZoneStyleOverride | null =
    baseRemovedZoneStyle === null
      ? pulseRemoved
        ? { pulse: true }
        : null
      : pulseRemoved
        ? { ...baseRemovedZoneStyle, pulse: true }
        : baseRemovedZoneStyle;
  const removedPathStyle: PathStyleOverride | null = pulseRemoved
    ? { pulse: true }
    : null;
  const base = options.base ?? {};

  const zoneStatusById = new Map<string, DiffDecorationStatus>();
  for (const zoneId of diff.zones.removed) zoneStatusById.set(zoneId, "removed");
  for (const zoneId of diff.zones.added) zoneStatusById.set(zoneId, "added");
  for (const zoneId of Object.keys(diff.zones.changed)) {
    zoneStatusById.set(zoneId, "changed");
  }

  const pathStatusById = new Map<string, DiffDecorationStatus>();
  for (const ref of diff.paths.removed) pathStatusById.set(ref.pathId, "removed");
  for (const ref of diff.paths.added) pathStatusById.set(ref.pathId, "added");
  for (const pathId of Object.keys(diff.paths.changed)) {
    pathStatusById.set(pathId, "changed");
  }

  return {
    resolveZoneColor: (zone) => {
      const status = zoneStatusById.get(zone.id);
      return status ? colors[status] : base.resolveZoneColor?.(zone);
    },
    resolveZoneStyle: (zone) => {
      const baseStyle = base.resolveZoneStyle?.(zone) ?? undefined;
      if (zoneStatusById.get(zone.id) === "removed" && removedZoneStyle) {
        // Merge so an app's own zone styling (e.g. a custom border) survives
        // under the diff ghost/pulse instead of being dropped.
        return { ...baseStyle, ...removedZoneStyle };
      }
      return baseStyle;
    },
    resolvePathColor: (path) => {
      const status = pathStatusById.get(path.id);
      return status ? colors[status] : base.resolvePathColor?.(path);
    },
    resolvePathLineColor: (path) => {
      const status = pathStatusById.get(path.id);
      return status ? colors[status] : base.resolvePathLineColor?.(path);
    },
    resolvePathStyle: (path) => {
      const baseStyle = base.resolvePathStyle?.(path) ?? undefined;
      if (pathStatusById.get(path.id) === "removed" && removedPathStyle) {
        // A removed path that the app also marks (e.g. dashed "unconfigured")
        // stays dashed AND gains the removal pulse.
        return { ...baseStyle, ...removedPathStyle };
      }
      return baseStyle;
    },
  };
}
