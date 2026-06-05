import {
  getPaths,
  resolvePathTarget,
  updateZoneLayout,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
  type ZoneId,
} from "@zoneflow/core";
import { resolveWorldZoneOrigin } from "./zoneGeometry";
import { roundCoordinate } from "./moveEditorShared";

/**
 * Per-zone velocity vectors carried between simulation steps.
 */
export type FloatingVelocities = Record<ZoneId, Point>;

export type FloatingLayoutOptions = {
  /**
   * Flow direction. Zoneflow flows left→right by default ("x"); "y" lays the
   * flow out top→bottom. Connected zones are spaced along this axis and aligned
   * along the perpendicular one.
   */
  flowAxis?: "x" | "y";
  /** Target spacing (px) between a source and its target along the flow axis. */
  layerGap?: number;
  /** Stiffness of the flow-axis spacing force (the dominant ordering force). */
  flowStrength?: number;
  /**
   * Stiffness of the cross-axis force that aligns a target with its source,
   * keeping each chain reading as a straight flow line.
   */
  alignStrength?: number;
  /** Strength of the inverse-square push that keeps mobile zones apart. */
  repulsionStrength?: number;
  /** Gentle pull toward the mobile cluster's centroid (prevents drift). */
  centeringStrength?: number;
  /** Velocity retention per step (0..1). Lower = settles faster. */
  damping?: number;
  /** Overall multiplier applied to velocity when moving (lower = slower). */
  speed?: number;
  /** Max distance (px) a zone may move in a single step. Keeps motion gentle. */
  maxStep?: number;
  /** Inner padding (px) kept between a child zone and its container's edges. */
  containerPadding?: number;
  /** Decides which zones drift. Defaults to action zones. */
  isMobile?: (zone: Zone) => boolean;
};

export type FloatingStepResult = {
  layoutModel: UniverseLayoutModel;
  velocities: FloatingVelocities;
  /** Total kinetic energy (sum of |v|²). Near zero once the layout settles. */
  energy: number;
};

const DEFAULTS = {
  flowAxis: "x" as const,
  layerGap: 200,
  flowStrength: 0.03,
  alignStrength: 0.014,
  repulsionStrength: 130000,
  // Very weak — just enough to stop unbounded drift. Stronger values compact
  // the whole graph toward the centroid and fight the left→right spread.
  centeringStrength: 0.0015,
  damping: 0.8,
  speed: 0.9,
  maxStep: 6,
  containerPadding: 12,
};

const MIN_DISTANCE = 1;

function isActionZone(zone: Zone): boolean {
  return zone.zoneType === "action";
}

type ZoneSample = {
  zoneId: ZoneId;
  center: Point;
  mobile: boolean;
};

/**
 * Advances a force-directed layout by one frame. Pure: given the same inputs
 * it always returns the same output, so the caller (a RAF loop) owns all
 * mutable state via the returned `velocities`.
 *
 * Forces are computed in world space; deltas are written back to each zone's
 * local layout coordinates. Because only action zones are mobile and their
 * container parents stay fixed, a world-space delta equals the local-space
 * delta, so no coordinate conversion is needed on write-back.
 */
