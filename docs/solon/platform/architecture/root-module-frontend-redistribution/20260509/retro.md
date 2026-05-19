---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W19-sprint-1"
workspace: "root-module-frontend"
handoff_dir: "docs/solon/platform/architecture/root-module-frontend-redistribution/20260509"
goal: "모듈 아키텍처 재설계 (설계 sprint, S7·S8 PII hygiene 코드 변경) — pnpm workspaces 기반 평평 monorepo (apps/{api,mcp,cli,web} + infra + packages/domain + 후보 layer packages) 도면 + 공통 설정 명세 + 영향 path 표 + Security 4종 명세 + Operational assumptions + ADR 1건"
created_at: ""
last_touched_at: "2026-05-09T21:23:53+09:00"
closed_at: 2026-05-09T21:23:53+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **hard mode brainstorm 의 5 라운드 진행** — owner-decision Q1~Q8 을 5 라운드로 좁히면서 사용자가 Spring 색 어휘를 Node 표준 어휘로 매핑하고 사실 정정 (yarn classic vs berry vs pnpm) 을 받은 흐름이 정확했다. 사용자 mental model 보존 + Node OSS 관행 권장 default 둘 다 만족.
- **plan ↔ ADR 의 1:1 traceability** — R1~R12 / AC1~AC12 가 ADR §3~§13 에 매핑되고 §16 self-CPO mini-check 표에서 항목별 PASS evidence 명시한 패턴. cross review 가 같은 lens 에서 partial 나도 다음 round 가 어디를 patch 하는지 명확.
- **review feedback 를 plan 에 즉시 인계** — round N 의 finding 을 plan §7 self-CPO 표의 새 행으로 추가 (round 1 F1~F4, round 2 F1~F3, round 3 F1·F2·F3, round 4 F1, round 5 F1) 한 패턴. drift 방지에 효과적.
- **PII property-based 검증** — file-count 컨트랙트 (round 3) → grep property 컨트랙트 (round 4) 로 진화한 것이 codex CPO 의 round 4·5 PASS 핵심.
- **사용자 dashboard 기반 결정 경험** — "권장 default + 대안 + 사용자가 무엇이 다르면 어느 결정 바뀌는지" 를 self-contained 하게 풀어둔 패턴. 사용자가 매번 짧게 "ㄱㄱ" / "권장안 그대로" 로 lock 가능했던 자리.

## 2. 문제

- **SFS review adapter 의 evidence packaging 한계** (Gate 4 round 3·4 partial 의 root cause). 핵심:
  - prompt cap: round 1 4340줄 → round 2 1665줄 → round 3·4 242줄 로 점차 축소. ADR 후미 절 (§18 ops appendix) 이 cap 으로 잘려 codex CPO 가 "본 적이 없는" 항목 finding 반복.
  - commit-aware 부재: commit 후 working tree clean 이면 evidence bundle 가 거의 비움. round 3·4 의 "no reviewable project artifact/source files" finding 사유.
  - sfs 0.6.74 → 0.6.75 upgrade 에 fix 미포함.
  - **upstream issue 후보**: solon-product 측에 Gate 별 evidence packaging 정책 (특히 commit 후 tracked file 인라이닝) 보강 요청.
- **sfs review 가 review.md frontmatter `goal` 을 매 호출마다 라운드 1 어휘로 reset** — Claude 가 갱신해도 다음 호출에 stale 어휘 ("root module/frontend-backend module architecture redesign") 로 되돌아옴. codex CPO 가 본 sprint 의 final scope (Security 4종 + Operational assumptions + PII hygiene) 를 어휘 측면에서 못 받아 ops lens 가 더 엄격하게 판정. 부수 신호.
- **sfs commit apply 의 -m 옵션이 multiline message 못 받음** — system prompt 의 HEREDOC + Co-Authored-By 컨벤션 이행 위해 git stage + commit 직접 fallback 필요했음 (commit `a305dd1`). CLAUDE.md global 갱신 (라운드 9 = "Solon/SFS 작업의 commit/push 는 sfs commit plan 후 sfs commit apply --group <name> 으로 수행. /commit 은 host-local skill 일 뿐 Solon workflow 명령이 아니므로 SFS 작업 안내에 쓰지 않는다") 으로 다음부터 sfs commit apply 만 사용 의향 — 단 multiline 한계가 fix 되지 않으면 Co-Authored-By 누락.
- **5 라운드 plan rework + 5 라운드 Gate 3 review + 4 라운드 Gate 4 review = 14 round-trip** — 본 sprint 의 cost. 정직한 hard mode 의 trade-off 이지만 다음 sprint 가 같은 deliverable 에 대해 더 적은 round 로 갈 수 있는지 (예: review-loop autonomy SFS.md 룰 인용으로 deterministic low-risk patch 는 사용자 컨펌 없이 같은 cycle 에서 fix) 시도 가치.

## 3. 시도할 것

