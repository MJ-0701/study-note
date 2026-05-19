---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W19-sprint-3"
workspace: "deferred-security-upload-validation-cli-path-negative-case"
handoff_dir: "docs/solon/lecture-note/pdf-import/upload-validation-cli-path-negative-case/20260510"
goal: "deferred security 보강 - upload validation + CLI path negative case"
created_at: ""
last_touched_at: "2026-05-10T18:19:07+09:00"
closed_at: 2026-05-10T18:19:07+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **simple brainstorm + ready-for-plan 1 round** — sprint-2 retro 인계. ADR + prior sprint plan 이 owner-decision 을 모두 lock 했기에 brainstorm 부담 작음.
- **plan-side stage-split (intent vs PUT)** — round 3·4 의 self-contradiction finding 으로 학습. AC 의 stage 명시가 implementation 의 정합성 보장.
- **Codex Spark + Claude direct 분업** — Spark 가 mechanical 작업 (validation 코드 + smoke + ADR), Claude 가 stream split → buffer concat fix (정상 PDF flow 깨지지 않도록 plan §6 R1 위험 처리). 분업이 sprint-2 retro 의 의무 패턴 그대로.
- **Gate 3 cross review 5 round chain** — sprint-1·2 의 round 5 PASS 패턴 일관. 매 round finding 을 plan §7 self-CPO 표 행으로 인계.
- **fail-closed evidence target = (b) smoke 의 LocalMockStorage 파일 부재 직접 확인** — unit test (jest 의존성 추가) 회피, sprint scope 안에 가벼운 검증.

## 2. 문제

- **Spark 의 stream split 패턴 부수효과** (plan §6 R1 위험 의 실제 발생) — Spark 가 readPdfLeadingBytes 를 prefix + remainder PassThrough 로 분리 → storage 에 prefix 빠져 정상 PDF download mismatch. plan §6 위험 R1 (정상 흐름 깨질 risk) 명시했고 Claude direct fix 로 buffer concat (전체 body Readable.from) 패턴 적용. 다음 sprint 의 Spark prompt 에 "stream consume 시 origin 보존 의무" 명시 강화.
- **5 round Gate 3 chain** — sprint-1·2 의 round 1·2·3·4 partial → 5 PASS 패턴 sprint-3 도 그대로. 본 sprint 가 매우 좁은 scope (deferred 의무 인계) 인데도 5 round 필요 — codex CPO 가 round 별 finding (`%PDF-` 5-byte 정합성, intent vs PUT stage 분리, fail-closed evidence target) 매번 정직하게 짚음. 단 본 cost (5 round-trip) 가 본 sprint 의 좁은 scope 와 비례 안 함 — 다음 sprint 의 plan 작성 시 stage 분리 + evidence target 사전 명시 의무.
- **Gate 6 review nothing-to-review 패턴 인계** — sprint-1·2·3 동일. SFS upstream issue.

## 3. 시도할 것

- **sprint-4 plan 의 stage-split + evidence target 사전 명시** — 본 sprint round 3·4 의 finding (stage 분리 + fail-closed evidence target) 을 round 1 plan 에 미리 박기. Gate 3 round chain 단축 의무.
- **Spark prompt 에 "stream/buffer 변형 시 origin 보존" 명시** — readPdfLeadingBytes 같은 부수효과 회피.
- **SFS upstream issue 후속** — Gate 6 의 commit-aware evidence packaging 한계는 별 issue 작성 후속 고려.

## 4. 이어갈 것

- **다음 sprint = sprint-4 (layer packages 3차 추출 + auth role policy)**:
  - 사용자 라운드 답 인계 (sprint-3 brainstorm.md §8 보존):
    - 인증 = 학번 + 이름 (현재 정책 보존).
    - 등급 (role) = `master` / `admin` / `normal` 3 단계.
    - 사용자 본인 = `master`. default 신규 user = `normal`. `admin` 권한 매트릭스는 sprint-4 brainstorm 에서 결정.
    - "현재는 3 단계만" — 향후 추가 단계 가능성 명시.
  - layer packages 3차: `packages/auth` + `packages/persistence` + `packages/storage`. 의존성 그래프 분석 (sprint-2 retro 의 학습 = "추출 대상 모듈의 의존성 그래프 사전 분석").
- **다음 sprint 입력 (sprint-3 commit `ffe4bde`)** — ADR §13 6 행 must-pass 활성, smoke:cli-path 신설.
- **sprint-5 후보** = 운영 ADR 작성 (Azure + DigitalOcean stack + ADR 0001 supersede + 사용자 환경 권장 default).

## 5. 종료 체크

- [x] report 가 최신이다 — `report.md` status `final` lock (sfs retro adapter 자동 처리, 2026-05-10).
- [x] review 조치가 완료 또는 이월됐다 — Gate 3 round 1·2·3·4 partial → 5 PASS (codex CPO security lens). Gate 6 = nothing-to-review (SFS adapter 한계 인계, manual smoke 로 보완). manual smoke 4 종 (smoke:backend + smoke:s3-storage + smoke:cli-path + 기존 보존) 모두 PASS.
- [x] workbench 가 접혔다 — `.sfs-local/sprints/2026-W19-sprint-3/` 의 brainstorm/plan 보존, raw result.md 5 (Gate 3 round 1~5) 보존.

### Sprint 본질 요약

- **brainstorm** simple round 1 → ready-for-plan (deferred 의무 인계).
- **plan** round 1~5 → R1·R2·R3 + AC1·AC2·AC3 + S1·S2·S3 + 위험 R1~R5 + self-CPO round 5 PASS.
- **Gate 3 review chain**: round 1·2·3·4 partial → round 5 **PASS**.
- **Implementation** 1 commit `ffe4bde`: 6 파일 (5 modified + 1 신규).
- **manual smoke**: smoke:backend (새 6 + 정상) ✅ + smoke:cli-path (신규) ✅ + smoke:s3-storage (회귀) ✅.
- **deliverable**: ADR 0007 §13 의 6 security regression 모두 must-pass 활성. sprint-1+2 의 누적 deferred 의무 종료.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (172 tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=9
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-10T18:19:07+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
