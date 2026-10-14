# AGENTS.md

프롬프트로 React 컴포넌트를 생성하고 react-live로 미리보기하는 앱. 설치/실행/기능 설명은 README.md 참고.

Tech Stack: React 19, TypeScript, Vite 8, react-live, Bun (API 서버), Vitest + Testing Library (jsdom), ESLint 9.

## Operational Commands

패키지 매니저는 bun 고정 (bun.lock). npm/yarn/pnpm 사용 금지.

- `bun install` : 의존성 설치
- `bun run dev` : API 서버(3002) + Vite 동시 실행
- `bun run server` : API 서버만 실행 (`bun --watch`)
- `bun run test` : Vitest 전체 1회 실행 (`src/**`, `server/**` 테스트 포함)
- `bunx vitest run server/generator.test.ts` : 단일 파일 테스트
- `bun run lint` : ESLint
- `bun run build` : `tsc -b && vite build`

검증 순서: `bun run test` -> `bun run lint` -> `bun run build`.

## Golden Rules

Immutable:

- API 키 값을 클라이언트로 내려보내지 않는다. `/api/config`는 키 존재 여부(boolean)만 반환한다 (server/index.ts:147-157). `.env`는 커밋 금지 (.gitignore:32).
- AI가 생성한 코드는 react-live `noInline` 모드로만 실행한다 (src/components/LivePreview.tsx:14). 이 모드는 코드 끝의 `render(<X />)` 호출이 있어야 그려진다.

Do:

- 서버 로직을 추가할 때 순수 함수는 `server/generator.ts`, `server/fallback.ts`처럼 부수효과 없는 모듈로 분리하고 테스트를 같이 둔다. `server/index.ts`는 import 시 `Bun.serve`가 실행되어 테스트할 수 없다 (server/index.ts:138, generator.ts:1-2 주석).
- 에러 분기는 현재 `message.includes('503'|'429')` 문자열 매칭에 의존하며, 이 문자열은 `callAnthropic`/`callGoogleModel`이 던지는 `... API error: ${status}` 형식에서 온다 (server/index.ts:85, 112, 194-206). 새 프로바이더를 추가하면 같은 형식으로 던지거나 분기를 함께 수정한다.
- 서버 포트를 바꾸면 `server/index.ts:139`와 `vite.config.ts`의 proxy target(3002)을 같이 수정한다. 두 곳에 하드코딩되어 있다.

Don't:

- 시스템 프롬프트 규칙(import 금지, 인라인 스타일만, TypeScript 문법 금지, render 호출 필수; server/index.ts:7-20)을 완화하지 않는다. 생성 코드는 react-live가 그대로 실행하므로 위반 시 미리보기가 깨진다.
- `stripCodeFences`/`ensureRenderCall` (server/generator.ts:5, 16)을 시스템 프롬프트를 믿고 제거하지 않는다. 프롬프트가 "펜스 없이, render 호출 포함"을 요구해도 모델이 어기는 경우를 서버에서 한 번 더 막는 이중 방어다.
- 서버 코드는 타입 체크 대상이 아니다. `tsconfig.app.json`은 `src`만, `tsconfig.node.json`은 `vite.config.ts`만 포함하므로 `bun run build`가 `server/`의 타입 오류를 잡지 못한다. 서버 수정 시 타입을 직접 신경 쓴다.

Asymmetry (수정 시 한쪽만 고치지 않는다):

- Google 경로에는 모델 폴백(`withModelFallback`, server/index.ts:5, 135)과 `MAX_TOKENS` 잘림 감지(index.ts:123)가 있지만 Anthropic 경로(index.ts:68-96)에는 둘 다 없다. 의도된 차이인지 확인하기 전에 "버그"로 단정하지 말고, 공통 동작을 바꿀 때는 두 경로를 모두 검토한다.

## Standards & References

- 커밋: 한국어, `feat|fix|refactor|chore: 요약` (docs/style/test 허용). 본문은 변경 이유가 불분명할 때만. 커밋은 `.claude/skills/commit`을 따른다.
- 코드/UI 문자열과 주석은 한국어 유지 (기존 파일 관례).
- TypeScript 설정 `erasableSyntaxOnly`, `verbatimModuleSyntax`: enum/namespace/parameter property 금지, 타입 import는 `import type`.
- 하위 규칙은 아래 Context Map 참고.

Maintenance Policy: 이 파일의 규칙과 실제 코드가 어긋나는 것을 발견하면 작업을 멈추고 업데이트를 제안한다. 근거로 적은 파일/라인이 이동했으면 함께 갱신한다.

## Context Map

- **[서버 수정 (Bun API 프록시)](./server/AGENTS.md)** — AI 호출, 폴백, 코드 정규화 로직 작업 시.
- **[프론트엔드 수정 (React UI)](./src/AGENTS.md)** — 컴포넌트, 훅, 미리보기, UI 테스트 작업 시.
