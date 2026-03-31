# @zoneflow/editor-dom

`@zoneflow/editor-dom`은 Zoneflow의 저수준 editor geometry / interaction helper 패키지입니다.

이 패키지는 주로 다음을 포함합니다.

- zone/path 이동 계산
- 리사이즈 계산
- reparent 계산
- path 생성/재연결 계산
- editor target / anchor geometry 유틸

대부분의 앱에서는 이 패키지를 직접 설치하거나 사용할 필요가 없습니다.
일반적인 React 앱은 `@zoneflow/react`를 통해 editor 기능을 사용하는 편이 맞습니다.

## 설치

```bash
pnpm add @zoneflow/editor-dom
```

## 언제 직접 쓰나

- React 바깥에서 editor interaction을 직접 구성할 때
- geometry helper만 별도로 써야 할 때
- low-level editor behavior를 직접 제어할 때

일반적인 앱 통합은 `@zoneflow/react`를 우선 사용하는 편이 맞습니다.

레포지토리: [github.com/groobee/zoneflow](https://github.com/groobee/zoneflow)
