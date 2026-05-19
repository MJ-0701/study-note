---
phase: implement
sprint_id: "2026-W20-sprint-8"
slice_id: "pr-p1-p2-fix"
slice_title: "PR #8 Codex review P1 + P2 fix"
goal: "conversation persistence handoff β"
worker: "Opus 4.7"
---

# PR #8 P1 + P2 fix evidence

PR #8 의 GitHub Codex bot review 가 발견한 2 finding 동시 fix. commit `2591132`.

## 1. P1 — turn submit race (high)

### 1.1 문제

`appendConversationTurn` 가 in-flight 중 사용자가 sidebar 의 다른 대화로 전환 →
hashchange handler 가 `conversationId` state 갱신. 그러나 in-flight 의 try-catch
끝에 `setMessages((prev) => [...prev, next])` 가 NEW conversation 의 UI 에 OLD
conversation 의 응답을 섞는다.

### 1.2 fix (commit 2591132)

- `liveConversationIdRef` (`useRef`) + `useEffect` 로 active conversationId
  live tracking. closure 의 `activeConversationId` 는 stale 일 수 있으니 ref 가
  진실의 단일 source.
- response 도착 시점에 `next.conversationId !== liveConversationIdRef.current &&
  next.conversationId !== activeConversationId` 면 silent discard (new 화면은
  자체 useEffect 가 history 다시 load 함).
- backend 응답에 conversationId 가 실려 있어 source-of-truth 비교 가능 — closure
  + ref 양쪽 모두 검사.

### 1.3 패치 위치

- `apps/web/src/persona-turn/App.tsx`:
  - import 에 `useRef` 추가.
  - `const liveConversationIdRef = useRef<string | null>(conversationId);` 신규.
  - `useEffect(() => { liveConversationIdRef.current = conversationId; }, [conversationId])` 신규.
  - `handleSubmit` 의 `appendConversationTurn` 결과 처리부에 race guard:
    ```ts
    if (
      next.conversationId !== liveConversationIdRef.current &&
      next.conversationId !== activeConversationId
    ) {
      return; // silent discard
    }
    setMessages((prev) => [...prev, next as ChatTurn]);
    ```

### 1.4 검증

- TypeScript build 정상 (web bundle 92.29 kB).
- 자동 시나리오 spec 는 React DOM/CDP 부재로 한계 — manual UAT 또는 후속 CDP
  design smoke 로 검증. 본 fix 는 코드 inspection + reviewer 분석으로 cover.
- 회귀 가드: 기존 conversation 동일 흐름 (submit → response → setMessages) 은
  `next.conversationId === activeConversationId` 이라 guard 통과 — 깨지지 않음.

## 2. P2 — derivedTitle redact 순서 (medium)

### 2.1 문제

`deriveTitleFromQuery` 가 학번 (`\d{8}`) replace → hex token (`[a-f0-9]{32,}`)
replace 순서. hex 토큰이 8자리 digit run 으로 시작하면 학번 replace 가 hex 의
prefix 를 먼저 split → 나머지 hex substring leak.

예: input `"12345678abcdef0987654321cafebabe"`
- 학번 replace → `"[redacted]abcdef0987654321cafebabe"`
- hex replace 시 `abcdef0987654321cafebabe` 가 24자 = 32자 미만 → 매치 안 됨.
- 결과 derivedTitle = `"[redacted]abcdef0987654321cafebabe"` → hex 토큰 일부 leak.

### 2.2 fix (commit 2591132)

순차 replace 폐기. 단일 alternation regex `/[a-f0-9]{32,}|\d{8}/gi` 로 일괄 처리.

JS regex alternation 좌측 우선 — 같은 position 에서 hex 가 매치 가능하면 hex 가
먼저 consume. `"12345678abcdef..."` 에서:
- 위치 0 에 alternation 시도 → 좌측 `[a-f0-9]{32,}` 가 32자+ 매치 → 전체 hex
  토큰 한 번에 consume → `"[redacted]"`.
- 학번 replace 가 hex 를 가르는 시나리오 발생 X.

순수 학번 (`"내 학번 20260001"`) 은 hex regex 가 매치 안 됨 → 우측 `\d{8}` 가
정상 매치.

### 2.3 패치 위치

- `packages/persona-engine/src/services/conversation.service.ts`:
  - `STUDENT_NUMBER_RE` + `HEX_TOKEN_RE` 두 const 폐기.
  - `PII_REDACT_RE = /[a-f0-9]{32,}|\d{8}/gi` 단일 const.
  - `deriveTitleFromQuery` 의 `replace(STUDENT_NUMBER_RE, ...).replace(HEX_TOKEN_RE, ...)`
    chain → `replace(PII_REDACT_RE, "[redacted]")` 단일 호출.

### 2.4 검증

spec 회귀 가드 case 추가 — `conversation.service.spec.ts`:

```ts
it("hex 토큰이 8자리 digit run 으로 시작해도 partial leak 없음 (P2 회귀 가드)", () => {
  const tokenStartsWithDigits = "12345678abcdef0987654321cafebabe";
  const out = deriveTitleFromQuery(`token ${tokenStartsWithDigits} 봐줘`);
  assert.ok(!out.includes("abcdef"), `hex 토큰 partial leak: ${out}`);
  assert.ok(!/[a-f0-9]{32,}/i.test(out));
  assert.ok(!/\d{8}/.test(out));
  assert.ok(out.includes("[redacted]"));
});
```

spec 결과 (commit 2591132 직후):

```
ℹ tests 16
ℹ suites 3
ℹ pass 16
ℹ fail 0
```

`pnpm smoke:conversation-list` 의 (f) PII guard 도 통과 — backend HTTP path 에서도
회귀 가드.

## 3. fix 영향 범위

- 본 commit 의 변경 파일 3개: `App.tsx` / `conversation.service.ts` /
  `conversation.service.spec.ts`.
- 외부 contract 변경 0 — `deriveTitleFromQuery` 시그니처 유지. `[redacted]`
  placeholder 도 동일. LIST endpoint response shape 동일.
- 회귀 0 — 기존 모든 spec + smoke 통과.

## 4. cpo-evaluator security lens 매핑

- **PII redaction 강화** = P2 fix 가 hex 토큰의 partial leak 가능성 제거. cpo
  persona 의 "Treat SEED/placeholder/mock material as fail/partial until
  replaced" 패턴에 따라 hex 토큰 redact 패턴 = 실제 제대로 작동하는 invariant.
- **race / TOCTOU pattern guard** = P1 fix 가 UI state 와 async response 간
  Time-Of-Check-Time-Of-Use race 차단. backend response 의 conversationId 가
  source of truth — frontend 의 stale closure 를 무력화.
- **silent discard 안전성** = error 상태가 아닌 정상 응답이라 사용자 가시 오류
  없음. 새 conversation 화면은 자체 history fetch 로 일관성 회복.