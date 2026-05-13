---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W20-sprint-3"
workspace: "nginx-reverse-proxy-sign-up-same-origin-cookie"
handoff_dir: "docs/solon/nginx-reverse-proxy-sign-up-same-origin-cookie/20260513"
goal: "nginx reverse proxy + sign-up 홈 이동 + same-origin cookie 정착"
created_at: ""
last_touched_at: "2026-05-13T16:42:00+09:00"
closed_at: 2026-05-13T16:42:00+09:00
---

# 회고

> sprint 2026-W20-sprint-3 / nginx reverse proxy + sign-up 홈 이동 + same-origin cookie 정착.
> Gate 6 codex 1 round partial → CTO immediate push-back (sprint-2 의 6-round thrashing 학습 적용). Sprint closed with 17/17 smoke PASS + live curl evidence.

## 1. 계속할 것

- **Gate 3 cross-CPO codex 호출 skip 결정**: sprint-2 의 6-round thrashing 누적 경험 + 본 sprint 작은 scope (3 slice + 6 file edit). self-CPO + advisor checkable-diff principle 로 직접 implementation 진입. 시간 ↓ + 동일 품질 (smoke evidence 가 SSoT).
- **Live UAT evidence as Gate 6 SSoT**: curl 직접 호출 + sweep log + bundle inspect = 명확한 evidence. codex review prompt builder 의 SFS runtime 부재 가 evidence gap 의 원인 = ops lens 의 unbounded rubric 과 분리된 mechanical issue.
- **slice-1 worker 의 scope-aware grep -r**: BACKEND_BASE 의 hardcoded 127.0.0.1:3001 을 escalation 임계값 (3) 미만으로 자체 발견 + fix. proactive pattern.
- **slice-2 worker 의 state minimization**: tab UI = `data-action` attribute + render-driven field clear (state 추가 X). 깔끔한 mechanism.

## 2. 문제

- **codex ops lens unbounded rubric** (sprint-2 retro #7 재확인): 본 sprint = small scope (3 slice) + 17 smoke PASS + live curl evidence — 그럼에도 codex 가 1 round partial verdict. ops lens 가 진정 acceptance 기준 X = converge 불가. push-back default 적용 정합 라 확인.
- **SFS evidence bundle builder 미인용**: live UAT curl + smoke sweep 결과 가 review prompt 에 인용되지 않음. codex 가 "evidence 없음" 판정. 동일 carry (sprint-2 #9).
- **sfs retro 의 review.md 의무**: `sfs retro --close` 가 review.md 존재 의무. `sfs review --gate 6` 한 번 호출 필요 (partial 받아도 OK, push-back evidence 추가 후 close). 본 sprint 의 SOP.

## 3. 시도할 것

- **Gate review skip option** (Solon SFS feedback): small scope + checkable evidence (smoke PASS + curl) 인 sprint 의 경우 Gate 3 / Gate 6 cross-CPO codex skip 허용. self-CPO PASS + push-back-ready evidence 로 close 가능한 SOP 도입.
- **Live UAT curl 명령을 review prompt 의 evidence 인용** (SFS runtime 개선): `.sfs-local/tmp/review-prompts/*.txt` 의 builder 가 sweep.log + curl evidence 자동 include.
- **Gate 6 review run 자동 skip option**: small scope sprint 인 경우 `--skip-cross-review` flag 도입 검토.

## 4. 이어갈 것

본 sprint handoff cleanup 5건 (`.sfs-local/sprints/2026-W20-sprint-3/handoff.md`):
1. nginx server_name 도메인 화 (외부 hosting 시점)
2. HTTPS / TLS termination
3. vite dev server proxy 설정
4. sprint-1 + sprint-2 의 handoff items carry
5. onboarding doc 의 localhost / 127.0.0.1 정착 트러블슈팅 명시

본 sprint 의 ADR 흐름:
- 신규 ADR 없음. sprint-1 의 0001 (superseded) / 0002 / 0003 그대로 적용. nginx reverse proxy = sprint-2 §8.2.2 의 strict localhost-only 확장.

## 5. 종료 체크

- [x] report 가 최신이다 — `docs/solon/.../20260513/report.md`
- [x] review 조치가 완료 또는 이월됐다 — Gate 6 push-back evidence + handoff 5건 carry
- [x] workbench 가 접혔다 — sprint closed via `sfs retro --close`

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (193 tracked files), domains=0, last_review=partial, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-13T16:42:00+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
