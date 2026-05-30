---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-5"
workspace: "s3-home-sidebar-intake-react-authgate-pure-props-island-click-submit-input-pointer-dispatcher"
handoff_dir: "docs/solon/identity/auth/s3-home-sidebar-intake-react-authgate-pure-props-island-click-submit-input-pointer-dispatcher/20260531"
goal: "S3: home + sidebar + intake 뷰 React 마이그레이션 (AuthGate pure-props island 패턴 재사용, click/submit/input 위임만 — pointer dispatcher 무관)"
created_at: ""
last_touched_at: "2026-05-31T01:15:02+09:00"
closed_at: 2026-05-31T01:15:02+09:00
domain: "identity"
subdomain: "auth"
feature: "s3-home-sidebar-intake-react-authgate-pure-props-island-click-submit-input-pointer-dispatcher"
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

> ⚠️ 도메인 = web/react-migration (sfs auto-slug 가 identity/auth 로 오분류 — brainstorm §8 taxonomy 메모, 비차단). 이전 S1a/S2 handoff = docs/solon/web/react-migration/.

## 1. 계속할 것

- **portal-into-slot + pure-props leaf 패턴**: HomeView/IntakeView 가 hook 0, 부모(vanilla renderApp)가 유일 render trigger → React #185 구조적 면역. S1a/S2 자산 재사용 마찰 최소. S4(subject views)가 home 패턴 직접 상속.
- **integration loop-gate(session-stub real-path)**: AuthGate gate 를 복제하되 cookie+localStorage+`/v1/auth/me`+`/materials`+`/v1/subjects` mock 으로 **post-auth 실경로** 도달. standalone-only 게이트(S1a 맹점) 회피. negative control 을 실 wiring(router swap)에 심어 게이트 유효성 증명.
- **main Opus 독립 검증(worker 자가보고 불신)**: loop-gate/unit/grep 전부 재실행 + 라인 실독. worker self-report 만으로 PASS 판정 안 함.
- **morphdom preserve 사전 실독**: `shouldPreserveReactIsland`=generic 확인 → advisor 가 "최대 위험 edit"으로 본 것이 실은 edit 불필요였음. plan 전 load-bearing 가정 검증.

## 2. 문제

- **loop-gate 가 parity 를 검증 못 함**: gate 가 empty data([])로만 돌아 island "렌더+무루프"만 증명, **AC2 핵심인 시각 parity(old renderHome 출력 동치)는 미검증**이었음. advisor 지적 → producer math + 카드 구조 source-diff 로 사후 closure. **교훈: 마이그레이션 = parity 가 정의 invariant. 게이트가 parity 를 안 잡으면 "PASS=완료"로 과장 금지.**
- **codex lane 전면 down**(usage-limit + claude bridge 401) → Gate 3/6 cross 전부 Gemini fallback. @codex post-impl deferred. 단일 외부 reviewer 의존 리스크.

## 3. 시도할 것

- **loop-gate 에 rich-data fixture 추가**: empty([]) 뿐 아니라 multi-subject + needs-fill + warnings 있는 mock notebook 으로도 GREEN 단언 → map-heavy 경로 + producer math 를 게이트가 직접 검증(parity 를 source-diff 수작업에 의존 안 하게).
- **migration slice 의 AC2 검증 표준화**: "old 출력 ↔ new 출력 source-diff" 를 plan 단계에서 명시 evidence 로 박기(다음 S3b/S4 carry).

## 4. 이어갈 것

- **operator QA(미완)**: 실 로그인 후 home/intake 시각·동작 1회 — metric 숫자/subject card/needs-fill 가 실 multi-subject notebook 에서 맞는지(auth-gated, 자동화 불가). 이상 시 fix-forward.
- **S3b**: sidebar(`renderHomeSidebar`/`renderSubjectSidebar`) — broad-entrypoint composeShell(전 12 route) 재배선. 본 슬라이스에서 격리한 위험.
- **S4**: subject views(class/summaries/week 등) — home island 패턴 상속.
- @codex: codex 복구 시 #132 에 post-impl 외부 review(optional, 비차단).

## 5. 종료 체크

- [x] report 가 최신이다 (report.md + implement.md ledger + review.md)
- [x] review 조치가 완료 또는 이월됐다 (Gate 6 required actions=none; operator QA + @codex = 이월)
- [x] workbench 가 접혔다 (sprint closed, fe-v0.1.76 prod live)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (680 tracked files), domains=3, last_review=pass, infra_signals=12, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- recommend: `taxonomy` activate (light) — glossary + naming/aggregation rules; triggers: multi-domain or large codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-31T01:15:02+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
