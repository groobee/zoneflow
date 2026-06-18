import type { SelectionCommandKey } from "./strings";

/**
 * Standard 14×14 line/bar glyphs for the selection toolbar commands. Inline
 * SVG (no icon-font dependency); everything is `currentColor` so each icon
 * inherits the button's text color, including the disabled tone. Decorative —
 * the button carries the accessible name via `aria-label`/`title`.
 */
export function SelectionCommandIcon(props: { command: SelectionCommandKey }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {renderGlyph(props.command)}
    </svg>
  );
}

const EDGE = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
};
const CHEVRON = {
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function bar(x: number, y: number, width: number, height: number) {
  return <rect x={x} y={y} width={width} height={height} rx={1} fill="currentColor" />;
}

function renderGlyph(command: SelectionCommandKey) {
  switch (command) {
    case "align-left":
      return (
        <>
          <line x1={2} y1={2} x2={2} y2={12} {...EDGE} />
          {bar(3.6, 3.4, 8.4, 2.4)}
          {bar(3.6, 8.2, 5, 2.4)}
        </>
      );
    case "align-right":
      return (
        <>
          <line x1={12} y1={2} x2={12} y2={12} {...EDGE} />
          {bar(2, 3.4, 8.4, 2.4)}
          {bar(5.4, 8.2, 5, 2.4)}
        </>
      );
    case "align-top":
      return (
        <>
          <line x1={2} y1={2} x2={12} y2={2} {...EDGE} />
          {bar(3.4, 3.6, 2.4, 8.4)}
          {bar(8.2, 3.6, 2.4, 5)}
        </>
      );
    case "align-bottom":
      return (
        <>
          <line x1={2} y1={12} x2={12} y2={12} {...EDGE} />
          {bar(3.4, 2, 2.4, 8.4)}
          {bar(8.2, 5.4, 2.4, 5)}
        </>
      );
    case "align-center-horizontal":
      return (
        <>
          <line x1={7} y1={2} x2={7} y2={12} {...EDGE} strokeWidth={1.1} opacity={0.6} />
          {bar(2.8, 3.4, 8.4, 2.4)}
          {bar(4.5, 8.2, 5, 2.4)}
        </>
      );
    case "align-center-vertical":
      return (
        <>
          <line x1={2} y1={7} x2={12} y2={7} {...EDGE} strokeWidth={1.1} opacity={0.6} />
          {bar(3.4, 2.8, 2.4, 8.4)}
          {bar(8.2, 4.5, 2.4, 5)}
        </>
      );
    case "distribute-horizontal":
      return (
        <>
          {bar(2, 2.5, 1.8, 9)}
          {bar(6.1, 2.5, 1.8, 9)}
          {bar(10.2, 2.5, 1.8, 9)}
        </>
      );
    case "distribute-vertical":
      return (
        <>
          {bar(2.5, 2, 9, 1.8)}
          {bar(2.5, 6.1, 9, 1.8)}
          {bar(2.5, 10.2, 9, 1.8)}
        </>
      );
    // z-order: a moving block + chevron(s); up = forward/front, down = back,
    // double = all the way (to-front / to-back).
    case "bring-to-front":
      return (
        <>
          <rect x={2} y={4.5} width={5.5} height={5.5} rx={1.2} fill="currentColor" />
          <polyline points="9,6 10.6,4.4 12,6" {...CHEVRON} />
          <polyline points="9,9 10.6,7.4 12,9" {...CHEVRON} />
        </>
      );
    case "bring-forward":
      return (
        <>
          <rect x={2} y={4.5} width={5.5} height={5.5} rx={1.2} fill="currentColor" />
          <polyline points="9,7.8 10.6,6.2 12,7.8" {...CHEVRON} />
        </>
      );
    case "send-backward":
      return (
        <>
          <rect x={2} y={4.5} width={5.5} height={5.5} rx={1.2} fill="currentColor" />
          <polyline points="9,6.2 10.6,7.8 12,6.2" {...CHEVRON} />
        </>
      );
    case "send-to-back":
      return (
        <>
          <rect x={2} y={4.5} width={5.5} height={5.5} rx={1.2} fill="currentColor" />
          <polyline points="9,5 10.6,6.6 12,5" {...CHEVRON} />
          <polyline points="9,8 10.6,9.6 12,8" {...CHEVRON} />
        </>
      );
    default:
      return null;
  }
}
