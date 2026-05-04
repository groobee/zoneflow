import React, { useEffect, useMemo, useRef } from "react";
import { updatePath } from "@zoneflow/core";
import {
  createZoneFromDropTemplate,
  UniverseEditorCanvas,
  type CanConnectPath,
  type CanvasExternalDropPayload,
  type UniverseEditorController,
} from "@zoneflow/react";
import type { DebugState } from "../../hooks/useDebugState";
import { readPaletteZoneDragData } from "../../palette/zonePalette";
import { canvasHostStyle } from "./layout.styles";
import { getThemePresetComponents } from "../renderers/presetComponents";
import {
  customZoneComponents,
  customZoneLayoutEngine,
} from "../renderers/customSlots";
import {
  makeWeatherBackground,
  type WeatherBackgroundId,
} from "../renderers/customBackground";
import {
  PlaygroundZoneEditButton,
  PlaygroundZoneEditor,
} from "../editor/PlaygroundZoneEditor";
import { PlaygroundPathEditor } from "../editor/PlaygroundPathEditor";
import type { PlaygroundThemePreset } from "../../theme/playgroundThemes";

type Props = {
  editor: UniverseEditorController;
  debug: DebugState;
  onResize: (size: { width: number; height: number }) => void;
  overlayHudVisible: boolean;
  themePreset: PlaygroundThemePreset;
  weatherBackgroundId: WeatherBackgroundId;
  canConnectPath?: CanConnectPath;
};

export function CanvasHost({
  editor,
  debug,
  onResize,
  overlayHudVisible,
  themePreset,
  weatherBackgroundId,
  canConnectPath,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { zoneComponents, pathComponents } = useMemo(() => {
    const preset = getThemePresetComponents(themePreset.id);
    return {
      zoneComponents: { ...preset.zoneComponents, ...customZoneComponents },
      pathComponents: preset.pathComponents,
    };
  }, [themePreset.id]);
  const Background = useMemo(
    () => makeWeatherBackground(weatherBackgroundId),
    [weatherBackgroundId]
  );

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;

      onResize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [onResize]);

  const handlePaletteZoneDrop = (event: CanvasExternalDropPayload) => {
    const template = readPaletteZoneDragData(event.dataTransfer);
    if (!template) return;

    const next = createZoneFromDropTemplate({
      model: editor.model,
      layoutModel: editor.layoutModel,
      worldPoint: event.worldPoint,
      gridSnapEnabled: editor.gridSnapEnabled,
      gridSnapSize: editor.gridSnapSize,
      template: {
        name: template.label,
        zoneType: template.zoneType,
        width: template.width,
        height: template.height,
        action: template.action,
        inputDisabled: template.inputDisabled,
        outputDisabled: template.outputDisabled,
        meta: template.meta,
      },
    });

    editor.updateDraftModel(next.model);
    editor.updateDraftLayoutModel(next.layoutModel);
  };

  const handlePathCreated = (params: {
    pathId: string;
    sourceZoneId: string;
    targetZoneId: string | null;
    model: typeof editor.model;
    layoutModel: typeof editor.layoutModel;
  }) => {
    const allowedRules = ["allow", "deny", "match", "fallback"];
    const ruleType = window.prompt(
      `새 패스 옵션 선택 (${allowedRules.join(" / ")}, 빈 값=옵션 없음)`,
      "allow"
    );
    if (ruleType === null) return;

    const trimmed = ruleType.trim();
    const nextRule = trimmed ? { type: trimmed } : null;

    return {
      model: updatePath(
        params.model,
        params.sourceZoneId,
        params.pathId,
        {
          name: trimmed,
          rule: nextRule,
        }
      ),
    };
  };

  const handlePathDropOnEmptySpace = (params: {
    worldPoint: { x: number; y: number };
    model: typeof editor.model;
    layoutModel: typeof editor.layoutModel;
  }) => {
    const name = window.prompt("새 zone 이름을 입력하세요", "New Zone");
    if (!name) return null;

    const next = createZoneFromDropTemplate({
      model: params.model,
      layoutModel: params.layoutModel,
      worldPoint: params.worldPoint,
      gridSnapEnabled: editor.gridSnapEnabled,
      gridSnapSize: editor.gridSnapSize,
      template: {
        name,
        zoneType: "container",
        width: 220,
        height: 140,
      },
    });

    return {
      model: next.model,
      layoutModel: next.layoutModel,
      targetZoneId: next.zoneId,
    };
  };

  return (
    <main ref={ref} style={canvasHostStyle}>
      <UniverseEditorCanvas
        editor={editor}
        theme={themePreset.rendererTheme}
        viewport={debug.viewport}
        componentLayoutEngine={customZoneLayoutEngine}
        background={Background}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        editorConfig={{
          theme: themePreset.editorTheme,
          overlayControls: {
            enabled: overlayHudVisible,
          },
          externalDrop: {
            enabled: true,
            onDrop: handlePaletteZoneDrop,
          },
          onPathCreated: handlePathCreated,
          onPathDropOnEmptySpace: handlePathDropOnEmptySpace,
          deleteInteraction: {
            animation: true,
            confirm: true,
          },
          canConnectPath,
          renderZoneEditButton: (props) => (
            <PlaygroundZoneEditButton {...props} />
          ),
          renderZoneEditor: (props) =>
            props.onModelChange ? (
              <PlaygroundZoneEditor
                model={props.model}
                zoneId={props.zoneId}
                onModelChange={props.onModelChange}
                onClose={props.closeEditor}
              />
            ) : null,
          renderPathEditor: (props) =>
            props.onModelChange ? (
              <PlaygroundPathEditor
                model={props.model}
                pathId={props.pathId}
                sourceZoneId={props.sourceZoneId}
                onModelChange={props.onModelChange}
                onClose={props.closeEditor}
              />
            ) : null,
        }}
        debug={{
          enabled: debug.enabled,
          layers: debug.layers,
        }}
      />
    </main>
  );
}
