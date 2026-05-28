---
title: 인프라 현황 (운영)
description: study-note 운영 인프라 사실 — storage / DB / 호스팅·배포 / 도메인. CLAUDE.md 가 @import 로 로드하는 단일 출처. 배포·storage·DB 작업 전 참조.
last-verified: 2026-05-29
---

# 인프라 현황 (운영)

> 운영 인프라 **사실** 단일 출처. agent 지침(CLAUDE.md/AGENTS.md/GEMINI.md)이
> `@docs/infra.md` 로 로드. 사실이 바뀌면 본 파일만 갱신.

- **Storage = Cloudflare R2** (S3-compatible API). 코드 베이스의 `S3StorageService`,
  `S3_*` 환경변수, `STORAGE_PROVIDER=s3` 는 모두 **R2 endpoint** 를 가리키는 legacy
  명칭이다. 실제 ACA env: `S3_ENDPOINT=https://...r2.cloudflarestorage.com`,
  `S3_REGION=auto`, `S3_BUCKET=study-note-prod`. AWS S3 를 사용하지 않는다.
- DB = Azure MySQL Flex (user / session). 새 영속화 시 우선 R2 object storage 검토,
  관계형이 필요한 경우만 MySQL 신규 테이블.
- 호스팅 (frontend) = **Vercel**. `fe-v*` tag push → `.github/workflows/fe-release.yml`
  ("FE Release Pipeline (Vercel)") 가 **유일한 prod 배포 경로**. Vercel git
  auto-deploy 는 Ignored Build Step ("Don't build anything") + `vercel.json`
  `git.deploymentEnabled=false` 로 차단. 과거 "Azure SWA (frontend)" 표기는
  stale — decision 0004 의 SWA 계획에서 Vercel 로 이관됨 (2026-05-28 확인). FE
  배포 = `git tag fe-v0.1.NN <commit> && git push origin fe-v0.1.NN` (최신 tag
  = `git tag -l 'fe-v*' | sort -V | tail`).
- 호스팅 (backend) = Azure Container Apps. `be-v*` tag → be-release.yml.
  min-replicas=0 → cold start 가능, sprint-15 의 keep-alive workflow 가 완화.
  infra = `infra-v*` → infra-release.yml.
- 도메인: Porkbun `910701.xyz` (운영 = `study-note.910701.xyz`, FE custom domain
  = Vercel).
- 신규 storage 작업은 새 R2 provider 도입 불필요. 기존 `StoragePort` /
  `S3StorageService` 의 `putObject`/`getObject` 재사용 + key prefix 분리
  (예: `materials/`, `notes/`, `annotations/`).
