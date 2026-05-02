---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5          # legacy storage id
sprint_id: 2026-W18-sprint-10
goal: "frontend PDF workspace integration with backend upload/download"
created_at: "2026-05-02T21:18:15+09:00"
last_touched_at: 2026-05-02T12:46:08+00:00
closed_at: 2026-05-02T12:46:08+00:00
---

# Retro — Frontend PDF Workspace Backend Upload/Download Integration

> Sprint **Gate 7 — Retro** 산출물. 학습 루프 (정성, N PDCA 집계).
> `/sfs retro --close` 로 본 sprint 의 `closed_at` 을 frontmatter 에 기록 + `.sfs-local/events.jsonl` 의 `sprint_close` event append.
> SSoT: `gates.md §1` (Gate 7) + `05-gate-framework.md §5.1.3` (Sprint Retro).
> 생명주기: `retro.md` 는 history/learning 을 보존하는 문서다. 실제 작업 결과는 close 전
> `report.md` 로 압축하고, workbench 문서는 compact stub 로 정리한다.

---

## §1. KPT (Keep / Problem / Try)

### Keep — 잘 된 것 (계속)

- Gate 3에서 iframe bearer auth 제약을 먼저 명시하고 `authenticated fetch -> Blob URL -> iframe` boundary를 고른 것이 구현 흔들림을 줄였다.
- Sprint 9 backend storage contract를 바꾸지 않고 그대로 소비해서 blast radius를 frontend workspace와 smoke로 제한했다.
- `MaterialApiError`, `uploadStatus`, `backendMaterialId`처럼 domain term을 frontend 코드와 UI 상태에 맞춰 넣은 것이 리뷰 추적성을 높였다.
- 기존 sticky note/pen local annotation 흐름을 보존해 사용자의 현재 필기 UX를 깨지 않았다.
- `smoke:pdf-workspace`가 login gate, `/api/me` revalidation, backend upload/download, latest material restore, unauthenticated file rejection, mobile toolbar overlap까지 한 번에 확인한다.

### Problem — 안 된 것 / 막힌 것

- 이번 sprint는 PDF file source of truth만 backend로 연결했다. annotation snapshot은 아직 frontend localStorage에 남아 있다.
- local/mock storage는 process-local bytes라 backend process restart 뒤 파일 byte durability는 real S3 없이는 제품 보장이 아니다.
- 과목별 여러 PDF가 쌓였을 때 사용자가 어떤 자료를 선택할지에 대한 material library/selector UX는 아직 없다.
- PDF preview는 browser built-in PDF viewer/iframe에 의존한다. PDF.js 기반 정밀 페이지 렌더링과 Apple Pencil 수준 ink UX는 별도 판단이 필요하다.
- `renderIntakeFeedback`을 PDF upload feedback과 JSON import feedback이 같이 사용한다. 지금은 동작하지만, 향후 화면이 커지면 feedback state를 분리하는 편이 더 명확하다.

### Try — 다음 sprint 시도

- 다음 sprint에서는 backend-backed annotation sync를 붙여 sticky notes/pen strokes를 material id 기준으로 저장/복원한다.
- material selector/library를 만들 때 latest uploaded 기본값을 유지하되, 과목별 PDF 목록/삭제/이름 표시를 별도 scope로 분리한다.
- 실제 S3 bucket/key가 준비되면 `RUN_REAL_S3_SMOKE=1` 경로와 frontend manual smoke를 함께 돌린다.
- PDF workspace feedback state를 JSON intake feedback과 분리할지 검토한다.
- iPad/mobile 수동 확인을 한 번 추가해 실제 터치/펜 입력 체감과 toolbar 밀림을 본다.

## §2. PDCA 학습

- **Plan**: Gate 3 계약의 핵심은 "frontend가 backend storage client가 된다"와 "private file preview는 Blob URL boundary로 한다"였다. 구현 결과가 이 의도와 잘 맞았다.
- **Do**: backend contract를 건드리지 않고 frontend API helper + workspace model + smoke를 얇게 확장한 패턴이 효과적이었다.
- **Check**: Gate 6 (Review) Gemini verdict는 `pass`. Evidence gaps와 required CTO actions 모두 없음.
- **Act**: 다음 backend-backed annotation sprint도 먼저 material id 기준 source of truth와 restore boundary를 정한 뒤, smoke에 reload/session 경로를 포함한다.

## §3. 정량 메트릭 (선택)

- **AC 통과율**: Gate 3 AC1-AC10 모두 구현 evidence와 Gate 6 review에서 pass.
- **검증 명령**: `npm run build:frontend`, `npm run smoke:backend`, `npm run smoke:pdf-workspace`, `npm run build`.
- **Gate 6 verdict 분포**: Gemini 1회, `pass`.
- **Required CTO actions**: 0개.

## §4. 다음 sprint 인계

- **이어가는 항목**:
  - `src/api/materials.ts` frontend material API helper.
  - `PdfMaterialDraft.backendMaterialId` / `uploadStatus` model.
  - authenticated fetch -> Blob URL preview boundary.
  - latest uploaded material restore after login and `/api/me`.
  - existing local annotation UX.
- **분기되는 WU/sprint**:
  - backend-backed annotation sync.
  - material selector/library/delete/versioning UX.
  - real S3 credential smoke and manual frontend smoke.
  - share/cohort access model.
- **결정 대기 (W10 후보)**:
  - 과목별 여러 PDF가 있을 때 selector UX를 어떻게 보여줄지.
  - real S3 bucket/region/credential 전달 시점.
  - annotation sync를 localStorage migration 포함으로 갈지, 새 material부터만 backend 저장할지.

## §5. Gate 7 close 체크

- [x] events.jsonl 마지막 entry = Gate 7 review/close verdict (`sprint_close` 기록 확인)
- [x] `closed_at` frontmatter 기록 (`2026-05-02T12:46:08+00:00`)
- [x] `report.md`에 본 sprint 결과/검증/다음 액션 압축

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T12:46:08+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
