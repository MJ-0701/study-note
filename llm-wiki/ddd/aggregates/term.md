---
id: study-note-agg-term
title: Term Aggregate (학기)
language: ko
load_when:
  - Term
  - 학기
  - Subject
  - grade
  - semester
summary: Term aggregate (학기) — sprint-W21-sprint-1/S1 에서 도입. Subject 1:N relation. admin SPA 학기/과목 관리 + main app sidebar 학기 그룹.
---

# Term Aggregate (학기)

## Root

- `Term` (`packages/persistence/prisma/schema.prisma:41-55`)
  - 식별: `id` (cuid)
  - unique: `(grade, semester, title)` — 동일 학년/학기/제목 중복 차단.
  - 메타: `grade: Int`, `semester: Int`, `title: String`, `startDate: Date?`, `endDate: Date?`
  - 감사: `createdById: String` (plain String, FK 없음), `createdAt`, `updatedAt`.
  - 소유: `subjects: Subject[]` (1:N).

## Owned entities

| Entity | 정의 | 역할 |
|---|---|---|
| `Subject` | `schema.prisma:57-69` | 학기 안의 과목. `termId` FK (RESTRICT on delete). `(termId, title)` unique (학기 내 동일 제목 차단). |

`Subject` 는 자체적으로 다른 aggregate 의 root (`PdfMaterial` 보유) 이지만, **`termId` FK 를 통해 Term aggregate 와 cross-aggregate relation**. Term 입장에서는 자식, Subject 입장에서는 부모 reference.

## Invariants

### T1. (grade, semester, title) unique
schema constraint. 사용자가 같은 학기 중복 생성 차단.

### T2. Subject.termId 는 항상 valid Term.id
schema FK (RESTRICT on delete). Term 삭제 시 child Subject 가 있으면 차단 (race-safe vs count-then-delete service logic).

### T3. Term 삭제는 child Subject 0 일 때만
`TermsController.delete` 가 `getChildCount` 사전 확인 + FK RESTRICT 가 race window 차단 (defense in depth, sprint-W21-sprint-1/S1 ADR-6).

### T4. Subject move = `termId` 갱신 시 새 Term 의 (termId, title) unique 검증
`SubjectsController.move` (sprint-W21-sprint-1/S7). 같은 title 의 subject 가 destination Term 안에 이미 있으면 409.

### T5. Term.startDate <= Term.endDate (둘 다 있을 때)
schema 자체 enforce 안 함. service layer (`TermsService.create/update`) 가 검증.

### T6. default Term backfill (sprint-W22-be-sync)
production DB 의 기존 4 seed subject (digital-engineering / information-communication / c-language / computer-introduction) 의 `termId` 가 NULL 일 때, 신규 migration `20260524025000_backfill_default_term` 이 id=`default-term-backfill-001` ("기본 학기", grade=1, semester=1) 으로 backfill. idempotent.

## 라이프사이클

```
admin SPA — 학기 추가
  POST /api/v1/terms { grade, semester, title, startDate?, endDate? }
    → Term row 생성 (cuid id, createdById = actor.id)

admin SPA — 과목 추가
  POST /api/v1/terms/:termId/subjects { id, title }
    → Subject row 생성 (subjectId = client-provided slug, termId FK)

admin SPA — 과목 이동
  PUT /api/v1/subjects/:id/move { termId }
    → Subject.termId 갱신 + (termId, title) unique 검증

admin SPA / main sidebar — 학기 트리 조회
  GET /api/v1/terms   → [Term]
  GET /api/v1/subjects → [Subject with termId]
    → main sidebar (renderSidebarTermGroups) 가 union 으로 group 화

학기 / 과목 삭제
  DELETE /api/v1/subjects/:id   → ON DELETE RESTRICT on PdfMaterial 도 별개
  DELETE /api/v1/terms/:id      → child subject 있으면 409 (T2/T3)
```

## 외부 의존

- **Subject** (cross-aggregate child): `termId` FK 로 1:N.
- **AuthSession**: 학기/과목 CRUD = master/admin role 만 (SessionAuthGuard + RoleGuard).
- **PdfMaterial**: Subject 자식. Term 변경 시 그대로 따라간다 (subject.id 불변 + storage key 도 user-scoped).

## main app sidebar 표시 정책 (sprint-W22-be-sync, fe-v0.1.28)

`renderSidebarTermGroups` (apps/web/src/subject-views/sidebar.ts):

- termsCache + subjectsCache 둘 다 있어야 group 표시 (boot 직후 / fetch fail 시 flat fallback).
- enrichedSubjects = **BE subjectsCache** 기준 (sprint-W22-be-sync 이전엔 FE notebook 기준 → admin 추가 과목 staleness).
- 각 subject 가 FE notebook 에 있으면 rich link (depth nav 포함), 없으면 minimal link.

## 변경 이력

- sprint-W21-sprint-1/S1 (2026-W21): Term + Subject.termId nullable FK 도입. admin SPA 의 학기/과목 관리 section + main sidebar term grouping (subject sidebar 한정).
- sprint-W21-sprint-1/S7 (2026-W21): Subject move (학기 이동) AC32-AC34. (termId, title) unique 검증.
- sprint-W22-be-sync (2026-05-28): be-v0.1.14 deploy + backfill default Term migration. fe-v0.1.27 home sidebar hierarchy + fe-v0.1.28 sidebar BE subjects union.

## Open questions / TODO

- Term 별 PdfWorkspace summary (학기 별 진도) 별도 page candidate.
- 학기 archive 정책 (졸업한 학기 hide) 미정.
- FE notebook seed (sampleLectureNote) 가 BE seed 와 분리되어 있음. 단일 SoT 로 통합 = React migration 후속.
