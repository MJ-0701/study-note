---
phase: do
sprint_id: "2026-W18-sprint-4"
goal: "해당 프로젝트는 시험 대비를 위한 lectture note임"
created_at: "2026-05-01T22:20:27+09:00"
---

# Log — Vite Lecture Note Reader Prototype

> Sprint **Do** 단계 작업 로그. 시간순 append 형식. 각 entry 는 1줄 요약 + 필요 시 details.
> `.sfs-local/events.jsonl` 이 machine-readable trace, 본 파일은 human-readable 보강.
> 새 entry 는 본 §1 의 **위쪽** 에 append 권장 (최신 우선).
> 생명주기: 본 문서는 작업 중 노트패드다. Close 후 시간순 세부 내역은 `retro.md` 와
> events/session log 로 넘기고, 최종 알맹이는 `report.md` 에만 남긴다.

---

## §1. 작업 로그 (시간순 append)

### 2026-05-02T09:34:10+09:00 — class-date schedule navigation

- User clarified that 주차 labels are confusing for a weekend학사 과정 and requested date-based navigation.
- Added `src/data/classSchedule.ts` with Thursday/Saturday class dates:
  - `4월 30일(목)` as the post-midterm start.
  - `5월 2일(토)` as the next class day.
  - continuing through `6월 13일(토)`.
  - `6월 13일(토)` marked as 기말고사 + 종강 예정.
- Updated fixture session labels from 주차 numbers to date labels.
- Updated sidebar with collapsible `수업 일정` and date pills, including final/end marker.
- Updated visible UI/intake/example copy from 주차 terminology to 수업일/날짜 terminology.
- Bumped localStorage key to `study-note.notebook.v2` to avoid stale old week labels in the browser.
- `npm run build` passed.
- Source/bundle smoke confirmed `4월 30일(목)`, `5월 2일(토)`, `6월 13일(토)`, `수업 일정`, and date-based note labels are present.
- Week-label smoke confirmed no visible `주차` labels remain in `src/main.ts`, `src/data/intakeGuide.ts`, `src/data/sampleLectureNote.ts`, example JSON, or production bundle.
- Example JSON parse check passed.
- `curl -I http://127.0.0.1:5173/` returned HTTP 200 OK.

### 2026-05-02T00:49:09+09:00 — design review rework implemented

- Applied the design review direction in code.
- Reworked navigation so subject links prioritize studying:
  - home subject nav now goes to subject summary pages.
  - intake links moved under collapsible `자료 관리`.
  - subject sidebar separates current subject study links from secondary management links.
- Compacted tablet/mobile navigation:
  - under 1100px, sidebar becomes a sticky compact horizontal scroller.
  - secondary all-subject links are hidden on small layouts.
  - management links are behind `<details>`.
- Moved quick-note output closer to its trigger:
  - subject quick-note renders under the subject hero.
  - week quick-note can be generated from week cards and renders near weekly notes.
  - keyword quick-note remains near keyword cards.
- Ran a Korean label pass for visible prototype labels and formatted raw statuses/kinds such as `ready`, `covered`, `professor-pdf`, and question difficulty.
- Added `:focus-visible` and `:active` feedback for links/buttons/file labels.
- `npm run build` passed.
- Source/bundle smoke confirmed design-review artifacts are present.
- English prototype-label smoke found no matches for the reviewed labels.
- Responsive/focus smoke confirmed 1100px rules, sticky compact nav, horizontal overflow, 44px targets, focus-visible, and active states.
- CSS smoke confirmed no viewport-scaled font sizes or negative letter spacing.
- `curl -I http://127.0.0.1:5173/` returned HTTP 200 OK.

### 2026-05-02T00:27:04+09:00 — design division activation and first design review

