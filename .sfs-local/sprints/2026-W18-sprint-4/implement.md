---
phase: implement
status: in-progress
sprint_id: "2026-W18-sprint-4"
goal: "해당 프로젝트는 시험 대비를 위한 lectture note임"
created_at: "2026-05-01T22:20:27+09:00"
last_touched_at: 2026-05-02T09:29:00+09:00
---

# Implement — Vite Lecture Note Reader Prototype

> Implementation execution artifact. This file records the work slice, code
> changes, and verification evidence. It is not a substitute for changing code.
> AI implementation must preserve system design, not only satisfy the nearest
> edit request.
> 생명주기: 구현 중에는 evidence 를 충분히 남기되, close 후 최종 변경/검증 요약은
> `report.md` 로 압축된다. 본 파일은 완료 뒤 compact stub 대상이다.

---

## §0. AI Coding Guardrails — Harness / Design / DDD / TDD

AI coding fails when it optimizes for the nearest change while ignoring the
system design. Treat bad code as expensive: unclear domain language, weak tests,
and irregular structure make future AI edits worse.

The first four guardrails are mandatory for code implementation, not just for
the final report. `/sfs implement` is complete only when the code slice is
small, scoped, verified, and ready to summarize.

- **Think before coding**: name assumptions, trade-offs, and success criteria
  before editing when the request is ambiguous.
- **Simplicity first**: implement the smallest code and document surface that
  proves the AC. Do not add flexibility or ceremony for imagined futures.
- **Surgical changes**: every changed line must connect to the requested slice.
  Leave unrelated cleanup as a finding or follow-up.
- **Goal-driven execution**: finish with verification evidence, not confidence.
- **Shared design concept first**: before editing, name the intended design,
  module boundary, and why this slice belongs there.
- **DDD language**: use the project's domain terms consistently in code,
  tests, filenames, and this artifact. If terms are missing, record them before
  implementing.
- **TDD feedback loop**: prefer a small failing/covering test first, then make
  it pass, then refactor. If a true test-first loop is impractical, record the
  reason and run the smallest useful verification before widening scope.
- **Regularity over cleverness**: follow existing codebase patterns. If a
  pattern is unclear or harmful, stop and record the refactor decision instead
  of adding another one-off.

## §1. Implementation Target

- **Work slice**: Vite lecture note reader prototype with typed schema and sample fixture. Use design template from `/Users/mj/IdeaProjects/solon-design/templates/web-system-docs-001`. Updated scope includes 4 subjects, subject-level summary pages, and n-week notes per subject.
- **Plan source**: `plan.md`
- **Implementation persona**: `.sfs-local/personas/implementation-worker.md`
- **Reasoning tier**: `execution_standard`
- **Model profile source**: `.sfs-local/model-profiles.yaml`
- **Runtime / resolved model / reasoning effort**: Codex current runtime / current selected model / current reasoning setting
- **Fallback if profile unset**: current runtime model
- **Agent model override used?** no
- **Acceptance criteria in scope**:
- AC4: sample lecture note renders exam scope/course header, keyword coverage, core concepts, example questions, and source/share warning.
- AC5: each `RequiredKeyword` can express `covered`/`missing` state and linked `Concept` ids.
- AC6: raw professor PDF is not exposed as a public URL; only source metadata and private-source rule are rendered.
- AC7: `npm run build` passes and design anti-pattern smoke has no matches.
- AC8: fixture and UI represent 4 subjects, each with a `SubjectSummary` and `WeekNote[]`.
- AC9: sidebar/body navigation exposes each subject summary and each week note anchor.
- AC10: home route is a home screen, not a long single-page dump; subject and week details render on separate hash routes.
- AC11: local material intake guide explains how to keep raw PDFs local, request Claude output as JSON, and insert reviewed data into the app fixture without Bedrock/server upload.
- AC12: subject intake route can select a local `study-note.week-note.v1` JSON file, validate it, merge it into browser state/localStorage, and expose the imported week in the reader.
- AC13: actual JSON file selection happens on `#/subjects/<subject-id>/intake`, and JSON `subjectId` must match the selected subject route.
- AC14: fixture and examples use the real subject set: 디지털공학개론, 정보통신개론, C언어, 컴퓨터개론; existing Notion URL is preserved as a home reference link.
- AC15: subject, week, and keyword surfaces expose actions that render a simple generated note or fill-in template from the current fixture.
- AC16: tablet/mobile responsive layout is explicit, including 1100px/820px/520px breakpoints and 44px touch targets.
- **Out of scope for this slice**:
- PDF upload/parser/storage, AI note generation, RAG/vector search/OCR, video/audio generation, NestJS API, MySQL persistence, S3 integration, auth, public share links.
- **Shared design concept**:
- `web-system-docs-001` inspired 2-column docs reader: left navigation, top breadcrumb, constrained main content, bordered rows, meta-driven labels, neutral tokens with sparse accent.
- Adaptation note: imported the layout/tokens concept, but avoided viewport-scaled font sizes and negative letter spacing to satisfy current frontend guardrails.
- **DDD terms touched**:
- StudyNotebook, SubjectNote, SubjectSummary, WeekNote, SourceMaterial, RequiredKeyword, Concept, ExampleQuestion, SharePolicy.

