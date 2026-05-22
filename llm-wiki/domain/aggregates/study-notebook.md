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
`hasCurrentSubjectSet` (`main.ts:801-812`) 가 localStorage payload load 시
subject id 집합이 `sampleLectureNote.subjects` 의 id 집합과 동일한지 검증. 다르면
fixture default 로 reset.

→ 시사: subject 추가/삭제는 sample fixture 와 동시에 갱신 필요. 미수 = 데이터
손실. sprint-2 이후 BE 가 SoT 이지만 localStorage hydrate 는 여전히 이 invariant
의존.

### N2. WeekNote.examPhase override 우선
WeekNote 에 `examPhase` 가 있으면 그 값이 우선, 없으면 SubjectNote.examPhase.
`midterm` / `final` 외 값 = invalid.

### N3. Concept ↔ Keyword ↔ Question 그래프 정합성
- `Concept.relatedKeywordIds` 의 모든 id 가 `requiredKeywords[*].id` 에 존재.
- `Concept.exampleQuestionIds` 의 모든 id 가 `exampleQuestions[*].id` 에 존재.
- `RequiredKeyword.conceptIds` 의 모든 id 가 `concepts[*].id` 에 존재.

→ `getIntegrityWarnings` (`lecture-note.ts:171`) 가 warning 출력. UI banner.

### N4. Coverage = covered / total
`getSubjectCoverage` (line 111) + `getNotebookCoverage` (line 126). 0 division
보호 (`total === 0 ? 0 : covered/total`).

### N5. userId-scoped persistence (sprint-3/S1)
localStorage key = `study-note.notebook.v2:<userId>`. session 부재 시 save noop.
**원문**: `main.ts:660-800`.

## 라이프사이클

```
boot
  notebook := sampleLectureNote   (module-init, S1 이후 LS read X)

session attach (revalidate / sign-in)
  notebook := loadStoredNotebook(userId)
    - scoped key 있으면 parse + hydrate
    - 없으면 migrateLegacyNotebookForUser(userId)
        - owner marker 일치 → 2-phase write (scoped) → 성공 시 legacy 삭제
        - 불일치 → legacy drop, return undefined
    - migration 실패 시 sampleLectureNote

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

## Open questions / TODO

- subject 삭제 시 연동되는 pdfWorkspace cleanup 정책 미명시.
- notebook 메타 (sharePolicy, audience) 의 BE persistence 미정 — 현재 localStorage only.
- `sourceWorkspaceUrl` 는 사용처 없음 — schema 잔존 의심.
