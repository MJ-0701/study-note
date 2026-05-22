---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-2"
workspace: "be-persistence-ia"
handoff_dir: "docs/solon/be-persistence-ia/20260522"
goal: "메모/필기 BE persistence + 필수암기노트 시험구분 + 진입화면 우선 IA"
created_at: ""
last_touched_at: "2026-05-22T19:37:17+09:00"
closed_at: 2026-05-22T19:37:17+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- self-review (diff + 7영역) 먼저, self-fix 후 codex 호출 — 11라운드 누적에서 reviewer subagent 가 codex 누락 1건 추가 발견.
- codex PR-level +1 reaction = PASS 신호. inline 0 만으로는 판정 X.
- AbortController + Promise chain layered (FIFO + termination) PUT race 패턴.

## 2. 문제

- codex 가 동일 stale finding 을 11라운드 반복 re-flag. triage 비용 누적.
- localStorage 가 global 이라 cross-user leak vector 가 marker+wipe 패턴 fallback 으로만 막힘 — 구조적 fragile.
- client-side PUT chain 으로 단일 디바이스 FIFO 만 보장. cross-device race 는 plan §5.2 LWW 수용 상태.

## 3. 시도할 것

- localStorage userId-namespacing (`study-note.notebook.v2:{userId}`) — leak vector 클래스 제거.
- server-side updatedAt/etag revision check — cross-device PUT race 진정한 해결.

## 4. 이어갈 것

- PDF 전체화면 + 필기도구 단축키 backlog 가 next sprint 후보.
- sprint-3 backlog 2건 (userId namespace + revision check) 우선순위 결정.

## 5. 종료 체크

- [ ] report 가 최신이다
- [ ] review 조치가 완료 또는 이월됐다
- [ ] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (338 tracked files), domains=0, last_review=unknown, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-22T19:37:17+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
