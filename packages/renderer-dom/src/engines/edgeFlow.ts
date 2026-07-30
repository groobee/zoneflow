import type { EdgeVisual, PathVisibility } from "../types.js";
import type { ZoneflowTheme } from "../theme.js";

export type EdgeFlowMotion = {
  durationMs: number;
  segmentLength: number;
  gapLength: number;
  dashArray: string;
  dashOffset: string;
};

function sanitizeNumber(value: number, fallback: number, min: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

export function resolveEdgeFlowMotion(theme: ZoneflowTheme): EdgeFlowMotion {
  const durationMs = sanitizeNumber(theme.edgeFlow.durationMs, 1320, 60);
  const segmentLength = sanitizeNumber(theme.edgeFlow.segmentLength, 18, 1);
  const gapLength = sanitizeNumber(theme.edgeFlow.gapLength, 28, 1);
  const cycleLength = segmentLength + gapLength;

  return {
    durationMs,
    segmentLength,
    gapLength,
    dashArray: `${segmentLength} ${gapLength}`,
    dashOffset: String(cycleLength),
  };
}

/**
 * Inject the shared blink animation used by pulse-decorated elements (diff
 * previews etc.). The keyframes only define the 50% stop, so each element
 * pulses from its own current opacity — ghosted zones dip from 0.45, full
 * elements from 1. The <style> lives inside the edge SVG but CSS rules are
 * document-global, so the same class works on the DOM zone/path layers too.
 */
export function appendPulseStyle(params: {
  svg: SVGSVGElement;
  animationName: string;
  className: string;
}) {
  const { svg, animationName, className } = params;
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
@keyframes ${animationName} {
  50% { opacity: 0.12; }
}
.${className} {
  animation: ${animationName} 1100ms ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .${className} {
    animation: none;
  }
}
  `;
  svg.appendChild(style);
}

export function appendEdgeFlowStyle(params: {
  svg: SVGSVGElement;
  animationName: string;
  className: string;
  motion: EdgeFlowMotion;
}) {
  const { svg, animationName, className, motion } = params;
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
@keyframes ${animationName} {
  from { stroke-dashoffset: ${motion.dashOffset}; }
  to { stroke-dashoffset: 0; }
}
.${className} {
  animation: ${animationName} ${motion.durationMs}ms linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .${className} {
    animation: none;
  }
}
  `;
  svg.appendChild(style);
}

export type DrawableEdgeSegment = {
  edge: EdgeVisual;
  collapsed: boolean;
};

export function resolveDrawableEdgeSegments(params: {
  pathId: string;
  edges: EdgeVisual[];
  visibility?: PathVisibility;
}): DrawableEdgeSegment[] {
  const { pathId, edges, visibility } = params;

  if (edges.length === 0) return [];

  if (visibility?.shouldRenderNode !== false) {
    return edges.map((edge) => ({
      edge,
      collapsed: false,
    }));
  }

  const first = edges[0];
  const last = edges[edges.length - 1];

  return [
    {
      edge: {
        ...first,
        id: `${pathId}:collapsed`,
        source: first.source,
        target: last.target,
      },
      collapsed: true,
    },
  ];
}

export function resolveCollapsedEdgeStroke(theme: ZoneflowTheme) {
  return `color-mix(in srgb, ${theme.pathEdge} 52%, ${theme.pathInboundEdge} 48%)`;
}
