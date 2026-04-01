# @zoneflow/core

`@zoneflow/core`는 Zoneflow의 도메인 레이어입니다.

이 패키지는 다음 역할을 담당합니다.

- `UniverseModel`, `UniverseLayoutModel` 타입
- zone / path 생성, 수정, 삭제 mutation
- lookup / validation 유틸
- layout 유틸
- zoneflow 문서 import / export

일반적으로 `@zoneflow/react`와 함께 사용합니다.

## 설치

```bash
pnpm add @zoneflow/core
```

## 포함 기능

- 모델 타입
  - `UniverseModel`
  - `UniverseLayoutModel`
  - `Zone`
  - `Path`
- mutation
  - `createZone`
  - `updateZone`
  - `removeZone`
  - `addPath`
  - `updatePath`
  - `removePath`
- layout
  - `createUniverseLayoutModel`
  - `createZoneLayout`
  - `getZoneLayout`
  - `updateZoneLayout`
- 문서 포맷
  - `createZoneflowDocument`
  - `serializeZoneflowDocument`
  - `parseZoneflowDocument`

## 최소 예제

```ts
import {
  createUniverseId,
  createUniverseLayoutModel,
  createZoneId,
  createZone,
  createZoneLayout,
  serializeZoneflowDocument,
} from "@zoneflow/core";

const universeId = createUniverseId();

let model = {
  version: "1.0.0",
  universeId,
  rootZoneIds: [],
  zonesById: {},
};

let layoutModel = createUniverseLayoutModel({
  universeId,
  version: "1.0.0",
});

model = createZone(model, {
  id: createZoneId(),
  name: "Start",
  zoneType: "action",
  parentZoneId: null,
});

const rootZoneId = model.rootZoneIds[0];

layoutModel = {
  ...layoutModel,
  zoneLayoutsById: {
    ...layoutModel.zoneLayoutsById,
    [rootZoneId]: createZoneLayout({
      x: 120,
      y: 100,
      width: 220,
      height: 140,
    }),
  },
};

const json = serializeZoneflowDocument({
  model,
  layoutModel,
});
```

## 문서 저장 / 불러오기

Zoneflow 문서 포맷은 다음 함수를 사용합니다.

```ts
import {
  serializeZoneflowDocument,
  parseZoneflowDocument,
} from "@zoneflow/core";

const json = serializeZoneflowDocument({
  model,
  layoutModel,
});

const documentBundle = parseZoneflowDocument(json);
```

문서 형식:

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

## 함께 쓰는 패키지

- 렌더링/에디팅 UI까지 필요하면 `@zoneflow/react`

레포지토리: [github.com/groobee/zoneflow](https://github.com/groobee/zoneflow)
