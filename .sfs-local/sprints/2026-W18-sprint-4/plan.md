---
phase: plan
gate_id: G1
sprint_id: "2026-W18-sprint-4"
goal: "해당 프로젝트는 시험 대비를 위한 lectture note임"
created_at: "2026-05-01T22:20:27+09:00"
last_touched_at: 2026-05-01T22:28:52+09:00
---

# Plan — 시험 대비 Lecture Note v1

> Sprint **G1 — Plan Gate** 산출물. 본 문서의 목적은 **요구사항·AC 의 측정 가능성 확보**.
> 변경 이력은 `.sfs-local/events.jsonl` 의 `phase_change` / `gate_review` event 로 추적.
> SSoT: `05-gate-framework.md §5.1` (Gate 매트릭스).
> 입력 기준: 같은 sprint 의 `brainstorm.md` (G0) 를 먼저 읽고 작성한다.
> 생명주기: 본 문서는 진행 중 sprint contract 이다. Close 후 최종 scope/AC/결과만
> `report.md` 에 남고, 본 파일은 compact stub 로 줄어든다.

---

## §1. 요구사항 (Requirements)

본 sprint 가 풀어야 할 문제 / 사용자 니즈 / 비즈니스 입력. 1줄 요약 + 배경 컨텍스트.

- [x] R1: 시험 직전 사용자는 교수님 PDF/강의노트/중요 키워드에서 시험에 나올 핵심 개념만 빠르게 읽고 이해할 수 있어야 한다.
  - 배경: 중간고사 때 Notion 요약본은 양이 방대해지고 페이지가 분리되어, 핵심 개념 우선순위와 읽기 흐름이 무너졌다.
- [x] R2: v1 대상 사용자는 "직장인 전형 대학생인 사용자 + 같은 수업을 듣는 소수 동기"로 고정한다.
  - 운영 가정: 대중 공개 서비스가 아니라 제한된 공유/읽기 경험을 먼저 검증한다.
- [x] R3: Lecture note 는 최소한 다음 domain object 를 표현해야 한다.
  - `Course`: 과목.
  - `ExamScope`: 중간/기말 등 시험 단위와 범위.
  - `SourceMaterial`: 교수님 PDF/강의자료/Claude 생성 note 등 원자료 메타데이터.
  - `RequiredKeyword`: 교수님이 시험에 나온다고 하거나 중요하다고 언급한 키워드.
  - `Concept`: 시험 대비 핵심 개념, 쉬운 설명, 연결 개념, 출처 힌트.
  - `ExampleQuestion`: 개념 적용/암기 확인용 예제문제와 해설.
  - `SharePolicy`: 개인/동기 공유 여부와 원문 공개 제한.
- [x] R4: 첫 구현 slice 는 자동 생성 파이프라인이 아니라 **Vite 기반 lecture note reader + typed sample schema/fixture** 로 좁힌다.
  - 이유: repo 에 현재 product source/package scaffold 가 없고, 사용자의 핵심 pain 은 "생성" 이전에 "시험 직전 읽기 흐름과 핵심 우선순위" 문제다.
  - stack 전제: `Decision 0001 — Stack lock-in: NestJS + Vite + MySQL + S3 + .env` 에 따라 frontend 는 Vite SPA 를 기본으로 둔다.
- [x] R5: AI 생성, PDF 파싱, 영상/오디오 생성은 v1 reader 구조와 note schema 가 검증된 뒤 붙인다.
  - 이유: PDF 파싱, prompt, 출처 추적, 비용, hallucination 검증을 한 번에 넣으면 sprint 범위가 터진다.
- [x] R6: 교수님 PDF 원문과 생성 note 의 공유 범위는 안전하게 제한해야 한다.
  - 기본 정책: v1 에서는 raw PDF 공개 공유 금지. 생성 note reader 만 제한 공유 후보로 둔다.
- [x] R7: 최종 reader 는 4과목을 과목별로 분리하고, 각 과목 안에서 과목별 총정리와 n주차별 note 를 모두 표현해야 한다.
  - 배경: 사용자는 "과목별은 당연히 나눠야 되고, 주차별도 나눠야 되며, 과목별 총정리 페이지가 있어야 한다"고 구현 중 요구사항을 명확히 했다.
  - UI 구조: 전체 시험 대시보드 → 과목별 총정리 → 주차별 note.
