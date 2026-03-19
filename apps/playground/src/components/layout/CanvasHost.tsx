import React from "react";
import { UniverseCanvas } from "@zoneflow/react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import type { DebugLayer } from "../../hooks/useDebugState";
import { canvasHostStyle } from "./layout.styles";

type Props = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  debugEnabled: boolean;
  debugLayers: DebugLayer[];
};

/**
 * UniverseCanvas는 renderer core의 React wrapper입니다.
 *
 * 내부적으로:
 * - render pipeline 실행
 * - camera 상태 적용
 * - DOM 기반 렌더링 수행
 */
export function CanvasHost({
                             model,
                             layoutModel,
                             debugEnabled,
                             debugLayers,
                           }: Props) {
  return (
    <main style={canvasHostStyle}>
      <UniverseCanvas
        model={model}
        layoutModel={layoutModel}
        debug={{
          enabled: debugEnabled,
          layers: debugLayers,
        }}
      />
    </main>
  );
}