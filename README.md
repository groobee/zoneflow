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

### 패스 생성 직후 옵션 설정 (onPathCreated)

Zone outlet 에서 끌어 새 path 가 만들어지는 순간, 외부에서 path 의 rule type / name / payload 같은 옵션을 즉석에서 설정할 수 있습니다. path 생성과 옵션 적용이 단일 commit 으로 묶여 undo 가 한 단계로 처리됩니다.

```tsx
import { updatePath } from "@zoneflow/core";

<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    onPathCreated: ({ pathId, sourceZoneId, targetZoneId, model }) => {
      const ruleType = window.prompt(
        "새 패스 rule (allow / deny / match …)",
        "allow"
      );
      if (ruleType === null) return; // 변경 없이 그대로 commit

      return {
        model: updatePath(model, sourceZoneId, pathId, {
          rule: ruleType.trim() ? { type: ruleType.trim() } : null,
        }),
      };
    },
  }}
/>
```

콜백 파라미터:

- `pathId` — 방금 만들어진 path 의 id
- `sourceZoneId` — path 가 속한 zone
- `targetZoneId` — 연결된 target zone (`null` 이면 dangling)
- `model` / `layoutModel` — path 가 들어간 직후의 모델 (commit 직전)

반환값:

- `{ model?, layoutModel? }` — 추가로 변경한 모델을 돌려주면 path 생성과 그 변경을 한 commit 으로 묶어 적용
- `null` / `undefined` / 콜백 미지정 — path 만 만들어진 상태로 그대로 commit (기존 동작)

비동기 modal 이 필요하면 콜백에서는 commit 만 두고, modal 이 닫힌 뒤 별도 `setModel` 로 후속 mutation 하는 패턴이 더 깔끔합니다 (단, undo 는 두 단계가 됩니다).

### 빈 공간 패스 드롭 → 존 생성

**기존 path 의 output anchor (path label) 를 끌어** zone 위가 아닌 빈 캔버스에 놓을 때, 외부에서 즉석으로 새 zone 을 만들고 그 zone 에 path 를 자동 연결하도록 콜백을 등록할 수 있습니다. "존을 먼저 만들고 연결" 이 아니라 **"패스 라벨에서 바로 존을 만든다"** 흐름.

> zone outlet 에서 새 path 를 만드는 흐름 (path-create) 에서는 호출되지 않습니다 — 그 경우는 빈 공간에 떨어뜨리면 기존 동작대로 dangling path 가 만들어집니다.

```tsx
import { createZoneFromDropTemplate } from "@zoneflow/react";

<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    onPathDropOnEmptySpace: ({ worldPoint, model, layoutModel }) => {
      const name = window.prompt("새 zone 이름");
      if (!name) return null;

      const next = createZoneFromDropTemplate({
        model,
        layoutModel,
        worldPoint,
        gridSnapEnabled: editor.gridSnapEnabled,
        gridSnapSize: editor.gridSnapSize,
        template: { name, zoneType: "container", width: 220, height: 140 },
      });

      return {
        model: next.model,
        layoutModel: next.layoutModel,
        targetZoneId: next.zoneId,
      };
    },
  }}
/>
```

콜백 파라미터:

- `sourceZoneId` — path 가 출발하는 zone
- `pathId` — 재지정 중인 path 의 id
- `worldPoint` / `screenPoint` — 드롭 위치
- `model` / `layoutModel` — 드롭 시점의 최신 모델

반환값:

- `{ model, layoutModel, targetZoneId }` — 새 zone 을 만든 결과를 돌려주면 editor 가 그 zone 을 path 의 target 으로 자동 연결. zone 생성 + path 연결이 단일 commit 으로 처리됨.
- `null` / `undefined` / 콜백 미지정 — 기존 동작 (dangling path 로 처리)

`createZoneFromDropTemplate` 외에도 `@zoneflow/core` 의 mutation 으로 직접 만들어도 됩니다. 핵심은 변경된 `model`/`layoutModel` 과 새 `targetZoneId` 만 돌려주면 path 연결은 editor 가 알아서 한다는 점.

## 슬롯 확장 (커스텀 UI 요소 추가)

기본 zone 슬롯은 `title | type | badge | body | footer` 5종으로 고정되어 있습니다. 이외에 코멘트 버튼, 전환수, 전환금액 카드 같은 임의의 UI 요소를 zone 안에 끼워 넣고 싶다면 **확장형 layout engine** 을 주입합니다.

