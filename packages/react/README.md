# @zoneflow/react

> **ℹ️ AI 생성 안내**<br>
> 이 라이브러리의 코드와 문서는 상당 부분 AI(Anthropic Claude)의 도움으로 작성되었습니다.

`@zoneflow/react`는 Zoneflow의 React 렌더러/에디터 패키지입니다.

이 패키지는 다음 기능을 제공합니다.

- `UniverseCanvas`
- `UniverseEditorCanvas`
- `useUniverseEditor`
- 기본 editor toolbar
- zone/path slot component 주입

일반적인 React 앱에서는 `@zoneflow/core`와 `@zoneflow/react`만 설치하면 시작할 수 있습니다.

## 설치

```bash
pnpm add @zoneflow/core @zoneflow/react react react-dom
```

## 최소 예제

```tsx
import { useMemo, useState } from "react";
import {
  createUniverseId,
  createUniverseLayoutModel,
  type UniverseModel,
} from "@zoneflow/core";
import {
  DefaultEditorToolbar,
  Pathed,
  UniverseEditorCanvas,
  Zoned,
  useUniverseEditor,
  type PathSlotComponentMap,
  type ZoneSlotComponentMap,
} from "@zoneflow/react";

function createEmptyUniverse(): {
  model: UniverseModel;
  layoutModel: ReturnType<typeof createUniverseLayoutModel>;
} {
  const universeId = createUniverseId();

  return {
    model: {
      version: "1.0.0",
      universeId,
      rootZoneIds: [],
      zonesById: {},
    },
    layoutModel: createUniverseLayoutModel({
      universeId,
      version: "1.0.0",
    }),
  };
}

export function ZoneflowScreen() {
  const initial = useMemo(() => createEmptyUniverse(), []);
  const [model, setModel] = useState(initial.model);
  const [layoutModel, setLayoutModel] = useState(initial.layoutModel);

  const editor = useUniverseEditor({
    model,
    layoutModel,
    setModel,
    setLayoutModel,
  });

  const zoneComponents: ZoneSlotComponentMap = {
    title: ({ mount }) => (
      <Zoned style={{ padding: "8px 12px", fontWeight: 700 }}>
        {mount.context.zone.name}
      </Zoned>
    ),
  };

  const pathComponents: PathSlotComponentMap = {
    label: ({ mount }) => (
      <Pathed
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          fontSize: 12,
          // resolvePathColor 가 준 per-path 색 (없으면 상속색)
          color: mount.context.pathColor,
        }}
      >
        {mount.context.path.name || "Empty"}
      </Pathed>
    ),
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100vh" }}>
      <DefaultEditorToolbar editor={editor} />

      <UniverseEditorCanvas
        editor={editor}
        zoneComponents={zoneComponents}
        pathComponents={pathComponents}
        editorConfig={{
          overlayControls: {
            enabled: true,
          },
        }}
      />
    </div>
  );
}
```

## 핵심 API

### `useUniverseEditor(...)`

원본 `model`, `layoutModel`을 받아 draft 편집 세션을 관리합니다.

- 편집 시작 시 복사본 생성
- draft 위에서 undo/redo
- `applyEdit()` 시 원본 반영
- `cancelEdit()` 시 draft 폐기

### `UniverseEditorCanvas`

렌더러와 editor overlay를 함께 제공합니다.

주요 prop:

- `editor`
- `zoneComponents`
- `pathComponents`
- `editorConfig`

### `zoneComponents`, `pathComponents`

존/패스 내부 렌더링은 slot component로 주입합니다.

> React slot component(`zoneComponents` / `pathComponents`)를 주면 해당 슬롯의 저수준 DOM 렌더러(`zoneComponentRenderers` / `pathComponentRenderers`)와 내장 기본 렌더러를 **덮어씁니다.** 즉 그 슬롯의 모양·색은 전적으로 주입한 컴포넌트가 결정합니다.

기본 zone slot:

- `title`
- `type`
- `badge`
- `body`
- `footer`