## §2. Execution Notes

- **Approach**:
- Created a minimal Vite/TypeScript app instead of adding backend or AI generation.
- Added a typed domain model and sample fixture first, then rendered the fixture into a static reader UI.
- Used a static SVG coverage-flow asset to make the reader state visually inspectable without introducing external media dependencies.
- **Files/modules expected to change**:
- `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `vite.config.ts`
- `src/domain/lectureNote.ts`
- `src/domain/lectureNoteImport.ts`
- `src/data/sampleLectureNote.ts`
- `src/data/intakeGuide.ts`
- `examples/digital-engineering-week-note.example.json`
- `src/main.ts`
- `src/styles.css`
- `public/coverage-map.svg`
- `.gitignore`
- **Test-first plan**:
- No existing test harness existed. The smallest useful feedback loop was strict TypeScript typecheck plus Vite production build.
- Added `getIntegrityWarnings()` so the sample fixture can surface broken keyword/concept/question links inside the UI.
- **Risks / rollback notes**:
- This is frontend-only scaffold. Backend/API/persistence decisions remain deferred.
- `npm install` requires registry network access; initial sandbox run failed with DNS `ENOTFOUND`, then escalated install succeeded.
- Rollback is straightforward by removing the new Vite scaffold files and reverting `.gitignore` additions.

## §3. Code Changes Made

- Added Vite/TypeScript product scaffold.
- Added typed study notebook domain model with subject/week coverage summary and fixture integrity helpers.
- Added sample 기말고사 fixture with 4 subjects, subject summaries, week notes, covered and missing required keywords.
- Added system-docs style reader UI with hash routes for home, subject summaries, and week notes; home now shows dashboard/subject entry only, while subject/week details render separately.
- Added `#/intake` guide route for the local-only material workflow: PDF/keywords/Claude JSON/app fixture roles, folder convention, prompt checklist, subject selection, and insertion contract.
- Added `study-note.week-note.v1` runtime validation, string sanitization, localStorage persistence, and browser-only WeekNote import/merge.
- Added per-subject intake routes at `#/subjects/<subject-id>/intake`; JSON imports are rejected when the payload `subjectId` does not match the selected subject.
- Added `examples/digital-engineering-week-note.example.json` so the import screen can be tested with a real local file.
- Replaced placeholder subjects with actual target subjects and updated sample/import ids: `digital-engineering`, `information-communication`, `c-language`, `computer-introduction`.
- Added the provided Notion URL as `sourceWorkspaceUrl` and rendered it on the home source policy block.
- Added localStorage subject-set validation so old placeholder subject data does not keep overriding the new fixture.
- Added local quick-note generation actions:
  - subject-level `10분 정리노트 만들기`
  - week-level `이번 주차 정리노트 만들기`
  - keyword-level `정리노트 만들기` / `보강 템플릿 만들기`
- Improved tablet/mobile responsive behavior:
  - sidebar collapses into top navigation under 1100px.
  - grids use fluid `auto-fit` + `minmax(min(100%, ...), 1fr)`.
  - action/touch targets are at least 44px high.