```tsx
import {
  createExtensibleComponentLayoutEngine,
  type ExtensibleZoneSlot,
} from "@zoneflow/renderer-dom";

const extraSlots: ExtensibleZoneSlot[] = [
  {
    name: "comment",
    placement: { kind: "top", height: 22 },
    shouldRender: ({ density, zone }) =>
      zone.childZoneIds.length === 0 &&
      (density === "near" || density === "detail"),
  },
  {
    name: "convStats",
    placement: { kind: "bottom", height: 26 },
    shouldRender: ({ density }) => density === "detail",
  },
];

const layoutEngine = createExtensibleComponentLayoutEngine({
  extraSlots,
  // disabledBuiltIns: ["footer"],            // 기본 슬롯 끄기 (선택)
  // builtInDensityOverride: {                // 기본 줌별 가시성 재정의 (선택)
  //   badge: ({ density }) => density !== "far",
  // },
});

<UniverseEditorCanvas
  editor={editor}
  componentLayoutEngine={layoutEngine}
  zoneComponents={{
    title: TitleSlot,
    badge: BadgeSlot,
    body:  BodySlot,
    comment: ({ mount }) => (
      <button onClick={(e) => {
        e.stopPropagation();          // zone 클릭으로 bubble 안 시키기
        openComments(mount.context.zone.id);
      }}>💬 코멘트</button>
    ),
    convStats: ({ mount }) => <ConvStats zoneId={mount.context.zone.id} />,
  }}
/>
```

핵심 포인트:

- `extraSlots` 항목은 `placement: "top"` (badge/title/type 다음에 stack) 또는 `"bottom"` (footer 위) 로 배치
- 빈 config 호출 시 (`createExtensibleComponentLayoutEngine()`) `defaultComponentLayoutEngine` 과 출력이 동일 — 기존 동작과 100% 호환
- 슬롯 컴포넌트는 React `onClick` 등 일반 이벤트 그대로 사용. `stopPropagation()` 호출하면 zone 단위 click 도 차단 가능
- 줌 단계별 (`far / mid / near / detail`) 가시성은 슬롯마다 `shouldRender` 로 제어
- `disabledBuiltIns` 로 `footer` 같은 기본 슬롯을 꺼서 그 자리를 다른 슬롯이나 body 가 차지하도록 만들 수 있음

zone 의 컨테이너/자식 관계 때문에 부모 zone 의 슬롯 영역 위에 자식 zone 이 그려지는 경우, 마우스 클릭이 자식 zone 에 가로채집니다. 인터랙티브한 슬롯 (버튼 등) 은 leaf zone 에서만 렌더하도록 `shouldRender` 에서 `zone.childZoneIds.length === 0` 조건을 거는 것이 안전합니다.

## 월드 배경 (지도/이미지)

캔버스 전체에 월드 좌표계로 동작하는 배경을 깔 수 있습니다. (지도 타일, blueprint 패턴 등) 카메라 pan/zoom 에 같이 따라가며, 시각 순서는 **`background → grid → zones`** 입니다.

React 컴포넌트로 주입:

```tsx
import type { BackgroundComponentProps } from "@zoneflow/react";

function MapBackground({ mount }: BackgroundComponentProps) {
  const { sceneBounds } = mount.context;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: sceneBounds.width,
        height: sceneBounds.height,
        backgroundImage: "url('/my-map.png')",
        backgroundRepeat: "repeat",
      }}
    />
  );
}

<UniverseEditorCanvas
  editor={editor}
  background={MapBackground}
/>
```

DOM 직접 렌더링이 필요하면:

```tsx
<UniverseEditorCanvas
  editor={editor}
  backgroundRenderer={(host, { sceneBounds }) => {
    host.style.backgroundImage = "url('/my-map.png')";
    host.style.width = `${sceneBounds.width}px`;
    host.style.height = `${sceneBounds.height}px`;
  }}
/>
```

`mount.context` 에는 `sceneBounds`, `camera`, `viewportInfo`, `theme` 가 들어옵니다. 배경 host 에는 자동으로 `pointer-events: none` 이 적용되어 zone/path 클릭을 가로채지 않습니다.

화면 고정 배경 (카메라에 안 따라오는 단색/그라데이션) 은 `theme.background` 또는 캔버스 컨테이너의 CSS 배경으로 처리하는 쪽이 더 적합합니다.

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
