---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-6"
workspace: "s3b-sidebar-renderhomesidebar-rendersubjectsidebar-react-island-broad-entrypoint-composeshell-renderappshell-12-route"
handoff_dir: "docs/solon/s3b-sidebar-renderhomesidebar-rendersubjectsidebar-react-island-broad-entrypoint-composeshell-renderappshell-12-route/20260531"
goal: "S3b: sidebar(renderHomeSidebar/renderSubjectSidebar) React island 마이그레이션 — broad-entrypoint(composeShell→renderAppShell 전 12 route 공유) 격리"
created_at: ""
last_touched_at: "2026-05-31T03:10:16+09:00"
closed_at: 2026-05-31T03:10:16+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **pure-props leaf + producer 분리 + 전체 view-model memoize** = React island loop-immunity 의 검증된 골격. S3(home/intake) 자산을 S3b 가 그대로 재사용해 신규 위험만 (Set→bool memoize) 추가하면 됐다.
- **div-slot(display:contents) + composeShell seam** = broad-entrypoint(12 route 공유) 을 appShell.ts 0-line 변경으로 격리. seam funnel 1곳에 descriptor 변환만 꽂는 방식이 깔끔했다.
- **loop-gate negative control A/B 분리** = mount-time(#185) 과 click-time(§5-C) 루프를 각각 RED 로 증명. B 가 green@mount/red@post-click 임을 게이트가 self-guard 로 강제해 "A 변종" 위장 차단.
- **worker(Sonnet) 구현 → main(Opus) 자가보고 불신 독립 재실행 검증**. build/unit/loop-gate 직접 돌리고 source 실독.

## 2. 문제

- **self-review 가 render-half 만 실독하고 dispatch-half(main.ts 56-line seam diff)를 미실독한 채 AC1/AC2 wiring 을 "implemented" 로 단언**. advisor 가 잡았다. producer 가 완벽해도 call site 가 잘못된 descriptor 를 넘기면 parity 깨지는데, producer source-diff 와 unit spec 은 구조적으로 그걸 못 본다. → 실독으로 13 call site(4 home/9 subject) mismatch 0 확인해 PASS 유지했지만, **acceptance ledger 에 "verified" 로 적은 라인을 실제로 안 읽은 것 = 직전 S1a incident 와 같은 오류 class**.
- field-level producer spec 이 JSX 렌더 divergence(depth-nav aria-label 누락)를 못 잡아 수동 source-diff 로만 잡혔다. S3 부터 반복되는 한계.
- codex usage-limit down 으로 cross 를 Gemini 단독 + waiver 로 처리. 외부 evidence 다양성 부족.

## 3. 시도할 것

- **Gate 6 self-CPO 체크리스트에 "seam/dispatch diff 실독" 을 명시 항목으로 추가**. island 마이그레이션은 render-half(leaf/producer) + dispatch-half(call site/seam) **둘 다** 실독해야 AC1/AC2 wiring 을 "verified" 로 표기 가능. 한쪽만 읽고 ledger 에 implemented 적으면 partial.
- parity 오라클을 field-spec 에서 **old≡new renderToStaticMarkup 정규화 string-equal** 로 승격 검토(후속 deferred 항목). JSX divergence 자동 포착.
- codex 복구 후(06:13 KST 지남) **7시 codex CPO cross review** 로 여태 구현분(S1a~S3b) 외부 evidence 보강 — 다음 세션 obligation.

## 4. 이어갈 것

- **다음 세션 goal = React 마이그레이션 남은 슬라이스 완주**(roadmap §4). 한 슬라이스가 아니라 남은 것 끝날 때까지 연속 작업.
- **deploy 후 operator 시각 QA** — sidebar 실렌더(home/subject 양 variant, term-group toggle, admin block) auth-gated 자동화 불가 → user 확인. 버그 발견 시 후속 신고.
- dead-prop ×2(`SubjectNavItem.ariaLabel`, `SubjectSidebarProps.pdfWorkspacesActive`) + old sidebar.ts renderer 제거 = parity oracle 역할 끝나면 후속 정리.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (Required cross=Gemini PASS, FYI dead-prop=이월)
- [x] workbench 가 접혔다 (sprint 2026-W22-sprint-6 closed)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (689 tracked files), domains=3, last_review=pass, infra_signals=12, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- recommend: `taxonomy` activate (light) — glossary + naming/aggregation rules; triggers: multi-domain or large codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-31T03:10:16+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
