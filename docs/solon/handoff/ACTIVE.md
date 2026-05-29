# 🎯 ACTIVE — 운영지표 v2 + DDD 9 slice 완료 (F-3 God Service split 포함)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.

## 현재 상태 (2026-05-29) — 운영지표 v2 prod + DDD 9 slice 완료 / ✅ iPad 펜 연속-획 버그 진단완료 (WebKit/Pencil OS 한계, 웹 fix 불가 · inkdebug 제거 fe-v0.1.63)

### 1. 운영지표 v2 (sprint-W22-sprint-24) — ✅ 완료 + prod 배포

- 4 Grafana dashboard (APM / Product / Cost / SLO) + Prometheus 자체호스팅 + Datadog dual-lane.
- BE: ProductMetricsCron(30min 13 gauge) + CostMetricsCron(6h 4 gauge) + `/api/metrics` Bearer token gate(AC14) + log-derived metric 10 + TelemetryController(widget create).
- Infra: Prometheus tsdb **Azure Files 영속** + Grafana 4 dashboard provisioning(코드 SoT) + Bearer auth cutover.
- FE: widget telemetry beacon + admin `#ops` 4-dashboard 링크 + 별표 drag resize + 자동저장 outcome panel.
- 배포 tag: be-v0.1.22~34, fe-v0.1.52~59, infra-v0.1.4~7. 전부 prod live. (be-v0.1.34=annotation cap 4MB, fe-v0.1.59=F-12+펜 텍스트선택 fix.)
- PR #85~111 머지 완료.

### 2. DDD 리팩토링 — 8 slice 완료 (audit: docs/solon/handoff/20260528-ddd-audit.md)

| Finding | 상태 | 비고 |
|---|---|---|
| F-5/F-6/F-13 domain purity | ✅ | Date.now optional `at` 주입(8 factory) + console.warn 제거. domain side-effect 0. |
| F-2 SubjectRepository / TermRepository | ✅ | be-v0.1.26/27 |
| F-9 cross-aggregate child count → repo | ✅ | be-v0.1.28 |
| F-8 Subjects→Term read → TermRepository | ✅ | be-v0.1.29 |
| F-1 MaterialsService Repository (PdfMaterial + AnnotationSnapshot) | ✅ | be-v0.1.30 |
| F-7 PdfAnnotations AnnotationSnapshotRepository | ✅ | be-v0.1.31 |
| F-3 MaterialsService God Service split (MaterialUploadService 추출) | ✅ | PR #111, be-v0.1.32 |

**결과**: API service = **Prisma 직접 의존 0** (MaterialUploadService 의 subject 존재검증 1곳만 cross-aggregate prisma 잔존 — 의도). MaterialsService = 조회/메타데이터/필기 slim, MaterialUploadService = 업로드 상태머신. material-shared.ts = 공유 헬퍼.

### 3. ✅ E2E 검증 완료 (2026-05-28, 운영자 수동)

- **upload E2E**: 실 PDF 업로드 → 자료실 노출 ✅ (F-3 분할 후 동작 동일 — be-v0.1.32 배포 success + prod health 200 / materials 401).
- **annotation/CAS E2E**: 필기 저장 ✅, cross-device sync (iPad↔PC) ✅, PC 삭제→iPad 반영 ✅.
- **iPad 펜 "두 번째 획 누락"**: ✅ **진단 완료 (2026-05-29 새벽, Mac↔iPad Safari 원격 인스펙트)** — root cause = **WebKit/Apple Pencil OS 레벨 입력 suppression**. 빠르게 이어 그린 다음 획(예 "4"=ㄴ+ㅣ 연결)은 `pointerdown`·`touchstart(stylus)` **둘 다 미발생** = 앱이 훅 걸 이벤트 0 → **웹 코드로 수정 불가.** 천천히/획 사이 텀 두면 정상(user 확인).
  - 측정 배제: renderApp 동기 7~8ms(<16ms, main-thread block ❌) · touch 핸들러 passive(억제 ❌) · 그려진 획 전부 `begin active=Y`/`committed=true`(begin·commit·discard 경로 ❌). 실패 획은 begin 도달조차 안 함(이벤트 0). 상세 = [[project-ipad-pen-second-stroke]].
  - **대응**: 웹앱 한계 수용 + 워크어라운드(연속획 사이 짧은 텀). native(PencilKit)는 다른 입력경로라 안 겪음. inkdebug 임시계측(fe-v0.1.60/61/62) 전부 revert → **clean fe-v0.1.63 prod live**.
  - 별개 follow-up(보존): bl-annotation-payload-growth(snapshot 무한증가 → decimation/압축), FE 413 silent return → 사용자 경고, API 4xx/5xx 를 trackRumError 로 RUM Error emit.

## DDD 자율 PR run (2026-05-28 저녁, PR-only · 미배포)

> `sfs loop` PROGRESS.md 미부트스트랩 → self-drive 로 PR 생산. 전부 **미머지·미배포** (user 검토 후 merge/배포). prod = be-v0.1.32 / fe-v0.1.57 유지.

