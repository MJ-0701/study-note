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

| 디렉터리 | 책임 | controller path |
|---|---|---|
| `auth/` | 로그인, 세션 cookie, `/api/v1/auth/me` | `@Controller("v1/auth")` |
| `materials/` | PdfMaterial CRUD + R2 upload | `@Controller("materials")` (v1 prefix 없음) |
| `pdf-annotations/` | annotation PUT / GET | `@Controller({ path: "v1/pdf-annotations" })` |
| `user-notes/` | userNotes PUT / GET (WeekNote.userNotes) | `@Controller({ path: "v1/notes" })` |
| `persona/` | 디공이 multi-turn (legacy from sprint pre-pivot) | `persona/__tests__/` |
| `admin/` | 관리자 endpoint | `admin/` |
| `common/` | filters (exception filter), logger | `common/filters/`, `common/logger/` |

## Endpoint 표 (현재 sprint 까지 알려진 surface)

NestJS global prefix = `app.setGlobalPrefix("api")` (`apps/api/src/main.ts:38`).
모든 path 는 client 입장에서 `/api` 가 붙는다. controller path 가 `v1/...` 이면
최종 URL = `/api/v1/...`; controller path 가 prefix 없으면 (예: `@Controller("materials")`)
최종 URL = `/api/materials/...`.

| Method | Final URL (client) | 모듈 | 인증 / 권한 | 비고 |
|---|---|---|---|---|
| GET | `/api/v1/auth/me` | auth | cookie | 45s timeout 위협, ACA cold start |
| POST | `/api/v1/auth/sign-in` | auth | — | cookie 발급 |
| POST | `/api/v1/auth/sign-up` | auth | — | 신규 가입 |
| POST | `/api/v1/auth/sign-out` | auth | cookie | cookie 해제 |
| POST | `/api/materials/upload-intent` | materials | cookie + ownerId | R2 PUT pre-signed URL 발급 |
| PUT | `/api/materials/:materialId/file` | materials | cookie + ownerId | proxy upload 경로 |
| POST | `/api/materials/:materialId/complete` | materials | cookie + ownerId | upload 완료 마킹 |
| GET | `/api/materials?subjectId=...` | materials | cookie | uploader-self 또는 cohort shared-read ([private 0005](../references/decisions.md#private-0005)) |
| GET | `/api/materials/:materialId` | materials | cookie | shared-read |
| GET | `/api/materials/:materialId/file` | materials | cookie | R2 object proxy |
| GET | `/api/materials/:materialId/download` | materials | cookie | download disposition |
| GET | `/api/materials/:materialId/annotation` | materials | cookie | **legacy** annotation 채널 (FE 미사용, sprint-2 이후 `/api/v1/pdf-annotations` 가 표준) |
| PUT | `/api/materials/:materialId/annotation` | materials | cookie | **legacy** annotation 저장 |
| GET | `/api/materials/:materialId/export-bundle` | materials | cookie | 내보내기 번들 |
| GET | `/api/v1/notes/subject/:subjectId/week/:weekId` | user-notes | cookie → `request.user.id` 로 storage key 구성 | WeekNote.userNotes hot path GET |
| PUT | `/api/v1/notes/subject/:subjectId/week/:weekId` | user-notes | 동일 | autosave PUT (userId 는 URL 에 없음 — cookie session 에서 추출) |
| GET | `/api/v1/pdf-annotations/:materialId` | pdf-annotations | cookie → `request.user.id` 로 storage key 구성 | annotation hot path GET |
| PUT | `/api/v1/pdf-annotations/:materialId` | pdf-annotations | 동일 | annotation autosave (subjectId/userId 는 URL 에 없음) |
| GET | `/api/v1/health` | health | — | LB / keep-alive |

핵심: **userId / subjectId 는 path key 에 들어가지 않는다.** userNotes 와
pdf-annotations 모두 BE 가 `request.user.id` (cookie session) 와 path 의
materialId / weekId 만으로 storage key 를 구성한다. FE wiki 의 storage key 표현
(예: `<userId>:<subjectId>:<materialId>`) 은 **client-side cache key** 이고 URL
key 가 아니다 — 둘을 혼동하지 않게 주의.

(표는 by-reference 색인. 정확한 body schema 는 각 controller 원문 참조.)

## 인프라 / 의존

- **R2** (S3-compatible): `materials.service.ts` 가 `StoragePort` / `S3StorageService` 사용.
  endpoint = R2, env = `S3_ENDPOINT=https://...r2.cloudflarestorage.com`.
- **MySQL Flex**: user / material / userNotes / pdfAnnotation 테이블 (Prisma).
- **Cookie session**: ACA + SWA cross-subdomain (`.910701.xyz`).
- **Datadog APM**: 현재 source truth (decision / runbook / 코드 import) 에 적용 흔적 없음. sprint-15 brainstorm 후보였으나 운영 진입 여부 미확정 — 적용되면 본 절 갱신.

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
- [private 0004](../references/decisions.md#private-0004): Azure full migration (SWA + ACA + MySQL Flex)
- [private 0005](../references/decisions.md#private-0005): PDF material ownerId write guard / uploaderId DTO alias / shared read
- [private 0006](../references/decisions.md#private-0006): classDate UI-only + `metadata-pending` sentinel
- sprint-15: 운영 배포 + keep-alive workflow

## 갱신 의무

- 새 controller / endpoint 추가 시 위 표 갱신.
- 인증 / 권한 규칙 변경 시 `auth.controller.ts` 와 함께 [domain/invariants](../domain/invariants.md) 의 I1, I2 영향 확인.