- [x] R8: 홈 화면은 모든 내용을 펼친 싱글페이지가 아니라, 전체 현황을 보고 과목으로 진입하는 홈답게 쓰여야 한다.
  - UI 구조: `#/` 홈, `#/subjects/<subject>` 과목 총정리, `#/subjects/<subject>/weeks/<week>` 주차별 note.
- [x] R9: Bedrock/API 자동 생성 없이, 사용자가 로컬에서 Claude로 만든 JSON 파일을 브라우저에서 불러와 앱 데이터로 투입할 수 있어야 한다.
  - 운영 방식: raw PDF는 `local-materials/` 같은 로컬 전용 폴더에 보관하고, 검수한 `study-note.week-note.v1` JSON만 과목별 브라우저 local import로 reader에 반영한다.
- [x] R10: 자료 투입은 전역 업로드 한 곳이 아니라 과목별 화면에서 이루어져야 한다.
  - 안전장치: 선택한 과목 route 의 subject id 와 JSON `subjectId` 가 다르면 반영하지 않는다.
- [x] R11: 실제 대상 과목은 디지털공학개론, 정보통신개론, C언어, 컴퓨터개론 4과목으로 고정한다.
  - 기존 Notion 원본 URL은 홈에서 reference link로 보존한다: `https://www.notion.so/1-33ff019a655181a1813ae6a1ad37a02a`.
- [x] R12: 키워드/주차/과목 화면은 단순 상태 노출이 아니라, 시험 직전 바로 읽을 수 있는 간단 정리노트를 생성하는 액션을 제공해야 한다.
- [x] R13: 주요 사용 환경은 태블릿 PC와 모바일이므로 desktop-first 고정 레이아웃이 아니라 responsive grid/touch layout을 우선해야 한다.
- [x] R14: 주말학사과정의 실제 수업 흐름에 맞춰 주차 기반 내비게이션을 수업일 날짜 기반 내비게이션으로 바꿔야 한다.
  - 일정 기준: 중간 이후 첫 수업은 2026년 4월 30일(목), 다음 수업은 2026년 5월 2일(토), 기말고사와 종강 예정일은 2026년 6월 13일(토)이다.
  - UI 기준: 사이드바와 과목/수업일 카드에서는 "8주차/10주차"가 아니라 "4월 30일(목)/5월 2일(토)"처럼 표시한다.

## §2. Acceptance Criteria (AC, 측정 가능)

각 요구사항에 대해 **측정 가능한 통과 조건** 정의. "되면 안 되는 것" (anti-AC) 도 명시.

- [x] AC1: G1 plan 은 대상 사용자, 문제, 성공 상태를 각각 1문장 이상으로 명시한다 — verify by `plan.md §1`.
- [x] AC2: G1 plan 은 lecture note 의 최소 domain object 7개 이상을 명시한다 — verify by `plan.md §1 R3`.
- [x] AC3: G1 plan 은 첫 구현 slice 를 하나로 고정한다: "Vite lecture note reader + typed sample schema/fixture" — verify by `plan.md §1 R4`, `§5 CTO Generator`.
- [x] AC4: 첫 구현 slice 가 완료되면 sample lecture note 에서 다음 5개 reader 영역이 한 화면 흐름으로 렌더링되어야 한다 — verify by browser/manual smoke:
  - 시험 범위/과목 header.
  - 필수 키워드 coverage.
  - 핵심 개념 목록과 쉬운 설명.
  - 예제문제와 해설.
  - 출처/공유 제한 안내.
