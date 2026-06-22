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
- `apps/kittyflow`
  - 편집 없는 read-only viewer 예제 — 골목 고양이 관계도
  - `UniverseCanvas + interactionHandlers.onZoneClick` 으로 존 클릭 시 우측에 정보 패널(모달 아님)을 띄우는 패턴과, 슬롯 커스터마이즈(ASCII 얼굴) / `resolveZoneColor` / `resolvePathColor` 활용을 보여줍니다
- `apps/custom-zone`
  - 빌트인 슬롯(`title | type | badge | body | footer`)을 전혀 쓰지 않고, `renderZone` 풀바디 렌더러로 존 카드 전체를 직접 그리는 최소 예제
  - 마운트 직후 `fitToView()` 로 콘텐츠를 화면에 맞추는 패턴도 함께 보여줍니다

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

## 특정 존으로 카메라 이동 (focusZone)

"그래프의 시작 존으로 이동" 같은 외부 내비게이션 수요를 위해, 캔버스 ref 로 특정 존을 화면 중앙에 가져올 수 있습니다.

```tsx
import { useRef } from "react";
import { UniverseCanvas, type UniverseCanvasHandle } from "@zoneflow/react";

function Viewer() {
  const canvasRef = useRef<UniverseCanvasHandle | null>(null);

  return (
    <>
      <button onClick={() => canvasRef.current?.focusZone("startZone")}>
        시작 존으로
      </button>
      <UniverseCanvas ref={canvasRef} model={model} layoutModel={layoutModel} />
    </>
  );
}
```

- `focusZone(zoneId, options?)` — 해당 존이 뷰포트 중앙에 오도록 카메라를 이동합니다. 존을 찾지 못했거나 아직 첫 프레임이 그려지기 전이면 `false` 를 반환합니다.
- `options.zoom` — 이동 후 zoom (미지정 시 현재 zoom 유지, 0.25~3 으로 clamp).
- controlled camera(`cameraState`/`onCameraChange`) 모드에서도 동작합니다 — 계산된 카메라가 `onCameraChange` 로 전달됩니다. ref 없이 직접 계산하고 싶으면 `computeZoneFocusCamera()` 헬퍼를 쓰세요.
- `UniverseEditorCanvas` 도 같은 핸들을 제공합니다 (`UniverseEditorCanvasHandle` — `focusZone` + `fitToView`).

활용 예는 `apps/kittyflow` 의 "시작 존으로" 버튼과 정보 패널의 관계 행 클릭(상대 고양이로 이동)을 참고하세요.

## 편집 UI 주입

실서비스에서는 존/패스 편집 폼을 외부에서 주입하면 됩니다.

지원 포인트:

- `renderZoneEditor`
- `renderPathEditor`
- `renderZoneOverlays` (편집 모드 존 오버레이 — 과거 `renderZoneEditButton` 대체)
- `resolvePathLabelResize`
- `resolveZoneResize`
- `onPathLabelDoubleClick`
- `onPathLabelContextMenu`
- `onZoneSelectionChange`
- `onPathSelectionChange`
- `canConnectPath`
- `confineChildZonesToParent` (자식 존을 부모 컨테이너 박스 밖으로 못 나가게 가두기 — 기본값 `!reparentZone`)

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

### 선택 변경 이벤트

캔버스에서 zone / path 선택이 바뀔 때마다 외부에서 알 수 있습니다. 선택된 대상에 맞춰 사이드 패널을 띄우거나, 외부 목록 UI 와 선택 상태를 동기화할 때 사용합니다.

```tsx
<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    onZoneSelectionChange: (zoneIds) => {
      // 단일 클릭이면 [zoneId], shift/ctrl 토글·마퀴 선택이면 여러 개,
      // 선택 해제면 []
      setInspectorZoneIds(zoneIds);
    },
    onPathSelectionChange: (pathIds) => {
      setInspectorPathIds(pathIds);
    },
  }}
/>
```

동작:

- 단일 클릭 선택, shift/ctrl/cmd 토글, 마퀴(드래그 박스) 선택이 모두 같은 콜백으로 옵니다. `zoneIds.length` 로 단일/다중을 구분하면 됩니다.
- 선택 해제(빈 캔버스 클릭, 편집 모드 종료, 선택 대상 삭제) 시 빈 배열로 호출됩니다.
- 선택 **내용이 실제로 바뀔 때만** 호출됩니다. 이미 선택된 zone 을 다시 클릭해도 재호출되지 않습니다.
- zone 과 path 선택은 상호 배타입니다. zone 을 선택하면 path 선택이 풀리면서 `onPathSelectionChange([])` 가 함께 호출될 수 있습니다 (반대도 동일).
- 선택된 zone 이 모델에서 삭제되면 남은 선택만 담아 다시 호출됩니다.

