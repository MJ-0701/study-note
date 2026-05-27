---
id: study-note-ubiquitous-language
title: Ubiquitous Language
language: ko
load_when:
  - 용어
  - glossary
  - ubiquitous language
  - 이게 무슨 뜻
summary: study-note 의 도메인 용어집. canonical meaning + 금기 의미. 코드/문서/대화에서 일관되게 쓴다.
---

# Ubiquitous Language

원본 = `docs/solon/domain-map.md` (persona/디공이 시절 용어 포함). 이 페이지는
**현재 study-note product** 의 용어만 정리. persona 도메인은 `docs/solon/domain-map.md`
원문 참조.

## 학기 / 과목 트리 (Term × Subject)

| Term | Canonical meaning | Do not use as |
|---|---|---|
| Term (학기) | 학년 + 학기 번호 + title 로 식별되는 학기 aggregate. 한 사용자가 여러 Term 보유. `Term -> Subject[]` 1:N. schema = `model Term`. | StudyNotebook 의 시간 단위, "용어 (terminology)" |
| Subject (과목) | Term 안의 과목 aggregate. `Subject -> PdfMaterial[]` + WeekNote[]. `subjects/:id/move` 로 다른 Term 으로 이동 가능. schema = `model Subject` (`termId` 필수). | SubjectNote (FE state), 학습 단위 일반 명사 |

## 학습 노트 (Notebook 계열)

| Term | Canonical meaning | Do not use as |
|---|---|---|
| StudyNotebook | 한 사용자의 학습 데이터 묶음 (현재 FE state). subjects[] 를 가진 aggregate root. | DB row, "notes app" 일반 명사. Term aggregate (DB schema) 와 구별. |
| SubjectNote | 한 과목 (e.g. 회계원리) 의 학습 단위 FE state. summary + sources + keywords + concepts + weekNotes 보유. | Subject aggregate (DB schema), 과목 메타데이터 (title 만) |
| WeekNote | subject 안의 주차 단위 학습 진도. `userNotes` (자유 메모) + `examPhase` (override). | "한 주의 일정" |
| Concept | 시험 출제 단위 개념. `priority: must-know / high / review`. | 그냥 키워드 |
| RequiredKeyword | 교수가 시험에 나온다고 한 키워드. coverage status (`covered` / `missing`). | 검색 키워드, tag |
| SourceMaterial | concept/keyword 의 출처 (professor-pdf / claude-summary / manual-keyword). | PDF 파일 자체 (= PdfMaterial) |
| ExamPhase | `midterm` / `final`. subject 기본값 + WeekNote override. | 학기 (term) |
| CoverageSummary | total / covered / missing / coverageRate 4-tuple. | 진도율 일반 |
| SharePolicy | owner-only / small-cohort-readonly. | 외부 publish |
| userNotes | WeekNote 의 사용자 자유 메모 string. sprint-2 BE sync 대상. | sticky note, annotation |

## PDF / Annotation (PdfWorkspace 계열)

| Term | Canonical meaning | Do not use as |
|---|---|---|
| SubjectPdfWorkspace | 한 subject 의 PDF 작업공간 aggregate. material + annotation 묶음. | 단일 PDF 파일 metadata |
| PdfMaterial / PdfMaterialRecord | 강의 PDF 원본 + R2 object 참조. | annotation, PDF 자체 |
| PdfMaterialDraft | FE intake 단계의 client-side material (BE upload 전). | confirmed material |
| backendMaterialId | BE 에서 부여한 materialId. annotation PUT key 의 핵심. | FE local material.id |
| PdfStickyNote | PDF 페이지 위 sticky 메모. `pageNumber` + `anchor` (normalized 0~1). | 자유 메모 (= userNotes) |
| PdfInkStroke | pen 도구로 그린 stroke. points[] + page. | sticky drawing |
| PdfTextBox / PdfChecklist / PdfTable / PdfChart | sprint-12/13 도구 — page + position 으로 배치. | sticky note |
| PdfWorkspaceTool | "read" / "sticky" / "pen" / "eraser" / "text" / "checklist" / "table" / "chart". | local PdfTool union 별칭 (main.ts `LocalPdfTool` 와 sync 필수) |
| PdfEraserShape | "circle" / "square" / "triangle" / "line". | tool kind |
| NormalizedPoint | 0~1 사이로 정규화된 (x, y). page rendering size 와 무관. | pixel coord |
| hydrateSubjectPdfWorkspace | localStorage payload → 안전한 SubjectPdfWorkspace 변환 (fail-closed per item). | 일반 deserialize |

