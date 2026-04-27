# Zoneflow

Zoneflow는 `Zone`과 `Path`를 중심으로 워크플로우를 표현하고 편집할 수 있는 그래프 라이브러리입니다.

핵심 구성은 다음 두 가지입니다.

- `@zoneflow/core`
  - 모델 타입
  - 레이아웃 타입
  - mutation / lookup / validation
  - import / export 문서 포맷
- `@zoneflow/react`
  - 렌더러
  - 에디터
  - React slot component 주입

대부분의 실서비스 통합은 이 두 패키지로 시작하면 됩니다.

## 패키지

- `@zoneflow/core`
- `@zoneflow/react`
- `@zoneflow/themes`
- `@zoneflow/renderer-dom`
- `@zoneflow/editor-dom`

일반적인 앱 개발에서는 `@zoneflow/core`, `@zoneflow/react`를 직접 사용하고, `@zoneflow/themes`는 선택적으로 프리셋 테마를 가져올 때 추가하면 됩니다. 나머지 저수준 패키지는 하위 레이어로 두는 편이 맞습니다.

## 설치

`pnpm`을 아직 설치하지 않았다면 먼저 준비합니다.

권장 방식:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

또는:

```bash
npm install -g pnpm
```

그 다음 Zoneflow 패키지를 설치합니다.

```bash
pnpm add @zoneflow/core @zoneflow/react react react-dom
```

## 예제 앱

- `apps/starter`
  - 기본적인 활용 예제
  - `DefaultEditorToolbar + UniverseEditorCanvas + 간단한 sample model`만 포함합니다
- `apps/playground`
  - 테마, 샘플, import/export, 디버그, 편집 기능을 모두 보여주는 확장 예제

## 핵심 개념

### 1. 모델과 레이아웃은 분리됩니다

- `UniverseModel`
  - 도메인 데이터
  - zone / path 구조
- `UniverseLayoutModel`
  - 위치와 크기
  - 존/패스 라벨의 배치 정보

### 2. 에디터는 원본을 바로 수정하지 않습니다

`useUniverseEditor()`는 편집 시작 시점에 `model`, `layoutModel`의 복사본을 따로 만들고, 그 draft 위에서 히스토리를 쌓습니다.

- `수정` 전: 원본 유지
- `수정` 중: draft 변경 + undo/redo
- `적용`: draft를 원본에 반영
- `취소`: draft 폐기

즉 일반적인 문서 편집기처럼 동작합니다.

## 최소 사용 예제

아래 예제는 실 프로젝트에 붙일 때의 최소 형태입니다.

