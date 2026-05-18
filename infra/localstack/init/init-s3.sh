#!/bin/bash
set -euo pipefail

BUCKET="study-note-dev"

echo "[init-s3] Starting S3 bucket initialization..."

# Create bucket — ignore error if already exists (idempotent)
if awslocal s3 mb "s3://${BUCKET}" 2>/dev/null; then
  echo "[init-s3] Bucket s3://${BUCKET} created."
else
  echo "[init-s3] Bucket s3://${BUCKET} already exists, skipping creation."
fi

# Apply CORS rules — allows browser PUT/GET from nginx (port 80), direct (port 3000), and Vite dev (port 5173)
awslocal s3api put-bucket-cors \
  --bucket "${BUCKET}" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["http://localhost", "http://localhost:80", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1", "http://127.0.0.1:80", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
        "AllowedMethods": ["PUT", "GET"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'

echo "[init-s3] CORS rules applied. Verifying..."

# Echo-verify CORS rules (plan §7.3 observability AC)
awslocal s3api get-bucket-cors --bucket "${BUCKET}"

echo "[init-s3] Bucket initialization complete: s3://${BUCKET}"
