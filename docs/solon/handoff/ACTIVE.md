# 🎯 ACTIVE — BE arch+CQRS+버그픽스 완료(PR 대기) / next = backlog 2건 → 그 후 React

> SessionStart hook 가 fresh session 마다 자동 inject. **이전 세션이 6 WU 로 길어져 clear 후 이어감** (Solon bug #5/#6 = session/verification 비용 교훈).
> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note` (receiver 는 cwd 확인 후 작업).

## 🚀 다음 세션 FIRST ACTION = backlog 2건 fix (그 후 별도 세션서 React)

새 세션 목적 = 아래 2건 처리해서 study-note dev backlog clear → 그 다음(또 새 세션)에 React 집중.

### Backlog A — smoke 를 CI gating 에 (품질 인프라)
- **문제**: `pnpm run smoke:backend` 가 어디서도 자동 실행 안 됨(`.github/workflows` = be/fe/infra-release + keep-alive 뿐). → smoke 장기 死 → rot 5곳 누적(이번 세션에 한꺼번에 터짐).
- **fix**: GH Actions 워크플로우 신규 — PR(+main push)시 MySQL service container 띄우고 `smoke:backend` 실행 → 실패 시 gating. Docker/MySQL + prisma migrate/seed 필요(smoke-db.mjs 가 docker-compose.smoke.yml 사용 — CI 에선 GH `services: mysql` 또는 동일 compose). STORAGE_PROVIDER=local + SESSION_TOKEN_PEPPER 등 env 주입.
- **검증**: smoke full green 은 #121+#122+#123 **동반** 전제(스택 의존). CI 는 main 대상이므로 3 PR 머지 후 실효. 워크플로우 yaml 자체는 먼저 작성 가능.
- worker(Sonnet) 위임. 단 CI yaml + docker 셋업은 검증 까다로움 — 작은 단위로.

### Backlog B — export-bundle annotation fidelity (먼저 "쓰이는지" 확인)
- **문제**: `GET /materials/:id/export-bundle` → annotation 타입 `AnnotationSnapshotRecord` 가 `stickyNotes`+`inkStrokes` 2개만 모델링. 실제 R2 payload 는 textbox/체크리스트/표/그래프/별표/지우개 등 전 타입. → export 시 대부분 누락 (이번 #123 으로 빈값→채워졌지만 타입 협소는 잔존).
- **⚠️ 선행 결정**: export-bundle 이 **실제 쓰이는 경로인지** 먼저 확인. 메모리 [[project-pdf-download-backlog]] = 필기포함 다운로드는 **client-side(pdf-lib)** 계획 → server export-bundle 이 legacy/미사용이면 협소함 고칠 가치 없음(deprecate 고려). FE 가 `/export-bundle` 호출하는지 grep 부터.
- **fix(쓰이면)**: `ExportBundle.annotation` 을 R2 full payload(opaque 전 타입)로 확장 + 소비처 갱신. **domain 타입 변경 = 신중**(고위험 판단은 main, I/O/구현은 worker).

## 직전 세션(2026-05-30) 완료 — BE arch + 경량 CQRS + 버그픽스 (전부 PR 대기, codex 5/31)

### PR 3개 (codex usage-limit **2026-05-31 06:13** 해제 후 `@codex` cross-review → **3개 동반 머지**, 스택 의존)
- **#121** `feature/be-arch-hygiene-cqrs` — sprint-2: 헥사고날 라벨 정정 + repo 중복 제거(aggregate당 1 class+accessibleWhere 단일) + PdfAnnotations Command/Query 분리 + MaterialsModule 추출 + dead code 제거. 동작 무변경. 247 unit green + DI boot.
- **#122** `fix/seed-subjects-term` — smoke 인프라: seed Term + annotation endpoint 마이그레이션 + local-mock disk 영속 + admin(REVIEWER) 단언. (4 commit)
- **#123** `fix/export-bundle-r2` (base=#121 스택) — export-bundle 빈값 fix(getAnnotation R2 읽기) + @Global StorageModule 단일 인스턴스 + DI싱글톤 docs. (3 commit)
- **검증**: 통합(#121+#122+#123) full smoke **green (14 체크 exit 0)** + 247 unit + DI boot preview. self-CPO PASS. **codex cross 만 남음.**
- sprint = `2026-W22-sprint-2` (open, codex 후 retro/close).

### 정책/교훈 (적용 의무)
- **구현 default = Sonnet worker** ([[feedback-opus-no-direct-code]] 2026-05-30 재전환). Opus(main)=plan/design/review + **고위험 인과판단만**. 명시 예외만 Opus 직접.
- **I/O 무거운 검증/조사(smoke/test/build 로그·파일덤프·grep)도 worker 위임 + 압축 반환** (Solon bug #6 교훈 — main 컨텍스트 lean 유지). 직전 세션 Opus 1M 컨텍스트 폭증 주범 = 대용량 로그 직접 주입.
- **긴 세션 끊기**: WU 여러 개면 handoff 후 fresh session (Solon bug #5 = enforcement 부재라 self-trigger 필수).
- commit = branch 작업, push 는 명시 승인. 머지 전 codex.

### Solon 제품 bug 4건 제출 (MJ-0701/solon-product)
#3 project-policy↔SFS conflict-surface guard 부재 / #4 model-profiles.yaml tier 모순 / #5 Session Continuation Guard enforcement 부재 / #6 verification-offload guidance 부재.

### infra (주말 비활성 — user 수동)
- grafana/prometheus min0 max0 + api min0 + keep-alive workflow disable. 월요일 재기동(요청 시 명령 제공) + doc-drift(keep-alive.yml/README "min=0" vs 실제) sync.

## 메모리 SoT
`project_sprint_w22_2_be_arch_cqrs` · `project_bug_export_bundle_r2_payload` · `feedback_opus_no_direct_code` · `feedback_worker_tiering`.

## React 마이그레이션 (backlog A/B 후 또 다른 새 세션)
roadmap = `docs/solon/web/react-migration/20260529/`. 접근 A(React-shell strangler)+PDF-first+Zustand. S0 plan = `.sfs-local/sprints/2026-W22-sprint-3/plan.md`. **backlog A/B 끝난 뒤** 진입.
