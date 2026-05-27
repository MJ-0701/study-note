---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-22"
workspace: "layer-d-slice-4-user-notes-sync-caches-usernotesputtimers-aborts-chains-fetchedkeys-syncfailuretracker-syncbackenderror"
handoff_dir: "docs/solon/user/accounts/layer-d-slice-4-user-notes-sync-caches-usernotesputtimers-aborts-chains-fetchedkeys-syncfailuretracker-syncbackenderror/20260527"
goal: "layer D/slice-4 — user-notes sync caches"
created_at: "2026-05-27T21:54:02+09:00"
last_touched_at: "2026-05-27T22:00:00+09:00"
closed_at: 2026-05-27T21:54:02+09:00
domain: "user"
subdomain: "accounts"
feature: "layer-d-slice-4-user-notes-sync-caches-usernotesputtimers-aborts-chains-fetchedkeys-syncfailuretracker-syncbackenderror"
---

# 회고

## 1. 계속할 것

- **Layer D 분해 phase 의 마지막 큰 candidate 완료**. main.ts 11,049 → 4,448 (-6,601 / **-59.74%**). 절반 이상 축소.
- **1 module 통합 패턴**: 4 cache + tracker + banner + 4 record + 3 lifecycle + clear + getter/setter = 422 line. boundary 명확.
- **Context+Callbacks pattern + module-level const wiring** (sprint-19/20/21 lineage 누적): ctx/cb 매 호출 factory 대신 module-level const. line 절약.
- **cross-domain reset 6 step → 1 line 통합**: clearUserNotesSync(ctx) — main.ts 2 site 각각 ~18 line 절약.
- **chain serialization + abort cleanup + race guard 보존**: sprint-2/S3 lineage 무손실. spec PUT-T4 + GET race-guard 검증.
- **annotation-sync (다른 모듈) 와 share state 처리**: isSyncBackendPaused / setSyncBackendError 등 module getter/setter 로 노출 — ctx callback 우아하게 wire.

## 2. 문제

- **Gate 6 self R1~R4 partial 4 round (R5 PASS)**:
  - R1 AC6 mismatch: plan 4 vs actual 5 console.warn. plan 갱신 + 모듈 comment 동기.
  - R2 source body excerpt 부족 — evidence-gate6.md 에 더 embed.
  - R3 prompt bundle size 7218 line 임에도 reviewer 계속 "evidence packaging gap" 호소.
  - R4 spec case body 전체 embed 추가 → PASS.
  - 회고: reviewer 의 "evidence packaging gap" 호소는 종종 실제 부족이 아닌 review prompt 의 strictness. comprehensive inline embed 가 우회.

## 3. 시도할 것

- **evidence-gate6.md inline embed minimum 표준화**:
  - full lifecycle body (모든 export fn).
  - main.ts wiring full callsite (annotation ctx + reset 2 site + banner dismiss + AppShellContext read).
  - spec representative case body 8~10개.
  - regression failing test identity (file path + sub-suite ok lines).
- 다음 sprint 부터 위 4 항목을 evidence-gate6.md 의 §3.x 에 default 포함.

## 4. 이어갈 것

- **잠재 slice-5 (drag states 6)**: activeEraserDrag/TextBox/Checklist/Table/Chart/Sticky. ~60 line 추가 분해 가능. 단 size 작아서 React migration 비용 대비 ROI 낮음 — 선택.
- **fe-v0.1.25 tag**: sprint-21 + sprint-22 합쳐서 prod deploy.
- **Codex Datadog admin ops dashboard merge**: 별도 worktree `codex/readme-datadog-ops`.
- **React migration cost 재평가**: 분해 phase 마무리. ambient identity (authSession/authMode/loginFeedback/notebook/pdfWorkspaceStore) 가 main.ts 잔류 정상. main.ts 4,448 = render entry + dispatcher 위주 → React Context provider 로 직접 변환 가능 surface.

## 5. 종료 체크

- [x] report 가 최신이다 (sfs retro 자동 생성)
- [x] review 조치 완료 (Gate 3 R1 + Gate 6 self R5 + cross R1 PASS)
- [x] workbench 접힘 (sprint closed)