- Applied design review rework:
  - Home/side navigation now prioritizes studying and links subject entries to subject summary pages.
  - Intake links moved into a collapsible `자료 관리` section.
  - Subject quick-note output renders directly below the subject hero.
  - Week quick-note output can be generated directly from week cards and renders near the weekly section.
  - Keyword quick-note output remains near the keyword section.
  - User-visible prototype labels were converted to Korean where they are not schema/dev terms.
  - Focus-visible and active interaction states were added for touch/keyboard feedback.
  - Tablet/mobile sidebar navigation now behaves as a compact horizontal scroller under 1100px.
- Replaced visible week-based navigation with date-based class sessions:
  - Added `src/data/classSchedule.ts` for Thursday/Saturday class dates from 2026-04-30 to 2026-06-13.
  - Marked 2026-06-13 as `기말고사 + 종강 예정`.
  - Changed sample fixture labels from `8주차/10주차/12주차` to `4월 30일(목)`, `5월 2일(토)`, and `5월 7일(목)`.
  - Updated sidebar to show a collapsible `수업 일정` list.
  - Updated visible copy from 주차/주차별 to 수업일/날짜별 where it refers to the study flow.
  - Bumped browser storage key to `study-note.notebook.v2` so old localStorage labels do not keep overriding the new date fixture.
- Added visual coverage-flow asset under `public/coverage-map.svg`.
- Added `node_modules/`, `dist/`, and `local-materials/` ignores outside the Solon-managed `.gitignore` block.

## §4. Verification

