---
id: study-note-agg-notebook
title: StudyNotebook Aggregate
language: ko
load_when:
  - StudyNotebook
  - SubjectNote
  - WeekNote
  - 학습 노트
  - 메모
  - 키워드 coverage
summary: StudyNotebook aggregate 의 root, 소유 entity, invariant, 라이프사이클 + 원문 링크.
---

# StudyNotebook Aggregate

## Root

- `StudyNotebook` (`packages/domain/src/lecture-note.ts:93-102`)
  - 식별: `id`
  - 메타: `title`, `updatedAt`, `term`, `audience`, `sourceWorkspaceUrl?`
  - 소유: `subjects: SubjectNote[]`, `sharePolicy: SharePolicy`

## Owned entities (aggregate boundary)

| Entity | 정의 | 역할 |
|---|---|---|
| `SubjectNote` | `lecture-note.ts:71-84` | 한 과목 단위. summary + sources + keywords + concepts + weekNotes |
| `SubjectSummary` | `lecture-note.ts:60-67` | goal / examScope / weekRange / mustKnowConceptIds / weakSpots / strategy |
| `WeekNote` | `lecture-note.ts:44-58` | 주차 단위 학습 + `userNotes` + `examPhase` override |
| `Concept` | `lecture-note.ts:24-33` | 시험 출제 단위 개념 + priority |
| `RequiredKeyword` | `lecture-note.ts:16-22` | 교수 시그널 키워드 + coverage status |
| `ExampleQuestion` | `lecture-note.ts:35-42` | concept 별 예제 문제 |
| `SourceMaterial` | `lecture-note.ts:7-14` | concept/keyword 의 출처 분류 |
| `SharePolicy` | `lecture-note.ts:86-91` | owner-only / small-cohort-readonly |

## Invariants

### N1. Subject id 집합은 sample fixture 와 동일
`hasCurrentSubjectSet` (`apps/web/src/app/notebook-storage.ts:71-85`,
sprint-W22-sprint-19 추출) 가 localStorage payload load 시 subject id 집합이
`sampleLectureNote.subjects` 의 id 집합과 동일한지 검증. 다르면 fixture default 로
reset.

→ 시사: subject 추가/삭제는 sample fixture 와 동시에 갱신 필요. 미수 = 데이터
손실. sprint-2 이후 BE 가 SoT 이지만 localStorage hydrate 는 여전히 이 invariant
의존. sprint-W22-be-sync 시점 부로 main app sidebar 는 BE `/api/v1/subjects` 응답을
union 으로 보기 때문에 admin 추가된 새 과목도 표시 가능 (단, 새 subject 가 FE notebook
seed 에 없으면 minimal link only — rich SubjectNote 없음).

### N2. WeekNote.examPhase override 우선
WeekNote 에 `examPhase` 가 있으면 그 값이 우선, 없으면 SubjectNote.examPhase.
`midterm` / `final` 외 값 = invalid.

### N3. Concept ↔ Keyword ↔ Question 그래프 정합성 (diagnostic, not enforced)
- `Concept.relatedKeywordIds` 의 모든 id 가 `requiredKeywords[*].id` 에 존재.
- `Concept.exampleQuestionIds` 의 모든 id 가 `exampleQuestions[*].id` 에 존재.
- `RequiredKeyword.conceptIds` 의 모든 id 가 `concepts[*].id` 에 존재.

→ `getIntegrityWarnings` (`lecture-note.ts:171`) 는 **diagnostic warning** 만
배출하고 UI banner 로 surface 한다. load/save/mutation 어디서도 dangling
reference 자체를 강제 차단하지 않는다 — 위반 데이터도 그대로 저장된다. 따라서
이 항목은 strict invariant 가 아니라 "consistency check + 사용자 알림" 수준이다.
실제 enforce 가 필요해지면 import/load 시점에 강제 hook 을 추가하는 후속 작업
대상.

### N4. Coverage = covered / total
`getSubjectCoverage` (line 111) + `getNotebookCoverage` (line 126). 0 division
보호 (`total === 0 ? 0 : covered/total`).

### N5. userId-scoped persistence (sprint-3/S1)
localStorage key = `study-note.notebook.v2:<userId>`. session 부재 시 save noop.
**원문**: `apps/web/src/app/notebook-storage.ts` (sprint-W22-sprint-19 추출, main.ts 잔여 = `persistNotebook()` thin wrapper).

## 라이프사이클

```
boot
  notebook := sampleLectureNote   (module-init, S1 이후 LS read X)

session attach (revalidate / sign-in)
  notebook := loadStoredNotebook(userId)
    - scoped key 있으면 parse + hydrate
    - 없으면 sampleLectureNote (sprint-4/S1 이후 legacy migration helper 제거
      — server GET hydrate 가 sprint-2 autosave 의 SoT 로 복원)

user edit
  notebook = { ...notebook, ...patch }
  saveNotebook(notebook)   (userId default = authSession.user.id)
  scheduleUserNotesPut(key, body)   (sprint-2 autosave)

session clear (logout / /v1/auth/me 실패)
  authSession = undefined
  sync caches reset
  notebook 그대로 (localStorage 의 scoped key 유지)
```

## 외부 의존

- **PdfWorkspace**: subjectId 로 1:1. notebook 의 subject 추가 시 pdfWorkspace 는
  lazy 생성 (`createEmptyPdfWorkspace`).
- **Sync**: userNotes 만 BE PUT (`/v1/user-notes/<key>`). 나머지 notebook 메타는
  현재 BE persistence 없음 (sprint-2 scope).
- **AuthSession**: load/save 모두 userId 필요. session 부재 시 load = fixture,
  save = noop.

## 변경 이력

- sprint-1: PDF hotkeys (notebook 무관)
- sprint-2: `userNotes` BE persistence + `examPhase` 도입 ([sprint-2 retro](../../references/sprints.md#2026-w21-sprint-2))
- sprint-3/S1: notebook localStorage userId namespacing + migration owner gate ([sprint-3/S1](../../references/sprints.md#2026-w21-sprint-1-userid-namespacing))
- sprint-W21-sprint-1/S1: Term aggregate 신규 — Subject 가 termId FK 보유 (DB schema). FE notebook 의 SubjectNote 는 termId 없음. cross-aggregate relation = sidebar grouping 시 BE `/api/v1/subjects` 응답으로 termId 가져옴.
- sprint-W22-sprint-19: notebook-storage.ts 추출. main.ts 잔여 = thin wrapper.
- sprint-W22-be-sync (2026-05-28): admin SPA 가 학기/과목 추가/이동 — main sidebar 는 BE subjectsCache union (fe-v0.1.28). FE notebook 안 없는 BE-only subject 는 minimal link only.

## Open questions / TODO

- subject 삭제 시 연동되는 pdfWorkspace cleanup 정책 미명시.
- notebook 메타 (sharePolicy, audience) 의 BE persistence 미정 — 현재 localStorage only.
- `sourceWorkspaceUrl` 는 사용처 없음 — schema 잔존 의심.
- **Term aggregate page 부재** — `llm-wiki/ddd/aggregates/term.md` 신규 candidate. Term/Subject relation 명문화.
- FE notebook.subjects (4 hardcoded seed) → BE `/api/v1/subjects` hydrate 전환 = React migration phase candidate.
