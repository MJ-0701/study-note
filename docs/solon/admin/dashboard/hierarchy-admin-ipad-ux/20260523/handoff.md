---
sprint_id: 2026-W21-sprint-1
goal: "학기/과목 hierarchy + admin·master CRUD + PDF calendar + iPad 펜 UX + ESC 도구 해제 + 별표 widget + Subject 이관"
gate: Gate 3 (Plan) PASS — 2026-05-23T22:22:44+09:00
handoff_kind: fresh-session implement
domain: admin
subdomain: dashboard
feature: hierarchy-admin-ipad-ux
created_at: 2026-05-23T22:25:00+09:00
---

# Sprint-W21-sprint-1 Implement Handoff

## Gate 3 PASS evidence

- **plan.md**: `.sfs-local/sprints/2026-W21-sprint-1/plan.md` (411+ lines, 9 sprint slices S1~S7, 34 ACs, 12 ADRs)
- **review.md**: `.sfs-local/sprints/2026-W21-sprint-1/review.md` (Round 8 capsule 보조 압축 요약 inline)
- **log.md**: `.sfs-local/sprints/2026-W21-sprint-1/log.md` (9 capture)
- **cross result final**: `.sfs-local/tmp/review-runs/2026-W21-sprint-1-gate3-20260523T132053Z-39585/result.md` (Round 8 PASS)

## Round 진행 (9 rounds)

| stage | rounds | findings patched |
|---|---|---|
| inline self-CPO | 2 | 12 (Round 1 partial → Round 2 PASS) |
| cross codex | 8 | 18 (4+4+2+5+4+3+1+0) |

## Implement entry point

```bash
sfs status
# 확인: sprint 2026-W21-sprint-1 · Gate 3 PASS

# 정책 = Claude main 직접 코딩 (memory feedback_opus_no_direct_code)
sfs implement  # 또는 user 가 manual 진행
```

## 7 PR 슬라이스 (의존성 + parallel lane)

| group | scope | depends | parallel |
|-------|-------|---------|----------|
| s1 | BE Term/Subject API + admin UI + backfill + 409 reject delete + auth negative + XSS + DTO whitelist + child-count endpoint + startDate/endDate validation | — | — (먼저) |
| s2 | sidebar nested rendering | s1 merged | — |
| s3 | PdfMaterial.classDate Date migration + calendar input + label fallback (20 사이트) | — (S1 무관) | — |
| s4 | iPad 펜 실시간 paint (getCoalescedEvents + RAF batch) | — | s3/s5/s6 |
| s5 | ESC 도구 해제 (FE only) | — | s3/s4/s6 |
| s6 | 별표 widget (drag-resize + whole-reject validation) | — | s3/s4/s5 |
| s7 | Subject 이관 (move) API + UI + 위계 spec | s1 merged | s2 |

**parallel lane 권장**: S3+S4+S5+S6 동시 worker (disjoint files_scope). S1 → S2 + S7. S5/S6 = main.ts 같은 파일이지만 다른 함수 — sequential merge 도 OK.

**SFS 0.6.106 parallel agent mode 옵션**:
```bash
sfs implement --agent-mode parallel --agents claude,codex "S3 + S4"
```
하지만 본 sprint 는 size 작아 single-agent (Claude) sequential 도 충분.

## 핵심 ADR (12개) — implement 시 절대 위반 금지

| # | rule |
|---|---|
| ADR-1 | Term unique = `(grade, semester, title)` 3-tuple |
| ADR-2 | Term ownership global (master/admin CRUD, user read-only) |
| ADR-3 | `PdfMaterial.classDate String → DateTime @db.Date` migration |
| ADR-4 | Subject = metadata-only, **ownerId 없음** (R2 key 가 user 자료 SoT) |
| ADR-5 | 권한 위계 = Term 차원만, Subject 동등 CRUD (단 부모 Term 위계 인계) |
| ADR-6 | delete = **409 reject only** (cascade soft-delete 폐기) |
| ADR-7 | starMark = `AnnotationSnapshot.payload` JSON collection |
| ADR-8 | ESC 우선순위 = (1) modal close (2) tool reset (3) browser default |
| ADR-9 | untrusted-input hardening = BE Zod `.strict()` + FE `escapeHtml()` + SVG regex + DTO whitelist |
| ADR-10 | Term.startDate/endDate = 사용자 정의 nullable, BE classDate range 검증 X |
| ADR-11 | Subject move = termId 만 변경, 자식 영향 0, 출발지+도착지 모두 위계 검사 |
| ADR-12 | starMark = whole-payload reject (개별 drop 폐기) |

## Implement 진입 전 추가 확인 사항

1. **prisma migration 순서** (AC7): Term create → Subject.termId nullable → backfill → NOT NULL enforce. 별도 migration 3개로 분리.
2. **backfill script 안전**: `scripts/backfill-default-term.ts --dry-run` → `--apply`. MASTER_USER_ID env + role 검증 + transaction.
3. **AC1b XSS grep**: `apps/web/src/main.ts` 안 모든 `${...title...}` template 사이트 grep → `escapeHtml()` 통과 보장.
4. **AC13 label fallback grep**: `week.label` / `weekNote.label` ≈ 20 사이트 fallback (`formatKoreanDate(classDate) ?? "(날짜 미지정)"`).
5. **R2 storage key 영향 0**: ADR-4 + ADR-11 보장. PdfMaterial.ownerId namespacing 그대로.

## Independence warning (cross review evidence)

- codex profile `gpt-5.5 xhigh` runtime 증명 불가 (codex CLI default 사용, `SFS_REVIEW_CODEX_CMD` 미설정). evidence 차원 warning, verdict 자체는 유효.
- 본 sprint 의 Gate 3 PASS = self-CPO PASS (Round 2) + codex cross PASS (Round 8 = 8 rounds). 충분.

## Session 분리 이유

- 본 sprint Gate 3 = brainstorm + plan + 9 review rounds. 단일 세션 context 무거움.
- CLAUDE.md "Session Continuation Guard": "새 gate/loop/review handoff 전 50%+ 또는 여러 WU/sprint/loop wake 거쳤다면 fresh session".
- fresh session = plan.md + review.md + handoff.md + memory 만 읽고 implement 진입. 결정 history 는 plan 의 ADR + log.md 가 SoT.

## Fresh session start prompt 예시

```
study-note repo 의 sprint-W21-sprint-1 implement 진입.

읽기 의무:
- .sfs-local/sprints/2026-W21-sprint-1/plan.md (34 AC + 12 ADR)
- .sfs-local/sprints/2026-W21-sprint-1/review.md (capsule 보조 요약)
- docs/solon/admin/dashboard/hierarchy-admin-ipad-ux/20260523/handoff.md (본 문서)
- memory feedback_codex_finding_filter, feedback_opus_no_direct_code, project_storage_is_r2

S1 (BE Term/Subject API + admin UI + backfill + 7 negative spec + XSS + DTO + child-count + startDate/endDate validation) 부터 시작.

Implement 진행 방식 = Claude main 직접 (memory feedback_opus_no_direct_code).
ADR 위반 금지. AC 마다 spec 동반.
완료 후 self-review → codex cross review (sfs review --gate 6 --stage self → cross) → user push → Gate 6 PASS.
```
