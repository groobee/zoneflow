import { describe, expect, it } from "vitest";
import {
  createUniverseLayoutModel,
  createZoneLayout,
  updateZoneLayout,
  type Path,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
} from "@zoneflow/core";
import {
  defaultGraphLayoutEngine,
  type RenderPipelineInput,
  type RendererFrame,
} from "@zoneflow/renderer-dom";
import {
  createPathFromOutputAnchorDrag,
  resolveInputAnchorTargetZoneId,
  resolveZoneAnchorScreenRect,
  retargetPathFromOutputAnchorDrag,
} from "./pathCreateEditor.js";
import { resolveZoneDropPlacement } from "./zoneReparent.js";
import {
  moveEditorTargetByScreenDelta,
  resolveMoveEditorDragOrigin,
  resolveMoveEditorObjectSnapGuides,
  snapZonesToCells,
  snapZonesToSlotPoints,
} from "./zoneMoveEditor.js";
import type { MoveEditorTarget } from "./moveEditorShared.js";

const CAMERA = { x: 0, y: 0, zoom: 1 };
const OBJECT_SNAP = { enabled: true };

function zone(id: string, over: Partial<Zone> = {}): Zone {
  return {
    id,
    parentZoneId: null,
    name: id,
    zoneType: "action",
    childZoneIds: [],
    pathIds: [],
    pathsById: {},
    ...over,
  };
}

function modelOf(zones: Zone[]): UniverseModel {
  return {
    version: "1",
    universeId: "u1",
    rootZoneIds: zones.filter((z) => z.parentZoneId === null).map((z) => z.id),
    zonesById: Object.fromEntries(zones.map((z) => [z.id, z])),
  };
}

function layoutOf(
  rects: Record<string, { x: number; y: number; width: number; height: number }>
): UniverseLayoutModel {
  let layoutModel = createUniverseLayoutModel({ universeId: "u1" });
  for (const [zoneId, rect] of Object.entries(rects)) {
    layoutModel = updateZoneLayout(layoutModel, zoneId, createZoneLayout(rect));
  }
  return layoutModel;
}

// A real graph layout (world rects) with everything visible.
function frameOf(
  model: UniverseModel,
  layoutModel: UniverseLayoutModel
): RendererFrame {
  const graphLayout = defaultGraphLayoutEngine.compute({
    model,
    layoutModel,
    camera: CAMERA,
  } as RenderPipelineInput);
  return {
    pipeline: {
      graphLayout,
      density: { zoneDensityById: {}, pathDensityById: {} },
      visibility: {
        zoneVisibilityById: Object.fromEntries(
          Object.keys(graphLayout.zonesById).map((id) => [id, { isVisible: true }])
        ),
        pathVisibilityById: Object.fromEntries(
          Object.keys(graphLayout.pathsById).map((id) => [
            id,
            { shouldRenderNode: true, shouldRenderEdge: true },
          ])
        ),
      },
    },
  } as unknown as RendererFrame;
}

const zoneTarget = (zoneId: string) =>
  ({
    key: `zone:${zoneId}`,
    kind: "zone",
    zoneId,
    label: zoneId,
    rect: { x: 0, y: 0, width: 1, height: 1 },
  }) as MoveEditorTarget;

describe("object snap compares like with like", () => {
  // Container C at world (500, 300). Child K at local (47, 40) → world 547;
  // sibling S at local (50, 150) → its left edge is the world guide 550.
  const model = modelOf([
    zone("C", { zoneType: "container", childZoneIds: ["K", "S"] }),
    zone("K", { parentZoneId: "C" }),
    zone("S", { parentZoneId: "C" }),
  ]);

  it("snaps a nested zone to a sibling edge in world space", () => {
    const layoutModel = layoutOf({
      C: { x: 500, y: 300, width: 400, height: 300 },
      K: { x: 47, y: 40, width: 100, height: 60 },
      S: { x: 50, y: 150, width: 100, height: 60 },
    });
    const origin = resolveMoveEditorDragOrigin({
      model,
      layoutModel,
      target: zoneTarget("K"),
      frame: frameOf(model, layoutModel),
    })!;

    const next = moveEditorTargetByScreenDelta({
      layoutModel,
      camera: CAMERA,
      origin,
      deltaX: 0.5,
      deltaY: 0,
      objectSnap: OBJECT_SNAP,
    });
    const guides = resolveMoveEditorObjectSnapGuides({
      camera: CAMERA,
      origin,
      deltaX: 0.5,
      deltaY: 0,
      objectSnap: OBJECT_SNAP,
    });

    expect(next.zoneLayoutsById.K.x).toBe(50); // world 550 = S's left edge
    expect(guides.guideX).toBe(550); // reported in world space
  });

  it("does not jump to a guide that is only near in local coordinates", () => {
    // K at local 497 → world 997. Local 497 sits next to C's world left edge
    // (500), but in world space K's edges (997/1047/1097) have no guide near.
    const layoutModel = layoutOf({
      C: { x: 500, y: 300, width: 1300, height: 300 },
      K: { x: 497, y: 40, width: 100, height: 60 },
      S: { x: 50, y: 150, width: 100, height: 60 },
    });
    const origin = resolveMoveEditorDragOrigin({
      model,
      layoutModel,
      target: zoneTarget("K"),
      frame: frameOf(model, layoutModel),
    })!;

    const next = moveEditorTargetByScreenDelta({
      layoutModel,
      camera: CAMERA,
      origin,
      deltaX: 0,
      deltaY: 0,
      objectSnap: OBJECT_SNAP,
    });

    expect(next.zoneLayoutsById.K.x).toBe(497);
  });

  it("reports path-label guides where the label is actually drawn", () => {
    const path: Path = { id: "p1", key: "p1", name: "p1", target: null, rule: null };
    const pathModel = modelOf([
      zone("A", { pathIds: ["p1"], pathsById: { p1: path } }),
      zone("B"),
    ]);
    const layoutModel = layoutOf({
      A: { x: 0, y: 0, width: 200, height: 100 },
      B: { x: 400, y: 0, width: 200, height: 100 },
    });
    const target = {
      key: "path:p1",
      kind: "path",
      pathId: "p1",
      label: "p1",
      rect: { x: 0, y: 0, width: 1, height: 1 },
    } as MoveEditorTarget;
    const origin = resolveMoveEditorDragOrigin({
      model: pathModel,
      layoutModel,
      target,
      frame: frameOf(pathModel, layoutModel),
    })!;

    for (const deltaX of [5, 140, 195]) {
      const next = moveEditorTargetByScreenDelta({
        layoutModel,
        camera: CAMERA,
        origin,
        deltaX,
        deltaY: 0,
        objectSnap: OBJECT_SNAP,
      });
      const { guideX } = resolveMoveEditorObjectSnapGuides({
        camera: CAMERA,
        origin,
        deltaX,
        deltaY: 0,
        objectSnap: OBJECT_SNAP,
      });
      if (guideX === undefined) continue;

      const rect = frameOf(pathModel, next).pipeline.graphLayout.pathsById.p1.rect!;
      const edges = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
      expect(edges.some((edge) => Math.abs(edge - guideX) < 0.01)).toBe(true);
    }
  });
});

