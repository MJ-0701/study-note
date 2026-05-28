# 🎯 ACTIVE — 운영지표 v2 완료 + DDD Repository 리팩토링 진행 중

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.

## 현재 상태 (2026-05-28) — 운영지표 v2 prod 완료 + DDD 8 slice 완료

### 1. 운영지표 v2 (sprint-W22-sprint-24) — ✅ 완료 + prod 배포

- 4 Grafana dashboard (APM / Product / Cost / SLO) + Prometheus 자체호스팅 + Datadog dual-lane.
- BE: ProductMetricsCron(30min 13 gauge) + CostMetricsCron(6h 4 gauge) + `/api/metrics` Bearer token gate(AC14) + log-derived metric 10 + TelemetryController(widget create).
- Infra: Prometheus tsdb **Azure Files 영속** + Grafana 4 dashboard provisioning(코드 SoT) + Bearer auth cutover.
- FE: widget telemetry beacon + admin `#ops` 4-dashboard 링크 + 별표 drag resize + 자동저장 outcome panel.
- 배포 tag: be-v0.1.22~31, fe-v0.1.52~55, infra-v0.1.4~7. 전부 prod live.
- PR #85~109 머지 완료.

### 2. DDD 리팩토링 — 8 slice 완료 (audit: docs/solon/handoff/20260528-ddd-audit.md)

| Finding | 상태 | 비고 |
|---|---|---|
| F-5/F-6/F-13 domain purity | ✅ | Date.now optional `at` 주입(8 factory) + console.warn 제거. domain side-effect 0. |
| F-2 SubjectRepository / TermRepository | ✅ | be-v0.1.26/27 |
| F-9 cross-aggregate child count → repo | ✅ | be-v0.1.28 |
| F-8 Subjects→Term read → TermRepository | ✅ | be-v0.1.29 |
| F-1 MaterialsService Repository (PdfMaterial + AnnotationSnapshot) | ✅ | be-v0.1.30 |
| F-7 PdfAnnotations AnnotationSnapshotRepository | ✅ | be-v0.1.31 |

**결과**: API 4 service (Terms/Subjects/Materials/PdfAnnotations) = **Prisma 직접 의존 0**. (Materials 의 subject 존재검증 1곳만 cross-aggregate prisma 잔존 — 의도.)

### 3. ⚠ 검증 대기 (auth-required, 운영자 수동)

- **be-v0.1.30 upload E2E**: 실 PDF 업로드 → createUploadIntent → 파일 PUT → completeUpload → 자료실 노출. smoke(health/materials 401)는 green이나 인증 흐름 미검증.
- **be-v0.1.31 annotation/CAS E2E**: 필기 저장 + 동시 편집 CAS 충돌(409 STALE_REVISION) 동작. smoke green이나 인증 흐름 미검증.
- 이상 시 즉시 roll-back (직전 be tag 재배포).

## DDD 잔여 backlog (user 검토 권장 — 큰 변경)

- **F-3** MaterialsService God Service 책임 분할 (Upload / Annotation / Query service). Repository는 추출 완료, service split만 남음. upload E2E 검증 동반 필요.
- **F-4** Anemic StudyNotebook (interface → class + behavior 이동). domain only.
- **F-10** Material DTO mapping (controller raw entity → DTO). FE 응답 contract 동시 변경 필요.
- **F-11/F-12** invariant polish (P3).

## 운영 대시보드 (Grafana/Prometheus) — 금요일까지 운영

- 금요일 이후 비활성화 예정. runbook: `docs/runbooks/observability-toggle.md` (min-replicas toggle + README 배지).
- 비활성 후 fallback = README 드롭다운 스냅샷 6장 (`docs/portfolio/dashboards/`).
- 지원/이력서 제출 시점 재활성화 (toggle만으로 복원, secret/volume 보존).

## 다음 세션 first action 후보

1. upload + annotation E2E 검증 (운영자 수동) → 이상 없으면 DDD 잔여 진입.
2. DDD F-3 (God Service split) 또는 F-4 (Anemic model).
3. React migration cost 재평가 (별 트랙, `.sfs-local/sprints/` 참고).

## SFS 0.6.138 정책 ambient (요약 — 자세히 CLAUDE.md)

- Executable Action Ownership / Runtime Token Firewall / Context Pollution Guard / Review autopilot rework loop / Session Continuation Guard.
- commit = `sfs commit plan` → `sfs commit apply --group <name>`. push 권한은 세션별 명시.
- 코드 수정 = Claude main 직접, Codex = cross-review (GitHub @codex bot, post-implementation).