path slot:

- `label`
- `rule`
- `target`
- `body`

기본 5종 외에 임의의 zone slot (코멘트 버튼, 전환수 카드 등) 을 추가하려면 **확장형 layout engine** 을 주입합니다. 자세한 사용은 root README 의 "슬롯 확장" 섹션을 참조하세요.

```tsx
import {
  createExtensibleComponentLayoutEngine,
  type ExtensibleZoneSlot,
} from "@zoneflow/renderer-dom";

const layoutEngine = createExtensibleComponentLayoutEngine({
  extraSlots: [
    { name: "comment", placement: { kind: "top", height: 22 } },
    { name: "convStats", placement: { kind: "bottom", height: 26 } },
  ],
});

<UniverseEditorCanvas
  editor={editor}
  componentLayoutEngine={layoutEngine}
  zoneComponents={{ title, badge, body, comment, convStats }}
/>
```

빈 config 로 호출하면 default 와 동일한 출력이라 호환성 100%.

### 개별 색상 / 모양 (per-instance color & shape)

zone/path 마다 다른 색·모양은 canvas 의 resolver prop 으로 줍니다. 모두 순수 표현 계층 hook 이라 모델 구조·연결·히트테스트에는 영향이 없습니다.

| prop | 시그니처 | 효과 |
|---|---|---|
| `resolveZoneColor` | `(zone) => string \| null \| undefined` | zone 의 테두리/accent/anchor 색을 덮어씀(DOM 도형). 슬롯엔 `mount.context.zoneColor` 로 노출 |
| `resolvePathColor` | `(path) => string \| null \| undefined` | path 의 per-instance 색. 내장 label 폴백이 사용하고, 슬롯엔 `mount.context.pathColor` 로 노출 |
| `resolveZoneShape` | `(zone) => ZoneShape \| null \| undefined` | zone 도형(`"rect" \| "pill" \| "circle" \| "diamond" \| "hexagon"` 또는 커스텀 clip) |

`null` / `undefined` 를 반환하면 테마 기본값으로 폴백합니다. 보통 `meta` 에서 값을 읽도록 배선합니다.

```tsx
import type { ZoneShape } from "@zoneflow/renderer-dom";

<UniverseEditorCanvas
  editor={editor}
  resolveZoneColor={(zone) => zone.meta?.color as string | undefined}
  resolvePathColor={(path) => path.meta?.color as string | undefined}
  resolveZoneShape={(zone) => zone.meta?.shape as ZoneShape | undefined}
  zoneComponents={zoneComponents}
  pathComponents={pathComponents}
/>
```

> **중요:** React slot component 를 직접 주는 경우(대부분), 그 슬롯의 텍스트 색은 슬롯이 결정합니다. resolver 색이 라벨에 반영되게 하려면 슬롯에서 `mount.context.pathColor` / `mount.context.zoneColor` 를 읽으세요. (이 레포의 예제 슬롯은 이미 그렇게 동작합니다.)

```tsx
const pathComponents: PathSlotComponentMap = {
  label: ({ mount }) => (
    <Pathed
      style={{ color: mount.context.pathColor ?? mount.context.theme.pathLabel }}
    >
      {mount.context.path.name || "Empty"}
    </Pathed>
  ),
};
```

zone 은 `resolveZoneColor` 가 도형(테두리/accent)을 자동으로 칠합니다. 타이틀 텍스트까지 같은 색으로 맞추고 싶을 때만 슬롯에서 `mount.context.zoneColor` 를 읽으면 됩니다(대비 유지를 위해 기본 타이틀은 테마색).

### `background` / `backgroundRenderer`

캔버스 전체에 월드 좌표계 배경 (지도, blueprint 패턴, 이미지 등) 을 깔 수 있습니다. 카메라 pan/zoom 에 같이 따라가며, 레이어 순서는 `background → grid → zones`.

