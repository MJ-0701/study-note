# 🎯 ACTIVE — 운영지표 v2 + DDD 9 slice 완료 (F-3 God Service split 포함)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.

## 현재 상태 (2026-05-29) — 운영지표 v2 prod + DDD 9 slice 완료 / 🔴 iPad 펜 연속-획 버그 REOPENED (inkdebug fe-v0.1.60 측정중)

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
- **iPad 펜 "두 번째 획 누락"**: 🔴 **REOPENED (2026-05-29)** — 이전 "RESOLVED" 는 틀림. user-select(fe-v0.1.59) + 413 cap(be-v0.1.34) 픽스는 real 이었으나 **실제 증상(연속으로 이어 쓸 때 일부 획 소실)은 못 잡음**. 펜 자체·단일 획은 정상. **이제 안정 재현됨** (전엔 간헐 → inkdebug 로도 못 잡았음).
  - 코드상 소실 경로 3개: **(A) points≤1 silent discard** (commitInkStroke ink-stroke.ts:320,333) — 가장 유력, 매 pointerup 의 deferred renderApp(ink-stroke.ts:343)이 다음 획 pointermove 전달 방해 추정. (B) begin 시 liveLayer 부재(begin-failed telemetry). (C) selectedTool≠pen silent return(telemetry 0). (A)/(C)는 DD telemetry 0 = Datadog 으로 disprove 불가.
  - **진단 진행**: `?inkdebug=1` 화면 오버레이 재도입(a8dee7e) + move 수신 카운터 → **fe-v0.1.60 배포**. 다음 = prod`?inkdebug=1` 로 "4" 쓰고 우상단 로그 판독 (`UP pts=1 moves=0`=capture 손실/renderApp race · `pts=1 moves=많음`=state reset · `layer=N`=B · `tool=read`=C). 그 신호로 targeted fix. 상세 = [[project-ipad-pen-second-stroke]].
  - 별개 follow-up(보존): bl-annotation-payload-growth(snapshot 무한증가 → decimation/압축), FE 413 silent return → 사용자 경고, API 4xx/5xx 를 trackRumError 로 RUM Error emit.

## DDD 자율 PR run (2026-05-28 저녁, PR-only · 미배포)

> `sfs loop` PROGRESS.md 미부트스트랩 → self-drive 로 PR 생산. 전부 **미머지·미배포** (user 검토 후 merge/배포). prod = be-v0.1.32 / fe-v0.1.57 유지.

- **PR #112/#113/#115 = merge + 배포 완료** (self+cross+@codex 3계층 green). `be-v0.1.33` prod live (health 200 / materials·subjects 401 검증). #112 spec + #113 F-11(canDeleteSubject) + #115 F-10(MaterialPublicResponse DTO).
- **PR #114** F-12 WeekNote import Concept↔Keyword invariant — **merge 완료** (main e9bcab3). self+cross+@codex 전부 green. Codex 가 trim(P2) + **XSS(P2)** 2건 발견 → 둘 다 fix (XSS = renderIntakeFeedback detail/title escapeHtml, 잠재 file.name XSS 도 동시 차단). strictness=Reject(user 승인). domain spec 6 + web build green.
  - ✅ **fe-v0.1.59 로 배포 완료** (Vercel 한도 리셋 후 성공). F-12 + import XSS escape + 펜 텍스트선택 fix 전부 prod live. (fe-v0.1.58 은 한도로 실패했던 tag, fe-v0.1.59 가 대체.)
  - ⚠ Vercel 일일한도(100/day) 재발 방지: vercel.json `git.deploymentEnabled=false`(b202f63) 로 push-당 배포 차단 — **대시보드 Git auto-deploy OFF 도 확인 권장**.

## DDD backlog — 종료

- **F-4** Anemic StudyNotebook (interface → class) — **user 결정으로 skip/closed**. StudyNotebook 이 apps/web 전반 + localStorage `JSON.parse` 직렬화 → class 전환 시 plain object method 호출 footgun + 전 호출부 rehydration = 큰 변경·낮은 가치. 재진입 X.
- **R-DTO-storageKey** (신규, P3) — material 응답에서 storageKey(R2 key) 비노출. domain PdfMaterialRecord 가 storage port 에 storageKey 를 넘겨야 해 BE/FE 공용 도메인 타입 분리 선행 필요. supervised.

> **DDD 13 finding 전부 처리됨**: 9 배포완료 + PR #112~115 (F-3 보강/F-11/F-12/F-10, 머지 대기) + F-4 skip. 잔여 = R-DTO-storageKey(P3 신규) 뿐.

## 운영 대시보드 (Grafana/Prometheus) — 금요일까지 운영

- 금요일 이후 비활성화 예정. runbook: `docs/runbooks/observability-toggle.md` (min-replicas toggle + README 배지).
- 비활성 후 fallback = README 드롭다운 스냅샷 6장 (`docs/portfolio/dashboards/`).
- 지원/이력서 제출 시점 재활성화 (toggle만으로 복원, secret/volume 보존).

## 다음 세션 first action 후보

1. 🔴 **iPad 펜 연속-획 버그 — `?inkdebug=1` 로 측정 (fe-v0.1.60 배포됨)**: prod `study-note.910701.xyz/...?inkdebug=1` 열고 PDF 에 "4" 한 번 쓰기 → 우상단 녹색 오버레이 맨 위 몇 줄 판독. `UP pts=1 moves=0`=capture 손실(renderApp race) · `pts=1 moves=많음`=state reset · `DOWN layer=N`=live layer 부재 · `DOWN tool=read`=tool flip. 그 신호로 ink-stroke.ts targeted fix. 측정 끝나면 inkdebug 오버레이 제거(a8dee7e revert). 상세 = [[project-ipad-pen-second-stroke]].
2. (완료) DDD F-3/F-10/F-11/F-12 전부 배포 (be-v0.1.33/34). ⚠ 펜버그는 **미해결**(위 1번) — user-select(fe-v0.1.59)+413(be-v0.1.34)은 별개 2버그 픽스였고 연속-획 증상은 못 잡음. follow-up = API 4xx/5xx RUM Error emit / annotation payload decimation / FE 413 경고 ([[project-ipad-pen-second-stroke]]).
3. Vercel 대시보드 Git auto-deploy OFF 확인 (push-당 배포 한도소진 방지, b202f63 보완).
4. R-DTO-storageKey (P3 supervised) / React migration 재평가 / CLAUDE.md infra Vercel 정정(chip).

## SFS 0.6.138 정책 ambient (요약 — 자세히 CLAUDE.md)

- Executable Action Ownership / Runtime Token Firewall / Context Pollution Guard / Review autopilot rework loop / Session Continuation Guard.
- commit = `sfs commit plan` → `sfs commit apply --group <name>`. push 권한은 세션별 명시.
- 코드 수정 = Claude main 직접, Codex = cross-review (GitHub @codex bot, post-implementation).