- **PR #112/#113/#115 = merge + 배포 완료** (self+cross+@codex 3계층 green). `be-v0.1.33` prod live (health 200 / materials·subjects 401 검증). #112 spec + #113 F-11(canDeleteSubject) + #115 F-10(MaterialPublicResponse DTO).
- **PR #114** F-12 WeekNote import Concept↔Keyword invariant — **merge 완료** (main e9bcab3). self+cross+@codex 전부 green. Codex 가 trim(P2) + **XSS(P2)** 2건 발견 → 둘 다 fix (XSS = renderIntakeFeedback detail/title escapeHtml, 잠재 file.name XSS 도 동시 차단). strictness=Reject(user 승인). domain spec 6 + web build green.
  - ✅ **fe-v0.1.59 로 배포 완료** (Vercel 한도 리셋 후 성공). F-12 + import XSS escape + 펜 텍스트선택 fix 전부 prod live. (fe-v0.1.58 은 한도로 실패했던 tag, fe-v0.1.59 가 대체.)
  - ⚠ Vercel 일일한도(100/day) 재발 방지: vercel.json `git.deploymentEnabled=false`(b202f63) 로 push-당 배포 차단 — **대시보드 Git auto-deploy OFF 도 확인 권장**.

## DDD backlog — 종료

- **F-4** Anemic StudyNotebook (interface → class) — **user 결정으로 skip/closed**. StudyNotebook 이 apps/web 전반 + localStorage `JSON.parse` 직렬화 → class 전환 시 plain object method 호출 footgun + 전 호출부 rehydration = 큰 변경·낮은 가치. 재진입 X.
- **R-DTO-storageKey** — ✅ **완료 + 배포** (PR #117 squash merge, main 6ed4c94, be-v0.1.35 deploy). storageKey(R2 object key) client 노출 4 surface 차단: MaterialPublicResponse DTO + controller getExportBundle 응답 + UploadIntent/DownloadIntent port + FE api/materials.ts 타입. "도메인 타입 분리 선행" 가정은 오판이었음 — domain `PdfMaterialRecord` 는 그대로 두고 FE workspace-store/class-date 가 소비하던 타입만 storageKey 없는 `BackendPdfMaterialInput` 로 retype (domain logic 은 storageKey 미사용). self+local Codex CPO PASS, web/api/storage tsc green, api material spec 48 pass.

> **DDD 13 finding 전부 처리됨**: 9 배포완료 + PR #112~117 + F-4 skip. R-DTO-storageKey = 완료/배포. **backlog clear.**

## 운영 대시보드 (Grafana/Prometheus) — 금요일까지 운영

- 금요일 이후 비활성화 예정. runbook: `docs/runbooks/observability-toggle.md` (min-replicas toggle + README 배지).
- 비활성 후 fallback = README 드롭다운 스냅샷 6장 (`docs/portfolio/dashboards/`).
- 지원/이력서 제출 시점 재활성화 (toggle만으로 복원, secret/volume 보존).

## 다음 세션 first action 후보

1. (✅ 완료) **iPad 펜 연속-획 버그 = 진단완료** — WebKit/Pencil OS 한계, 웹 fix 불가(위 §3). inkdebug 제거 fe-v0.1.63 prod. 재진입 X. 잔여 follow-up = API 4xx/5xx RUM Error emit / annotation payload decimation / FE 413 경고 ([[project-ipad-pen-second-stroke]]).
2. (✅ 완료) **CLAUDE.md infra Vercel 정정** — SWA→Vercel + `docs/infra.md` 분리 + @import. 지침서 = agent 지침 전용 원칙([[feedback-instruction-file-purity]]). 로컬 커밋 bdd24dc/bbdbebd (fe-v0.1.63 tag 와 함께 push 됨).
3. (✅ 확인) Vercel git auto-deploy = `vercel.json git.deploymentEnabled=false`(b202f63) 이미 적용. push 트리거 안 함. 대시보드 토글은 redundant(원하면 확인).
4. **다음 세션 작업 순서 (user 합의 2026-05-29) = DTO → follow-up → migration**:
   - **(1) R-DTO-storageKey** — ✅ **완료/배포** (PR #117, be-v0.1.35). 상세 = §DDD backlog.
   - **(2) follow-up (관측성 3건)** ← **현재 next** — ① API 4xx/5xx → `trackRumError` 로 RUM Error emit (Error Tracking 가시화), ② annotation snapshot payload 무한증가 → decimation/압축 (be-v0.1.34 가 cap 만 4MB 로 올림, 근본 미해결), ③ FE 413 silent return → 사용자 경고+로컬 보존 ([[project-ipad-pen-second-stroke]] follow-up).
   - **(3) React migration 재평가** ([[project-react-migration-backlog]]) — 분해 A~D 후 재검토 조건. main.ts 현재 ~6.9k line.

## SFS 0.6.138 정책 ambient (요약 — 자세히 CLAUDE.md)

- Executable Action Ownership / Runtime Token Firewall / Context Pollution Guard / Review autopilot rework loop / Session Continuation Guard.
- commit = `sfs commit plan` → `sfs commit apply --group <name>`. push 권한은 세션별 명시.
- 코드 수정 = Claude main 직접, Codex = cross-review (GitHub @codex bot, post-implementation).