- [x] AC5: 각 `RequiredKeyword` 는 covered/missing 상태와 연결된 `Concept` id 를 표현할 수 있어야 한다 — verify by typed fixture 또는 schema test.
- [x] AC6: raw professor PDF 를 public URL 로 노출하지 않는다 — verify by code review: fixture/source metadata 는 있어도 PDF file serving/share 기능은 없음.
- [x] AC7: 구현 후 최소 검증은 `npm` 기반 install/build 또는 사용 가능한 local smoke command 로 수행하고, 실패 시 `log.md` 에 원인을 기록한다 — verify by command output evidence.
- [x] AC8: reader fixture 는 4개 과목과 각 과목별 `SubjectSummary`, `WeekNote[]` 를 표현해야 한다 — verify by typed fixture and UI smoke.
- [x] AC9: sidebar 또는 본문 navigation 에서 각 과목의 총정리와 주차별 note 로 직접 이동할 수 있어야 한다 — verify by anchor ids.
- [x] AC10: 홈 route 는 전체 현황, 과목 카드, 보강 필요 주차, 공유 원칙만 보여주고 과목 상세/주차 상세를 직접 펼치지 않는다 — verify by `src/main.ts` route rendering and bundle smoke.
- [x] AC11: `#/intake` route 는 서버 업로드/Bedrock 없이 PDF, 키워드, Claude JSON, 앱 fixture의 역할과 보관 위치를 설명해야 한다 — verify by source/build smoke.
- [x] AC12: 과목별 intake route 에서 `study-note.week-note.v1` JSON 파일을 선택하면 runtime validation 후 브라우저 localStorage에 병합되고, 과목/주차 reader에서 바로 접근 가능해야 한다 — verify by build and static import smoke.
- [x] AC13: 실제 JSON 파일 선택은 `#/subjects/<subject-id>/intake` 에서만 가능하고, JSON `subjectId` 가 현재 과목과 다르면 import가 실패해야 한다 — verify by source/build smoke.
- [x] AC14: fixture, routes, examples, and bundle include the new 4 subject names/ids and no longer use the old placeholder subject ids — verify by source/build smoke.
- [x] AC15: 과목, 주차, 키워드 카드에서 정리노트 생성 액션을 눌렀을 때 현재 fixture 기반 미니 정리노트 또는 보강 템플릿이 렌더링되어야 한다 — verify by source/build smoke.
- [x] AC16: 1100px 이하 tablet layout, 820px 이하 mobile/tablet layout, 520px 이하 small-mobile layout이 CSS에 존재하고 주요 버튼/링크 touch target은 44px 이상이어야 한다 — verify by CSS smoke.
- [x] AC17: 사용자에게 보이는 수업 단위 navigation/copy/example JSON은 주차 표현 대신 날짜 표현을 사용해야 하며, 사이드바에는 2026-04-30부터 2026-06-13까지의 목/토 수업 일정과 기말/종강 표시가 있어야 한다 — verify by source/build smoke.

Anti-AC:

- [x] Anti-AC1: 첫 구현 slice 에서 PDF 텍스트 추출/RAG/AI note generation 을 구현하지 않는다.
- [x] Anti-AC2: 첫 구현 slice 에서 영상/오디오 생성 기능을 구현하지 않는다.
- [x] Anti-AC3: 교수님 PDF 원문을 동기에게 공개 공유하는 기능을 구현하지 않는다.
- [x] Anti-AC4: 로그인/권한/결제/다수 학교 확장 기능을 구현하지 않는다.

## §3. 범위 (Scope)

- **In scope**:
  - G1 산출물: lecture note v1 요구사항, AC, anti-AC, 첫 구현 slice 계약.
  - 구현 후보: Vite SPA scaffold, typed lecture note schema/fixture, reader UI prototype.
  - reader UX: 시험 범위 중심 header, 필수 키워드 coverage, 핵심 개념 카드/목록, 예제문제, 출처/공유 제한 안내.
  - reader IA: 4과목 대시보드, 과목별 총정리, n주차별 note.
  - local intake/import: 서버 업로드 없이 로컬 자료와 Claude 산출 JSON을 과목별 브라우저 화면에서 검증하고 reader state로 반영하는 화면.
  - domain language 고정: StudyNotebook, SubjectNote, SubjectSummary, WeekNote, SourceMaterial, RequiredKeyword, Concept, ExampleQuestion, SharePolicy.
