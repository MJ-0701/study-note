---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W19-sprint-2"
workspace: "pnpm-workspaces-packages-domain-apps-api-mcp-cli-web-infra-adr-0007-14-pr-4"
handoff_dir: "docs/solon/pnpm-workspaces-packages-domain-apps-api-mcp-cli-web-infra-adr-0007-14-pr-4/20260510"
goal: "모듈 아키텍처 이동 — pnpm workspaces + packages/domain + apps/{api,mcp,cli,web} + infra/ 분리 (ADR 0007 §14 PR 4단계 적용)"
created_at: ""
last_touched_at: "2026-05-10T01:57:24+09:00"
closed_at: 2026-05-10T01:57:24+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **simple brainstorm + Q1 light gap lock 후 즉시 plan 진입** — sprint-1 의 hard mode 5 라운드 와 다르게 본 sprint 는 ADR 0007 이 owner-decision 을 모두 lock 했기에 simple mode 1 round 만에 ready-for-plan. ADR 인계 잘 된 sprint 의 자연스러운 흐름.
- **Codex worker 위임 패턴** — PR 2/3 의 file move + import patch + invariant merge 모두 codex (gpt-5.3-codex) 가 fixed-scope 대량 mechanical-leaning 작업을 round-trip 1 회로 처리. PR 2 (16 file) 와 PR 3 (~100 file) 모두 통과.
- **Spark worker 첫 적용 검증** — PR 4 (S4: infra/ 분리) 가 Spark (gpt-5.3-codex-spark) 로 1 round 통과. 작은 mechanical task + scope/files_scope/AC 잠긴 조건 = Spark 정합. 다음 sprint 부터 mechanical sub-task default = Spark 로 lock.
- **plan ↔ ADR ↔ 실 검증 traceability** — Gate 3 cross review 5 라운드 partial → 5 PASS 의 finding chain (round 1 F1~F4 → round 2 F1·F2·F3 → round 3 F1·F2·F3·F4 → round 4 F1·F2 → round 5 PASS) 모두 plan §7 self-CPO 표 행으로 인계.
- **AC binary property-based 검증** — sprint-1 의 PII grep property (file-count → property-based 재작성) 패턴을 sprint-2 의 AC10 (R10 코드 fix), AC11 (R11 packages 추출), AC12 (R12 cli token check) 모두 동일 적용. binary grep / build / smoke 명령으로 측정.
- **manual smoke 가 implementation 끝의 진짜 검증** — Gate 6 의 cross review 가 nothing-to-review 패턴 (sprint-1 의 SFS adapter 한계 인계) 이지만, manual smoke (smoke:backend / s3-storage / corpus-ingest / persona-turn) 모두 통과로 실 동작 검증. cross review 의 한계를 manual smoke 가 보완.

## 2. 문제

