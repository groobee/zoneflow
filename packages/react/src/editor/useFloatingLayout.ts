import { useEffect, useRef } from "react";
import type { UniverseLayoutModel, UniverseModel, ZoneId } from "@zoneflow/core";
import {
  stepFloatingLayout,
  type FloatingLayoutOptions,
  type FloatingVelocities,
} from "@zoneflow/editor-dom";

/** Total kinetic energy below which the layout is considered settled. */
const SETTLE_ENERGY = 0.05;
/** Consecutive settled steps before the loop pauses itself (~1s at 30fps). */
const SETTLE_FRAMES = 30;
/**
 * Minimum gap between simulation steps. Each step triggers a full canvas
 * redraw, so ~30fps keeps motion smooth and gentle while halving the redraw
 * churn of an unthrottled 60fps loop.
 */
const STEP_INTERVAL_MS = 1000 / 30;

export type UseFloatingLayoutParams = {
  /** Master switch. When false the loop never runs. */
  enabled: boolean;
  /**
   * Temporarily halt the simulation without resetting it — e.g. while the
   * editor is in edit mode and positions are driven by a draft transaction.
   */
  paused?: boolean;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  /** Called once per frame with the displaced layout model. */
  onLayoutModelChange: (next: UniverseLayoutModel) => void;
  /** Zones excluded from the simulation (e.g. currently grabbed by the user). */
  pinnedZoneIds?: ReadonlySet<ZoneId>;
  options?: FloatingLayoutOptions;
};

/**
 * Runs a gentle force-directed "floating" animation over action zones.
 *
 * The loop reads from and writes to an internal working copy of the layout so
 * it is not throttled by React's render cadence. It distinguishes its own
 * echoed updates (same object reference) from genuine external edits and wakes
 * back up when the model or layout changes from the outside. Once motion dies
 * down it stops requesting frames until something changes again.
 */
export function useFloatingLayout(params: UseFloatingLayoutParams): void {
  const {
    enabled,
    paused = false,
    model,
    layoutModel,
    onLayoutModelChange,
    pinnedZoneIds,
    options,
  } = params;

  const modelRef = useRef(model);
  const workingLayoutRef = useRef(layoutModel);
  const velocitiesRef = useRef<FloatingVelocities>({});
  const onChangeRef = useRef(onLayoutModelChange);
  const pinnedRef = useRef<ReadonlySet<ZoneId> | undefined>(pinnedZoneIds);
  const optionsRef = useRef<FloatingLayoutOptions | undefined>(options);

  const activeRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const settleFramesRef = useRef(0);
  const lastStepTimeRef = useRef(0);

  // Keep callback/option refs fresh without restarting the loop.
  onChangeRef.current = onLayoutModelChange;
  pinnedRef.current = pinnedZoneIds;
  optionsRef.current = options;
  modelRef.current = model;

  // Sync external layout/model changes into the working copy. Our own per-frame
  // writes echo back as the identical object reference, so we ignore those and
  // only react to genuine outside edits (resync + wake the loop).
  useEffect(() => {
    if (layoutModel === workingLayoutRef.current) return;
    workingLayoutRef.current = layoutModel;
    velocitiesRef.current = {};
    settleFramesRef.current = 0;
    if (activeRef.current && rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutModel, model]);

  // The animation frame callback. Declared as a stable function via ref-reads.
  // `now` is the DOMHighResTimeStamp RAF passes in — used to throttle steps
  // without needing a wall-clock read.
  function tick(now: number) {
    if (now - lastStepTimeRef.current < STEP_INTERVAL_MS) {
      // Too soon for another step — keep the frame loop alive and wait.
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    lastStepTimeRef.current = now;

    const result = stepFloatingLayout({
      model: modelRef.current,
      layoutModel: workingLayoutRef.current,
      velocities: velocitiesRef.current,
      pinnedZoneIds: pinnedRef.current,
      options: optionsRef.current,
    });

    velocitiesRef.current = result.velocities;
    workingLayoutRef.current = result.layoutModel;
    onChangeRef.current(result.layoutModel);

    if (result.energy < SETTLE_ENERGY) {
      settleFramesRef.current += 1;
    } else {
      settleFramesRef.current = 0;
    }

    if (settleFramesRef.current >= SETTLE_FRAMES) {
      rafRef.current = null; // settled — stop until something changes
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // Start/stop the loop when the active state flips.
  useEffect(() => {
    const active = enabled && !paused;
    activeRef.current = active;

    if (active) {
      workingLayoutRef.current = layoutModel;
      velocitiesRef.current = {};
      settleFramesRef.current = 0;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // `layoutModel` intentionally excluded: a restart snapshots the latest via
    // the ref. Including it would restart the loop every frame we drive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paused]);
}
