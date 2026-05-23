---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
sprint_id: "2026-W21-sprint-4"
goal: "PDF mobile rendering (pdfjs-dist canvas)"
closed_at: 2026-05-23T17:21:04+09:00
workspace: "pdf-mobile-rendering-pdfjs-dist-canvas"
domain: "document"
subdomain: "pdf"
feature: "pdf-mobile-rendering-pdfjs-dist-canvas"
handoff_dir: "docs/solon/document/pdf/pdf-mobile-rendering-pdfjs-dist-canvas/20260523"
last_touched_at: "2026-05-23T17:21:04+09:00"
---

# 회고 — 2026-W21-sprint-4

## 한 줄 요약

native `<iframe src="*.pdf#page=N">` → pdfjs-dist canvas 전환 sprint. main
구현 (PR #40) 후 iPad blank canvas 발생 → 진단 (debug overlay + RUM) → root
cause (Map.prototype.getOrInsertComputed 미지원) → fix (polyfill + legacy
build) → cleanup. 총 PR 5개 + tag 5개 (fe-v0.1.19 ~ fe-v0.1.23) prod 배포.

## 머지된 PR

| PR | 한줄 | tag |
|----|------|-----|
| #40 | sprint-4: pdfjs-dist canvas viewer 전환 (S1~S4) | fe-v0.1.18 |
| #42 | iPad blank canvas 진단 debug overlay | fe-v0.1.19 |
| #43 | Datadog RUM mount events + errors | fe-v0.1.20 |
| #44 | Map/WeakMap upsert polyfill | fe-v0.1.21 |
| #45 | pdfjs-dist legacy build 전환 | fe-v0.1.22 |
| #46 | debug overlay cleanup | fe-v0.1.23 |

(병행 progress: sprint-W21-sprint-2/S2+S3 의 #35 sync hardening + #38
backfill + #41 race fix 도 이 sprint 안에서 마감.)

## 주요 결정

1. **iPad 진단 path = debug overlay deploy** (cable/inspect 부재 환경).
   PR #42 의 화면 badge 가 [FAIL] TypeError 메시지를 정확히 캡처 → root
   cause 즉시 확정.
2. **Fix 전략 = 2-layer + defense in depth**.
   - PR #44 polyfill (특정 method)
   - PR #45 legacy build (vendor 공식 광범위 polyfill 포함)
   - polyfills.ts 는 cleanup 후에도 유지 — 미래 회귀 보호.
3. **RUM observability backbone (PR #43)** = 진단 도구가 아니라 backbone.
   debug overlay 제거 후에도 Datadog dashboard 에서 mount phase / device 분포
   / error pattern 영구 추적 가능.

## SFS policy 회복

- PR #38 merge 시 codex review 트리거 누락 (실수). post-hoc `@codex review`
  → P1 finding (read-then-create race) → PR #41 hotfix. self-CPO (Opus 4.7)
  도 동일 finding 독립 발견 → invariant 충족.
- 이후 모든 PR (#42/#43/#44/#45/#46) = self-CPO + @codex review 무조건 + push
  전에 typecheck/build/spec 통과 패턴 준수.
- SFS 0.6.106 으로 upgrade (router contract "Executable Action Ownership"
  추가) — runtime SFS.md 업데이트 commit (c1a5e0c, chore(sfs): update runtime).

## 교훈 (memory 로 발췌)

- console 접근 불가 환경의 진단 = user-facing debug overlay deploy 가 다음
  best path. RUM 도 같이 깔면 retrospective + multi-device 분석 가능.
- 단일 polyfill = 땜질. vendor 의 legacy build (광범위 polyfill 포함) 가
  진짜 범용 호환 path. polyfill 은 defense in depth 로 함께 유지.
- TC39 stage 3+ proposal 은 vendor 가 일찍 채택 → 브라우저 분포 따라 fail.
  legacy build 또는 explicit polyfill 필요.
- Mac Safari wireless inspect = USB pair 이력 강제 (Apple 정책). cable 없으면
  debug overlay deploy 가 deploy 1회로 진단 가능한 가장 빠른 path.

## 남은 backlog

- mismatch 4 (dual-account orphan) = 향후 user merge 결정 전까지 R2 에 남김.
  user 가 두 account 통합 결정 시 별도 sprint 로 cleanup + R2 key 이전.
- prod FE 의 PDF 정상 동작 다른 device (구 iPad / Android / WebView) 도 회귀
  smoke 수동 확인 권장 (특히 sprint 의 4 backfilled annotation user).

## 인계 (다음 sprint)

- annotation domain 의 batch GET / single GET / CAS path 모두 prod 안정.
  Datadog APM 으로 latency baseline 기록 후 임계치 alert 설정 백로그.
- PDF canvas mount RUM (5 event) 의 prod 분포 1주일 후 검토 — timeout/error
  비율이 0% 에 가까우면 watchdog 시간 단축 또는 RUM event 일부 축소 (cost).
- SFS 0.6.106 의 parallel sub-agent (`sfs implement --agent-mode parallel
  --agents codex,claude[,gemini]`) 다음 sprint 부터 적극 검토 — 본 sprint 의
  PR #44/#45 같은 disjoint lane (polyfill / legacy import) 은 parallel
  실행 후보였음.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (371 tracked files), domains=0, last_review=unknown, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-23T17:21:04+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
