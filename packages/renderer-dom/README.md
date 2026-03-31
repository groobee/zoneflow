# @zoneflow/renderer-dom

`@zoneflow/renderer-dom`은 Zoneflow의 저수준 DOM 렌더러 엔진 패키지입니다.

이 패키지는 주로 다음을 포함합니다.

- 그래프 레이아웃 파이프라인
- DOM draw engine
- renderer frame / mount registry
- renderer용 타입 정의

대부분의 앱에서는 이 패키지를 직접 사용할 필요가 없습니다.
일반적인 React 앱은 `@zoneflow/react`를 사용하면 충분합니다.

## 설치

```bash
pnpm add @zoneflow/renderer-dom
```

## 언제 직접 쓰나

- React 없이 renderer DOM 레이어를 직접 붙일 때
- low-level draw engine이나 pipeline을 교체/실험할 때
- renderer frame을 직접 소비하는 커스텀 환경을 만들 때

일반적인 앱 통합은 `@zoneflow/react`를 우선 사용하는 편이 맞습니다.

레포지토리: [github.com/groobee/zoneflow](https://github.com/groobee/zoneflow)