describe("cell snap uses the world grid for nested zones", () => {
  it("centers a child on a world cell center", () => {
    const model = modelOf([
      zone("C", { zoneType: "container", childZoneIds: ["K"] }),
      zone("K", { parentZoneId: "C" }),
    ]);
    const layoutModel = layoutOf({
      C: { x: 130, y: 70, width: 600, height: 400 },
      K: { x: 50, y: 50, width: 100, height: 60 },
    });
    const cells = { enabled: true, columns: [256, 80], rows: [256, 80] };

    const next = snapZonesToCells({ model, layoutModel, zoneIds: ["K"], cells });
    const k = next.zoneLayoutsById.K;

    // Cell centers (cell 256 + gutter 80): 128, 464, 800, …
    expect(130 + k.x + 50).toBe(128);
    expect(70 + k.y + 30).toBe(128);
  });
});

describe("exit to an ancestor ignores the ancestor's own inputDisabled", () => {
  const model = modelOf([
    zone("C", {
      zoneType: "container",
      childZoneIds: ["K"],
      inputDisabled: true,
    }),
    zone("K", {
      parentZoneId: "C",
      pathIds: ["p1"],
      pathsById: {
        p1: { id: "p1", key: "p1", name: "p1", target: null, rule: null },
      },
    }),
  ]);
  const layoutModel = layoutOf({
    C: { x: 0, y: 0, width: 600, height: 300 },
    K: { x: 40, y: 40, width: 160, height: 80 },
  });
  const frame = frameOf(model, layoutModel);

  it("hover, create and retarget agree", () => {
    const outlet = resolveZoneAnchorScreenRect({
      frame,
      camera: CAMERA,
      zoneId: "C",
      kind: "outlet",
    })!;
    const point = {
      x: outlet.x + outlet.width / 2,
      y: outlet.y + outlet.height / 2,
    };

    const hovered = resolveInputAnchorTargetZoneId({
      model,
      frame,
      camera: CAMERA,
      point,
      sourceZoneId: "K",
    });
    expect(hovered).toBe("C");

    const created = createPathFromOutputAnchorDrag({
      model,
      layoutModel,
      frame,
      sourceZoneId: "K",
      dropWorldPoint: point,
      targetZoneId: hovered,
    });
    expect(created).toBeDefined();

    const retargeted = retargetPathFromOutputAnchorDrag({
      model,
      sourceZoneId: "K",
      pathId: "p1",
      targetZoneId: "C",
    });
    expect(retargeted?.zonesById.K.pathsById.p1.target?.zoneId).toBe("C");
  });
});

describe("allowReparent: false keeps the drop where it can land", () => {
  // Root zone R hovers over slot container D (lane "a" with a snap point).
  const model = modelOf([
    zone("D", {
      zoneType: "container",
      slots: [{ key: "a" }],
    }),
    zone("R"),
  ]);
  let layoutModel = layoutOf({
    D: { x: 0, y: 0, width: 600, height: 300 },
    R: { x: 30, y: 100, width: 80, height: 60 },
  });
  layoutModel = updateZoneLayout(layoutModel, "D", {
    slotLayoutsByKey: { a: { width: 200, snapPoints: [{ x: 100, y: 150 }] } },
  });

  it("reports the current parent and slot to canDropZone", () => {
    expect(
      resolveZoneDropPlacement({ model, layoutModel, zoneId: "R" })
        ?.targetParentZoneId
    ).toBe("D");
    expect(
      resolveZoneDropPlacement({
        model,
        layoutModel,
        zoneId: "R",
        allowReparent: false,
      })
    ).toMatchObject({ targetParentZoneId: null, slotKey: null });
  });

  it("does not snap into a lane of a parent it cannot join", () => {
    const snapped = snapZonesToSlotPoints({ model, layoutModel, zoneIds: ["R"] });
    const held = snapZonesToSlotPoints({
      model,
      layoutModel,
      zoneIds: ["R"],
      allowReparent: false,
    });

    expect(snapped.zoneLayoutsById.R.x).not.toBe(30);
    expect(held.zoneLayoutsById.R).toEqual(layoutModel.zoneLayoutsById.R);
  });
});