- **Out of scope**:
  - PDF upload/parser/storage.
  - AI 자동 요약/문제 생성.
  - RAG, vector search, OCR, prompt tuning 자동화.
  - 영상/오디오 생성.
  - NestJS API, MySQL persistence, S3 upload integration.
  - public share link, login/auth, 사용자별 권한 관리.
  - 여러 학교/여러 과목을 대상으로 한 범용 플랫폼화.
- **Dependencies / Decisions**:
  - Stack dependency: `Decision 0001 — Stack lock-in: NestJS + Vite + MySQL + S3 + .env` 를 따른다.
  - Codebase status: 현재 visible repo 에 product source scaffold 가 없으므로 첫 구현은 scaffold 생성부터 시작할 수 있다.
  - Default decision A: v1 첫 구현은 reader/schema 우선. AI 생성은 후속 sprint 로 넘긴다.
  - Default decision B: 첫 화면 단위는 전체 시험 notebook 으로 둔다. 내부 구조는 4과목 → 과목별 총정리 → n주차 note 이다.
  - Default decision C: 공유는 v1 에서 "제한 공유를 고려한 read-only reader" 까지만 설계하고, 실제 auth/share link 는 후속 sprint 로 넘긴다.
  - User decision point: 사용자가 "AI 생성부터"를 강하게 원하면 본 plan 을 다시 좁혀 PDF+keyword prompt contract sprint 로 전환한다.

## §4. G1 Gate 자기 점검

- [x] R/AC 가 측정 가능 (정량 또는 binary)
- [x] 범위가 sprint 1개 안에서 닫힘
- [x] 의존성 / 결정 대기 항목이 명시됨

> 본 체크리스트 통과 = `/sfs review --gate G1` 진입 조건. verdict (pass / partial / fail) 는 `review.md` 에 기록.

## §5. Sprint Contract (Generator ↔ Evaluator)

`brainstorm.md` 의 G0 맥락을 기반으로 이번 sprint 의 실행 계약을 명시한다.
역할 흐름은 **CEO → CTO Generator ↔ CPO Evaluator → CTO 구현 → CPO 리뷰 → CTO rework/final confirm → retro** 이다.

- **CEO 요구사항/plan 결정**:
  - 문제 정의: 시험 직전, Notion/긴 PDF 요약/분리된 페이지 구조 때문에 핵심 개념 우선순위와 읽기 흐름이 무너진다.
  - 최종 목표: 교수님 PDF 와 중요 키워드를 기반으로 만든 기말고사 대비 lecture note 를, 동기들과 공유해도 한 화면 흐름으로 빠르게 읽고 이해할 수 있게 한다.
  - 이번 sprint 에서 채택할 옵션: `brainstorm.md §4 Option B — 작은 MVP: 시험범위 중심 Lecture Note Reader`.
  - 이번 sprint 에서 버릴 것: AI 자동 생성, PDF parser, 영상 생성, auth/share link, backend persistence.
- **CTO Generator 가 만들 것**:
  - persona: `.sfs-local/personas/cto-generator.md`
  - reasoning_tier: `strategic_high` for architecture/contract; worker 실행은 `execution_standard`
  - model profile source: `.sfs-local/model-profiles.yaml`
  - selected runtime / policy: `claude` / `solon_recommended` (configured in `.sfs-local/model-profiles.yaml`)
  - fallback when unset: current runtime model
  - preferred executor: current Codex runtime for this session, with independent review via configured CPO executor where available
  - implementation worker persona: `.sfs-local/personas/implementation-worker.md`
  - 산출물:
    - Vite/TypeScript product scaffold if missing.
    - Typed lecture note schema or domain model.
    - Sample fixture representing 4 subjects with subject summaries and weekly notes.
    - Reader UI that renders whole-exam dashboard, subject summaries, week notes, keyword coverage, concept explanations, example questions, and source/share warning.
    - Minimal build/smoke evidence in `log.md`.
  - 변경 파일/모듈:
    - `package.json`, `index.html`, `tsconfig*.json`, `vite.config.*` if scaffold is missing.
    - `src/` frontend files for domain model, fixture, UI components, styles.
    - `.sfs-local/sprints/2026-W18-sprint-4/implement.md` and `log.md` for implementation evidence.
  - 구현하지 않을 것:
    - NestJS backend/API.
    - MySQL schema/migration.
    - S3 upload/download.
    - PDF parsing or AI generation.
    - auth/share link.
