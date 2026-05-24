---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-2"
workspace: "main-ts-routing-shell-layer-ddd-app-routes-ts-app-appshell-ts"
handoff_dir: "docs/solon/main-ts-routing-shell-layer-ddd-app-routes-ts-app-appshell-ts/20260525"
goal: "main.ts routing/shell layer DDD 분리 — app/routes.ts + app/appShell.ts 추출"
created_at: ""
last_touched_at: "2026-05-25T01:44:36+09:00"
closed_at: 2026-05-25T01:44:36+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **Brainstorm Q1~Q4 사전 결정** → AC scope 확정 후 plan 진입. AC7 line target
  같은 ambitious goal 도 산술 사전 검증 후 사용자 합의. PR review 의 "AC 의미"
  논쟁 줄임.
- **Context (least-privilege) + Sink interface** = boundary 모듈 추출 시
  module state 결합을 끊는 표준 패턴. broad `authSession` / `notebook` 노출
  X. layer B/C/D 분해도 같은 pattern 적용.
- **이동 commit / behavior commit 분리** (slice 1 = routes pure / slice 2 =
  appShell+wiring+AC9 escape). PR diff review noise 분리 효과 큼.
- **DOM-parsed XSS assertion** (linkedom) = substring grep 보다 false fail
  / false pass 모두 줄임. Gate 3 self round-4 P1 (`onerror=` substring 의
  escape 후 inert text 가 false fail) 회피.
- **source-grep spec 의 multi-source 합본 패턴** = pdf-material-library +
  pdf-annotation-layer spec 의 `mainTs` = main.ts + app/routes.ts +
  app/appShell.ts 합본. 분해 후속 sprint 에서도 같은 helper 패턴 사용.
- **Capture-based waiver** (`sfs capture --kind user-approval/exception/
  evidence`) = AC7/AC8/AC4/AC10(n) 의 deterministic finding 을 plan rework
  대신 evidence 기록으로 처리. Gate 6 ledger 가 user-approved exception 인식.

## 2. 문제

- **Gate 3 cross codex 5 round / Gate 6 cross 2 round** = SFS profile
  bridge evidence (codex `gpt-5.5` xhigh self-attestation) 가 매번 review
  result 에 emit 안 됨. infra bug 아니라 codex LLM self-attestation 한계.
  bridge-probe.stderr.txt 의 banner 를 explicit capture 후에야 PASS.
  ✦ 학습 = 첫 cross review 부터 profile evidence 를 plan frontmatter 에
  미리 embed 해서 round 단축.
- **AC7 ambitious goal (≤10,750)** = layer A 단독 산술 한계 (300 line 추정
  vs 실 265 line). brainstorm Q1 사용자 결정 시점에 정확한 한계 노출했지만
  여전히 49 line 부족 발생 → cleanup commit 3 + exception capture.
  ✦ 학습 = layer A~D 누적 기준으로 line 목표를 multi-sprint 누적 metric 으로
  정의하자.
- **AC8 (1 PR / 2 commit) → 4 commit** = Gate 6 self review 의 deterministic
  finding (AC3 grep, line count cleanup) 대응 commit 추가. plan AC8 의 정확
  contract 위반.
  ✦ 학습 = AC8 같은 commit count 제약은 Gate 6 self review finding 횟수를
  미리 예측 불가 → plan AC 에서 "최소 2 commit" + "review finding 대응
  commit 무한 허용" 표현으로 완화.
- **Pre-existing 3 spec fail** (chart-tool, inspector-drill, pdf-material-
  library subtest 6/9) 의 root cause = 본 sprint 전부터 존재. AC4 user-
  approved waiver 처리. 다음 sprint 전 fix 또는 별 backlog 진입 결정 필요.
- **codex bot 의 첫 review iteration** = `.sfs-local/` 없다고 confused
  (private workbench gitignore). 30초 후 두 번째 iteration 에서 정상 PASS.
  [[feedback-codex-bot-review-timing]] 정책 적용 (지연 도착 finding 가능)
  으로 두 번째까지 기다림.

## 3. 시도할 것

- **Layer B (PDF workspace) sprint = 30+ 함수 추정** = annotation render +
  ink stroke + drill highlight + drag handler + star mark + PDF nav +
  fullscreen toggle + classDate dropdown. layer A 의 Context/Sink 패턴
  재사용. **위험도 매우 큼** (sprint-W21-sprint-1 의 좌표 0~1 ratio +
  RAF batch + getCoalescedEvents + morphdom canvas preservation +
  pdfjs polyfill saga invariant). 별 sprint 진입 시 advisor + brainstorm
  Q 사전 합의 필수.
- **Layer A 의 backlog 항목 정리**:
  - `bl-subject-id-href-escape` — path helper 의 `encodeURIComponent(id)`
    + sink 측 `escapeHtml` 도입. layer C/D 후속 sprint AC 로 진입.
  - `bl-week-id-encode` — `weekSummaryPath` 의 `week.id` 도 동일.
  - `bl-trusted-html-brand` — TrustedHtml 구조적 brand type (`string &
    { __trustedHtml: unique symbol }`). layer C subject views 분해 sprint.
  - `bl-parseRoute-empty-segment` — `#/subjects//class` 의 home fallback
    guard (security 영향 minor, behavior 변경 = 별 product decision).
- **autopilot rework loop 의 evidence packaging 사전 자동화** = Gate 6 self/
  cross 의 매번 반복된 P1/P2 (source excerpt 누락, profile attestation 누락)
  를 plan template 의 §10 source excerpt 섹션 standard 화. 다음 layer
  sprint 부터 적용.
- **pre-existing 3 spec fail backlog 분리** — `bl-fe-spec-fix-pre-existing`
  (chart-tool 1 / inspector-drill 1 / pdf-material-library subtest 6/9 의
  2 fail). 별 sprint 가 아니라 다음 layer sprint 진입 전 spike 으로 처리
  가능.

## 4. 이어갈 것

- **Layer B sprint scope 결정 = 다음 sprint brainstorm 의 Q1**. 한 번에
  PDF workspace 전체 vs slice (annotation render / ink stroke / drag /
  nav 별 sprint) 결정. cost = sprint-1 의 PDF/iPad invariant rewrite
  비용 정점, slice 별 분해가 더 안전.
- **SFS 0.6.117 추가 정책 12 항목 (CLAUDE.md)** = autopilot rework loop +
  Executable Action Ownership + Monitor checkpoint classification +
  Handoff-only stop contract 등. 다음 sprint 진입부터 ambient 적용.
- **React migration backlog** = [[project-react-migration-backlog]].
  분해 layer A~D 완료 후 재검토 조건.
- **iPad 실기기 QA 사이클** = layer A 머지 후 사용자 직접 검증 필요 (PDF
  workspace 진입 + 펜 + ESC + starMark). layer B 사전 가시성 확보.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (Gate 3 / 6 self+cross PASS, codex bot
  PASS, AC7/8/4/10(n) capture-based waiver 기록)
- [x] workbench 가 접혔다 (sprint 2026-W21-sprint-2 close, .sfs-local/sprints/
  current-sprint pointer 해제)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (419 tracked files), domains=0, last_review=unknown, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-25T01:44:36+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
