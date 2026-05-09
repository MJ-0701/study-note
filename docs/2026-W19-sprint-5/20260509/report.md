---
phase: report
status: final
sprint_id: "2026-W19-sprint-5"
workspace: "2026-W19-sprint-5"
handoff_dir: "docs/2026-W19-sprint-5/20260509"
goal: ""
created_at: "2026-05-09T12:58:13+09:00"
last_touched_at: "2026-05-09T12:58:13+09:00"
closed_at: "2026-05-09T12:58:13+09:00"
---

# 보고서

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 결과

- 목표: 디공이 1 turn page (form + response + sources panel + mode toggle + consent banner) 를
  React + Vite 프론트엔드 + NestJS HTTP (`POST /api/v1/persona-turns`) 로 노출. UX-first
  per-slice cadence, sprint-3/4 invariant 보존.
- 상태: **done**
- 판정: **Gate 6 (Review) PASS** — codex CPO design lens, round 3 (2026-05-09T03:53:12Z),
  independence risk = warning. Gate 6 round 1~2 partial → round 3 PASS. Gate 3 round 1~4
  partial → round 5 PASS (사용자 수정 cycle 5).
- 한 줄 결과: AC1, AC3~AC12 모두 충족. AC2 (chunks endpoint) 는 *implement-driven reverse*
  (round 6 D-S5-2 third trigger by user) — 학습 use-case noise 로 판정되어 정직 제거.
  multi-turn 사용자 풀 신호 3차 누적 → sprint-6 priority 1 강화.

## 2. 완료한 것

- React + Vite scaffold (vite multi-entry — `/` lecture-reader 보존, `/persona-turn.html` 신규
  React entry). 신규 npm dep 10건 (`react`, `react-dom`, `@vitejs/plugin-react@^5.2.0`,
  `@types/react`, `@types/react-dom`, `marked`, `dompurify`, `@types/dompurify`,
  `class-validator`, `class-transformer`).
- NestJS HTTP controller `POST /api/v1/persona-turns` + DTO (`subject`, `query`, `k?`, `mode?`)
  + ValidationPipe (CLAUDE.md API conv `{errorCode, errorMessage}` exceptionFactory).
- Sprint-3 `resolveProviderMode(env)` → `resolveProviderMode(env, requestMode?)` *signature
  additive 확장* (D-S5-3 b lock). priority lock spec 1 case 추가, sprint-3 spec 4 회귀 PASS.
- Frontend persona-turn page: TurnForm (subject/query/k + disabled rule 3 case) + ResponsePanel
  (marked + DOMPurify + 응답 복사 버튼 — D-S5-2 trigger) + SourcesPanel (ord + pdfBasename +
  score 컴팩트 카드) + ModeToggle (데모/Claude 호출) + ConsentBanner (role=alert, 1초 delay).
- App.tsx state lifting (Gate 6 round 2 finding) — submitting state lift, stale clear
  (mode/form change), in-flight loading panel ("Claude 응답 생성 중... 30~60초").
- Markdown CSS (`.response-markdown` selector) — h1~h4 / p / strong / em / list / blockquote /
  code / pre / table / hr / a 명시 style. table border-collapse + th 회색 배경 등.
- `.env` 자동 write (db-persistent.mjs up) + Node `--env-file-if-exists=.env` flag (npm
  scripts dev:backend / ingest:pdf / persona:turn). 사용자 매번 `export DATABASE_URL=...`
  부담 0. dep 추가 0.
- Backend tests: **44/44 PASS** (sprint-4 38 + sprint-5 신규 6 — claude-cli priority 1 +
  persona-turn dto validation 3 + persona-turn controller happy 2). sprint-3 9 case 회귀 OK.
- Smoke: `npm run smoke:persona-turn` (fixture) PASS — sprint-3 CLI lane 회귀 0.
- Claude CLI default timeout 30s → 90s 상향 (sprint-4 retro K5 carry).
- README sprint-5 단락 — HTTP endpoint shape + multi-entry + 3 터미널 dev 흐름 + 화면 구성.

## 3. 결정