- **Gate 6 의 commit-aware evidence packaging 한계 재발** — sprint-1 인계 + sprint-2 의 PR 1·2·3·4 review 모두 "리뷰할 항목이 없습니다". commit 후 working tree clean 이라 SFS review adapter 가 evidence bundle 을 모음. 즉 cross review 는 plan 단계 (Gate 3) 에서만 의미 있고, implementation 단계 (Gate 6) 는 manual smoke 의존. **SFS upstream issue 후보** (sprint-1 + sprint-2 모두 동일 패턴 = SFS 0.6.74 → 0.6.80 까지 fix 미포함).
- **codex worker 의 의도 외 file 추가** — PR 3 시점 codex 가 `apps/mcp/src/persona/services/retrieval.service.ts` 신설 (mcp scope 외). prompt 에 file_scope 잠갔으나 codex 가 자체 판단으로 추가. fix-up R13 으로 삭제. 다음 codex 호출 시 prompt 에 "files_scope 외 신규 file 금지" 명시 강화 필요.
- **codex worker 의 의도 외 type 단순화** — PR 2/3 시점 codex 가 `toAnnotationPayload` return type 을 `Prisma.InputJsonValue` → `Record<string,unknown>` 으로 단순화 (packages/domain 으로 type 분리 시도). prisma update 의 strict type 과 모순, AC5/AC6 manual smoke 직전까지 안 발견. PR 5 fix 로 복원. 다음 codex 호출 시 prompt 에 "Prisma 타입 의존 보존" 명시.
- **brainstorm Q1 lock 부분 변경 사실** (round 4) — 본 sprint 가 1차 (domain) 만 의향이었는데 PR 3 build 시 cli ↔ corpus/persona 의존성 발견 → packages/corpus + packages/persona-engine (2차 일부) 추출 결정. 사용자 라운드 답 = "유연하게 가는게 맞음 작업단위로 묶여있으면 병합". 즉 brainstorm 의 lock 이 implementation 단계에서 부분 변경되는 패턴 — Q1 의 정의 "1차/2차 분배" 가 의존성 그래프 분석 부족이었음. 다음 sprint brainstorm 에서 "추출 대상 모듈의 의존성 그래프 사전 분석" 추가.
- **manual smoke 의 환경 의존 issue 3 종 발견** (AC5/AC6 검증 직전) — (a) Prisma v6 호환 type, (b) R10 startup-time fail-closed 의 STORAGE_PROVIDER inject 누락 (smoke 환경), (c) R11 추출 후 scripts/*.mjs 의 require path stale. 3 issue 모두 PR 5 fix 후 통과. 단 PR 3 fix-up 시 사전 검증이 build 통과만 확인했고 manual smoke 까지 안 한 사실. 다음 sprint 의 implementation slice 끝에 "build + smoke 1회" 의무 lock.
- **worker 라우팅 학습 cost** — PR 3 fix-up 을 `gpt-5.3-codex` 로 호출 (사용자 지적 = "Spark 가 정답"). plan §5 에 mechanical sub-task default = Spark 로 갱신. 1 round-trip cost 학습. 다음 sprint 부터 mechanical = Spark, strategic = codex, complex = strategic_high.
- **CLAUDE.md global 라운드 9 룰** (commit/push 는 sfs commit apply, /commit 은 host-local skill 아님) — sprint-1 commit 시 git 직접 호출 fallback 했던 사실의 retrospective. 본 sprint 도 일부 commit 은 git 직접 (HEREDOC + Co-Authored-By 의 multiline 한계로 sfs commit apply 회피). 본질 = sfs commit apply 의 multiline -m 미지원이 SFS upstream issue.

## 3. 시도할 것

- **다음 sprint plan 단계에서 의존성 그래프 분석** — 추출 대상 모듈 (예: layer packages 3차 = auth / persistence / storage) 의 import graph 를 brainstorm 단계에서 분석. 추출 단위가 의존성으로 묶여있으면 함께 추출, 분리 가능하면 별 PR.
- **codex worker prompt 강화** — 다음 호출부터 "files_scope 외 신규 file 금지" + "기존 strict type 보존" 명시. 본 sprint 의 retrieval.service.ts 와 toAnnotationPayload type regression 둘 다 prompt 강화로 회피 가능.
- **mechanical sub-task default = Spark** — 다음 sprint 의 file move / import patch / 단순 코드 fix / 작은 file 삭제 모두 Spark. strategic 합성 (ADR / 큰 R/AC) 만 codex.
- **implementation slice 끝마다 "build + manual smoke 1회"** — 본 sprint 의 PR 3 fix-up 이 build 통과만 확인하고 commit 후 manual smoke 시 환경 의존 issue 발견. 다음 sprint 부터 commit 직전에 build + smoke 둘 다 검증 lock.
- **SFS upstream issue 보고** — Gate 6 의 commit-aware evidence packaging 한계 + sfs commit apply 의 multiline -m 미지원. 둘 다 sprint-1·2 의 동일 패턴이라 별 issue 작성 후 solon-product upstream 에 PR 또는 issue 등록 의향.
- **다음 sprint 후보 (사용자 의향에 따라)**:
  - (i) **layer packages 3차 추출** (auth / persistence / storage) — ADR §9 우선순위 3차 (단 사용자 라운드 답 = "auth 는 별 결정"). 의존성 그래프 분석 후 결정.
  - (ii) **deferred security 보강** (next-AC-sec-4 upload validation + next-AC-sec-6 CLI path) — sprint-1 + sprint-2 의 deferred 누적, 운영 ADR 전 보강 의무.
  - (iii) **운영 ADR 작성** (ADR §15 #1 + #7) — Azure + DigitalOcean stack 선택 + 사용자 환경 권장 default + ADR 0001 supersede.

## 4. 이어갈 것

- **다음 sprint 입력**:
  - sprint-2 의 5 commits (`d39b429` PR 1 / `bebb3e7` PR 2 / `398d1ec` PR 3 / `d81925f` PR 4 / `132befe` PR 5) 가 baseline.
  - 새 root layout = `apps/{api,mcp,cli,web}` + `packages/{domain,corpus,persona-engine}` + `infra/`.
  - manual smoke 4 종 통과 (smoke:backend / s3-storage / corpus-ingest / persona-turn).
- **deferred 의무 (sprint-1 + sprint-2 누적)**:
  - sprint-1 ADR §15 #1 운영 ADR (Azure + DigitalOcean) — 실 배포 임박 시.
  - sprint-1 ADR §15 #7 stack 후보 장단점 + 환경 추천 — 운영 ADR 시점.
  - sprint-2 plan §6 R10 = next-AC-sec-4 upload validation + next-AC-sec-6 CLI path — 별 sprint.
- **sfs runtime upgrade 추적** — 본 sprint 안에 0.6.74 → 0.6.75 → 0.6.78 → 0.6.79 → 0.6.80 자동 upgrade 됐다 (각 자동 commit `737fc75` / `e2118e6` / `9fc9372` 등). 매 사용자 명령 호출마다 자동 upgrade. 단 commit-aware evidence pipeline 은 fix 미포함.
- **§6 자동 division 추천 (`infra` light)** — 다음 sprint plan 의 입력 후보로 옮길지 여부 (sprint-1 의 qa light + 본 sprint 의 infra light).

## 5. 종료 체크

- [x] report 가 최신이다 — `report.md` status `final` lock (sfs retro adapter 자동 처리, 2026-05-10T01:57:24+09:00).
- [x] review 조치가 완료 또는 이월됐다 — Gate 3 (Plan, security lens) round 5 PASS / Gate 6 (Review) 4 회 호출 모두 nothing-to-review (SFS adapter 한계 사실 인계). manual smoke 4 종 (backend/s3-storage/corpus-ingest/persona-turn) 모두 PASS 로 cross review 의 nothing-to-review 보완. deferred = next-AC-sec-4·6 (별 sprint, plan §6 R10 명시).
- [x] workbench 가 접혔다 — `.sfs-local/sprints/2026-W19-sprint-2/` 의 brainstorm/plan/review 보존, raw result.md 5 (Gate 3 round 1~5) + 4 (Gate 6 round 1~4 nothing-to-review) 보존.

### Sprint 본질 요약 (5 PR + 5 라운드 review chain)

- **brainstorm** simple round 1 → ready-for-plan (Q1 lock = 1차 domain 만, 라운드 2 부분 변경 = 2차 corpus/persona-engine 도 추출).
- **plan** round 1~5 → R1~R12 (sprint-1 인계 + Gate 3 round 1·2·3·4 finding 인계) + AC1~AC12 + S1~S5 + 위험 R1~R11 + self-CPO round 5 PASS.
- **Gate 3 review chain**: round 1·2·3·4 partial → round 5 **PASS** (codex CPO security lens + gpt-5.5 xhigh).
- **Implementation 4 PR + 1 fix**:
  - PR 1 (S1) `d39b429`: pnpm workspaces 도입 + 공통 설정 + npm→pnpm 마이그레이션 (Claude direct).
  - PR 2 (S2) `bebb3e7`: packages/domain 통합 + 중복 4종 invariant merge (gpt-5.3-codex).
  - PR 3 (S3 + R11+R12+R13) `398d1ec`: apps/* 분리 + packages/{corpus,persona-engine} 추출 + cli token check + retrieval 삭제 (gpt-5.3-codex, build pass 단 manual smoke 시 환경 의존 issue 잠복).
  - PR 4 (S4) `d81925f`: infra/ 분리 (gpt-5.3-codex-spark, 1 round 통과 — Spark default 검증).
  - PR 5 (post-fix) `132befe`: manual smoke 환경 fix 7 파일 (Prisma v6 호환 + R10 fail-closed inject + R11 path patch) (Claude direct).
- **manual smoke**: smoke:backend ✅ + smoke:s3-storage ✅ + smoke:corpus-ingest ✅ + smoke:persona-turn ✅.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (169 tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=9
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-10T01:57:24+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
