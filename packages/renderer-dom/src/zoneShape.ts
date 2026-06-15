import type { Zone } from "@zoneflow/core";

/**
 * Where a zone's connection anchors are drawn.
 * - `edge`: the default full-height side tabs (good for rectangular cards).
 * - `vertex`: a compact dot centered on the left/right edge midpoint
 *   (good for round/diamond nodes whose sides are not flat).
 */
export type ZoneAnchorRenderMode = "edge" | "vertex";

/** Built-in shape presets. */
export type ZoneShapeName =
  | "rect"
  | "rounded"
  | "pill"
  | "circle"
  | "diamond"
  | "hexagon";

/**
 * Fully custom shape spec — the escape hatch for arbitrary geometry.
 *
 * Provide either `borderRadius` (rendered with a real CSS border) or
 * `clipPath` (rendered as a clipped polygon with a synthesized outline).
 * When `clipPath` is set, `borderRadius` is ignored.
 */
export type ZoneShapeSpec = {
  /** CSS `border-radius` value, e.g. `"14px"`, `"50%"`, `"999px"`. */
  borderRadius?: string;
  /**
   * CSS `clip-path` value, e.g. `"polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"`.
   * When set the zone is drawn as a clipped polygon.
   */
  clipPath?: string;
  /**
   * Whether to draw the rectangular accent header band at the top.
   * Defaults to `true` for radius-based shapes and `false` for clipped /
   * fully-rounded shapes (where a rectangular band looks wrong).
   */
  header?: boolean;
  /**
   * How connection anchors attach. Defaults to `"vertex"` for clipped or
   * circular shapes and `"edge"` otherwise.
   */
  anchors?: ZoneAnchorRenderMode;
};

export type ZoneShape = ZoneShapeName | ZoneShapeSpec;

/**
 * Resolver invoked once per zone to decide how it is drawn. Return
 * `undefined`/`null` to fall back to the default rectangle. Purely a
 * presentation concern — the zone's geometry, hit-testing, and anchor
 * points are unaffected, so paths still connect exactly as before.
 */
export type ResolveZoneShape = (zone: Zone) => ZoneShape | null | undefined;

/**
 * Resolver invoked once per zone to decide its accent color. Return a CSS
 * color to override the zone's border + accent (and matching anchor) for that
 * zone; return `undefined`/`null` to fall back to the theme's zoneType-based
 * colors. Like {@link ResolveZoneShape}, a purely presentational hook decided
 * by the consumer (e.g. from `zone.meta.color`, `zone.action`, …). The body
 * background and text stay theme-driven so contrast is preserved.
 */
export type ResolveZoneColor = (zone: Zone) => string | null | undefined;

/**
 * Per-zone presentation overrides beyond color — built for transient states
 * like a diff preview's "will be removed" ghost (dashed outline + dimmed).
 */
export type ZoneStyleOverride = {
  /**
   * CSS `border-style` for the zone outline. Applies to radius-based shapes;
   * clipped shapes (diamond/hexagon/custom `clipPath`) synthesize their
   * outline from a fill layer, so `borderStyle` is ignored there.
   */
  borderStyle?: "solid" | "dashed" | "dotted";
  /**
   * 0..1 multiplier composed onto the zone's computed visibility opacity.
   * Dims the whole zone including its slots and anchors.
   */
  opacity?: number;
  /**
   * Blink the whole zone (slots and anchors included) — for states color
   * alone can't carry, e.g. "will be removed" in a diff preview where apps
   * may already use colors for their own meaning. Pulses from the zone's
   * computed opacity, so it composes with `opacity`. Disabled automatically
   * under `prefers-reduced-motion`.
   */
  pulse?: boolean;
};

/**
 * Resolver invoked once per zone to decide its style overrides. Return
 * `undefined`/`null` for the default presentation. Like
 * {@link ResolveZoneColor}, purely presentational — geometry, hit-testing,
 * and anchors are unaffected.
 */
export type ResolveZoneStyle = (
  zone: Zone
) => ZoneStyleOverride | null | undefined;

/** Normalized geometry consumed by the draw engine. */
export type ResolvedZoneShape = {
  borderRadius: string;
  clipPath: string | null;
  header: boolean;
  anchors: ZoneAnchorRenderMode;
};

const DIAMOND_CLIP = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
const HEXAGON_CLIP =
  "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

const RECT_SHAPE: ResolvedZoneShape = {
  borderRadius: "0",
  clipPath: null,
  header: true,
  anchors: "edge",
};

function specFromName(name: ZoneShapeName): ZoneShapeSpec {
  switch (name) {
    case "rounded":
      return { borderRadius: "14px" };
    case "pill":
      return { borderRadius: "999px", header: false, anchors: "vertex" };
    case "circle":
      return { borderRadius: "50%", header: false, anchors: "vertex" };
    case "diamond":
      return { clipPath: DIAMOND_CLIP };
    case "hexagon":
      return { clipPath: HEXAGON_CLIP };
    case "rect":
    default:
      return { borderRadius: "0" };
  }
}

export function normalizeZoneShape(
  shape: ZoneShape | null | undefined
): ResolvedZoneShape {
  if (!shape) return RECT_SHAPE;

  const spec = typeof shape === "string" ? specFromName(shape) : shape;
  const clipPath = spec.clipPath ?? null;
  const borderRadius = clipPath ? "0" : spec.borderRadius ?? "0";
  const isRound = !clipPath && borderRadius === "50%";

  return {
    borderRadius,
    clipPath,
    header: spec.header ?? !clipPath,
    anchors: spec.anchors ?? (clipPath || isRound ? "vertex" : "edge"),
  };
}
