---
phase: retro
gate_id: G5
sprint_id: 2026-W18-sprint-5
goal: "PDF 뷰어와 필기형 학습 워크스페이스 기획"
created_at: "2026-05-02T10:16:42+09:00"
last_touched_at: 2026-05-02T05:51:06+00:00
closed_at: 2026-05-02T05:51:06+00:00
---

# Retro — PDF Viewer Local Annotation Prototype

> Sprint **G5 — Sprint Retro** 산출물. 학습 루프 (정성, N PDCA 집계).
> `/sfs retro --close` 로 본 sprint 의 `closed_at` 을 frontmatter 에 기록 + `.sfs-local/events.jsonl` 의 `sprint_close` event append.
> SSoT: `gates.md §1` (G5) + `05-gate-framework.md §5.1.3` (Sprint Retro).
> 생명주기: `retro.md` 는 history/learning 을 보존하는 문서다. 실제 작업 결과는 close 전
> `report.md` 로 압축하고, workbench 문서는 compact stub 로 정리한다.

---

## §1. KPT (Keep / Problem / Try)

### Keep — 잘 된 것 (계속)

- G0/G1에서 "PDF viewer + local annotation prototype" 범위를 작게 자른 덕분에 auth/S3/export까지 섞지 않고 UX feasibility를 확인했다.
- SFS G4 review가 evidence packaging 문제에서 실제 code-level finding으로 넘어간 뒤, read-mode pointer blocker를 작게 고쳐 pass까지 확인했다.
- `npm run smoke:pdf-workspace`가 route, local PDF iframe, sticky reload, pen reload, read-mode pointer pass-through, mobile toolbar non-overlap까지 반복 검증한다.
- subject/date 기반 IA와 "과목별 PDF 작업공간" 흐름이 유지되어 다음 backend slice와 연결하기 쉬운 상태가 됐다.

### Problem — 안 된 것 / 막힌 것

- 초기 G4들은 구현 품질보다 evidence bundle 부족으로 `partial`이 반복됐다. untracked app files와 SFS/runtime upgrade files가 섞이면 review scope가 흐려진다는 점이 드러났다.
- read mode에서 annotation overlay가 PDF iframe interaction을 막는 실제 UX blocker가 있었다.
- iPad/Apple Pencil 실기기 검증은 아직 없다.
- browser-native PDF iframe과 overlay coordinate는 prototype 수준이다. pdf.js 기반 정확도와 production export는 별도 sprint가 필요하다.

### Try — 다음 sprint 시도

- backend/auth/S3를 시작하기 전에도 "reviewable source excerpt + smoke assertion"을 implement 단계에서 바로 남긴다.
- product implementation과 SFS/runtime state를 report에서 분리해서 기록한다.
- PDF viewer 다음 slice는 하나만 선택한다: auth/S3 upload, PDF export/download, pdf.js fidelity, or tablet hardware validation.
- iPad Safari/Apple Pencil smoke checklist를 별도 QA artifact로 준비한다.

## §2. PDCA 학습

- **Plan**: "PDF 뷰어 + 필기 UX 가능성 확인"이라는 slice는 적절했다. 다만 review evidence까지 AC로 명시해야 G4 loop가 덜 흔들린다.
- **Do**: no-dependency prototype에서는 browser-native iframe을 쓸 수 있지만, annotation overlay는 read/sticky/pen mode별 pointer policy를 반드시 분리해야 한다.
- **Check**: G4는 최종적으로 `pass`. 이전 `partial`들은 evidence packaging 부족과 read-mode pointer blocker를 분리해 학습시켰다.
- **Act**: 다음 sprint부터 implement handoff에는 build/smoke output, source excerpt target, untracked manifest, residual risk ledger를 기본 포함한다.

## §3. 정량 메트릭 (선택)

- **G4 verdict 분포**: partial 여러 차례 후 pass 1회.
- **최종 검증**: `npm run build` pass, `npm run smoke:pdf-workspace` pass, `sfs review --gate G4 --executor codex` pass.
- **주요 smoke assertions**: 6개 — route, local PDF iframe, sticky reload, pen reload, read-mode pointer pass-through, mobile toolbar non-overlap.

## §4. 다음 sprint 인계

- **이어가는 항목**: subject-scoped PDF workspace UI, typed local annotation schema, smoke harness.
- **분기되는 WU/sprint**: backend/auth/S3 upload, PDF export/download, pdf.js fidelity, iPad hardware validation.
- **결정 대기 (W10 후보)**: production PDF renderer를 browser-native iframe으로 유지할지, pdf.js로 전환할지.

## §5. G5 close 체크

- [x] G4 pass result exists: `.sfs-local/tmp/review-runs/2026-W18-sprint-5-G4-20260502T054452Z.result.md`
- [x] `report.md` created with final outcome, artifacts, verification, and residual risks.
- [x] Same-session Codex review risk recorded as accepted for local prototype only.
- [x] events.jsonl 마지막 close entry = `sprint_close`
- [x] `closed_at` frontmatter 기록 (`/sfs retro --close` 가 자동 채움)
- [ ] HANDOFF / sessions log 에 본 sprint 결과 link 1줄 추가

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T05:51:06+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