- **CPO Evaluator 가 검증할 것**:
  - persona: `.sfs-local/personas/cpo-evaluator.md`
  - reasoning_tier: `review_high`
  - preferred executor: different runtime/instance from implementation when available; `codex` or `claude` bridge acceptable depending on auth.
  - self-validation 방지: 구현한 agent/tool 과 다른 evaluator instance/tool 사용 권장
  - AC 검증 방법:
    - Plan-to-code trace: implemented reader maps to AC4, AC5, AC8, and AC9.
    - Browser/manual smoke: 4 subjects are separated, each subject has a summary, and week notes are reachable without Notion-like page hopping.
    - Static/build check: local build or equivalent command passes.
    - Risk check: raw PDF/public share/AI generation are not accidentally included.
  - 회귀/위험 체크:
    - 제품 source scaffold 가 과도하게 커지지 않았는가.
    - UI 가 과목/시험범위/키워드/개념/문제 구조를 혼동하지 않는가.
    - "핵심 개념 우선순위"가 UI 에서 드러나는가.
    - 저작권/공유 제한 문구가 reader 안에서 보이는가.
  - 통과/부분통과/실패 기준:
    - pass: reader prototype, typed fixture/schema, smoke evidence, anti-AC 준수 모두 확인.
    - partial: reader 는 있으나 keyword coverage, example question, source/share warning 중 일부 누락.
    - fail: 첫 slice 가 AI/PDF/backend 등으로 확장되어 AC 검증이 불가능하거나, build/smoke evidence 가 없다.
- **CTO ↔ CPO 재작업 계약**:
  - CPO `pass`: 최종 통과 + retro 진입
  - CPO `partial`: 지정된 항목만 CTO 재구현 후 재리뷰
  - CPO `fail`: plan/scope 재검토 또는 구현 재작업
- **사용자 최종 결정이 필요한 지점**:
  - 첫 구현 전에 사용자가 "AI 생성부터"를 원하면 구현 slice 를 전환한다.
  - 실제 과목명/시험범위/필수 키워드가 있으면 sample fixture 를 실제에 가깝게 교체한다.
  - 동기 공유 방식을 로그인, 공유 링크, 공통 계정 중 무엇으로 할지는 후속 auth/share sprint 에서 결정한다.

## §6. Phase 1 구현 Backlog Seed

1. **Reader scaffold**: Vite/TypeScript SPA scaffold + single exam-scope reader route.
2. **Lecture note schema**: Course, ExamScope, SourceMaterial, RequiredKeyword, Concept, ExampleQuestion, SharePolicy model.
3. **Sample note fixture**: 실제 강의 PDF 가 없어도 UI 를 검증할 수 있는 기말고사 대비 sample data.
4. **Keyword coverage UI**: 필수 키워드 covered/missing 상태와 연결된 concept 표시.
5. **Concept reader UI**: 핵심 개념, 쉬운 설명, 연결 개념, 출처 힌트를 시험 직전 읽기 흐름으로 배치.
6. **Example questions UI**: 개념별 예제문제, 정답/해설 토글 또는 섹션.
7. **Source/share warning**: 원문 PDF 비공개, 생성 note 제한 공유 원칙 표시.
8. **Manual authoring flow**: Claude 가 만든 note/키워드를 사람이 붙여넣어 fixture 또는 draft note 로 만드는 form.
9. **AI generation contract**: PDF + keyword input -> note JSON/Markdown output prompt, coverage checker, hallucination guard.
10. **Backend persistence**: NestJS API + MySQL schema + S3 source storage. `Decision 0001 — Stack lock-in: NestJS + Vite + MySQL + S3 + .env` 적용.
11. **Private sharing**: small cohort read-only sharing; auth/share link 방식은 별도 decision 필요.
12. **Video/audio generation**: note 품질 검증 후 후속 실험.

First implementation command candidate:

```text
/sfs implement "Vite lecture note reader prototype with typed schema and sample fixture"
```