- User requested design division activation and a design review of the project.
- Ran `sfs decision "Activate design division for responsive lecture note UX"` and created `.sfs-local/decisions/0002-activate-design-division-for-responsive-lecture-note-ux.md`.
- Activated `design` in `.sfs-local/divisions.yaml`.
- Added `.sfs-local/sprints/2026-W18-sprint-4/design-review.md`.
- Design review verdict: `partial`.
- Main findings: study navigation should outrank intake navigation, mobile/tablet navigation may bury content, quick-note result placement needs tightening, week cards need direct quick-note actions, user-visible English labels should be Koreanized, and focus/active states need explicit treatment.

### 2026-05-01T23:53:56+09:00 — actionful notes and responsive layout

- User pointed out keyword cards were passive status displays and should provide a useful action.
- Added local quick-note actions without backend/AI:
  - subject `10분 정리노트 만들기`
  - week `이번 주차 정리노트 만들기`
  - keyword `정리노트 만들기`
  - missing keyword `보강 템플릿 만들기`
- Generated note panels are built from the current fixture/imported data and include core definitions, easy explanations, source hints, practice questions, or fill-in items.
- User clarified the main usage target is tablet/mobile rather than desktop web.
- Refined responsive layout:
  - sidebar collapses into top navigation below 1100px.
  - fluid grids use `auto-fit` with `minmax(min(100%, ...), 1fr)`.
  - key actions and nav controls have 44px touch targets.
  - 820px and 520px breakpoints tighten layout for tablet/mobile.
- `npm run build` passed.
- Source/bundle smoke confirmed quick-note actions and responsive CSS are present.
- CSS smoke confirmed no viewport-scaled font sizes or negative letter spacing.
- `curl -I http://127.0.0.1:5173/` returned HTTP 200 OK.

### 2026-05-01T23:44:43+09:00 — real subject set and Notion reference

- User provided the real 4 subjects and the original Notion URL.
- Replaced placeholder subjects with 디지털공학개론 (`digital-engineering`), 정보통신개론 (`information-communication`), C언어 (`c-language`), 컴퓨터개론 (`computer-introduction`).
- Added `sourceWorkspaceUrl` to the notebook model and rendered the provided Notion URL as a home reference link.
- Replaced the example import file with `examples/digital-engineering-week-note.example.json`.
- Added localStorage subject-set validation so old placeholder subject data does not override the new fixture.
- Refined stale localStorage handling to remove old stored data when the subject set no longer matches the fixture.
- `npm run build` passed after the subject rename and Notion reference update.
- `npm run build` passed again after localStorage cleanup refinement.
- Example JSON parse check passed for the new digital-engineering example file.
- Source/bundle smoke confirmed the new subject names/ids and Notion reference link are present.
- Old placeholder subject ids and old example filename were absent from source, bundle, and examples.

### 2026-05-01T23:28:00+09:00 — browser-local JSON import

- User clarified that if JSON is the intended handoff, the app should provide at least a file upload/import path.
- Added `src/domain/lectureNoteImport.ts` with `study-note.week-note.v1` payload validation, string sanitization, and WeekNote merge logic.
- Updated `#/intake` with a `.json` file selector, validation feedback, localStorage persistence, imported week link, reset action, and JSON shape example.
- Added `examples/week-note-import.example.json` for manual upload/import smoke testing. Later replaced by `examples/digital-engineering-week-note.example.json` when the real subject set was applied.
- This is browser-local import only. No server upload, S3 upload, Bedrock/API, or backend persistence was introduced.
- `npm run build` passed after the import implementation.
- Source/bundle smoke confirmed `study-note.week-note.v1`, `note-json-file`, `localStorage`, validation, sanitization, and JSON file selection are present.
- Upload/API smoke confirmed no custom `fetch`, `XMLHttpRequest`, `FileReader`, object URL, presigned URL, S3 upload, or `upload()` path exists in source.
- `curl -I http://127.0.0.1:5173/` returned HTTP 200 OK after the import implementation.
- Example JSON parse check passed.
- `npm run build` passed again after wiring the example file path into the guide UI.