### 패스 라벨 리사이즈 제약 (resolvePathLabelResize)

패스 라벨 박스의 리사이즈 허용 여부와 크기 제약을 패스별로 외부에서 정할 수 있습니다.

```tsx
<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    resolvePathLabelResize: ({ path, sourceZoneId }) => {
      // 특정 패스는 리사이즈 금지
      if (path.meta?.locked) return { enabled: false };

      // 나머지는 최소/최대 크기만 제약 (world units)
      return { minWidth: 80, maxWidth: 320, minHeight: 28 };
    },
  }}
/>
```

콜백 파라미터: `pathId` / `path` / `sourceZoneId` / `model`.

반환값 (`PathLabelResizeConfig`):

- `enabled` — 리사이즈 핸들 노출 여부(기본 `true`). `false` 면 해당 라벨은 크기 조정 불가.
- `minWidth` / `maxWidth` / `minHeight` / `maxHeight` — 라벨 박스 크기 제약(world units). 미지정 시 라이브러리 기본 최소치만 적용(상한 없음).
- `null` / `undefined` / 콜백 미지정 — 기본 동작(라이브러리 기본 최소치로 리사이즈 허용).

### 존 리사이즈 제약 (resolveZoneResize)

존 박스의 리사이즈 허용 여부와 크기 제약을 존별로 외부에서 정할 수 있습니다. 패스의 `resolvePathLabelResize` 와 대칭이며, 모델의 `fixedWidth` / `fixedHeight` / `minWidth` / `minHeight` 필드를 외부에서 덮어쓰는 주입 계층입니다.

```tsx
<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    resolveZoneResize: ({ zone }) => {
      // action 존은 리사이즈 금지
      if (zone.zoneType === "action") return { enabled: false };

      // 그 외는 높이만 잠그고 폭은 상/하한만 (world units)
      return { lockHeight: true, minWidth: 120, maxWidth: 320 };
    },
  }}
/>
```

콜백 파라미터: `zoneId` / `zone` / `model`.

반환값 (`ZoneResizeConfig`):

- `enabled` — 리사이즈 핸들 노출 여부(기본 `true`). `false` 면 해당 존은 크기 조정 불가.
- `lockWidth` / `lockHeight` — 축별 잠금. 미지정 시 존의 `fixedWidth` / `fixedHeight` 모델 필드를 따릅니다.
- `minWidth` / `maxWidth` / `minHeight` / `maxHeight` — 존 박스 크기 제약(world units). min 미지정 시 존의 `minWidth` / `minHeight`(없으면 라이브러리 기본 최소치), max 미지정 시 상한 없음.
- `null` / `undefined` / 콜백 미지정 — 기본 동작(모델 필드 + `resizeZone` 권한).

### 자식 존 컨테이너 가두기 (confineChildZonesToParent)

컨테이너에 속한 자식 존을 드래그할 때 **부모 컨테이너 박스 밖으로 나가지 못하게** 위치를 가둡니다. 자식 존의 레이아웃 좌표는 부모 기준 상대값이므로, 드래그 중 자식의 위치를 `[0, 부모폭 − 자식폭] × [0, 부모높이 − 자식높이]` 범위로 클램프합니다.

**기본값은 `!permissions.reparentZone` 입니다.** 재배치(reparent)는 공간 기반이라 — 드롭한 위치가 곧 새 부모가 됩니다 — `reparentZone` 권한을 끄면 "부모를 못 바꾼다"의 자연스러운 완성이 "부모 박스를 못 벗어난다"입니다. 그래서 **재배치를 잠그면 자식 존은 자동으로 컨테이너 안에 갇힙니다**(별도 설정 불필요). `editorPermissionPresets.layoutOnly` 는 `reparentZone: false` 이므로 그대로 적용됩니다.

`true` / `false` 로 명시하면 그 값으로 오버라이드합니다:

```tsx
<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    // reparentZone:false 면 이미 자동으로 가둠 — 보통은 지정할 필요 없음.
    // 자체 렌더러로 자동 확장되는 컨테이너처럼, 선언된 layout 박스 밖 배치를
    // 허용하고 싶을 때만 명시적으로 풀어준다.
    confineChildZonesToParent: false,
  }}
/>
```