- **Commands run**:
- `npm install` — failed once in sandbox due `getaddrinfo ENOTFOUND registry.npmjs.org`.
- `npm install` with escalation — succeeded, added 14 packages, 0 vulnerabilities.
- `npm run build` — succeeded: `tsc --noEmit && vite build`.
- `rg -n 'linear-gradient|border-radius:\s*9999|✅|🚀|💪' src public index.html` — no matches.
- `rg -n 'pdf upload|PDF upload|AI generation|ai generation|auth|share link|video|audio|RAG|vector' src public index.html` — no matches.
- `npm run dev -- --port 5173` — initial sandbox bind failed with `EPERM`, escalated local bind succeeded.
- `curl -I http://127.0.0.1:5173/` — HTTP 200 OK.
- `npm run build` after 4-subject/week-note refactor — succeeded.
- `rg -n '4과목|운영체제|데이터베이스|컴퓨터네트워크|이산수학|주차별|총정리' src dist` — historical smoke for the earlier placeholder subject set; later replaced by the real 4-subject smoke below.
- `rg -n 'PDF upload|pdf upload|AI generation|ai generation|auth|share link|video|audio|RAG|vector search|Vector search' src public index.html` — no matches.
- `npm run build` after home/subject/week hash route refactor — succeeded.
- `rg -n '#/subjects|Final exam home|과목 들어가기|주차 note 보기|홈은 전체 현황' src dist` — matched source and built bundle.
- `npm run build` after `#/intake` guide route — succeeded.
- `rg -n '#/intake|자료 투입|local-materials|no server upload|Claude prompt checklist' src dist` — matched source and built bundle.
- `rg -n 'fetch\(|XMLHttpRequest|FileReader|type="file"|createObjectURL|presigned|S3|PutObject|upload\(' src public index.html` — no matches; no actual upload/API integration was introduced.
- `curl -I http://127.0.0.1:5173/` after intake guide change — HTTP 200 OK.
- `npm run build` after browser JSON import implementation — succeeded.
- `rg -n 'study-note\.week-note\.v1|note-json-file|localStorage|applyWeekNoteImport|sanitizeWeekNoteImportPayload|JSON 파일 선택' src dist` — matched source and production bundle.
- `rg -n 'fetch\(|XMLHttpRequest|FileReader|createObjectURL|presigned|S3|PutObject|upload\(' src public index.html` — no matches; no server/network upload path introduced.
- `rg -n 'linear-gradient|border-radius:\s*9999|✅|🚀|💪' src public index.html` — no matches.
- `curl -I http://127.0.0.1:5173/` after JSON import implementation — HTTP 200 OK.
- `node -e "JSON.parse(require('fs').readFileSync('examples/week-note-import.example.json','utf8')); console.log('example json ok')"` — historical smoke for the earlier example file; later replaced by the real subject example smoke below.
- `npm run build` after adding example JSON reference — succeeded.
- `npm run build` after per-subject intake route implementation — succeeded.
- `rg -n '#/subjects/.*/intake|subject-intake|자료 넣기|선택한 과목과 JSON 과목이 다릅니다|data-subject-id' src dist` — matched source and production bundle.
- `rg -n 'note-json-file"|id="note-json-file"|JSON 파일 넣기' src/main.ts` — confirmed no global fixed upload input remains; upload copy appears only in subject intake rendering.
- `rg -n 'fetch\(|XMLHttpRequest|FileReader|createObjectURL|presigned|S3|PutObject|upload\(' src public index.html` — no matches.
- `curl -I http://127.0.0.1:5173/` after per-subject intake change — HTTP 200 OK.
- `npm run build` after subject-specific JSON example rendering — succeeded.
- `npm run build` after subject rename/Notion reference update — succeeded.
- `node -e "JSON.parse(require('fs').readFileSync('examples/digital-engineering-week-note.example.json','utf8')); console.log('example json ok')"` — succeeded.
- `rg -n '디지털공학개론|정보통신개론|C언어|컴퓨터개론|digital-engineering|information-communication|c-language|computer-introduction|기존 Notion 원본' src dist examples` — matched source, example, and production bundle.
- `rg -n 'operating-systems|computer-network|discrete-math|week-note-import\.example|운영체제 자료 투입|데이터베이스 자료 투입|컴퓨터네트워크|이산수학' src dist examples` — no matches.
- `curl -I http://127.0.0.1:5173/` after subject rename update — HTTP 200 OK.
- `npm run build` after localStorage mismatch cleanup refinement — succeeded.
- `npm run build` after quick-note actions and responsive layout refinement — succeeded.
- `rg -n '정리노트 만들기|보강 템플릿 만들기|quick-note|generate-keyword-note|generate-subject-note|generate-week-note' src dist` — matched source and production bundle.
- `rg -n '@media \(max-width: 1100px\)|min-height: 44px|grid-template-columns: repeat\(auto-fit, minmax\(min\(100%' src/styles.css dist/assets` — matched responsive CSS in source and built CSS bundle.
- `rg -n 'font-size:\s*.*vw|letter-spacing:\s*-' src/styles.css` — no matches.
- `curl -I http://127.0.0.1:5173/` after quick-note/responsive refinement — HTTP 200 OK.
- `npm run build` after design review rework — succeeded.
- `rg -n '자료 관리|과목 공부|정리노트 만들기|week-card-actions|secondary-link|focus-visible|sidebar-details|formatReviewStatus|formatQuestionDifficulty' src dist` — matched source and production bundle.
- `rg -n 'Dashboard|Subjects|Weeks|Coverage|Generated note|Final exam home|keyword coverage|Fixture integrity|Typed fixture check|not-found' src/main.ts dist` — no matches.
- `rg -n '@media \(max-width: 1100px\)|position: sticky|overflow-x: auto|min-height: 44px|:focus-visible|:active' src/styles.css dist/assets` — matched responsive/touch/focus rules.
- `rg -n 'font-size:\s*.*vw|letter-spacing:\s*-' src/styles.css` — no matches.
- `curl -I http://127.0.0.1:5173/` after design review rework — HTTP 200 OK.
- `npm run build` after class-date schedule update — succeeded.
- `rg -n '4월 30일\(목\)|5월 2일\(토\)|6월 13일\(토\)|기말고사 \+ 종강 예정|수업 일정|수업일별 노트|날짜별 노트|study-note.notebook.v2' src dist examples` — matched source, example, and production bundle.
- `rg -n '주차|8주차|10주차|12주차|13주차|주차별|이번 주차' src/main.ts src/data/intakeGuide.ts src/data/sampleLectureNote.ts examples/digital-engineering-week-note.example.json dist` — no matches.
- `rg -n 'schedule-list|schedule-pill|is-final|overflow-x: auto|@media \(max-width: 1100px\)' src/styles.css dist/assets` — matched source and built CSS bundle.
- `node -e "JSON.parse(require('fs').readFileSync('examples/digital-engineering-week-note.example.json','utf8')); console.log('example json ok')"` — succeeded.
- `curl -I http://127.0.0.1:5173/` after class-date schedule update — HTTP 200 OK.
- **Result**:
- Build passed. Vite output: `dist/index.html`, CSS bundle, JS bundle.
- Anti-pattern smoke found no gradient, rounded-full radius, or emoji-list markers.
- Anti-scope smoke found no accidental PDF upload, AI generation, backend auth/share link, video/audio, RAG/vector implementation.
- Local dev server is running at `http://127.0.0.1:5173/`.
- 4-subject/week-note refactor is present in both source and production bundle.
- Home/subject/week route separation is present in both source and production bundle.
- Local material intake guide is present in both source and production bundle.
- Browser JSON import path is typechecked and included in the production bundle.
- Per-subject intake route and subjectId mismatch rejection are typechecked and included in the production bundle.
- New subject set and Notion reference link are present in the production bundle.
- Quick-note actions and responsive layout rules are present in the production bundle.
- Design review rework is present in the production bundle: reading-first navigation, collapsible material management, week-card quick-note action, Korean label pass, and focus/active states.
- Class-date schedule rework is present in the production bundle: visible date labels, class schedule sidebar, final/end date marker, and v2 browser storage key.
- Dev server remains reachable at `http://127.0.0.1:5173/`.
- **Manual smoke / inspection**:
- Static inspection confirms UI renders the AC4 areas plus updated AC8/AC9: whole-exam dashboard, 4 subject summaries, week notes, keyword coverage, core concepts, example questions, and source/share warning.
- Static inspection confirms AC10: home route is separate from subject/week detail pages.
- Static inspection confirms AC11: `#/intake` explains local PDF/keyword/Claude JSON/app fixture roles without adding server upload code.
- Static inspection confirms AC12: subject intake has a local JSON file input, validates `study-note.week-note.v1`, sanitizes imported strings, merges into notebook state, and persists to localStorage.
- Static inspection confirms AC13: the global intake page is a subject selector, actual file input is rendered under subject intake, and mismatch feedback exists.
- Fixture integrity helper reports no broken sample keyword/concept/question links.