### 2026-05-01T23:37:20+09:00 — per-subject intake refinement

- User pointed out 자료 투입 should happen by subject, not from one global-looking upload screen.
- Reworked `#/intake` into a guide + subject selector.
- Added actual upload/import route per subject: `#/subjects/<subject-id>/intake`.
- Added a route-level safety check: selected subject id must match JSON `subjectId`; mismatches show an error and do not merge.
- Added subject-level entry points from each subject summary page and sidebar.
- Subject intake pages now render a JSON example with that subject's own `subjectId` instead of showing one fixed placeholder payload everywhere.
- `npm run build` passed after the per-subject intake change.
- Source/bundle smoke confirmed `subject-intake`, `data-subject-id`, subject intake links, and mismatch feedback are present.
- Upload/API smoke still confirmed no custom network upload path exists.
- `curl -I http://127.0.0.1:5173/` returned HTTP 200 OK after the change.
- `npm run build` passed again after subject-specific JSON example rendering.

### 2026-05-01T23:19:02+09:00 — local material intake guide

- User confirmed Bedrock/API generation is out of scope and asked how to request/insert files, then run the project locally.
- Added `#/intake` route with a local-only material workflow:
  - raw professor PDFs stay in ignored `local-materials/`.
  - professor keywords are passed to Claude with the PDF.
  - Claude output should be app-schema JSON, not a human-only summary PDF.
  - reviewed content is inserted into the current TypeScript fixture.
- Added `src/data/intakeGuide.ts` to keep the guide structured and reusable.
- Added `local-materials/` to `.gitignore` so private PDFs and drafts are not committed.
- `npm run build` passed after the guide route.
- Route smoke confirmed `#/intake`, `자료 투입`, `local-materials`, and `Claude prompt checklist` are present in source and production bundle.
- Upload/API smoke confirmed no `FileReader`, file input, presigned URL, S3 upload, or custom `fetch()` integration was introduced.
- `curl -I http://127.0.0.1:5173/` returned HTTP 200 OK after the change.

### 2026-05-01T23:08:49+09:00 — home/subject/week route separation

- User clarified the previous version was still too single-page: subjects must be separated, and home must be used as a real home screen.
- Reworked `src/main.ts` into a small hash router:
  - `#/` home dashboard.
  - `#/subjects/<subject-id>` subject total summary.
  - `#/subjects/<subject-id>/weeks/<week-id>` weekly note.
- Home now shows only overall status, subject cards, needs-fill weekly notes, and sharing policy.
- Subject pages show subject total summary, week-note entry cards, required keywords, concepts, and sources.
- Week pages show a single week's keywords, concepts, sources, and practice questions.
- `npm run build` passed after route refactor.
- Route smoke confirmed `#/subjects`, `Final exam home`, `과목 들어가기`, `주차 note 보기`, and `홈은 전체 현황` are present in source and production bundle.

### 2026-05-01T23:00:04+09:00 — 4-subject weekly IA refinement

- User clarified that the app must separate 4 subjects, separate notes by week, and include a total summary page per subject.
- Refactored domain model from single `LectureNote` to `StudyNotebook` → `SubjectNote` → `SubjectSummary` + `WeekNote[]`.
- Rebuilt sample fixture with 4 subjects: 운영체제, 데이터베이스, 컴퓨터네트워크, 이산수학.
- Reworked reader UI into whole-exam dashboard, subject summary sections, and weekly note sections.
- `npm run build` passed after refactor.
- Content smoke confirmed `4과목`, all four subject labels, `총정리`, and `주차별` are present in source and production bundle.
- Anti-scope smoke for PDF upload, AI generation, auth/share link, video/audio, RAG, vector search returned no matches.

### 2026-05-01T22:45:35+09:00 — reader prototype build evidence

