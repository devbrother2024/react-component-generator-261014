# src/AGENTS.md

Vite + React 19 프론트엔드. 서버와는 `/api/*` fetch로만 통신한다 (hooks/useComponentGenerator.ts:23).

## Tech Stack & Constraints

- 스타일은 일반 CSS (`App.css`, `index.css`) 클래스 방식. CSS-in-JS/Tailwind 도입 금지. (생성된 컴포넌트 코드는 별개로 인라인 스타일만 사용)
- 상태 관리 라이브러리 없음. 서버 통신 상태는 `useComponentGenerator` 훅에 둔다.
- 공용 타입은 `types/index.ts`. `Provider` 유니온은 서버에도 별도 정의되어 있다 (server/index.ts:57). 프로바이더를 추가하면 양쪽을 같이 수정한다.

## Implementation Patterns

- 컴포넌트는 `components/` 아래 이름 있는 export (`export function X`). 컴포넌트와 같은 폴더에 `X.test.tsx`를 둔다.
- 컴포넌트 props 인터페이스는 파일 상단에 `XxxProps`로 선언한다 (LivePreview.tsx:3).

## Testing Strategy

- `bunx vitest run src/` 로 프론트 테스트만 실행. 환경은 jsdom, 설정은 `src/test/setup.ts` (jest-dom 매처, 테스트 후 `cleanup`).
- 패턴: `@testing-library/react`의 `render` + `userEvent.setup()`, 쿼리는 `getByRole`과 한국어 접근 이름 (PromptInput.test.tsx:12, 21).
- 현재 테스트는 `PromptInput`뿐이다. `App.tsx`, 훅, `ComponentCard`, `LivePreview`는 테스트 경계 밖이므로, 이 영역을 수정할 때는 가능하면 순수 로직을 분리해 테스트를 추가한다.

## Local Golden Rules

- `LivePreview`는 `noInline`이므로 `code` prop에는 `render(...)` 호출이 포함되어야 한다 (LivePreview.tsx:14). 코드를 가공해서 전달하는 로직을 넣을 때 이 호출을 잘라내지 않는다.
- 미리보기 다시보기(새로고침)는 `key={previewKey}`로 리마운트해서 구현한다 (ComponentCard.tsx:70). 상태 초기화가 필요하면 같은 방식을 쓰고 effect로 우회하지 않는다.
- API 키는 `App.tsx`의 로컬 state(`apiKey`)에만 두고 요청 본문으로만 보낸다 (App.tsx:14, hooks:26). localStorage 등에 저장하지 않는다.
- 키 입력 없이 생성 가능한지는 서버의 `envKeys`(boolean)로 판단한다 (App.tsx:27-34). 서버가 키 값을 내려주도록 바꾸지 않는다.
- ESLint 설정은 `globals.browser`만 적용된다 (eslint.config.js:17). `src/` 안에서 Node/Bun 전용 API를 쓰지 않는다.
