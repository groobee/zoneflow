import type { CSSProperties, ComponentType, ReactNode } from "react";
import { Fragment } from "react";
import { createPortal } from "react-dom";
import type {
  PathComponentMount,
  PathComponentSlotName,
  RenderMountRegistry,
  ZoneComponentMount,
  ZoneComponentSlotName,
} from "@zoneflow/renderer-dom";

export type ZoneSlotComponentProps = {
  mount: ZoneComponentMount;
};

export type PathSlotComponentProps = {
  mount: PathComponentMount;
};

export type ZoneSlotComponent = ComponentType<ZoneSlotComponentProps>;
export type PathSlotComponent = ComponentType<PathSlotComponentProps>;

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
}) {
  const {
    mounts,
    zoneComponents,
    pathComponents,
  } = props;

  return (
    <>
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
