import {
  getZoneDepth,
  getZoneLayout,
  updateZoneLayout,
  type PathId,
  type UniverseLayoutModel,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import type {
  CameraState,
  RendererFrame,
} from "@zoneflow/renderer-dom";
import {
  projectWorldRectToScreenRect,
  resolveSnappedMove,
  roundCoordinate,
  snapCoordinate,
  typedValues,
  type GridSnapOptions,
  type MoveEditorDragOrigin,
  type MoveEditorTarget,
  type MoveEditorTargetOptions,
  type ZoneAlignMode,
  type ZoneDistributeMode,
  type ZoneResizeOrigin,
} from "./moveEditorShared";
import {
  applyPathMovePosition,
  resolvePathMoveOriginSnapshot,
} from "./pathMoveEditor";
import {
  applyZoneOriginsDelta,
  resolveZoneGroupOrigins,
} from "./zoneGeometry";

export type {
  GridSnapOptions,
  MoveEditorDragOrigin,
  MoveEditorTarget,
  MoveEditorTargetOptions,
  PathAlignMode,
  PathDistributeMode,
  PathResizeOrigin,
  ZoneAlignMode,
  ZoneDistributeMode,
  ZoneResizeOrigin,
} from "./moveEditorShared";
export {
  alignPathsByMode,
  distributePathsByMode,
  resolveGroupPathDragOrigin,
  resolvePathResizeOrigin,
  resizePathNodeByScreenDelta,
} from "./pathMoveEditor";
export {
  commitZoneGroupReparentAtCurrentPosition,
  commitZoneReparentAtCurrentPosition,
  reparentZoneAtCurrentPosition,
  resolveZonePlacementAtWorldRect,
  resolveZoneReparentCandidate,
} from "./zoneReparent";

const DEFAULT_MIN_VISIBLE_SIZE = 18;
const DEFAULT_MIN_ZONE_WIDTH = 140;
const DEFAULT_MIN_ZONE_HEIGHT = 96;

function resolveResizedAnchor(params: {
  kind: "inlet" | "outlet";
  width: number;
  height: number;
  current?: NonNullable<UniverseLayoutModel["zoneLayoutsById"][ZoneId]>["anchors"]["inlet"];
}) {
  const { kind, width, height, current } = params;
  const rectWidth = current?.rect?.width;
  const rectHeight = current?.rect?.height;
  const nextCenterY = roundCoordinate(height / 2);
  const nextRectY =
    rectHeight !== undefined
      ? roundCoordinate(nextCenterY - rectHeight / 2)
      : undefined;

  return {
    point: {
      x: kind === "inlet" ? 0 : roundCoordinate(width),
      y: nextCenterY,
    },
    rect: current?.rect
      ? {
          ...current.rect,
          x:
            kind === "inlet"
              ? 0
              : roundCoordinate(width - (rectWidth ?? current.rect.width ?? 0)),
          y: nextRectY ?? current.rect.y,
          width: rectWidth,
          height: rectHeight,
        }
      : undefined,
  };
}

export function getMoveEditorTargets(params: {
  model: UniverseModel;
  frame: RendererFrame;
  camera: CameraState;
  options?: MoveEditorTargetOptions;
}): MoveEditorTarget[] {
  const {
    model,
    frame,
    camera,
    options,
  } = params;

  const includeRoot = options?.includeRoot ?? true;
  const minVisibleSize = options?.minVisibleSize ?? DEFAULT_MIN_VISIBLE_SIZE;
  const zoneTargets: Array<MoveEditorTarget & { kind: "zone"; depth: number }> = [];
  const pathTargets: MoveEditorTarget[] = [];

  for (const zoneVisual of typedValues(frame.pipeline.graphLayout.zonesById)) {
    const zone = model.zonesById[zoneVisual.zoneId];
    const visibility =
      frame.pipeline.visibility.zoneVisibilityById[zoneVisual.zoneId];

    if (!zone || !visibility?.isVisible) continue;
    if (!includeRoot && model.rootZoneIds.includes(zone.id)) continue;

    const rect = projectWorldRectToScreenRect(zoneVisual.rect, camera);
    if (rect.width < minVisibleSize || rect.height < minVisibleSize) {
      continue;
    }

    zoneTargets.push({
      key: `zone:${zoneVisual.zoneId}`,
      kind: "zone",
      zoneId: zoneVisual.zoneId,
      label: zone.name,
      rect,
      depth: getZoneDepth(model, zoneVisual.zoneId),
    });
  }

  for (const pathVisual of typedValues(frame.pipeline.graphLayout.pathsById)) {
    const visibility =
      frame.pipeline.visibility.pathVisibilityById[pathVisual.pathId];

    if (!visibility?.shouldRenderNode || !pathVisual.rect) continue;

    const rect = projectWorldRectToScreenRect(pathVisual.rect, camera);
    if (rect.width < minVisibleSize || rect.height < minVisibleSize) {
      continue;
    }

    pathTargets.push({
      key: `path:${pathVisual.pathId}`,
      kind: "path",
      pathId: pathVisual.pathId,
      label: pathVisual.path.name,
      rect,
    });
  }

  return [
    ...zoneTargets
      .sort((a, b) => a.depth - b.depth)
      .map(({ depth: _depth, ...target }) => target),
    ...pathTargets,
  ];
}

export function resolveMoveEditorDragOrigin(
  layoutModel: UniverseLayoutModel,
  target: MoveEditorTarget,
  frame?: RendererFrame
): MoveEditorDragOrigin | undefined {
  if (target.kind === "zone") {
    const zoneLayout = getZoneLayout(layoutModel, target.zoneId);
    if (!zoneLayout) return undefined;

    return {
      kind: "zone",
      zoneId: target.zoneId,
      originX: zoneLayout.x,
      originY: zoneLayout.y,
    };
  }

  return {
    kind: "path",
    pathId: target.pathId,
    origin: resolvePathMoveOriginSnapshot({
      frame,
      layoutModel,
      pathId: target.pathId,
    }),
  };
}

export function resolveGroupZoneDragOrigin(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  primaryZoneId: ZoneId;
}): MoveEditorDragOrigin | undefined {
  const resolved = resolveZoneGroupOrigins(params);
  if (!resolved) return undefined;

  return {
    kind: "zone-group",
    primaryZoneId: resolved.primaryZoneId,
    originsByZoneId: resolved.originsByZoneId,
  };
}

