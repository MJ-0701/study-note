# Docker Infrastructure Runbook

## Overview
This project uses Docker Compose to orchestrate the Frontend, Backend, MySQL, and LocalStack (S3).

## Prerequisites
- Docker and Docker Compose installed.
- Local ports `80`, `3001`, `3306`, and `4566` must be free.

## Commands

### Start the Stack
```bash
docker compose up -d --build
```

### Stop the Stack
```bash
docker compose down
```

### Clean up (including volumes/data)
```bash
docker compose down -v
```

### Check Service Status
```bash
docker compose ps
```

### View Logs
```bash
docker compose logs -f
```

## Smoke Tests

### Backend Health & Connectivity
```bash
# Check if backend can reach DB/S3
curl http://localhost:3001/api/health
```

### Frontend Accessibility
```bash
curl -I http://localhost:80
```

### S3 Bucket Verification
```bash
docker exec s3-service awslocal s3 ls
```

## Troubleshooting
- **Port Conflicts**: If port 80 or 3001 is in use, change the `ports` mapping in `docker-compose.yml`.
- **Database Reset**: If you need to reset the database, run `docker compose down -v`.
- **LocalStack Init**: The S3 bucket is created automatically on startup via `localstack/init/init-s3.sh`.

## Security Note
The credentials in `docker-compose.yml` and `.env.example` are for **LOCAL DEVELOPMENT ONLY**. Never use them in production.
