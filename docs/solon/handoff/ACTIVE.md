# 🎯 ACTIVE — 운영지표 v2 + DDD 9 slice 완료 (F-3 God Service split 포함)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.

## 현재 상태 (2026-05-28) — 운영지표 v2 prod 완료 + DDD 9 slice 완료 + E2E 검증

### 1. 운영지표 v2 (sprint-W22-sprint-24) — ✅ 완료 + prod 배포

- 4 Grafana dashboard (APM / Product / Cost / SLO) + Prometheus 자체호스팅 + Datadog dual-lane.
- BE: ProductMetricsCron(30min 13 gauge) + CostMetricsCron(6h 4 gauge) + `/api/metrics` Bearer token gate(AC14) + log-derived metric 10 + TelemetryController(widget create).
- Infra: Prometheus tsdb **Azure Files 영속** + Grafana 4 dashboard provisioning(코드 SoT) + Bearer auth cutover.
- FE: widget telemetry beacon + admin `#ops` 4-dashboard 링크 + 별표 drag resize + 자동저장 outcome panel.
- 배포 tag: be-v0.1.22~32, fe-v0.1.52~57, infra-v0.1.4~7. 전부 prod live.
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
- **iPad 펜 "두 번째 획 누락"**: 간헐 버그, 재현 실패(입력 파이프라인 매번 정상). blind fix 회피, `pen-stroke.cancel`/`pen-stroke.begin-failed` Datadog RUM anomaly emit 만 prod 에 심음 (fe-v0.1.57). 실수업 재발 시 Datadog 누적 먼저 확인.

## DDD 자율 PR run (2026-05-28 저녁, PR-only · 미배포)

> `sfs loop` PROGRESS.md 미부트스트랩 → self-drive 로 PR 생산. 전부 **미머지·미배포** (user 검토 후 merge/배포). prod = be-v0.1.32 / fe-v0.1.57 유지.

- **PR #112** MaterialUploadService 전용 spec (F-3 보강, 11 case) — Codex PASS.
- **PR #113** F-11 Subject 삭제 불변식 → canDeleteSubject 도메인 policy — Codex PASS.
- **PR #114** F-12 WeekNote import Concept↔Keyword 참조 일관성 invariant — Codex P2(trim 정규화) 반영, 재검토 중. ⚠ strictness tradeoff (dangling ref hard reject) 머지 전 검토.

## DDD 잔여 backlog (user 검토 권장 — 큰 변경)

- **F-10** Material DTO mapping — 자율 run 에서 **분석만, 구현 보류** (contract 변경·최고위험). 근거: FE coupling 이 어댑터 `createPdfMaterialFromBackend`(packages/domain/src/pdf-workspace.ts:303) 1곳에 국소화, MaterialPublicDTO 후보 = 11 필드. ⚠ `ownerId`(spec 사용)/`storageKey`/`deletedAt` drop 전 audit 필요. 상세 = `.sfs-local/queue/pending/loopq-*-f-10-*.md`. supervised 진행 권장.
- **F-4** Anemic StudyNotebook (interface → class). ⚠ StudyNotebook 이 apps/web 전반 + localStorage `JSON.parse` 직렬화 → class 전환 시 plain object method 호출 footgun. 재설계(rehydration) 필요, 위험. 보류 권장.

## 운영 대시보드 (Grafana/Prometheus) — 금요일까지 운영

- 금요일 이후 비활성화 예정. runbook: `docs/runbooks/observability-toggle.md` (min-replicas toggle + README 배지).
- 비활성 후 fallback = README 드롭다운 스냅샷 6장 (`docs/portfolio/dashboards/`).
- 지원/이력서 제출 시점 재활성화 (toggle만으로 복원, secret/volume 보존).

## 다음 세션 first action 후보

1. **PR #112/#113/#114 검토 → merge → 배포** (자율 run 산출, 미배포 상태). #114 는 strictness tradeoff + Codex 재검토 확인 후. merge 후 be tag 1회 배포.
2. DDD F-10 (Material DTO, contract 변경 — `.sfs-local/queue/pending/loopq-*-f-10-*.md` 분석 참고, supervised). F-4 는 localStorage footgun 으로 보류 권장.
3. iPad 펜 버그 — 실수업 후 Datadog RUM `pen-stroke.cancel`(points 작음)/`begin-failed` 누적 확인. 있으면 root cause 확정 후 fix, 0이면 timing 이슈로 종결.
4. React migration cost 재평가 (별 트랙). CLAUDE.md infra 정정 (FE = Vercel, "Azure SWA" stale — spawn task chip).

## SFS 0.6.138 정책 ambient (요약 — 자세히 CLAUDE.md)

- Executable Action Ownership / Runtime Token Firewall / Context Pollution Guard / Review autopilot rework loop / Session Continuation Guard.
- commit = `sfs commit plan` → `sfs commit apply --group <name>`. push 권한은 세션별 명시.
- 코드 수정 = Claude main 직접, Codex = cross-review (GitHub @codex bot, post-implementation).