```tsx
function MapBackground({ mount }: BackgroundComponentProps) {
  const { sceneBounds } = mount.context;
  return (
    <div
      style={{
        position: "absolute",
        width: sceneBounds.width,
        height: sceneBounds.height,
        backgroundImage: "url('/my-map.png')",
      }}
    />
  );
}

<UniverseEditorCanvas editor={editor} background={MapBackground} />
```

DOM 직접 렌더링은 `backgroundRenderer={(host, ctx) => {...}}`. 배경 host 는 자동으로 `pointer-events: none` 이라 클릭 방해 없음.

## 편집기 주입 포인트

실서비스 폼은 외부에서 주입하면 됩니다.

- `renderZoneEditButton`
- `renderZoneEditor`
- `renderPathEditor`
- `onPathLabelDoubleClick`
- `onPathLabelContextMenu`
- `canConnectPath` — zone 간 path 연결 검증
- `onPathCreated` — zone outlet 에서 새 path 가 만들어진 직후 호출, rule/name 등 옵션을 즉석 설정 (생성 + 옵션 적용이 단일 commit)
- `onPathDropOnEmptySpace` — 기존 path 의 output anchor 를 빈 공간에 드롭했을 때 새 zone 을 만들고 자동 연결 (zone outlet 에서 새 path 를 만드는 흐름은 해당 없음)

예:

```tsx
<UniverseEditorCanvas
  editor={editor}
  zoneComponents={zoneComponents}
  pathComponents={pathComponents}
  editorConfig={{
    renderZoneEditor: ({ zone, onModelChange, closeEditor }) =>
      onModelChange ? (
        <MyZoneEditor
          zone={zone}
          onClose={closeEditor}
          onSave={(nextModel) => {
            onModelChange(nextModel);
            closeEditor();
          }}
        />
      ) : null,
  }}
/>
```

## 테마 주입

렌더러와 editor overlay는 각각 다른 계층으로 테마를 받을 수 있습니다.

```tsx
<DefaultEditorToolbar
  editor={editor}
  theme={{
    hud: {
      panelBackground: "rgba(9, 15, 28, 0.92)",
      buttonActiveBackground: "#0f766e",
      buttonActiveBorder: "1px solid rgba(45, 212, 191, 0.42)",
    },
  }}
/>

<UniverseEditorCanvas
  editor={editor}
  theme={{
    zoneContainerBorder: "#334155",
    zoneActionBorder: "#0f766e",
    pathEdge: "#475569",
    pathInboundEdge: "#0f766e",
    surface: {
      chrome: {
        accentFade: "rgba(226, 232, 240, 0.08)",
      },
      zone: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,253,250,0.98) 100%)",
      },
      path: {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
      },
    },
  }}
  editorConfig={{
    theme: {
      overlay: {
        helpPanel: {
          background: "rgba(6, 12, 24, 0.9)",
        },
        connectTarget: {
          badgeBackground: "#0f766e",
        },
        dropTarget: {
          badgeBackground: "#2563eb",
        },
      },
    },
  }}
/>
```

- `theme`
  - renderer/viewer 카드, 앵커, 선, 상태 배지 테마
- `editorConfig.theme`
  - editor overlay, HUD, preview, 선택 하이라이트 테마
- `DefaultEditorToolbar.theme`
  - 기본 toolbar 테마

## 파일 저장 / 불러오기

문서 저장과 불러오기는 `@zoneflow/core`의 문서 API를 사용하는 것이 맞습니다.

```ts
import {
  parseZoneflowDocument,
  serializeZoneflowDocument,
} from "@zoneflow/core";

const json = serializeZoneflowDocument({
  model: editor.model,
  layoutModel: editor.layoutModel,
});

const documentBundle = parseZoneflowDocument(json);
```

## 권장 구조

- 도메인/저장 포맷: `@zoneflow/core`
- 렌더링/에디팅 UI: `@zoneflow/react`
- 실제 서비스 폼과 비즈니스 규칙: 앱 레이어

레포지토리: [github.com/groobee/zoneflow](https://github.com/groobee/zoneflow)
