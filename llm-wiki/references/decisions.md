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

## `.sfs-local/decisions/` (private workbench)

| ID | 제목 | 요약 |
|---|---|---|
| 0001 | worker-sonnet-4-6 / gpt-5-3-codex-spark / slice-dual-cpo | 초기 worker model routing 정책 (이후 0002 가 amend) |
| 0002 | amend-worker-routing per model-profiles.yaml — Opus 4.7 CTO/CPO, Sonnet 4.6 worker | 모델 라우팅 amend. 이후 feedback_opus_no_direct_code 정책 (사용자 메모리) 가 폐기 |
| 0003 | narrow AC2 — corpus local-only, single-dataset ownerId isolation, conversation MCP env fail-closed | persona/conversation 시기의 격리 정책 |
| 0004 | Azure full-migration + prod auth acceptance | SWA + ACA + MySQL Flex + Key Vault + GHA OIDC 결정. 운영 인프라 SoT. |
| 0005 | PDF material ownerId/uploaderId/shared-read | uploader 만 write, cohort 내 shared read. `PdfMaterial` aggregate M1 의 근거. |
| 0006 | PDF metadata UI-only classDate contract | classDate 는 UI metadata, BE storage 영향 X. M2 근거. |

원문 디렉터리: `.sfs-local/decisions/<id>-*.md`

## `docs/solon/decisions/` (공유 가능)

| ID | 제목 | 요약 |
|---|---|---|
| 0001 | Stack lock-in: Nest.js + Vite + MySQL + S3 + env | 기본 stack 결정. |
| 0002 | Activate design division for responsive lecture-note UX | 반응형 UX 작업을 design division 으로 활성화. |
| 0003 | Amend stack — add AI tutor, defer cost ceiling | AI tutor 도입 amend. |
| 0004 | AI tutor stack | AI tutor 구현 stack 결정. |
| 0005 | Monthly AI cost ceiling options | AI 비용 ceiling 옵션. |
| 0006 | Expand design scope — tutor UX | design scope 확장 (tutor UX). |
| 0007 | Module architecture redistribution | 모듈 재배치 + 운영 stack 비교 표 (Azure / DigitalOcean 등). |

원문 디렉터리: `docs/solon/decisions/<id>-*.md`

## 인용 규칙

- 코드 / sprint 문서에서 결정을 인용할 때 `decision 0004` (private) 또는
  `solon decisions/0007` (공유) 같은 식으로 prefix 명시.
- 새 decision 은 ADR template 사용 (`.sfs-local/decisions/0000-...md` 또는
  `docs/solon/decisions/`).
- wiki 갱신 = 새 ADR 추가 시 위 표에 한 줄 추가.

## 관련 aggregate / invariant

- I7 (R2 키 BC 명칭 유지) ← 0004
- PdfMaterial M1, M2 ← 0005, 0006
- Sync I3~I5 ← persona/conversation 시기 (0003) 의 일반 정책에서 진화