export function moveEditorTargetByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: MoveEditorDragOrigin;
  deltaX: number;
  deltaY: number;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    gridSnap,
  } = params;

  if (origin.kind === "zone") {
    const { nextX, nextY } = resolveSnappedMove({
      originX: origin.originX,
      originY: origin.originY,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });
    return updateZoneLayout(layoutModel, origin.zoneId, {
      x: nextX,
      y: nextY,
    });
  }

  if (origin.kind === "zone-group") {
    const primaryOrigin = origin.originsByZoneId[origin.primaryZoneId];
    if (!primaryOrigin) return layoutModel;

    const { effectiveDeltaX, effectiveDeltaY } = resolveSnappedMove({
      originX: primaryOrigin.x,
      originY: primaryOrigin.y,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });

    return applyZoneOriginsDelta({
      layoutModel,
      originsByZoneId: origin.originsByZoneId,
      deltaX: effectiveDeltaX,
      deltaY: effectiveDeltaY,
    });
  }

  if (origin.kind === "path-group") {
    const primaryOrigin = origin.originsByPathId[origin.primaryPathId];
    if (!primaryOrigin) return layoutModel;

    const { effectiveDeltaX, effectiveDeltaY } = resolveSnappedMove({
      originX: primaryOrigin.x,
      originY: primaryOrigin.y,
      deltaX,
      deltaY,
      camera,
      gridSnap,
    });

    let nextLayoutModel = layoutModel;
    for (const [pathId, pathOrigin] of Object.entries(origin.originsByPathId) as Array<
      [PathId, typeof primaryOrigin]
    >) {
      nextLayoutModel = applyPathMovePosition({
        layoutModel: nextLayoutModel,
        pathId,
        origin: pathOrigin,
        x: roundCoordinate(pathOrigin.x + effectiveDeltaX),
        y: roundCoordinate(pathOrigin.y + effectiveDeltaY),
      });
    }

    return nextLayoutModel;
  }

  const { nextX, nextY } = resolveSnappedMove({
    originX: origin.origin.x,
    originY: origin.origin.y,
    deltaX,
    deltaY,
    camera,
    gridSnap,
  });
  return applyPathMovePosition({
    layoutModel,
    pathId: origin.pathId,
    origin: origin.origin,
    x: nextX,
    y: nextY,
  });
}

export function resolveZoneResizeOrigin(
  layoutModel: UniverseLayoutModel,
  zoneId: ZoneId
): ZoneResizeOrigin | undefined {
  const zoneLayout = getZoneLayout(layoutModel, zoneId);
  if (!zoneLayout) return undefined;

  return {
    zoneId,
    originWidth: zoneLayout.width ?? 0,
    originHeight: zoneLayout.height ?? 0,
  };
}

