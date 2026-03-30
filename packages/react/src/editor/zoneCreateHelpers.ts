import {
  createZone,
  createZoneId,
  createZoneLayout,
  setZoneLayout,
  type Point,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
  type ZoneAction,
  type ZoneId,
} from "@zoneflow/core";
import { resolveZonePlacementAtWorldRect } from "@zoneflow/editor-dom";
import type { UniverseEditorGridSize } from "./useUniverseEditor";

export type ZoneDropTemplate = {
  name: string;
  zoneType: Zone["zoneType"];
  width: number;
  height: number;
  action?: ZoneAction;
  inputDisabled?: boolean;
  outputDisabled?: boolean;
  meta?: Record<string, unknown>;
};

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function snapCoordinate(
  value: number,
  enabled: boolean,
  size: UniverseEditorGridSize
): number {
  if (!enabled) return roundCoordinate(value);
  return roundCoordinate(Math.round(value / size) * size);
}

export function createZoneFromDropTemplate(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  worldPoint: Point;
  template: ZoneDropTemplate;
  gridSnapEnabled?: boolean;
  gridSnapSize?: UniverseEditorGridSize;
  createId?: () => ZoneId;
}) {
  const {
    model,
    layoutModel,
    worldPoint,
    template,
    gridSnapEnabled = false,
    gridSnapSize = 16,
    createId = createZoneId,
  } = params;

  const worldRect = {
    x: snapCoordinate(
      worldPoint.x - template.width / 2,
      gridSnapEnabled,
      gridSnapSize
    ),
    y: snapCoordinate(
      worldPoint.y - template.height / 2,
      gridSnapEnabled,
      gridSnapSize
    ),
    width: template.width,
    height: template.height,
  };
  const placement = resolveZonePlacementAtWorldRect({
    model,
    layoutModel,
    worldRect,
  });
  const zoneId = createId();
  const nextModel = createZone(model, {
    id: zoneId,
    name: template.name,
    parentZoneId: placement.parentZoneId,
    zoneType: template.zoneType,
    action: template.action,
    inputDisabled: template.inputDisabled,
    outputDisabled: template.outputDisabled,
    meta: template.meta,
  });
  const nextLayoutModel = setZoneLayout(
    layoutModel,
    zoneId,
    createZoneLayout({
      x: placement.x,
      y: placement.y,
      width: template.width,
      height: template.height,
    })
  );

  return {
    zoneId,
    model: nextModel,
    layoutModel: nextLayoutModel,
  };
}
