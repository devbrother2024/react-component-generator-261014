# server/AGENTS.md

Bun 런타임의 AI API 프록시. `/api/config`, `/api/generate`만 제공하며 프론트엔드는 Vite proxy로 접근한다.

## Tech Stack & Constraints

- Bun 전용 API 사용 (`Bun.serve`, `process.env`). Node 전용 서버 프레임워크(express 등) 도입 금지, HTTP 호출은 전역 `fetch`.
- 외부 AI SDK 의존성이 없다. Anthropic/Gemini 모두 REST를 직접 호출한다 (index.ts:69, 99). 새 프로바이더도 같은 방식을 따른다.
- 모델 ID는 코드에 하드코딩: Claude는 `callAnthropic` 내부 (index.ts:77), Gemini 우선순위는 `GOOGLE_MODELS` (index.ts:5).

## Implementation Patterns

- 순수 로직은 `generator.ts`, `fallback.ts`에 두고 같은 이름의 `*.test.ts`를 둔다. `index.ts`에는 로직을 늘리지 않고 호출만 조립한다.
- 응답은 항상 `Response.json(..., { headers: CORS_HEADERS })` 형태. 새 응답 경로에서 CORS 헤더 누락 금지 (index.ts:51-55).
- 키 우선순위: 클라이언트가 보낸 키 > 환경변수 (`resolveApiKey`, index.ts:64-66).

## Testing Strategy

- `bunx vitest run server/` 로 서버 테스트만 실행. jsdom 환경이지만 순수 함수 테스트라 무관하다.
- 테스트 대상은 `generator.ts`, `fallback.ts`뿐이다. `index.ts`(HTTP 핸들러, 외부 API 호출)는 테스트가 없으므로 핸들러를 고쳤다면 `bun run server` 후 `curl`로 `/api/config`, `/api/generate`를 직접 확인한다.

## Local Golden Rules

- Gemini 키는 요청 URL 쿼리(`?key=`)로 전달된다 (index.ts:99). 이 URL을 로그, 에러 메시지, 응답에 절대 포함하지 않는다. 현재 에러는 상태 코드만 담는다 (index.ts:85, 112). 유지할 것.
- 에러 메시지 포맷 `... API error: ${status}`를 바꾸지 않는다. 핸들러가 503/429를 이 문자열에서 추출한다 (index.ts:194-206).
- `withModelFallback`은 모든 에러(인증 오류 포함)에서 다음 모델로 넘어가고 마지막 에러만 던진다 (fallback.ts:12-19). 에러 종류별 분기를 넣으려면 `fallback.test.ts`부터 수정한다.
- Anthropic 경로에는 모델 폴백과 잘림(`stop_reason`) 처리가 없다. 추가한다면 Google 경로와 동작을 맞추고 둘 다 점검한다.
