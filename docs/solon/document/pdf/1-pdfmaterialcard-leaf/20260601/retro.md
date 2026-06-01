---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W23-sprint-2"
workspace: "1-pdfmaterialcard-leaf"
handoff_dir: "docs/solon/document/pdf/1-pdfmaterialcard-leaf/20260601"
goal: "#1 PdfMaterialCard 공유 leaf 추출"
created_at: "2026-06-01T15:58:29+09:00"
last_touched_at: "2026-06-01T15:58:29+09:00"
closed_at: 2026-06-01T15:58:29+09:00
domain: "document"
subdomain: "pdf"
feature: "1-pdfmaterialcard-leaf"
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- SFS Gate 6 전에는 code acceptance와 post-merge release closeout을 분리해 적는다.
- shared leaf 추출처럼 prod island 2개를 건드리는 refactor는 static spec + loop gate를 같이 돌린다.
- preview server가 필요한 Playwright gate는 sandbox listen 제한을 빠르게 판정하고 sandbox 밖에서 동일 명령을 재실행한다.

## 2. 문제

- 처음 계획에서 PR/tag/deploy evidence를 Gate 6 pre-push AC로 넣어 self review partial이 났다.
- 새 파일은 `git diff`에 보이지 않아 Gate 6 evidence packaging이 약해질 수 있다.

## 3. 시도할 것

- release evidence는 `post-Gate-6 closeout`으로 명시해 SFS pre-push review와 충돌하지 않게 한다.
- 새 파일이 있는 Gate 6 전에는 `git add -N <file>` 또는 실제 stage로 diff visibility를 확보한다.

## 4. 이어갈 것

- S1 단수 `#/subjects/:id/pdf` React 전환.
- 단, pen 2nd-stroke physical check와 annotation physical cross-device gate unlock 전까지 agent 자율 구현 금지.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## 6. Wiki compile

<!-- solon:wiki-compile-checklist:start -->
- status: active
- sprint_records: `docs/solon/document/pdf/1-pdfmaterialcard-leaf/20260601/report.md` and `docs/solon/document/pdf/1-pdfmaterialcard-leaf/20260601/retro.md` remain the close evidence SSoT; do not copy them wholesale into the wiki.
- compile_to_wiki: when durable, update `llm-wiki/` TopicHubs, DDD maps, glossary/ubiquitous-language, history map, bug reports, or a gap note.
- compile_only: decisions, domain terms, architecture/release/test contract changes, recurring defects, and follow-up gaps.
- human_review: shared knowledge promotion, deletion, sensitive/private material movement, and conflict resolution need human review before merge.
- generated_at: 2026-06-01T15:58:29+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:wiki-compile-checklist:end -->

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (734 tracked files), domains=3, last_review=pass, infra_signals=12, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- recommend: `taxonomy` activate (light) — glossary + naming/aggregation rules; triggers: multi-domain or large codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-06-01T15:58:29+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
