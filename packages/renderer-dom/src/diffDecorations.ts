import type { UniverseModelDiff } from "@zoneflow/core";
import type { ResolvePathColor, ResolvePathLineColor } from "./types";
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
   * Resolvers to fall back to for elements the diff does not mark — so the
   * decorations can wrap an app's existing presentation (e.g. `meta.color`
   * based resolvers) instead of replacing it.
   */
  base?: {
    resolveZoneColor?: ResolveZoneColor;
    resolveZoneStyle?: ResolveZoneStyle;
    resolvePathColor?: ResolvePathColor;
    resolvePathLineColor?: ResolvePathLineColor;
  };
};

export type DiffDecorations = {
  resolveZoneColor: ResolveZoneColor;
  resolveZoneStyle: ResolveZoneStyle;
  resolvePathColor: ResolvePathColor;
  resolvePathLineColor: ResolvePathLineColor;
};

/**
 * Turn a {@link UniverseModelDiff} into the four presentation resolvers that
 * paint diff status onto the canvas:
 *
 * - removed → red accent, red connector lines, dashed ghost zones
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
  const removedZoneStyle =
    options.removedZoneStyle === undefined
      ? DEFAULT_REMOVED_ZONE_STYLE
      : options.removedZoneStyle;
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
      if (zoneStatusById.get(zone.id) === "removed" && removedZoneStyle) {
        return removedZoneStyle;
      }
      return base.resolveZoneStyle?.(zone);
    },
    resolvePathColor: (path) => {
      const status = pathStatusById.get(path.id);
      return status ? colors[status] : base.resolvePathColor?.(path);
    },
    resolvePathLineColor: (path) => {
      const status = pathStatusById.get(path.id);
      return status ? colors[status] : base.resolvePathLineColor?.(path);
    },
  };
}