## Auth / Session

| Term | Canonical meaning | Do not use as |
|---|---|---|
| AuthSession | FE in-memory 사용자 인증 상태. `authSession.user.id` 가 userId SoT. | localStorage session |
| userId | `authSession.user.id`. MySQL BIGINT → string. localStorage namespacing 의 키. | studentNumber, login id |
| applySessionTransitionForUser | session attach 시 호출되는 transition routine. namespaced load + (다른 user 일 때) sync cache reset. | 단순 login handler |
| ~~lastSessionUserStorageKey~~ | **DEPRECATED** — sprint-4/S1 에서 marker write/read 완전 제거. 이전엔 `study-note.session.lastUserId` 가 legacy migration owner gate + cross-reload A→B detection 에 쓰였지만 두 기능 모두 폐기. `lastSessionUserId` 는 sprint-4/S1 이후 in-memory only. | 영구 사용자 식별자 |
| clearAuthSession | session 해제 routine. transient /v1/auth/me 실패에도 호출되므로 destructive reset 금지. | logout 만의 의미 |

## Sync / Storage

| Term | Canonical meaning | Do not use as |
|---|---|---|
| autosave | debounced PUT (userNotes 500ms / annotations 750ms) + per-key promise chain. | 즉시 저장 |
| per-key chain | `userNotesPutChains` / `annotationPutChains` — FIFO promise queue. 같은 key 의 PUT 가 wire 위에서 순서 뒤집히지 않도록 보장. | concurrent fan-out |
| backoff pause | 5xx 3회 / 5분 → autosave pause + banner. | network retry |
| hot path GET | view 진입 시 1회 GET hydrate. `userNotesFetchedKeys` / `annotationFetchedKeys` 가 멱등성 보장. | continuous polling |
| AbortController | A→B 전환 / logout 시 in-flight PUT 강제 종료. server arrival 막지는 못함. | full undo |
| revision check | sprint-3 backlog. server-side updatedAt 비교 last-write-wins 약화. | sprint-2 에는 없음 |
| storage namespace | localStorage key 의 `{base}:{userId}` 형태. cross-user leak 막는 invariant. | URL namespace, R2 prefix |
| R2 | Cloudflare R2 (S3-compatible). `S3StorageService` / `STORAGE_PROVIDER=s3` 는 R2 endpoint. | AWS S3 |

## SFS / 운영 메타

| Term | Canonical meaning | Do not use as |
|---|---|---|
| Solon SFS | 본 프로젝트의 sprint/gate workflow 도구. bash adapter SSoT, multi-adaptor (Claude/Codex/Gemini). | bkit, 임의 sprint 도구 |
| Gate 3 / Gate 6 | Plan review / Implementation+Retro review. cross-review 전 self-review PASS 필수. | 단순 review milestone |
| codex review | PR 에 `@codex review` 트리거 → bot inline + 👍 reaction. inline 0 + 30~60s 후 재확인 필수. | OpenAI Codex 일반 호출 |
| `.sfs-local/` | private workbench. 공유 handoff 는 `docs/solon/` 로. | 공유 dir |
| `docs/solon/` | 공유 가능한 sprint / decision / handoff 산출물. | 비공개 작업 메모 |

## 금기 (do-not-confuse 모음)

- **PdfMaterial ≠ SourceMaterial**: 전자 = PDF 원본 파일, 후자 = concept/keyword
  의 출처 분류 (`professor-pdf` 등).
- **userNotes ≠ PdfStickyNote**: 전자 = WeekNote 의 자유 메모 string, 후자 =
  PDF 페이지 위 annotation.
- **subjectId ≠ subject.title**: title 은 변경 가능, id 는 PK.
- **R2 ≠ S3**: 코드 명칭은 S3 지만 인프라는 R2. 추가 storage 도입 전 [decisions](../references/decisions.md) 확인.
- **userId 의 source**: localStorage marker (legacy migration gate) ≠ live identity.
  live = `authSession.user.id`.
