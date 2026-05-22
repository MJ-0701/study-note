---
id: study-note-module-apps-api
title: apps/api 모듈 지도
language: ko
load_when:
  - 백엔드
  - api 모듈
  - NestJS
  - controller
  - service
summary: NestJS BE 의 모듈 구조 + endpoint + 책임 + R2/MySQL 의존.
---

# apps/api 모듈 지도

NestJS 기반. node-22 / fluid compute. localhost dev = `pnpm --filter @study-note/api dev`.

## 진입점

- `apps/api/src/main.ts` — NestFactory bootstrap, CORS, global pipes/filters.
- `apps/api/src/app.module.ts` — root module, import 등록.
- `apps/api/src/health.controller.ts` — `/v1/health` (cold start probe).

## Modules

| 디렉터리 | 책임 | 주요 endpoint |
|---|---|---|
| `auth/` | 로그인, 세션 cookie, `/v1/auth/me` | `auth.controller.ts`, `cookie.util.ts`, `auth.env.ts` |
| `materials/` | PdfMaterial CRUD + R2 upload | `materials.controller.ts`, `materials.service.ts`, `__tests__/` |
| `pdf-annotations/` | annotation PUT / GET | `pdf-annotations.controller.ts`, `service.ts`, `module.ts` |
| `user-notes/` | userNotes PUT / GET (WeekNote.userNotes) | `user-notes.controller.ts`, `service.ts`, `module.ts` |
| `persona/` | 디공이 multi-turn (legacy from sprint pre-pivot) | `persona/__tests__/` |
| `admin/` | 관리자 endpoint | `admin/` |
| `common/` | filters (exception filter), logger | `common/filters/`, `common/logger/` |

## Endpoint 표 (현재 sprint 까지 알려진 surface)

| Method | Path | 모듈 | 인증 | 비고 |
|---|---|---|---|---|
| GET | `/v1/auth/me` | auth | cookie | 45s timeout 위협, ACA cold start |
| POST | `/v1/auth/sign-in` | auth | — | cookie 발급 |
| POST | `/v1/auth/sign-out` | auth | cookie | cookie 해제 |
| POST | `/v1/materials` (multipart) | materials | cookie | R2 putObject + Record row |
| GET | `/v1/materials/<id>` | materials | cookie + uploader 또는 cohort | 사용자별 SCROll-only |
| GET | `/v1/materials?subjectId=...` | materials | cookie | subject 별 material list |
| PUT | `/v1/user-notes/<userId>:<subjectId>:<weekId>` | user-notes | cookie + ownerId 일치 | sprint-2 |
| GET | `/v1/user-notes/<key>` | user-notes | cookie + ownerId 일치 | hot path |
| PUT | `/v1/pdf-annotations/<userId>:<subjectId>:<materialId>` | pdf-annotations | cookie + ownerId 일치 | annotation body |
| GET | `/v1/pdf-annotations/<key>` | pdf-annotations | cookie + ownerId 일치 | hot path |
| GET | `/v1/health` | health | — | LB / keep-alive |

(표는 wiki 의 by-reference 색인. 정확한 path / body schema 는 각 controller 원문 참조.)

## 인프라 / 의존

- **R2** (S3-compatible): `materials.service.ts` 가 `StoragePort` / `S3StorageService` 사용.
  endpoint = R2, env = `S3_ENDPOINT=https://...r2.cloudflarestorage.com`.
- **MySQL Flex**: user / material / userNotes / pdfAnnotation 테이블.
- **Cookie session**: ACA + SWA cross-subdomain (`.910701.xyz`).
- **Datadog APM**: sprint-15 이후 (계획 / 진행 중 확인).

## 환경변수 / secret

- `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET=study-note-prod`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- `STORAGE_PROVIDER=s3` (legacy 명칭, R2 가리킴).
- `DATABASE_URL` (MySQL flex).
- `AUTH_SESSION_COOKIE_*` (auth.env.ts 참조).
- secret 은 ACA env (managed identity + Key Vault 또는 직접 secret).

## Testing

- `apps/api/src/materials/__tests__/`
- `apps/api/src/persona/__tests__/`
- 통합 테스트 / e2e 정책 = sprint 별 retro / decision 확인.

## 변경 이력 / 관련 sprint

- sprint-2: userNotes + pdfAnnotations BE persistence
- decision 0004: Azure full migration (SWA + ACA + MySQL Flex)
- decision 0005: PDF material ownerId/uploaderId/shared read
- decision 0006: classDate UI-only contract
- sprint-15: 운영 배포 + keep-alive workflow

## 갱신 의무

- 새 controller / endpoint 추가 시 위 표 갱신.
- 인증 / 권한 규칙 변경 시 `auth.controller.ts` 와 함께 [domain/invariants](../domain/invariants.md) 의 I1, I2 영향 확인.
