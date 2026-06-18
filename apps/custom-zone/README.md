# custom-zone

빌트인 존 슬롯을 **전혀 쓰지 않고** 존 카드 전체를 직접 그리는 최소 예제.

## 핵심

zoneflow 의 존 렌더링에는 두 갈래가 있습니다.

1. **슬롯 채우기** — `zoneComponents` 맵으로 빌트인 슬롯
   (`title | type | badge | body | footer`)에 React 컴포넌트를 끼워 넣음.
   레이아웃·골격은 라이브러리가 잡고, 각 칸 내용만 커스텀.

2. **풀바디 렌더러** — `renderZone` (= `ResolveZoneRenderComponent`) 이
   컴포넌트를 반환하면, renderer-dom 은 그 존을 **풀바디 mount** 로 처리하고
   빌트인 슬롯을 **하나도 만들지 않습니다**. 즉 존 rect 전체를 컴포넌트 하나가
   차지하고, 모양을 100% 직접 그립니다. ← 이 예제가 쓰는 방식.

```tsx
const renderZone: ResolveZoneRenderComponent = () => CustomZoneCard;

// renderZone 은 UniverseCanvas / UniverseEditorCanvas 둘 다 받는 prop.
<UniverseEditorCanvas
  editor={editor}
  renderZone={renderZone}   // 모든 존을 우리가 직접 그림
/>;
```

> 캔버스는 뷰포트 밖 존을 그리지 않으므로, 로드 시 콘텐츠가 화면에 들어와
> 있어야 한다. 이 예제는 마운트 직후 `canvasRef.current.fitToView()` 를 잠깐
> 폴링해 자동으로 맞춘다([`src/App.tsx`](src/App.tsx)).

`renderZone` 이 `undefined` 를 반환하면 그 존은 기본 카드(빌트인 슬롯)로
떨어집니다. 그래서 "특정 조건만 커스텀, 나머지는 기본"도 가능합니다.

```tsx
const renderZone: ResolveZoneRenderComponent = (zone, { density }) =>
  zone.zoneType === "branch" ? BranchCard
  : density === "far" ? CompactCard
  : undefined; // 기본 카드
```

## 풀바디 컴포넌트가 받는 것

`mount.context` 로 다음을 받습니다 (`ZoneRenderComponentProps`):

- `zone` — 모델의 존 (name, zoneType, action, meta, pathIds …)
- `theme` — 해석된 테마 색
- `density` — 현재 LOD (`farest|far|mid|near|detail`) → 반응형 분기에 사용
- `rect` — 화면상 박스 크기
- `zoneColor` — 외부에서 주입한 존 색(있으면)

[`src/CustomZoneCard.tsx`](src/CustomZoneCard.tsx) 가 `zoneType` 으로 아이콘·색·
라벨을 분기해 카드를 통째로 그립니다 (빌트인 슬롯 미사용).

## 실행

```bash
pnpm --filter custom-zone dev
```
