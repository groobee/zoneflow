# @zoneflow/react

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

zone slot:

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

## 편집기 주입 포인트

실서비스 폼은 외부에서 주입하면 됩니다.

- `renderZoneEditButton`
- `renderZoneEditor`
- `renderPathEditor`
- `onPathLabelDoubleClick`
- `onPathLabelContextMenu`

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