export function resizeZoneByScreenDelta(params: {
  layoutModel: UniverseLayoutModel;
  camera: CameraState;
  origin: ZoneResizeOrigin;
  deltaX: number;
  deltaY: number;
  minWidth?: number;
  minHeight?: number;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const {
    layoutModel,
    camera,
    origin,
    deltaX,
    deltaY,
    minWidth = DEFAULT_MIN_ZONE_WIDTH,
    minHeight = DEFAULT_MIN_ZONE_HEIGHT,
    gridSnap,
  } = params;

  const currentLayout = getZoneLayout(layoutModel, origin.zoneId);
  if (!currentLayout) return layoutModel;

  const nextWidth = Math.max(
    minWidth,
    snapCoordinate(origin.originWidth + deltaX / camera.zoom, gridSnap)
  );
  const nextHeight = Math.max(
    minHeight,
    snapCoordinate(origin.originHeight + deltaY / camera.zoom, gridSnap)
  );

  return updateZoneLayout(layoutModel, origin.zoneId, {
    width: nextWidth,
    height: nextHeight,
    anchors: {
      inlet: resolveResizedAnchor({
        kind: "inlet",
        width: nextWidth,
        height: nextHeight,
        current: currentLayout.anchors.inlet,
      }),
      outlet: resolveResizedAnchor({
        kind: "outlet",
        width: nextWidth,
        height: nextHeight,
        current: currentLayout.anchors.outlet,
      }),
    },
  });
}

export function alignZonesByMode(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  mode: ZoneAlignMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { layoutModel, zoneIds, mode, gridSnap } = params;
  const entries = zoneIds
    .map((zoneId) => ({
      zoneId,
      layout: getZoneLayout(layoutModel, zoneId),
    }))
    .filter(
      (
        entry
      ): entry is {
        zoneId: ZoneId;
        layout: NonNullable<ReturnType<typeof getZoneLayout>>;
      } => Boolean(entry.layout)
    );

  if (entries.length < 2) return layoutModel;

  const reference =
    mode === "left"
      ? Math.min(...entries.map((entry) => entry.layout.x))
      : mode === "right"
        ? Math.max(
            ...entries.map((entry) => entry.layout.x + (entry.layout.width ?? 0))
          )
        : mode === "top"
          ? Math.min(...entries.map((entry) => entry.layout.y))
          : mode === "bottom"
            ? Math.max(
                ...entries.map((entry) => entry.layout.y + (entry.layout.height ?? 0))
              )
            : mode === "center-horizontal"
              ? entries.reduce(
                  (sum, entry) => sum + entry.layout.x + (entry.layout.width ?? 0) / 2,
                  0
                ) / entries.length
              : entries.reduce(
                  (sum, entry) => sum + entry.layout.y + (entry.layout.height ?? 0) / 2,
                  0
                ) / entries.length;
  const snappedReference = snapCoordinate(reference, gridSnap);

  let nextLayoutModel = layoutModel;
  for (const entry of entries) {
    nextLayoutModel = updateZoneLayout(nextLayoutModel, entry.zoneId, {
      x:
        mode === "left"
          ? snappedReference
          : mode === "right"
            ? snapCoordinate(
                snappedReference - (entry.layout.width ?? 0),
                gridSnap
              )
            : mode === "center-horizontal"
              ? snapCoordinate(
                  snappedReference - (entry.layout.width ?? 0) / 2,
                  gridSnap
                )
              : entry.layout.x,
      y:
        mode === "top"
          ? snappedReference
          : mode === "bottom"
            ? snapCoordinate(
                snappedReference - (entry.layout.height ?? 0),
                gridSnap
              )
            : mode === "center-vertical"
              ? snapCoordinate(
                  snappedReference - (entry.layout.height ?? 0) / 2,
                  gridSnap
                )
              : entry.layout.y,
    });
  }

  return nextLayoutModel;
}

export function distributeZonesByMode(params: {
  layoutModel: UniverseLayoutModel;
  zoneIds: ZoneId[];
  mode: ZoneDistributeMode;
  gridSnap?: GridSnapOptions;
}): UniverseLayoutModel {
  const { layoutModel, zoneIds, mode, gridSnap } = params;
  const axis = mode === "horizontal" ? "x" : "y";
  const sizeKey = mode === "horizontal" ? "width" : "height";
  const entries = zoneIds
    .map((zoneId) => ({
      zoneId,
      layout: getZoneLayout(layoutModel, zoneId),
    }))
    .filter(
      (
        entry
      ): entry is {
        zoneId: ZoneId;
        layout: NonNullable<ReturnType<typeof getZoneLayout>>;
      } => Boolean(entry.layout)
    )
    .sort((a, b) => a.layout[axis] - b.layout[axis]);

  if (entries.length < 3) return layoutModel;

  const first = entries[0];
  const last = entries[entries.length - 1];
  const span =
    last.layout[axis] + (last.layout[sizeKey] ?? 0) - first.layout[axis];
  const occupied = entries.reduce(
    (sum, entry) => sum + (entry.layout[sizeKey] ?? 0),
    0
  );
  const gap = (span - occupied) / (entries.length - 1);

  let cursor = first.layout[axis] + (first.layout[sizeKey] ?? 0) + gap;
  let nextLayoutModel = layoutModel;

  for (const entry of entries.slice(1, -1)) {
    const snapped = snapCoordinate(cursor, gridSnap);
    nextLayoutModel = updateZoneLayout(nextLayoutModel, entry.zoneId, {
      x: mode === "horizontal" ? snapped : entry.layout.x,
      y: mode === "vertical" ? snapped : entry.layout.y,
    });
    cursor += (entry.layout[sizeKey] ?? 0) + gap;
  }

  return nextLayoutModel;
}
