import type { CSSProperties, ComponentType, ReactNode } from "react";
import { Fragment } from "react";
import { createPortal } from "react-dom";
import type { Zone } from "@zoneflow/core";
import type {
  BackgroundMount,
  PathComponentMount,
  PathComponentSlotName,
  RenderMountRegistry,
  ZoneComponentMount,
  ZoneComponentSlotName,
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

export type PathSlotComponentProps = {
  mount: PathComponentMount;
};

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
}) {
  const {
    mounts,
    zoneComponents,
    pathComponents,
    background: BackgroundComponent,
    renderZone,
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
