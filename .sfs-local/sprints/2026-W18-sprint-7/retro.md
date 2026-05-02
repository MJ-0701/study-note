---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5          # legacy storage id
sprint_id: 2026-W18-sprint-7
goal: "frontend session revalidation with /api/me"
created_at: "2026-05-02T17:34:03+09:00"
last_touched_at: 2026-05-02T09:06:45+00:00
closed_at: 2026-05-02T09:06:45+00:00
---

# Retro — Frontend Session Revalidation with Name + Student Number Login

> Sprint **Gate 7 — Retro** 산출물. 학습 루프 (정성, N PDCA 집계).
> `/sfs retro --close` 로 본 sprint 의 `closed_at` 을 frontmatter 에 기록 + `.sfs-local/events.jsonl` 의 `sprint_close` event append.
> SSoT: `gates.md §1` (Gate 7) + `05-gate-framework.md §5.1.3` (Sprint Retro).
> 생명주기: `retro.md` 는 history/learning 을 보존하는 문서다. 실제 작업 결과는 close 전
> `report.md` 로 압축하고, workbench 문서는 compact stub 로 정리한다.

---

## §1. KPT (Keep / Problem / Try)

### Keep — 잘 된 것 (계속)

- Gate 2/3에서 `StoredSession`은 localStorage만으로 신뢰하지 않는다는 shared design concept를 먼저 고정한 덕분에 구현 범위가 작고 명확했다.
- 로그인 UX를 product mental model에 맞춰 `이름 + 학번`으로 바꾸면서도, local/private MVP 한정이라는 경계를 `backend/README.md`, `.env.example`, `implement.md`에 남겼다.
- `smoke:pdf-workspace`가 invalid stored token clearing과 stale stored user refresh를 직접 검증해 `/api/me` revalidation의 핵심 위험을 잡았다.
- Gate 6 Review를 Gemini executor로 받아 self-approval 위험을 줄였고, verdict `pass`로 닫을 수 있었다.
- 기존 backend ownership/material/export smoke를 유지해 auth contract 변경이 다른 protected API를 깨지 않았음을 확인했다.

### Problem — 안 된 것 / 막힌 것

- 이름+학번은 production-grade auth가 아니다. private/local MVP에는 충분하지만, 동기 공유나 배포 전에는 PIN/password/admin-created user policy가 필요하다.
- Backend runtime persistence는 아직 in-memory다. Prisma schema는 `studentNumber` identity contract를 표현하지만 실제 DB-backed users/sessions/materials는 다음 sprint 범위다.
- Gemini stderr에 review prompt 일부 path warning이 남았다. 최종 verdict는 pass였지만, review prompt packaging은 SFS runtime 쪽에서 계속 관찰할 만하다.
- 개인 seed 값이 구현/스모크에 들어갔다. 현재는 사용자가 직접 확인하기 위한 local seed지만, 공개 repo/published artifact 전에는 fixture/seed 정책을 재검토해야 한다.

### Try — 다음 sprint 시도

- Prisma/MySQL runtime persistence를 users/sessions/materials/annotations에 연결하고, in-memory backend state를 제거한다.
- 이름+학번만 유지할지, PIN/password를 추가할지, admin-created/imported user provisioning으로 갈지 결정한다.
- S3 bucket/key 전달 후 `StoragePort` 뒤에 real S3 provider를 붙이고 local mock과 provider mode를 명확히 나눈다.
- 배포 전 seed/fixture에 실제 개인정보가 섞이지 않도록 dev seed와 production seed 전략을 분리한다.

## §2. PDCA 학습

- **Plan**: Gate 3 contract가 `/api/me` revalidation, name/studentNumber login, local/private MVP boundary를 분리해서 정의했기 때문에 scope creep 없이 닫혔다.
- **Do**: Frontend auth boot state를 `checking | ready`로 명시하니, workspace render boundary가 `renderApp()` 초입에서 단순하게 보장됐다. Backend는 `findByNameAndStudentNumber`를 public service method로 두어 login contract가 숨지 않았다.
- **Check**: Gate 6 Review verdict는 Gemini `pass`. Evidence gaps와 required CTO actions는 없었다.
- **Act**: 다음 persistence sprint도 "schema artifact"와 "active runtime persistence"를 명확히 분리해서 계획한다. Smoke는 계속 실제 backend + Vite를 띄우는 self-contained 방식으로 유지한다.

## §3. 정량 메트릭 (선택)

- **Gate 3 Review**: Gemini pass.
- **Gate 6 Review**: Gemini pass.
- **AC 통과율**: AC1-AC12 pass by Gate 6 Review.
- **검증 명령**:
  - `npm run build` pass
  - `npm run smoke:backend` pass
  - `npm run smoke:pdf-workspace` pass
  - password seed string grep no matches

## §4. 다음 sprint 인계

- **이어가는 항목**:
  - Prisma/MySQL runtime persistence for users/sessions/materials/annotations.
  - Real S3 provider behind `StoragePort`.
  - Cohort user provisioning model.
- **분기되는 WU/sprint**:
  - Production auth hardening (PIN/password, rate limiting, audit/logging).
  - Seed/fixture privacy cleanup before public sharing.
  - Flattened annotated PDF export remains separate.
- **결정 대기 (W10 후보)**:
  - 이름+학번을 장기 로그인 모델로 유지할지 여부.
  - 배포 전 PIN/password 추가 여부.
  - 동기 계정 생성 방식: admin-created, import, self-registration 중 선택.

## §5. Gate 7 close 체크

- [x] Gate 6 Review final verdict = pass.
- [ ] events.jsonl 마지막 entry = Gate 7 review/close verdict (`sfs retro --close` adapter 실행 후 확인)
- [ ] `closed_at` frontmatter 기록 (`sfs retro --close` 가 자동 채움)
- [x] Durable result compressed into `report.md`.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T09:06:45+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