- 빈 문서 생성
- slot component 주입
- editor toolbar + canvas 렌더
- draft 편집 후 적용

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
    initialGridSnapEnabled: true,
    initialGridSnapSize: 16,
  });

  const zoneComponents: ZoneSlotComponentMap = {
    title: ({ mount }) => (
      <Zoned
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          fontWeight: 700,
        }}
      >
        {mount.context.zone.name}
      </Zoned>
    ),
    body: ({ mount }) => (
      <Zoned
        style={{
          padding: "12px",
          fontSize: 12,
          color: "#475569",
        }}
      >
        {mount.context.zone.zoneType}
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
          fontWeight: 700,
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

## 편집 UI 주입

실서비스에서는 존/패스 편집 폼을 외부에서 주입하면 됩니다.

지원 포인트:

- `renderZoneEditButton`
- `renderZoneEditor`
- `renderPathEditor`
- `onPathLabelDoubleClick`
- `onPathLabelContextMenu`
- `canConnectPath`

예:

```tsx
<UniverseEditorCanvas
  editor={editor}
  zoneComponents={zoneComponents}
  pathComponents={pathComponents}
  editorConfig={{
    renderZoneEditor: ({ zone, onModelChange, closeEditor }) => {
      if (!onModelChange) return null;

      return (
        <MyZoneEditorModal
          zone={zone}
          onClose={closeEditor}
          onSave={(nextModel) => {
            // zone 수정 결과를 반영한 새 UniverseModel
            onModelChange(nextModel);
            closeEditor();
          }}
        />
      );
    },
    renderPathEditor: ({ path, sourceZone, onModelChange, closeEditor }) => {
      if (!onModelChange) return null;

      return (
        <MyPathEditorModal
          path={path}
          sourceZone={sourceZone}
          onClose={closeEditor}
          onSave={(nextModel) => {
            onModelChange(nextModel);
            closeEditor();
          }}
        />
      );
    },
  }}
/>
```

도메인 규칙은 라이브러리 안에 넣지 말고, 이 주입 계층에서 처리하는 쪽이 맞습니다.

### 패스 연결 검증

존 간 패스를 새로 만들거나 기존 패스의 target 을 다른 존으로 옮길 때, 외부에서 도메인 룰에 따라 연결 가능 여부를 결정할 수 있습니다.

```tsx
<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    canConnectPath: ({ mode, sourceZone, targetZone, sourceZoneId, targetZoneId }) => {
      // self-connect 금지
      if (sourceZoneId === targetZoneId) return false;

      // action 끼리 직결 금지
      if (sourceZone.zoneType === "action" && targetZone.zoneType === "action") {
        return false;
      }

      return true;
    },
  }}
/>
```

동작:

- hover 단계 — `false` 반환 시 해당 zone 이 drop target 후보에서 제외됩니다. 사용자에겐 "여기엔 못 붙음" 이 즉시 시각으로 보입니다.
- drop 단계 — `false` 반환 시 path 의 `target` 이 `null` 로 강등됩니다. 새 path 의 경우 노드는 사용자가 놓은 위치에 만들어지지만 target 없이 비어있는 상태로, 기존 path retarget 의 경우 dangling 상태가 됩니다.
- 콜백 미지정 시 모든 연결을 허용합니다 (기존 동작과 동일).

`canConnectPath` 는 pointermove 마다 호출되므로 동기적이고 가벼워야 합니다. 콜백이 throw 하면 `false` 로 처리됩니다.

## 테마 주입

`@zoneflow/react`는 렌더러 테마와 editor HUD/preview 테마를 각각 주입할 수 있습니다.

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
  - renderer/viewer chrome 테마
- `editorConfig.theme`
  - editor overlay, HUD, preview, selection UI 테마
- `DefaultEditorToolbar.theme`
  - 기본 툴바 테마

## 파일 저장 / 불러오기

`@zoneflow/core`에는 zoneflow 문서 포맷이 포함되어 있습니다.

- `serializeZoneflowDocument(...)`
- `parseZoneflowDocument(...)`

저장은 현재 작업 중인 데이터(`editor.model`, `editor.layoutModel`)를 기준으로 하는 게 맞습니다.

```ts
import {
  parseZoneflowDocument,
  serializeZoneflowDocument,
} from "@zoneflow/core";

const json = serializeZoneflowDocument({
  model: editor.model,
  layoutModel: editor.layoutModel,
});
```

불러오기는 보통 이렇게 처리합니다.

```ts
const documentBundle = parseZoneflowDocument(jsonText);

// 현재 편집 세션 정리
editor.resetForSampleChange();

// 새 원본 문서로 교체
setModel(documentBundle.model);
setLayoutModel(documentBundle.layoutModel);
```

문서 포맷은 다음 형태입니다.

```json
{
  "kind": "zoneflow/universe",
  "formatVersion": 1,
  "exportedAt": "2026-03-31T12:00:00.000Z",
  "model": {},
  "layoutModel": {}
}
```

레거시 호환을 위해 raw `{ "model": ..., "layoutModel": ... }` 형태도 읽을 수 있습니다.

## 실프로젝트 통합 순서

권장 순서는 다음과 같습니다.

1. `@zoneflow/core`, `@zoneflow/react`를 프로젝트에 설치
2. 서비스의 실제 문서를 `UniverseModel`, `UniverseLayoutModel`로 매핑
3. slot component로 zone/path UI를 주입
4. `renderZoneEditor`, `renderPathEditor`에 서비스 편집 폼 연결
5. 저장 시 `serializeZoneflowDocument(...)` 사용
6. 불러오기 시 `parseZoneflowDocument(...)` 사용

## 개발

### 설치

```bash
pnpm install
```

### 빌드

```bash
pnpm build
```

### Playground 실행

```bash
pnpm --filter playground dev
```

### 패키지 빌드

```bash
pnpm --filter @zoneflow/core build
pnpm --filter @zoneflow/react build
```
