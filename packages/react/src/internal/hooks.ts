import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  resolveEditorLocale,
  type ZoneflowEditorLocale,
} from "../editor/strings.js";

/**
 * `useLayoutEffect` in the browser, `useEffect` during SSR — React 18 warns
 * when a layout effect is scheduled on the server (React 19 no longer does).
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A ref that always holds the latest committed `value`. Event handlers and
 * effects read callbacks through it, so a consumer passing a fresh inline
 * function does not re-subscribe listeners or re-run a full redraw.
 *
 * Synced in a layout effect: a passive effect can run after the next input
 * event and overwrite a value that handler already advanced. Works on React
 * 18 and 19 alike (unlike `useEffectEvent`, which needs React 19.2+).
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Returns the earlier value while `value` stays JSON-equal to it, so an inline
 * literal prop (`grid={{ enabled: true }}`) is not a change on every parent
 * render — each change there is a full canvas redraw. Plain-data props only.
 */
export function useJsonStable<T>(value: T): T {
  const key = value === undefined ? "" : JSON.stringify(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => value, [key]);
}

const subscribeNever = () => () => {};
const getServerEditorLocale = (): ZoneflowEditorLocale => "en";

/**
 * Browser locale for the built-in editor strings. Server rendering and
 * hydration use "en" so SSR markup matches the first client render; the
 * browser locale applies right after (no hydration mismatch in Next.js).
 */
export function useEditorLocale(): ZoneflowEditorLocale {
  return useSyncExternalStore(
    subscribeNever,
    resolveEditorLocale,
    getServerEditorLocale
  );
}
