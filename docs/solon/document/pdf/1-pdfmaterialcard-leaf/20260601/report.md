---
phase: report
status: final
sprint_id: "2026-W23-sprint-2"
workspace: "1-pdfmaterialcard-leaf"
handoff_dir: "docs/solon/document/pdf/1-pdfmaterialcard-leaf/20260601"
goal: "#1 PdfMaterialCard 공유 leaf 추출"
created_at: "2026-06-01T15:58:29+09:00"
last_touched_at: "2026-06-01T15:58:29+09:00"
closed_at: "2026-06-01T15:58:29+09:00"
domain: "document"
subdomain: "pdf"
feature: "1-pdfmaterialcard-leaf"
---

# 보고서

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 결과

- 목표: S4b-2 `SubjectClassView`와 S4c `PdfWorkspacesView`의 중복 `PdfMaterialCard` React leaf를 공유 컴포넌트로 추출한다.
- 상태: done
- 판정: 구현, 검증, PR merge, FE 배포, prod smoke, ACTIVE 갱신까지 완료.
- 한 줄 결과: `PdfMaterialCard.tsx` shared leaf로 두 prod island의 material card 중복을 제거했고, S1 단수 route는 물리 pen/annotation gate 전 hard stop으로 남겼다.

## 2. 완료한 것

- `apps/web/src/subject-views/PdfMaterialCard.tsx` 추가.
- `SubjectClassView.tsx`는 shared card를 `showClassDateControl={true}`로 호출해 class-date picker/assign action을 유지.
- `PdfWorkspacesView.tsx`는 shared card를 default false branch로 호출해 class-date control 미렌더를 유지.
- 두 정적 spec을 shared leaf + callsite 경계로 갱신.
- PR#143 squash merge: `51a61fc`.
- FE release tag: `fe-v0.1.85`.
- ACTIVE closeout PR#144 squash merge: `ec5accb`.

## 3. 결정

- `PdfMaterialCard` shared props는 현재 두 variant만 지원한다: class-date control 있음/없음.
- S1 단수 `#/subjects/:id/pdf` 전환은 이번 sprint 범위 밖이다.
- S1b pen 2nd-stroke, S1c annotation physical cross-device gate 전까지 agent 자율 구현 금지.

## 4. 검증

- 명령/체크:
  - `node --experimental-strip-types --no-warnings --test apps/web/src/subject-views/__tests__/SubjectClassView.spec.ts apps/web/src/subject-views/__tests__/PdfWorkspacesView.spec.ts`
  - `pnpm -r build`
  - `pnpm --filter web test:run`
  - `node apps/web/scripts/playwright-s4b2-subject-class-loop.mjs`
  - `node apps/web/scripts/playwright-s4c-pdf-workspaces-loop.mjs`
  - `PROD_URL=https://study-note.910701.xyz/ node scripts/playwright-prod-smoke.mjs`
- 결과:
  - targeted specs: exit 0 · 87 pass · 0 fail
  - build: exit 0
  - web tests: exit 0 · 165 pass · 0 fail
  - S4b2 loop gate: exit 0 · GREEN + FOCUS-PRES + DIST delta + RED A/B PASS
  - S4c loop gate: exit 0 · GREEN + FOCUS-PRES N/A + DIST delta + RED A/B PASS
  - FE Release run `26739780203`: success
  - prod smoke: exit 0 · HTTP 200 · login/signup visible · PASS
- 수동 확인:
  - SFS Gate 3 self/cross PASS
  - SFS Gate 6 self/cross PASS
  - PR#143/PR#144 `@codex review`: major issues 없음
  - GitHub backend smoke run #48/#50: success

## 5. 위험 / 후속

- 위험: shared leaf가 S1 요구까지 미리 끌어안으면 scope creep가 생긴다.
- 대응: shared props를 S4b-2/S4c 현재 variant에만 맞췄다.
- 후속: S1 단수 route React 전환은 물리 gate unlock 후 별도 sprint.

## 6. 남긴 것 / 접은 것

- 남김:
  - `docs/solon/handoff/ACTIVE.md`에 최신 release evidence와 S1 hard stop 반영.
  - untracked `llm-wiki/.obsidian/graph.json`은 사용자/환경 파일로 유지, PR에 포함하지 않음.
- private archive: `.sfs-local/sprints/2026-W23-sprint-2`는 `sfs retro`로 close됨.

## 7. 다음

- S1 (pdf-workspace 단수)만 React migration 잔여로 남음.
- 시작 조건: pen 2nd-stroke physical check + annotation physical cross-device gate에 대한 사용자 unlock.

## 8. Wiki compile

<!-- solon:wiki-compile-checklist:start -->
- status: active
- sprint_records: `docs/solon/document/pdf/1-pdfmaterialcard-leaf/20260601/report.md` and `docs/solon/document/pdf/1-pdfmaterialcard-leaf/20260601/retro.md` remain the close evidence SSoT; do not copy them wholesale into the wiki.
- compile_to_wiki: when durable, update `llm-wiki/` TopicHubs, DDD maps, glossary/ubiquitous-language, history map, bug reports, or a gap note.
- compile_only: decisions, domain terms, architecture/release/test contract changes, recurring defects, and follow-up gaps.
- human_review: shared knowledge promotion, deletion, sensitive/private material movement, and conflict resolution need human review before merge.
- generated_at: 2026-06-01T15:58:29+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:wiki-compile-checklist:end -->

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (734 tracked files), domains=3, last_review=pass, infra_signals=12, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- recommend: `taxonomy` activate (light) — glossary + naming/aggregation rules; triggers: multi-domain or large codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-06-01T15:58:29+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
