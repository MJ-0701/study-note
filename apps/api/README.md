# Study Note Backend

NestJS backend boundary for the PDF workspace prototype.

## Route Contract

- `GET /api/health`
- `POST /api/v1/auth/sign-in` — body `{studentNumber, name}` → 200 `{userId,studentNumber,name,role}` + `Set-Cookie: study_note_session` (HttpOnly, Secure, SameSite=Lax, no Max-Age)
- `POST /api/v1/auth/sign-out` — clears session cookie; 200 `{ok:true}`
- `GET /api/v1/auth/me` — cookie session → 200 `{userId,studentNumber,name,role}`; 401 if not signed in
- `POST /api/materials/upload-intent`
- `PUT /api/materials/:materialId/file`
- `GET /api/materials/:materialId/file`
- `GET /api/materials`
- `GET /api/materials/:materialId`
- `GET /api/materials/:materialId/download`

> 위 목록은 **핵심 라우트(auth + materials) 발췌**입니다. v1 전체 표면(terms · subjects · admin · pdf-annotations · user-notes · telemetry)은 `llm-wiki/modules/apps-api.md` 의 엔드포인트 표를 단일 출처로 참조하세요.
>
> **410 Gone (deprecated)**: `PUT|GET /api/materials/:materialId/annotation` — sprint-W21-sprint-2/S2 에서 폐기. 현행 annotation 채널은 `PUT|GET /api/v1/pdf-annotations/:materialId`.
>
> **Removed** (slice-2): `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me` — replaced by the `v1/auth/*` routes above.

## v1 Boundaries

- Auth is name + student number for a private local MVP (`User.devUserFlag=true` allowlist).
  Only users with `devUserFlag=true` may sign in. Set `STUDY_NOTE_AUTH_DEV_ENABLED=false` to
  disable all auth routes (HTTP 503) — intended for production deployments before OAuth/MFA.
- Session token is stored in an **httpOnly cookie** (`study_note_session`). Token is never in the
  response body. Cookie spec: `Secure; SameSite=Lax; Path=/; no Max-Age` (browser-close expiry).
  The browser must send `credentials: "include"` (or equivalent) on all API requests.
- `GET /api/v1/auth/me` is the frontend session revalidation boundary. Called on every app boot
  with `credentials: "include"`; 401 means not signed in (clear in-memory state, show login).
- Session rows store `tokenHash`; raw session tokens must not be stored in MySQL or logged.
- PII policy: student numbers logged as `****{last4}`, names as `{first char}**`. Session cookie
  value is never logged.
- Runtime persistence uses Prisma + MySQL for users, sessions, PDF material metadata, and annotation snapshots.
- Storage uses `StoragePort`. `STORAGE_PROVIDER=local` is the default local/mock path; `STORAGE_PROVIDER=s3` enables private S3-backed PDF object storage.
- Upload status is stored on `PdfMaterial`: new upload intents start as `pending`, and successful backend proxy upload changes the material to `uploaded`.
- Browser clients do not upload directly to S3 in this MVP. They upload PDF bytes to `PUT /api/materials/:materialId/file`; the backend writes the object to S3 after session and ownership checks.

## Local MySQL / Prisma

Set `DATABASE_URL` and `SESSION_TOKEN_PEPPER` in `.env` or your shell.

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev:backend
```

The seed is idempotent and creates the local MVP users plus the four current
subjects. Smoke tests start a temporary MySQL 8 Docker Compose service by
default. To use an already-running database instead:

```bash
STUDY_NOTE_USE_EXISTING_DB=1 DATABASE_URL="mysql://..." npm run smoke:backend
```

## PDF Storage

Local development defaults to the local/mock storage provider:

```bash
STORAGE_PROVIDER=local npm run dev:backend
```

The local/mock provider keeps binary bytes only inside the backend process and
is intended for smoke tests and local UI work. Metadata and annotations still
go to MySQL.

For private S3 storage, provide S3 config through environment variables only:

```bash
STORAGE_PROVIDER=s3
S3_BUCKET="your-private-bucket"
S3_REGION="ap-northeast-2"
# Optional for S3-compatible local tools:
S3_ENDPOINT=""
S3_FORCE_PATH_STYLE=false
```

AWS credentials should come from the normal AWS SDK credential chain, such as
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, an AWS profile, or an instance
role. Do not commit bucket names, keys, secrets, or `.env` files.

The bucket is assumed to be private. The backend proxy approach means browser
S3 CORS is not required for this MVP. The backend must have permission for:

- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject` only for optional real smoke cleanup

The default PDF upload limit is `PDF_UPLOAD_MAX_BYTES=26214400` (25 MiB). The
backend rejects non-PDF content types, oversized uploads, wrong owners, and
downloads for materials whose upload status is still `pending`.

Storage checks:

```bash
npm run smoke:s3-storage
RUN_REAL_S3_SMOKE=1 STORAGE_PROVIDER=s3 S3_BUCKET="..." S3_REGION="..." npm run smoke:s3-real
```

`smoke:s3-storage` uses a mocked S3 client and does not require AWS. The real
S3 smoke is opt-in and skips unless `RUN_REAL_S3_SMOKE=1` is set.