- `npm install` initial sandbox run failed with DNS `ENOTFOUND registry.npmjs.org`; escalated `npm install` succeeded with 14 packages and 0 vulnerabilities.
- `npm run build` passed: `tsc --noEmit && vite build`.
- Design anti-pattern smoke found no matches for gradient, rounded-full radius, or emoji-list markers.
- Anti-scope smoke found no accidental PDF upload, AI generation, backend auth/share link, video/audio, RAG/vector implementation.
- Dev server initial sandbox bind failed with `EPERM`; escalated `npm run dev -- --port 5173` succeeded at `http://127.0.0.1:5173/`.
- `curl -I http://127.0.0.1:5173/` returned HTTP 200 OK.
- Result: implementation is ready for G4 review.

### 2026-05-01T22:37:13+09:00 — implementation scope fixed

- `/sfs implement` opened `implement.md` and `log.md`.
- Read G1 plan, G1 review, and `/Users/mj/IdeaProjects/solon-design/templates/web-system-docs-001`.
- Shared design concept: system-docs style reader with sidebar navigation, constrained main content, meta labels, bordered rows, and sparse accent.
- Decision: implement only Vite reader + typed schema + sample fixture; defer PDF parser, AI generation, backend, auth/share links, and video/audio.

## §2. 발견된 결정 / 블로커 (decision log 후보)

- 결정: design template source is `solon-design/templates/web-system-docs-001`.
- 보정: template concept was adapted to current frontend guardrails by avoiding viewport-scaled font sizes and negative letter spacing.
- 블로커: 없음. Network sandbox blocked initial npm registry access, resolved through approved escalation.

## §3. CTO 구현 메모

- **CTO Generator persona**: `.sfs-local/personas/cto-generator.md`
- **구현 executor/tool**: codex
- **변경 파일/모듈**:
- `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `vite.config.ts`
- `src/domain/lectureNote.ts`, `src/domain/lectureNoteImport.ts`, `src/data/sampleLectureNote.ts`, `src/data/intakeGuide.ts`, `src/main.ts`, `src/styles.css`
- `examples/digital-engineering-week-note.example.json`
- `public/coverage-map.svg`
- `.gitignore`
- **실행한 테스트/스모크 체크**:
- `npm install` (approved network escalation after sandbox DNS failure)
- `npm run build`
- `rg -n '디지털공학개론|정보통신개론|C언어|컴퓨터개론|digital-engineering|information-communication|c-language|computer-introduction|기존 Notion 원본' src dist examples`
- `rg -n '#/subjects|Final exam home|과목 들어가기|주차 note 보기|홈은 전체 현황' src dist`
- `rg -n '#/intake|자료 투입|local-materials|no server upload|Claude prompt checklist' src dist`
- `rg -n 'fetch\(|XMLHttpRequest|FileReader|type="file"|createObjectURL|presigned|S3|PutObject|upload\(' src public index.html`
- `rg -n 'linear-gradient|border-radius:\s*9999|✅|🚀|💪' src public index.html`
- `rg -n 'PDF upload|pdf upload|AI generation|ai generation|auth|share link|video|audio|RAG|vector search|Vector search' src public index.html`
- **CPO 에게 넘길 검증 포인트**:
- AC4: header, keyword coverage, concepts, example questions, source/share warning render in one reader flow.
- AC5: `RequiredKeyword.status` and `conceptIds` are typed and represented in the UI.
- AC6: raw professor PDF has no public URL or serving path.
- AC7: build and smoke evidence are present.
- AC8: 4 subjects each have subject summary and weekly note data.
- AC9: sidebar/body anchors expose subject summary and week note navigation.
- AC10: home, subject, and week routes are separated.
- AC15: subject/week/keyword actions render local quick-note panels.
- AC16: tablet/mobile responsive layout and touch targets are present.

## §4. 다음 단계 / 핸드오프 메모

- Next: `/sfs review --gate G4 --executor codex` 또는 독립 evaluator runtime 으로 G4 review.
- Review should check user-visible reader flow, code regularity, and anti-scope compliance.