- `true` — 부모를 가진 자식 존은 드래그 중 부모 박스 안으로 위치가 클램프됩니다. 루트 존, 부모/자신의 크기가 없는 존은 영향받지 않습니다.
- `false` — 재배치 권한과 무관하게 자유 이동(컨테이너 이탈 허용).
- 미지정 — `!permissions.reparentZone`(재배치를 잠그면 가둠, 켜져 있으면 자유 이동).

> 클램프 기준은 **선언된 layout 박스(width/height)** 입니다. 고정 크기 컨테이너는 정확하지만, 자식에 맞춰 자동 확장되는 커스텀 컨테이너라면 시각 박스와 어긋날 수 있으니 그때는 `false` 로 풀어주세요.

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
- 줌 단계별 (`farest / far / mid / near / detail`) 가시성은 슬롯마다 `shouldRender` 로 제어
- `disabledBuiltIns` 로 `footer` 같은 기본 슬롯을 꺼서 그 자리를 다른 슬롯이나 body 가 차지하도록 만들 수 있음

zone 의 컨테이너/자식 관계 때문에 부모 zone 의 슬롯 영역 위에 자식 zone 이 그려지는 경우, 마우스 클릭이 자식 zone 에 가로채집니다. 인터랙티브한 슬롯 (버튼 등) 은 leaf zone 에서만 렌더하도록 `shouldRender` 에서 `zone.childZoneIds.length === 0` 조건을 거는 것이 안전합니다.

## 존/패스 전체 직접 그리기 (renderZone / renderPath)

슬롯을 채우는 대신, **존/패스 노드 전체를 컴포넌트 하나로 직접 그릴** 수도 있습니다. 슬롯 골격·레이아웃을 라이브러리가 잡지 않고, 노드 rect 전체를 주입한 컴포넌트가 차지합니다.

- `renderZone(zone, context) => Component | null | undefined` — 존 풀바디 렌더러. 컴포넌트를 반환하면 그 존은 빌트인 슬롯(`title | type | badge | body | footer`)을 **하나도 만들지 않고** 풀바디로 마운트됩니다.
- `renderPath(path, context) => Component | null | undefined` — 패스 풀노드 렌더러. 기본 라벨 칩 대신 패스 노드를 통째로 그립니다.

`null` / `undefined` 를 반환하면 기본 카드(빌트인 슬롯)로 폴백합니다 → "특정 조건만 커스텀, 나머지는 기본" 이 가능합니다. 둘 다 `UniverseCanvas` / `UniverseEditorCanvas` 의 prop 이며 편집 모드에서도 동작합니다.

```tsx
import type { ResolveZoneRenderComponent } from "@zoneflow/react";

const renderZone: ResolveZoneRenderComponent = (zone, { density }) =>
  zone.zoneType === "branch" ? BranchCard
  : density === "far" ? CompactCard
  : undefined; // 기본 카드

<UniverseEditorCanvas editor={editor} renderZone={renderZone} />;
```

풀바디 컴포넌트는 `mount.context` 로 다음을 받습니다.

- `zone` (또는 `path`) — 모델 노드
- `theme` — 해석된 테마 색
- `density` — 현재 LOD (`farest | far | mid | near | detail`) → 반응형 분기에 사용
- `rect` — 화면상 박스 크기
- `zoneColor` — 외부에서 주입한 색(있으면)

> 캔버스는 뷰포트 밖 존을 그리지 않습니다. 풀바디 렌더만 쓰는 화면이라면 로드 시 콘텐츠가 보이도록 `canvasRef.current?.fitToView()` 로 맞추세요.

전체 동작 예제는 `apps/custom-zone` 을 참고하세요.

## 존 오버레이 (renderZoneOverlay / renderZoneOverlays)

존 본문을 **교체하지 않고 그 위에 덮어 그리는** 레이어입니다. 배지·아이콘·작은 컨트롤처럼 본문과 무관한 장식/버튼을 얹을 때 씁니다. 두 종류가 있습니다.

- `renderZoneOverlay(zone, context) => Component | null | undefined` — **렌더 레벨** 오버레이. `UniverseCanvas` / `UniverseEditorCanvas` 의 prop 이며 **뷰/편집 양쪽 모드**에서 항상 동작합니다. (per-instance 배지·장식 같은 표현 계층 요소)
- `editorConfig.renderZoneOverlays(props) => ReactNode` — **편집 모드 전용** 오버레이. 과거 라이브러리가 강제로 그리던 편집 버튼(`renderZoneEditButton`)을 대체합니다. 존마다 본문 위를 덮는 레이어를 주고, 편집 버튼/배지/컨트롤을 소비자가 직접 그립니다.