- **Q1 = B (React + Vite)** — 사용자 explicit override (권장 A=vanilla TS 채택 안 함). 4 페르소나/multi-turn 확장 시 component 추상화 정당.
- **Q2 = A (per-slice cadence)** — 슬라이스 5건 (S1~S5) 각 끝마다 사용자 review paste 누적 (총 5건 lock).
- **Q3 = A (단일 turn page)** — sprint-3/4 의 1-turn stateless contract 와 일치, multi-turn 분리.
- **Q4 = B → A (round 6 reverse)** — 초기 chunk text 200 chars inline lock 후 사용자 S4 review 에서 학습 use-case noise 로 판정 → C 옵션 채택, chunks endpoint 까지 함께 제거 (정직 코드 청결).
- **Q5 = A (stdout schema 그대로 emit)** — sprint-3 invariant 보존. round 6 reverse 후에도 동일.
- **D-S5-1 (vite entry) lock = (a)** — multi-entry, 기존 `/` lecture-reader 보존.
- **D-S5-2 (UX 조정) trigger 3건** — (1) 응답 복사 버튼 추가 (S3 review by user), (2) chunks endpoint reverse (S4 review by user), (3) markdown CSS patch (Gate 6 round 3 codex finding).
- **D-S5-3 (mode toggle) (b) additive signature 확장** — `resolveProviderMode(env, requestMode?)`. sprint-3 invariant 약한 수정, priority lock spec 으로 명시.
- **D-S5-3 신규 (multi-turn carry-over)** — 3차 신호 누적, sprint-6 priority 1.
- 모든 결정 reversibility = brainstorm.md §6 reversibility 표 + plan §0 self-CPO summary.

## 4. 검증

- 명령/체크 (자동):
  - `npm run build:frontend` exit 0 (45 modules, persona-turn bundle ~268kB).
  - `npm run test:backend` **44/44 PASS** (12 suites).
  - `npm run smoke:persona-turn` (fixture) PASS — sprint-3/4 회귀 0.
  - `curl POST /api/v1/persona-turns` (fixture / real / validation 4xx) 모두 동작.
  - cross-file invariant: ADR 0004 본문 + persona invariant 텍스트 + locked stdout schema 9 필드 변경 0.
- 결과: Gate 6 verdict = pass (round 3, design lens). blocking finding 0건. 2 retro carry-over 명시.
- 수동 확인 (사용자 직접 화면 review):
  - S1: React scaffold 빈 페이지 + console error 0 (paste).
  - S2: turn form mock submit (1초 disabled → JSON 표시) (paste).
  - S3: backend HTTP fixture E2E (provider=claude-cli-fixture, sources 5, isFallback false) (raw JSON paste).
  - S4 round 1: chunk text inline 200 chars → 사용자 "보는게 너무 불편" 풀 신호 → round 2 reverse (chunks endpoint 제거).
  - S4 round 2: 컴팩트 sources panel (ord+pdf+score) confirm.
  - S5: real Claude CLI 1 turn (provider=claude-cli, D2 톤 + 시험 우선순위 5단계 + chunk verbatim 인용 + page p.4-7) — multi-turn 1차 신호.
  - Gate 6 round 2 추가: F1 stale + F2 in-flight + F3 copy 모두 OK + multi-turn 2차 신호.
  - Gate 6 round 3+4: markdown CSS + .env 자동 load 모두 동작 + multi-turn 3차 신호 (디공이 self-aware 우회 패턴).

## 5. 위험 / 후속

- 위험:
  - **Multi-turn 미구현** = 학습 도구 use-case incomplete (페르소나 invariant "수준 탐색 질문" 발동 시 사용자 답할 UI 0). sprint-6 priority 1 강제.
  - **AC2 (chunks endpoint) reverse** 가 sprint-3 invariant 약한 변경 트리거. 기존 spec 그대로 PASS, 그러나 향후 sprint 의 chunk 본문 재도입 시 (예: PDF page metadata + chunk preview UI) endpoint 재구축 필요.
  - **Stale chunk-endpoint frontmatter 텍스트** (codex 명시) — implement.md frontmatter `implementation_reverse_note` 가 reverse 명시했지만 codex 가 stale 인식. cosmetic, sprint-6 시작 시 cleanup.
  - **Generator metadata `unknown`** (sprint-3/4/5 systemic) — independence risk warning 영구. SFS runtime upgrade 필요 (이미 sprint-4 retro 명시).
  - **Dev infra 불완전** — `db:up-persistent` + `--env-file-if-exists` 로 export 부담 0 됐지만 mysql + backend + frontend 가 *3 터미널* 필요. full docker compose 통합은 sprint-5.5 hotfix 또는 sprint-6 sub-item.
  - **Codex review prompt size 한계** (sprint-3 9 round 트라우마와 같은 systemic) — round 4 G15 patch 의 §0 frontmatter 압축 summary 패턴으로 우회 정착. 그러나 SFS upstream 개선 필요.
