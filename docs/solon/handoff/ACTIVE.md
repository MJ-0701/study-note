# 🎯 ACTIVE — backlog A/B + 문서/관측 정리 전부 main 머지 완료 / next = React 마이그레이션

> SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.
> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.

## 🚀 다음 세션 FIRST ACTION = React 마이그레이션 (fresh 세션)

- roadmap = `docs/solon/web/react-migration/20260529/`, S0 plan = `.sfs-local/sprints/2026-W22-sprint-3/plan.md`.
- 접근 = React-shell strangler + PDF-first + Zustand. main.ts 현재 ~6.9k line.
- ⚠️ 시작 전 `git pull` (origin/main 최신 = 아래 머지 반영). 긴 세션이면 WU 단위로 끊고 handoff.

## 직전 세션(2026-05-30) 완료 — backlog A/B + 문서 sync + 관측 scale-to-zero (전부 main 머지)

origin/main = `d9748a0`. **이전 핸드오프의 PR wave(#121~123) + backlog A/B 전부 머지 완료.** codex 한도(5/31) → user 승인 하에 **codex 생략 + self-CPO 후 강행 머지**.

### 머지된 작업 (cherry-pick 통합 → main)
- **#121** BE arch+CQRS (헥사고날 라벨 + repo 중복제거 + Command/Query 분리 + MaterialsModule). squash merge.
- **#123** export-bundle 빈값 fix(getAnnotation R2) + **@Global StorageModule 단일 인스턴스** + docs. (StorageModule fix 보존됨)
- **#122** smoke 인프라 복구 (seed Term + annotation endpoint 마이그레이션 + **local-mock disk 영속** + REVIEWER admin 단언).
- **Backlog A (#124)** = smoke CI 게이트 (`​.github/workflows/smoke.yml`). PR + main push 마다 `pnpm smoke:backend` 자동. **CI run green 확인됨.**
- **Backlog B (#125)** = export-bundle 전면 제거 (FE 소비처 0 확인 → deprecate. route+service+StoragePort.createExportBundle+ExportBundle 타입+smoke 체크+spec 제거). #123 의 StorageModule/getAnnotation fix 는 보존(충돌 해소=제거 채택).
- **docs rehome (#126)** = `docs/solon` flat 26개 → domain-first (2A 9 sibling-match + 2B 17 user 승인 lean). 삭제 0.
- **#127** = `llm-wiki/.obsidian` per-machine state gitignore + 공유 설정 track.
- **문서 sync 정정**: export-bundle 잔재(README ×2) + smoke CI 게이트(README §6) + Product gauge 13→14 + apps/api/README 410 annotation 라우트 정정 + 전체 라우트는 `llm-wiki/modules/apps-api.md` 단일출처 포인터.

### 관측 인프라 = scale-to-zero 전환 (운영 사실 변경)
- grafana(0.5vCPU/1GiB) + prometheus(0.25vCPU/0.5GiB) ACA = **min=0/max=1 (scale-to-zero)**. idle replica 0 → 비용 0, 링크 접속 시 cold start 라이브.
- ⚠️ ACA 제약: `--max-replicas 0` 거부 + `az containerapp stop` 미지원 → "끄기"는 scale-to-zero 가 유일. hard-off 는 `ingress disable`/revision deactivate. runbook(`docs/runbooks/observability-toggle.md`) 수정 완료.
- README 배지 = 🟢 on-demand(scale-to-zero) + "운영 단가까지 설계" 포폴 문구 추가.

## 🔑 이번 세션 핵심 교훈 (다음 세션 적용 의무)
- **stale workspace dist 함정 (3번 물림)**: `pnpm smoke:backend` 는 **api 만 빌드, 워크스페이스 dist(storage/auth/persistence/...) 안 만듦**. gitignored dist 가 stale 하면 거짓 red/거짓 green. → **통합 검증·CI 전 항상 `pnpm -r build`**. CI(#124)도 `pnpm -r build` 단계 포함시켜 영구 해결. (worktree 가 fresh build 라 통과한 게 main 의 stale 과 어긋나 "14/14 green" 오판 유발했음.)
- **검증 우선**: "비활성화 했다"/"green 이다" 류 주장은 **직접 curl/az/build 로 실측 후 신뢰**. 이번에 grafana 200 실측으로 비활성화 미적용 발견, az 로 min=1 확인.
- 구현 default = Sonnet worker, I/O 무거운 audit 도 worker 압축반환 (main lean). [[feedback-opus-no-direct-code]].

## 정책 ambient (SFS 0.6.138, 자세히 CLAUDE.md)
- commit = branch 작업, push 는 명시 승인. 머지 전 self-CPO(+codex, 한도 시 user 승인 waiver).
- 코드 수정 = main(Opus) plan/review + 고위험판단, 구현 = Sonnet worker.

## 잔여 / 주의
- 작업트리에 세션-시작 SFS sync mods(.claude/AGENTS/CLAUDE/GEMINI/SFS.md 등) 미커밋 보존 — SFS runtime 관리분, 손대지 말 것.
- 사용한 PR(#121~127) 전부 closed/merged + remote 브랜치 삭제됨.
- branch protection required-check(smoke) 토글은 user 직접 (CI green 확인됨).