export function stepFloatingLayout(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  velocities?: FloatingVelocities;
  pinnedZoneIds?: ReadonlySet<ZoneId>;
  options?: FloatingLayoutOptions;
}): FloatingStepResult {
  const { model, layoutModel, velocities = {}, pinnedZoneIds, options } = params;

  const flowAxis = options?.flowAxis ?? DEFAULTS.flowAxis;
  const layerGap = options?.layerGap ?? DEFAULTS.layerGap;
  const flowStrength = options?.flowStrength ?? DEFAULTS.flowStrength;
  const alignStrength = options?.alignStrength ?? DEFAULTS.alignStrength;
  const repulsionStrength =
    options?.repulsionStrength ?? DEFAULTS.repulsionStrength;
  const centeringStrength =
    options?.centeringStrength ?? DEFAULTS.centeringStrength;
  const damping = options?.damping ?? DEFAULTS.damping;
  const speed = options?.speed ?? DEFAULTS.speed;
  const maxStep = options?.maxStep ?? DEFAULTS.maxStep;
  const containerPadding =
    options?.containerPadding ?? DEFAULTS.containerPadding;
  const isMobile = options?.isMobile ?? isActionZone;

  // 1. Sample world-space centers for every laid-out zone.
  const originCache = new Map<ZoneId, Point>();
  const samples: ZoneSample[] = [];
  const sampleById = new Map<ZoneId, ZoneSample>();

  for (const zone of Object.values(model.zonesById)) {
    const layout = layoutModel.zoneLayoutsById[zone.id];
    if (!layout) continue;

    const origin = resolveWorldZoneOrigin({
      model,
      layoutModel,
      zoneId: zone.id,
      cache: originCache,
    });
    const center: Point = {
      x: origin.x + (layout.width ?? 0) / 2,
      y: origin.y + (layout.height ?? 0) / 2,
    };
    const sample: ZoneSample = {
      zoneId: zone.id,
      center,
      mobile: isMobile(zone) && !pinnedZoneIds?.has(zone.id),
    };
    samples.push(sample);
    sampleById.set(zone.id, sample);
  }

  const mobileSamples = samples.filter((sample) => sample.mobile);
  if (mobileSamples.length === 0) {
    return { layoutModel, velocities, energy: 0 };
  }

  // Accumulated force per mobile zone.
  const forces = new Map<ZoneId, Point>();
  for (const sample of mobileSamples) {
    forces.set(sample.zoneId, { x: 0, y: 0 });
  }

  const addForce = (zoneId: ZoneId, fx: number, fy: number) => {
    const force = forces.get(zoneId);
    if (!force) return; // not mobile — ignore
    force.x += fx;
    force.y += fy;
  };

  // 2. Flow forces along every path edge (source → target). The flow axis
  //    carries a directional spacing force (target sits one `layerGap`
  //    downstream of its source); the cross axis carries a gentle alignment
  //    force so each chain reads as a straight flow line.
  for (const zone of Object.values(model.zonesById)) {
    const source = sampleById.get(zone.id);
    if (!source) continue;

    for (const path of getPaths(zone)) {
      const targetZone = resolvePathTarget(model, path);
      if (!targetZone || targetZone.id === zone.id) continue;
      const target = sampleById.get(targetZone.id);
      if (!target) continue;
      if (!source.mobile && !target.mobile) continue;

      // Flow axis: drive the gap toward +layerGap (target downstream).
      const flowGap =
        flowAxis === "x"
          ? target.center.x - source.center.x
          : target.center.y - source.center.y;
      const flowForce = (layerGap - flowGap) * flowStrength;

      // Cross axis: pull the target onto the source's line.
      const crossDelta =
        flowAxis === "x"
          ? target.center.y - source.center.y
          : target.center.x - source.center.x;
      const alignForce = -crossDelta * alignStrength;

      if (flowAxis === "x") {
        addForce(targetZone.id, flowForce, alignForce);
        addForce(zone.id, -flowForce, -alignForce);
      } else {
        addForce(targetZone.id, alignForce, flowForce);
        addForce(zone.id, -alignForce, -flowForce);
      }
    }
  }

  // 3. Inverse-square repulsion between every pair of mobile zones.
  for (let i = 0; i < mobileSamples.length; i += 1) {
    for (let j = i + 1; j < mobileSamples.length; j += 1) {
      const a = mobileSamples[i];
      const b = mobileSamples[j];
      let dx = a.center.x - b.center.x;
      let dy = a.center.y - b.center.y;
      let distanceSq = dx * dx + dy * dy;
      if (distanceSq < MIN_DISTANCE) {
        // Perfectly overlapping — nudge deterministically by index so the
        // pair separates without relying on randomness.
        dx = (i - j) || 1;
        dy = 1;
        distanceSq = dx * dx + dy * dy;
      }
      const distance = Math.sqrt(distanceSq);
      const magnitude = repulsionStrength / distanceSq;
      const ux = dx / distance;
      const uy = dy / distance;
      addForce(a.zoneId, ux * magnitude, uy * magnitude);
      addForce(b.zoneId, -ux * magnitude, -uy * magnitude);
    }
  }

  // 4. Centering pull toward the mobile cluster's centroid.
  let centroidX = 0;
  let centroidY = 0;
  for (const sample of mobileSamples) {
    centroidX += sample.center.x;
    centroidY += sample.center.y;
  }
  centroidX /= mobileSamples.length;
  centroidY /= mobileSamples.length;
  for (const sample of mobileSamples) {
    addForce(
      sample.zoneId,
      (centroidX - sample.center.x) * centeringStrength,
      (centroidY - sample.center.y) * centeringStrength
    );
  }

  // 5. Integrate velocities and write displaced positions back to the layout,
  //    clamping each child zone inside its parent container's bounds.
  const nextVelocities: FloatingVelocities = {};
  let nextLayoutModel = layoutModel;
  let energy = 0;

  for (const sample of mobileSamples) {
    const force = forces.get(sample.zoneId) ?? { x: 0, y: 0 };
    const prev = velocities[sample.zoneId] ?? { x: 0, y: 0 };

    let vx = (prev.x + force.x) * damping;
    let vy = (prev.y + force.y) * damping;

    // Clamp the per-step displacement so motion stays slow and gentle.
    const stepDistance = Math.hypot(vx * speed, vy * speed);
    if (stepDistance > maxStep) {
      const scale = maxStep / stepDistance;
      vx *= scale;
      vy *= scale;
    }

    const layout = layoutModel.zoneLayoutsById[sample.zoneId];
    if (!layout) {
      nextVelocities[sample.zoneId] = { x: vx, y: vy };
      energy += vx * vx + vy * vy;
      continue;
    }

    let nextX = layout.x + vx * speed;
    let nextY = layout.y + vy * speed;

    // Containment: keep a child fully within its parent container. Local
    // coordinates are relative to the parent origin, so the valid box is
    // [pad, parentSize - childSize - pad] on each axis. Velocity on a clamped
    // axis is zeroed so the zone rests against the wall without jitter.
    const parentId = model.zonesById[sample.zoneId]?.parentZoneId;
    const parentLayout = parentId
      ? layoutModel.zoneLayoutsById[parentId]
      : undefined;
    if (parentLayout) {
      const childW = layout.width ?? 0;
      const childH = layout.height ?? 0;
      const parentW = parentLayout.width;
      const parentH = parentLayout.height;

      if (parentW !== undefined) {
        const maxX = Math.max(containerPadding, parentW - childW - containerPadding);
        const clampedX = Math.min(Math.max(nextX, containerPadding), maxX);
        if (clampedX !== nextX) {
          nextX = clampedX;
          vx = 0;
        }
      }
      if (parentH !== undefined) {
        const maxY = Math.max(containerPadding, parentH - childH - containerPadding);
        const clampedY = Math.min(Math.max(nextY, containerPadding), maxY);
        if (clampedY !== nextY) {
          nextY = clampedY;
          vy = 0;
        }
      }
    }

    nextVelocities[sample.zoneId] = { x: vx, y: vy };
    energy += vx * vx + vy * vy;

    nextLayoutModel = updateZoneLayout(nextLayoutModel, sample.zoneId, {
      x: roundCoordinate(nextX),
      y: roundCoordinate(nextY),
    });
  }

  return {
    layoutModel: nextLayoutModel,
    velocities: nextVelocities,
    energy,
  };
}