`renderZoneOverlays` 가 받는 `props` (`ZoneOverlayRenderProps`):

- `zone` / `zoneId` / `model` / `layoutModel` / `rect` — 대상 존과 화면 박스
- `isSelected` / `isHovered` / `isEditing` / `isDragging` — 상태 플래그 (언제 무엇을 그릴지 결정)
- `openEditor()` / `closeEditor()` — `renderZoneEditor` 패널 열고/닫기
- `theme` — 에디터 테마

```tsx
<UniverseEditorCanvas
  editor={editor}
  editorConfig={{
    renderZoneOverlays: ({ zone, isSelected, isHovered, openEditor }) => {
      if (!isSelected && !isHovered) return null;

      return (
        <button
          style={{ position: "absolute", top: 6, right: 6, pointerEvents: "auto" }}
          onClick={(e) => {
            e.stopPropagation();
            openEditor();
          }}
        >
          ✏️ 편집
        </button>
      );
    },
  }}
/>
```

오버레이 컨테이너는 `pointer-events: none` 이라 빈 영역 클릭은 존(드래그)으로 통과합니다. 버튼에는 `pointerEvents: "auto"` 를 주면 되고, 그 클릭이 드래그를 시작하지 않도록 라이브러리가 컨테이너에서 막아줍니다.

## 개별 색상 / 모양 (per-instance color & shape)

zone/path 마다 다른 색·모양은 canvas 의 resolver prop 으로 줍니다. 순수 표현 계층 hook 이라 모델/연결/히트테스트에는 영향이 없습니다.

- `resolveZoneColor(zone) => string | null | undefined` — zone 테두리/accent/anchor 색(DOM 도형). 슬롯엔 `mount.context.zoneColor` 노출
- `resolvePathColor(path) => string | null | undefined` — path per-instance 색. 내장 label 폴백이 사용, 슬롯엔 `mount.context.pathColor` 노출
- `resolveZoneShape(zone) => ZoneShape | null | undefined` — `rect | pill | circle | diamond | hexagon` 또는 커스텀 clip

`null` / `undefined` 를 반환하면 테마 기본값으로 폴백합니다. 보통 `meta` 에서 값을 읽습니다.

```tsx
import type { ZoneShape } from "@zoneflow/renderer-dom";

<UniverseEditorCanvas
  editor={editor}
  resolveZoneColor={(z) => z.meta?.color as string | undefined}
  resolvePathColor={(p) => p.meta?.color as string | undefined}
  resolveZoneShape={(z) => z.meta?.shape as ZoneShape | undefined}
/>
```

> React slot component(`zoneComponents` / `pathComponents`)는 그 슬롯의 저수준 DOM 렌더러와 내장 폴백을 **덮어씁니다.** 따라서 직접 슬롯을 주는 경우, 라벨/타이틀 색이 resolver 색을 따르게 하려면 슬롯에서 `mount.context.pathColor` / `mount.context.zoneColor` 를 읽어야 합니다(이 레포의 예제 슬롯은 이미 그렇게 동작).

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

### 릴리즈 (태그 드리븐)

배포는 **`vX.Y.Z` 태그 push** 로 트리거됩니다. 태그가 그 배포의 앵커가 되어, 배포 간 차이를 `git`/GitHub compare 와 자동 생성 릴리즈 노트로 추적할 수 있습니다.

```bash
# 1) 릴리즈 컷 — git 태그 기준으로 버전 증가(모든 패키지 lockstep) + 커밋 + 태그 생성
pnpm release patch              # 또는 minor / major / prerelease / 1.2.0
pnpm release minor --dry-run    # 실제 변경 없이 다음 버전만 확인

# 2) 태그 push → CI 가 npm publish + GitHub Release(노트 자동 생성)
git push --follow-tags
```

- 버전 소스는 **git 태그**(npm 레지스트리 아님) — 레포가 "어느 커밋 = 어느 배포"를 기록합니다.
- prerelease 태그(`v1.2.0-rc.0`)는 npm dist-tag `next` + GitHub Release `prerelease` 로 배포됩니다.
- GitHub Actions 의 수동 실행(Run workflow)은 기본 **dry-run** 검증용입니다. `pnpm release … --push` 로 컷+푸시를 한 번에 할 수도 있습니다.