- **다음 sprint 첫 슬라이스에서 native 모듈 hoisting smoke 1회**. ADR §15 #2 의무. `pnpm install` + corpus/persona/pdf smoke 1회 → onnxruntime-node / @xenova/transformers / pdf-parse 깨지면 `.npmrc` 의 `public-hoist-pattern` 또는 `shamefully-hoist=true` 옵션 시도.
- **review prompt 인라이닝 옵션 검증** — `sfs review --gate N --include <path>` 같은 옵션이 있는지 확인 (현재 dispatch 미명세). ADR 후미 절이 cap 안에 들어가도록 사용자 force inject.
- **SFS upstream issue 생성** — review adapter 의 evidence packaging (commit-aware + ADR 후미 cap) 한계 정직히 보고. 본 sprint 의 review.md 호출 timestamp 와 prompt 길이 추이를 첨부.
- **다음 sprint 의 PR 분할 4단계 (ADR §14)** 를 literal 로 진행 — workspace 도입 PR / domain 통합 PR / surface 분리 PR / infra 분리 PR. 각 PR 끝 검증 (pnpm install + pnpm -r build + smoke 통과) 의무.
- **운영 ADR 작성 시점에 stack 후보 장단점 표 + 사용자 환경 권장 default** (라운드 7 컨펌, ADR §15 #7) — 별 brainstorm 으로 진입.

## 4. 이어갈 것

- **다음 sprint 입력 (이동 sprint)**:
  - ADR 0007 §14 PR 분할 4단계 (workspace 도입 / domain 통합 / surface 분리 / infra 분리).
  - ADR §15 의무 7개 (운영 ADR / pnpm hoisting smoke / layer packages 우선순위 / Prisma schema 위치 lock / 영향 path 39행 patch / security regression 6 행 등재 / stack 장단점 + 환경 추천).
  - ADR §13 의 6 security regression 을 다음 sprint AC (next-AC-sec-1 ~ 6) 로 등재.
- **운영 ADR 입력 (별 sprint, 실제 배포 임박 시)**:
  - ADR 0001 운영 형상 절 supersede.
  - 사용자 환경 (학생 Student Pack + Azure + DigitalOcean) 기반 stack 후보 (deploy host / observability / secret manager / DB managed / CDN) 의 장단점 표 + 권장 default 제시 의무.
- **본 sprint 의 commit `a305dd1`** 가 다음 sprint 의 baseline. ADR 0007 + report.md + S7/S8 코드 변경 8 파일 영구 보존.
- **§6 자동 division 추천 (qa light + infra light) 검토** — 다음 sprint plan 의 입력 후보로 옮길지 여부.

## 5. 종료 체크

- [x] report 가 최신이다 — `report.md` status `final` lock (sfs retro adapter 자동 처리, 2026-05-09 21:23:53+09:00).
- [x] review 조치가 완료 또는 이월됐다 — Gate 3 round 5 PASS / Gate 4 round 1·2 acceptable 인정 / round 3·4 partial 은 SFS adapter packaging 한계로 **명시 waiver** (Solon kernel rule 의 "explicit waiver" 경로). design 자체는 codex CPO 가 round 1·2 에 "directionally acceptable" 인정. 상세 사유 §2 문제 절 참조.
- [x] workbench 가 접혔다 — `.sfs-local/sprints/2026-W19-sprint-1/` 의 brainstorm/plan/review 보존, raw result.md 5 (Gate 3) + 4 (Gate 4) = 9 개 보존, sprint close 시점에 sfs adapter 가 자동 정리.

### Gate 4 명시 waiver 사유 (2026-05-09)

본 sprint 의 Gate 4 (Design, ops lens) 가 round 4 시점에 partial 로 종료. 명시 waiver 사유:

1. **artifact 는 정상 작성됨**: ADR 0007 (`docs/solon/decisions/0007-module-architecture-redistribution.md`, 365 줄, §1~§18 + §16 self-CPO + §17 references) 와 sprint report.md 모두 file system 에 존재, commit `a305dd1` 으로 git history 영구 보존.
2. **codex CPO 의 design lens 인정**: round 1 = "Architecture direction is acceptable for a design sprint", round 2 = "Architecture direction is acceptable". 즉 design 자체는 codex CPO 가 명시 PASS 신호 부여.
3. **partial 사유 = SFS review adapter packaging 한계**: round 3·4 의 "no reviewable project artifact/source files" finding 은 SFS adapter 가 commit 후 tracked file 을 evidence prompt 에 거의 안 담는 한계 때문. codex CPO 의 결함도 ADR 의 결함도 아님 (위 §2 문제 절 evidence 참조 — round 1 4340 줄 prompt → round 4 242 줄 prompt).
4. **upgrade fix 미적용**: sfs 0.6.74 → 0.6.75 upgrade 진행, 동일 한계 유지.
5. **kernel rule 적용**: Solon kernel "Cross review 가 partial 일 때 사용자 명시 waiver 를 기록하면 진행 가능" 경로 채택.

다음 sprint (이동 sprint) 가 ADR 0007 의 §10·§11·§12·§13·§18 (Threat model / Secret-PII / Service exposure / Security regression / Operational assumptions) 을 입력으로 받는다 — Gate 4 acceptance evidence 가 본 sprint 에 codex CPO 환경에서 못 보였더라도 다음 sprint 의 implementation 시점에 동일 lens 가 검증할 수 있다.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (144 tracked files), domains=0, last_review=partial, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T21:23:53+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
