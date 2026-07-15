# @zoneflow/themes

> **ℹ️ AI 생성 안내**<br>
> 이 라이브러리의 코드와 문서는 상당 부분 AI(Anthropic Claude)의 도움으로 작성되었습니다.

`@zoneflow/themes`는 Zoneflow용 기본 프리셋 테마 묶음입니다.

포함 프리셋:

- `dark`
- `ocean`
- `sunset`
- `light`
- `party`
- `korean-culture`
- `sci-fi`
- `fantasy`
- `mono`
- `garden`
- `utopia`
- `dystopia`
- `desert`

## 설치

```bash
pnpm add @zoneflow/themes @zoneflow/react @zoneflow/core react react-dom
```

## 사용 예제

```tsx
import { UniverseEditorCanvas, DefaultEditorToolbar } from "@zoneflow/react";
import { oceanPreset } from "@zoneflow/themes";

<DefaultEditorToolbar editor={editor} theme={oceanPreset.editorTheme} />

<UniverseEditorCanvas
  editor={editor}
  theme={oceanPreset.rendererTheme}
  editorConfig={{
    theme: oceanPreset.editorTheme,
  }}
/>
```

프리셋은 다음 구조를 가집니다.

- `rendererTheme`
- `editorTheme`
- `surfacePalette`

`surfacePalette`는 playground 같은 샘플 앱이나 자체 shell UI에 톤을 맞출 때 사용할 수 있는 보조 팔레트입니다.

레포지토리: [github.com/groobee/zoneflow](https://github.com/groobee/zoneflow)
