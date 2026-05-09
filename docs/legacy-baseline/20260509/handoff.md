---
title: "Solon Adoption Summary"
status: legacy-baseline
adopt_id: "legacy-baseline"
goal: "패치된 문서/파일정리 정책 재적용"
created_at: "2026-05-09T13:02:51+09:00"
last_touched_at: "2026-05-09T13:02:51+09:00"
source: "git/code/docs scan + user brief"
confidence: "mixed"
---

# Solon Adoption Summary — legacy-baseline

## §1. Project Snapshot

The project describes itself as:

```text
- **이름**: `study-note`
- **유형**: `<PROJECT-TYPE>`
- **단계**: `<PROJECT-STAGE>`
- **환경**: `<PROJECT-ENVIRONMENT>`
- **핵심 산출물**: `<PROJECT-OUTPUT>`
- **공유/운영 방식**: `<PROJECT-DELIVERY>`
Read order:
1. `sfs context cat kernel`
2. `sfs context cat index`
3. Only the matching module from `sfs context cat commands/<name>.md` or

# study-note
회사일로 수업을 제대로 듣지 못하는 컴공 1학년이, 4과목의 전공기초를 강의 PDF + 과목별 AI 튜터 페르소나로 최소 시간·최대 효율로 학습하기 위한 개인 study workspace입니다.
저는 본업이 백엔드 개발자라 학교 수업을 모두 출석할 수 없습니다. 그러나 컴공 전공기초는 한 학기에 한 번 듣고 넘기기엔 너무 중요한 토대입니다. 그래서 이 프로젝트는 단순한 lecture-note reader가 아니라, **교수님 강의 PDF를 흡수해서 사용자에게 적극적으로 질문을 던지고 핵심을 가리켜주는 AI 튜터 페르소나**를 만드는 쪽으로 방향을 잡습니다. 기말고사 대비는 이 흐름의 자연스러운 부분집합이지, 본질이 아닙니다.
## Product Direction
대상 4과목:
- 디지털공학개론
- 정보통신개론
- C언어
- 컴퓨터개론
각 과목마다 **전용 AI 튜터 페르소나 1명**이 있고, 각 페르소나는 자기 과목의 강의 PDF를 RAG corpus로 참조합니다. 사용자는 PDF를 직접 읽기보다, 페르소나와 대화하며 PDF의 어느 부분이 시험 핵심인지·자기 수준에서 무엇이 비어있는지 파악합니다.
```

SFS did not infer product intent from archived notes. It created a compact
handoff from current project files, git history, and documentation topology.

User brief:

```text
패치된 문서/파일정리 정책 재적용
```

## §2. Operating Facts

- **Repository root**: `/Users/mj/IdeaProjects/study-note`
- **Current branch / head**: `main` / `1a27528`
- **Commit history**: 26 commits; first observed commit `bf2a07059325`
- **Tracked files**: 115
- **Documentation signals**: 17
- **Test signals**: 8
- **Stack signals**: node/package.json, npm, dockerfile, compose
- **Submodule/subrepo signals**: 0
- **Existing SFS sprint folders before adopt**: 5
- **Active sprint before adopt**: none
- **Active sprint pointer removed during adopt**: 0
- **Archived existing SFS sprint folders during adopt**: 5
- **Collapsed pre-existing expanded archive folders**: 3
- **Archived tmp scratch files during adopt**: 0
- **Archived previous event ledger lines during adopt**: 219
- **Archived nonessential `.sfs-local` residue during adopt**: 12
- **Retained runtime files and one-line reasons**:
  - `.sfs-local/config.yaml` — workspace SFS runtime config.
  - `.sfs-local/VERSION` — installed SFS version/upgrade state.
  - `.sfs-local/model-profiles.yaml` — project model-routing config.
  - `.sfs-local/divisions.yaml` — project division activation config.

## §3. Component Map

Largest tracked project surfaces, excluding SFS/agent runtime state:

```text
  -     53 backend
  -     18 src
  -     16 root
  -     12 scripts
  -     11 docs
  -      1 public
  -      1 localstack
  -      1 examples
  -      1 "asset
```

Documentation topology:

```text
- docs/: in-repo documentation directory.
- README.md: current project/product entry.
- SFS.md: Solon operating identity and routed entry.
```

Submodules:

```text
- none
```

If docs are a submodule, treat the main repo report as the product/runtime
handoff and read the docs submodule at its pinned commit only when docs history
is directly relevant.

## §4. Product Change Signals

The last 80 commits point to these recurring product paths after
filtering SFS/archive/runtime noise:

```text
  -   67 backend/src
  -   15 src/persona-turn
  -    9 docs/solon
  -    7 backend/prisma
  -    7 README.md
  -    6 package.json
  -    6 .gitignore
  -    5 SFS.md
  -    4 docs/2026-W19-sprint-5
  -    3 src/domain
  -    3 src/data
  -    3 scripts/smoke-db.mjs
```

Recent non-SFS commits:

```text
- 25a807b 2026-05-09 docs(sprint-5): retro + report (Gate 6 round 3 PASS, multi-turn priority 1 carry-over)
- 6a048f8 2026-05-09 fix(sprint-5): Gate 6 round 2~4 patches — stale clear / in-flight UX / markdown CSS / .env auto-load / copy polish
- ce5f52c 2026-05-09 feat(sprint-5): React + Vite persona-turn page + NestJS HTTP (POST /api/v1/persona-turns) + mode toggle/consent banner + Claude CLI timeout 90s
- 2312b76 2026-05-08 fix(sprint-4): db-persistent — guard STUDY_NOTE_USE_EXISTING_DB=1 + composeProject defensive check (Gate 6 round 1 partial follow-up)
- d33c1e9 2026-05-08 docs(readme): sprint-4 evidence harness + persistent dev DB scripts
- 4e9c523 2026-05-08 feat(sprint-4): 7장 PDF ingest 검증 + real-PDF evidence harness + carry-over (preflight, embedQuery spec, helper rename)
- 3e35682 2026-05-08 feat(scripts): add scripts
- d61bfda 2026-05-08 fix(persona): Gate 6 round 2 — empty-retrieval bypass + payload shape + embedQuery spec
- f5b5df2 2026-05-08 fix(persona): address Gate 6 partial — PDF citation + nested label + consent delay
- 107da6b 2026-05-08 feat(persona): add sprint-3 디공이 페르소나 + corpus retrieval + Claude CLI stub
- f0ff3d9 2026-05-08 chore(sprint-2): add one-shot real-PDF evidence harness
- 0268b33 2026-05-08 fix(corpus): address Gate 6 partial — token budget, zero-chunk guard, cache dir
- 0bb4260 2026-05-08 feat(corpus): add sprint-2 PDF→corpus ingest pipeline
- 1148a00 2026-05-07 chore(post-sprint-1): carry sprint-1 R1 README + solon-managed gitignore/SFS thinning
- f80c4e8 2026-05-03 fix(docker): make backend/frontend stack runnable
- e83487d 2026-05-03 feat: add local docker infrastructure with mysql and localstack
- c70a8c7 2026-05-02 feat: build study note workspace
- 0c8231f 2026-05-02 feat: launch exam-focused study note workspace
```

## §5. Verification Starting Points

Suggested checks to confirm the current baseline:

```text
- npm test / npm run build (if defined)
```

## §6. SFS Handoff

- **Shared document**: `docs/legacy-baseline/20260509/handoff.md`.
- **Private evidence**: `.sfs-local/archives/adopt/legacy-baseline/2026-05-09T13-02-51-09-00/source-summary.txt`.
- **Cold archive policy**: old sprint/archive trees are stored as tarballs plus short manifests, not expanded as a visible document tree.
- **Archived old sprint folders**: 5 in `.sfs-local/archives/adopt/legacy-baseline/2026-05-09T13-02-51-09-00/existing-sprints.tar.gz`.
- **Collapsed old archive folders**: 3 in `.sfs-local/archives/adopt/legacy-baseline/2026-05-09T13-02-51-09-00/preexisting-archives.tar.gz`.
- **Archived old tmp scratch**: 0 files in `.sfs-local/archives/adopt/legacy-baseline/2026-05-09T13-02-51-09-00/preexisting-tmp.tar.gz`.
- **Archived old event ledger**: 219 lines in `.sfs-local/archives/adopt/legacy-baseline/2026-05-09T13-02-51-09-00/preexisting-events.jsonl`.
- **Archived legacy flat shared doc**: 0 file in `.sfs-local/archives/adopt/legacy-baseline/2026-05-09T13-02-51-09-00/preexisting-shared-adoption-summary.md`.
- **Archived nonessential residue**: 12 files in `.sfs-local/archives/adopt/legacy-baseline/2026-05-09T13-02-51-09-00/preexisting-residue.tar.gz`.
- **Event ledger after adopt**: none. `adopt` leaves no active log file; the
  shared summary and private source summary are the durable evidence.

## §7. Next Sprint Contract Seed

Before implementation, choose one:

- product area/component to change.
- acceptance criteria that prove the slice is done.
- verification command or manual smoke path.
- whether docs/submodule history is authoritative for this slice.

Do not start the next sprint by reading the cold archives. Use them only for
archaeology, dispute resolution, or deep recovery.