- 후속 (retro §3 / §4 동기): multi-turn / MCP server / docker compose 통합 / 4 페르소나 / Bedrock provider / PDF page metadata / Self-CPO checklist v3 / Plan SSoT cascade lint / stale frontmatter cleanup. 모두 §3 우선순위 정렬.

## 6. 남긴 것 / 접은 것

- 남김 (durable, repo 에 commit):
  - `persona-turn.html` (root) + `src/persona-turn/**` (main.tsx, App.tsx, components 5개,
    api/personaTurns.ts, styles.css)
  - `backend/src/persona/persona-turn.controller.ts` + `dto/persona-turn-request.dto.ts`
  - `backend/src/persona/services/persona-turn.service.ts` (M, requestMode additive)
  - `backend/src/persona/providers/claude-cli.provider.ts` (M, signature 확장 + timeout 90s)
  - `backend/src/main.ts` (M, ValidationPipe + exceptionFactory)
  - `backend/src/persona/__tests__/persona-turn.controller.spec.ts` (5 case)
  - `backend/src/persona/providers/__tests__/claude-cli.provider.spec.ts` (M, +1 priority case)
  - `vite.config.ts` (M, react plugin + multi-entry)
  - `tsconfig.json` (M, jsx: react-jsx)
  - `package.json` (M, +10 deps + 4 npm scripts + --env-file-if-exists flag)
  - `scripts/db-persistent.mjs` (M, .env auto-write + STUDY_NOTE_USE_EXISTING_DB guard)
  - `README.md` (M, sprint-5 web UI 단락)
- 공개 archive (`docs/2026-W19-sprint-5/20260509/`):
  - `retro.md` + `report.md` (본 문서). 새 SFS layout (sprint-3/4 와 다름 — `.sfs-local/` 에서 `docs/<workspace>/<yyyyMMdd>/` 으로 이동).
- private archive (`.sfs-local/sprints/2026-W19-sprint-5/`):
  - brainstorm.md / plan.md / implement.md / review.md — round-by-round detail 보존.
- 접은 것 (plan §4.2 비범위 + sprint-5 안 명시 reverse): multi-turn / 4 페르소나 / vector store / 학기 batch / page metadata / 인증 / 모바일 polish / streaming / chunks endpoint (round 6 reverse).

## 7. 다음

- **즉시**: 사용자 터미널에서 `git push origin main` (ahead 5 commits — sprint-4 1 + sprint-5 4: `4e9c523`, `d33c1e9`, `2312b76`, `ce5f52c`, `6a048f8`). 사용자 PDF 정책 결정 후 (sprint-4 retro carry).
- **즉시 (사용자 명시)**: `sfs adopt --id legacy-baseline "패치된 문서/파일정리 정책 재적용" --apply` (또는 비슷한 flag — `sfs adopt --help` 로 확인). sprint-5 정상 close 후라 archive 안전.
- **sprint-6 candidate (priority 정렬)**:
  1. Multi-turn (대화 history) — backend Conversation/Turn entity + history persist + system prompt history inject + frontend chat-style state.
  2. MCP server 구축 + Provider 분기 architecture — 사용자 명시 의도 (web hosting demo + user 자기 LLM via MCP). brainstorm hard depth 로 정식 결정.
  3. Full docker compose 통합 (sprint-5.5 hotfix 가능).
  4. 페르소나 전 과목 (PersonaRegistry) + 4 페르소나.
  5. PDF page metadata preservation + 학기 batch ingest.
  6. Bedrock provider for mj.
  7. Self-CPO checklist v3 + Plan SSoT cascade lint.
  8. Stale frontmatter cleanup.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (113 tracked files), domains=0, last_review=pass, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T12:58:13+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
