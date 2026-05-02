# Study Note Backend

NestJS backend boundary for the PDF workspace prototype.

## Route Contract

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/materials/upload-intent`
- `PUT /api/materials/:materialId/file`
- `GET /api/materials/:materialId/file`
- `GET /api/materials`
- `GET /api/materials/:materialId`
- `GET /api/materials/:materialId/download`
- `PUT /api/materials/:materialId/annotation`
- `GET /api/materials/:materialId/annotation`
- `GET /api/materials/:materialId/export-bundle`

## v1 Boundaries

- Auth is name + student number for a private local MVP. The default seed user is `채명정` / `20264514`; real DB-backed user enrollment is deferred.
- `GET /api/me` is the frontend session revalidation boundary and must be called before rendering a stored-session workspace.
- Runtime persistence uses Prisma + MySQL for users, sessions, PDF material metadata, and annotation snapshots.
- Session rows store `tokenHash`; raw bearer tokens must not be stored in MySQL.
- Storage uses `StoragePort`. `STORAGE_PROVIDER=local` is the default local/mock path; `STORAGE_PROVIDER=s3` enables private S3-backed PDF object storage.
- Upload status is stored on `PdfMaterial`: new upload intents start as `pending`, and successful backend proxy upload changes the material to `uploaded`.
- Browser clients do not upload directly to S3 in this MVP. They upload PDF bytes to `PUT /api/materials/:materialId/file`; the backend writes the object to S3 after session and ownership checks.
- Export bundle is original PDF reference + annotation JSON. Flattened annotated PDF generation is deferred.

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
