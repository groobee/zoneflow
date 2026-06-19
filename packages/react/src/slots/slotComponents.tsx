import type { CSSProperties, ComponentType, ReactNode } from "react";
import { Fragment } from "react";
import { createPortal } from "react-dom";
import type { Path, Zone } from "@zoneflow/core";
import type {
  BackgroundMount,
  PathComponentMount,
  PathComponentSlotName,
  PathOverlayMount,
  PathRendererMount,
  PathResolveContext,
  RenderMountRegistry,
  ZoneComponentMount,
  ZoneComponentSlotName,
  ZoneOverlayMount,
  ZoneRendererMount,
  ZoneResolveContext,
} from "@zoneflow/renderer-dom";

export type ZoneSlotComponentProps = {
  mount: ZoneComponentMount;
};

export type ZoneRenderComponentProps = {
  mount: ZoneRendererMount;
};

export type ZoneRenderComponent = ComponentType<ZoneRenderComponentProps>;

/**
 * Resolver picking a full-zone React component for the current density level
 * (or any per-zone condition). Return `undefined`/`null` for the default card.
 * Mirrors the renderer-dom `ResolveZoneRenderer` but in React-component form.
 */
export type ResolveZoneRenderComponent = (
  zone: Zone,
  context: ZoneResolveContext
) => ZoneRenderComponent | null | undefined;

export type ZoneOverlayComponentProps = {
  mount: ZoneOverlayMount;
};

export type ZoneOverlayComponent = ComponentType<ZoneOverlayComponentProps>;

/**
 * 존 본문 위에 덮어 그릴 오버레이(배지·장식 등) React 컴포넌트를 고른다. 본문을
 * 교체하지 않고 위에 얹으며, 뷰/편집 양쪽 모드에서 렌더된다. 안 그릴 땐
 * `undefined`/`null`. (편집 모드 전용인 에디터의 `renderZoneOverlays` 와 달리
 * 렌더 레벨이라 항상 동작한다.)
 */
export type ResolveZoneOverlayComponent = (
  zone: Zone,
  context: ZoneResolveContext
) => ZoneOverlayComponent | null | undefined;

export type PathSlotComponentProps = {
  mount: PathComponentMount;
};

export type PathRenderComponentProps = {
  mount: PathRendererMount;
};

export type PathRenderComponent = ComponentType<PathRenderComponentProps>;

/**
 * Resolver picking a full-node path React component for the current visual mode
 * (or any per-path condition). Return `undefined`/`null` for the default chip.
 * The path-side equivalent of {@link ResolveZoneRenderComponent}.
 */
export type ResolvePathRenderComponent = (
  path: Path,
  context: PathResolveContext
) => PathRenderComponent | null | undefined;

export type PathOverlayComponentProps = {
  mount: PathOverlayMount;
};

export type PathOverlayComponent = ComponentType<PathOverlayComponentProps>;

/**
 * 패스 노드 위에 덮어 그릴 오버레이(배지·장식 등) React 컴포넌트를 고른다. 본문을
 * 교체하지 않고 위에 얹으며, 뷰/편집 양쪽 모드에서 렌더된다. 안 그릴 땐
 * `undefined`/`null`. 존의 {@link ResolveZoneOverlayComponent} 와 대칭이며,
 * 본문을 교체하는 {@link ResolvePathRenderComponent} 와 대비된다.
 */
export type ResolvePathOverlayComponent = (
  path: Path,
  context: PathResolveContext
) => PathOverlayComponent | null | undefined;

export type BackgroundComponentProps = {
  mount: BackgroundMount;
};

export type ZoneSlotComponent = ComponentType<ZoneSlotComponentProps>;
export type PathSlotComponent = ComponentType<PathSlotComponentProps>;
export type BackgroundComponent = ComponentType<BackgroundComponentProps>;

export type ZoneSlotComponentMap = Partial<
  Record<ZoneComponentSlotName, ZoneSlotComponent>
>;

export type PathSlotComponentMap = Partial<
  Record<PathComponentSlotName, PathSlotComponent>
>;

type SurfaceProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const baseSurfaceStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
};

export function Zoned({ children, className, style }: SurfaceProps) {
  return (
    <div className={className} style={{ ...baseSurfaceStyle, ...style }}>
      {children}
    </div>
  );
}

export function Pathed({ children, className, style }: SurfaceProps) {
  return (
    <div className={className} style={{ ...baseSurfaceStyle, ...style }}>
      {children}
    </div>
  );
}

export function SlotPortals(props: {
  mounts: RenderMountRegistry;
  zoneComponents?: ZoneSlotComponentMap;
  pathComponents?: PathSlotComponentMap;
  background?: BackgroundComponent;
  renderZone?: ResolveZoneRenderComponent;
  renderZoneOverlay?: ResolveZoneOverlayComponent;
  renderPath?: ResolvePathRenderComponent;
  renderPathOverlay?: ResolvePathOverlayComponent;
}) {
  const {
    mounts,
    zoneComponents,
    pathComponents,
    background: BackgroundComponent,
    renderZone,
    renderZoneOverlay,
    renderPath,
    renderPathOverlay,
  } = props;

  return (
    <>
      {BackgroundComponent && mounts.background ? (
        <Fragment key="background">
          {createPortal(
            <BackgroundComponent mount={mounts.background} />,
            mounts.background.host
          )}
        </Fragment>
      ) : null}

      {mounts.zoneRenderers.map((mount: ZoneRendererMount) => {
        const Component = renderZone?.(mount.context.zone, {
          density: mount.context.density,
        });
        if (!Component) return null;

        return (
          <Fragment key={mount.key}>
            {createPortal(<Component mount={mount} />, mount.host)}
          </Fragment>
        );
      })}

      {mounts.zoneOverlays.map((mount: ZoneOverlayMount) => {
        const Component = renderZoneOverlay?.(mount.context.zone, {
          density: mount.context.density,
        });
        if (!Component) return null;

        return (
          <Fragment key={mount.key}>
            {createPortal(<Component mount={mount} />, mount.host)}
          </Fragment>
        );
      })}

      {mounts.pathRenderers.map((mount: PathRendererMount) => {
        const Component = renderPath?.(mount.context.path, {
          mode: mount.context.mode,
        });
        if (!Component) return null;

        return (
          <Fragment key={mount.key}>
            {createPortal(<Component mount={mount} />, mount.host)}
          </Fragment>
        );
      })}

      {mounts.pathOverlays.map((mount: PathOverlayMount) => {
        const Component = renderPathOverlay?.(mount.context.path, {
          mode: mount.context.mode,
        });
        if (!Component) return null;

        return (
          <Fragment key={mount.key}>
            {createPortal(<Component mount={mount} />, mount.host)}
          </Fragment>
        );
      })}

      {mounts.zones.map((mount: ZoneComponentMount) => {
        const Component = zoneComponents?.[mount.slot];
        if (!Component) return null;

        return (
          <Fragment key={mount.key}>
            {createPortal(<Component mount={mount} />, mount.host)}
          </Fragment>
        );
      })}

      {mounts.paths.map((mount: PathComponentMount) => {
        const Component = pathComponents?.[mount.slot];
        if (!Component) return null;

        return (
          <Fragment key={mount.key}>
            {createPortal(<Component mount={mount} />, mount.host)}
          </Fragment>
        );
      })}
    </>
  );
}
