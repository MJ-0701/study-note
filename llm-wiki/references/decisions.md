---
id: study-note-ref-decisions
title: Decision Index
language: ko
load_when:
  - 결정
  - ADR
  - 왜 이렇게
  - decision history
summary: SFS decision (ADR) 색인. 본문은 .sfs-local/decisions/ + docs/solon/decisions/ 원문 참조.
---

# Decision Index

본문은 원문 ADR 에. wiki 는 한 줄 요약 + 어떤 invariant / aggregate 에 묶이는지.

두 갈래의 ADR 디렉터리가 있다. 인용 시 prefix 를 명시한다:

- **private 0NNN** → `.sfs-local/decisions/0NNN-*.md` (workbench, opt-in 공유)
- **docs 0NNN** → `docs/solon/decisions/0NNN-*.md` (공유 가능)

## `.sfs-local/decisions/` (private workbench)

<a id="private-0001"></a><a id="0001"></a>
### private 0001 — worker-sonnet-4-6 / gpt-5-3-codex-spark / slice-dual-cpo
초기 worker model routing 정책. 이후 private 0002 가 amend.

<a id="private-0002"></a><a id="0002"></a>
### private 0002 — amend-worker-routing (Opus 4.7 CTO/CPO, Sonnet 4.6 worker)
모델 라우팅 amend. 이후 feedback_opus_no_direct_code (사용자 메모리) 정책으로 폐기.

<a id="private-0003"></a><a id="0003"></a>
### private 0003 — narrow AC2: corpus local-only, single-dataset ownerId isolation
persona/conversation 시기의 격리 정책. conversation MCP env fail-closed.

<a id="private-0004"></a><a id="0004"></a>
### private 0004 — Azure full-migration + prod auth acceptance
SWA + ACA + MySQL Flex + Key Vault + GHA OIDC. 운영 인프라 SoT.

<a id="private-0005"></a><a id="0005"></a>
### private 0005 — PDF material ownerId/uploaderId/shared-read
ownerId 가 write guard 의 storage field. `uploaderId` 는 DTO/API 표면의 alias (mapper 가 `uploaderId = ownerId`). cohort 내 shared read. `PdfMaterial` M1 의 근거.

<a id="private-0006"></a><a id="0006"></a>
### private 0006 — PDF metadata UI-only classDate contract
classDate 는 UI metadata. BE 저장 시 `metadata-pending` sentinel 도 허용 — draft 단계에서 optional. `PdfMaterial` M2 의 근거.

## `docs/solon/decisions/` (공유 가능)

<a id="docs-0001"></a>
### docs 0001 — Stack lock-in: Nest.js + Vite + MySQL + S3-compat + env

<a id="docs-0002"></a>
### docs 0002 — Activate design division for responsive lecture-note UX

<a id="docs-0003"></a>
### docs 0003 — Amend stack: add AI tutor, defer cost ceiling

<a id="docs-0004"></a>
### docs 0004 — AI tutor stack

<a id="docs-0005"></a>
### docs 0005 — Monthly AI cost ceiling options

<a id="docs-0006"></a>
### docs 0006 — Expand design scope: tutor UX

<a id="docs-0007"></a>
### docs 0007 — Module architecture redistribution
운영 stack 비교 표 (Azure / DigitalOcean 등) + secret 주입 채널.

## 인용 규칙

- ADR 인용 시 항상 `private 0NNN` 또는 `docs 0NNN` prefix + 파일 경로 명시.
  예: `private 0005 — .sfs-local/decisions/0005-pdf-material-ownerid-uploader-shared-read.md`.
- 새 decision 은 ADR template 사용 (위 두 디렉터리 중 하나).
- wiki 갱신 = 새 ADR 추가 시 위 섹션에 anchor 와 한 줄 추가.

## 관련 aggregate / invariant

- I7 (R2 키 BC 명칭 유지) ← [private 0004](#private-0004)
- PdfMaterial M1 (ownerId write guard + uploaderId alias) ← [private 0005](#private-0005)
- PdfMaterial M2 (classDate UI-only) ← [private 0006](#private-0006)
- Sync I3~I5 (격리 정책 진화) ← [private 0003](#private-0003)
- PdfMaterial M1, M2 ← 0005, 0006
- Sync I3~I5 ← persona/conversation 시기 (0003) 의 일반 정책에서 진화