## §5. Review Handoff

- **Ready for review?** yes
- **Recommended next gate**: `G4`
- **Next command**: `/sfs review --gate G4`
- **Review focus**:
  - Verify AC4-AC7 against the implemented reader and sample fixture.
  - Verify AC8-AC9 against the 4-subject/weekly information architecture.
  - Verify AC10 by opening `#/`, `#/subjects/digital-engineering`, and `#/subjects/digital-engineering/weeks/de-week-08`.
  - Verify AC11 by opening `#/intake`.
  - Verify AC12/AC13 by importing a `study-note.week-note.v1` JSON file from `#/subjects/digital-engineering/intake` and checking the resulting week route.
  - Confirm the design template adaptation is consistent with `web-system-docs-001` without copying disallowed anti-patterns.
  - Confirm design-review P1/P2/P3 rework: reading-first navigation, compact tablet/mobile nav, quick-note result placement, week-card note action, Korean labels, and focus/active feedback.
  - Confirm class-date schedule rework: visible notes are date-based, sidebar schedule covers 2026-04-30 through 2026-06-13, and old week labels do not appear in source/bundle.
  - Confirm raw professor PDF is metadata-only and no upload/public sharing path was introduced.

## 2026-05-01T22:36:10+09:00 — Implementation Request

```text
Vite lecture note reader prototype with typed schema and sample fixture. Use design template from /Users/mj/IdeaProjects/solon-design
```

## 2026-05-02T00:43:24+09:00 — Implementation Request

```text
Apply design review: reading-first navigation, compact tablet mobile nav, quick-note placement, Korean label pass, focus active states
```

## 2026-05-02T09:34:10+09:00 — Implementation Request

```text
Replace week-based lecture note navigation with class-date schedule labels from 2026-04-30 to 2026-06-13
```

## 2026-05-02T09:29:00+09:00 — Implementation Request

```text
Replace week-based lecture note navigation with class-date schedule labels from 2026-04-30 to 2026-06-13
```
