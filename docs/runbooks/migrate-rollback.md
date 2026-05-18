# Migrate Rollback Runbook

> 대상 환경: dev (docker compose) / prod (placeholder)
> 최종 갱신: 2026-05-16 (sprint-10 slice-4)

---

## 1. 마이그레이션 실패 진단

### 1.1 be-service 로그 확인

```sh
docker compose logs be-service --tail=100
```

찾아볼 키워드:

| 패턴 | 의미 |
|------|------|
| `[entrypoint] db not yet ready` | DB TCP 대기 중 — 최대 60s 대기 후 자동 진행 |
| `[entrypoint] ERROR: db not ready` | 60s 초과 대기 — DB 컨테이너 상태 확인 필요 |
| `[entrypoint] ERROR: prisma migrate deploy failed` | 마이그레이션 자체 실패 — 아래 §2 참조 |
| `Migrate deploy applied` / `No pending migrations` | 정상 완료 |

### 1.2 DB 컨테이너 상태 확인

```sh
docker compose ps db-service
docker compose logs db-service --tail=50
```

### 1.3 직접 마이그레이션 상태 조회

```sh
# be-service 컨테이너 안에서
docker compose exec be-service sh -c \
  "prisma migrate status --schema /app/packages/persistence/prisma/schema.prisma"
```

또는 호스트에서 (로컬 prisma CLI 필요):

```sh
pnpm --filter @study-note/api prisma:migrate:deploy
```

---

## 2. 마이그레이션 실패 시 복구

### 2.1 실패한 마이그레이션을 "rolled back" 으로 표시

Prisma는 실패한 migration을 `failed` 상태로 기록하므로 재실행 전에 수동으로 resolve 해야 한다.

```sh
# <migration_name> = migrations/ 디렉토리 이름 (e.g. 20260516140000_add_pdf_material_soft_delete)
prisma migrate resolve --rolled-back <migration_name> \
  --schema packages/persistence/prisma/schema.prisma
```

### 2.2 직전 SQL 역적용 (필요 시)

실패한 migration의 SQL이 부분 적용된 경우 수동 역적용:

```sh
# DB 접속
docker compose exec db-service mysql -u study_note -pstudy_note study_note

# 예: 컬럼 추가 migration이 실패한 경우
ALTER TABLE PdfMaterial DROP COLUMN IF EXISTS deletedAt;

# 예: 테이블 생성 migration이 실패한 경우
DROP TABLE IF EXISTS NewTable;

EXIT;
```

> 역적용 SQL은 해당 migration 파일(`migration.sql`)의 역연산을 수동으로 작성해야 한다.
> Prisma는 자동 rollback SQL을 제공하지 않는다.

### 2.3 정상 migration 재적용

역적용 후 migration 파일을 수정하거나 새 migration을 생성하여 재적용:

```sh
pnpm --filter @study-note/api prisma:migrate:deploy
```

---

## 3. seed corruption 복구

seed 데이터가 오염되었거나 dev 환경을 초기화해야 하는 경우:

> **주의**: 아래 명령은 mysql volume을 포함한 모든 데이터를 삭제한다.
> 사용자 업로드 PDF, 대화 기록 등 모든 dev 데이터가 사라진다.
> 실행 전 반드시 보존할 데이터 여부를 확인할 것.

```sh
# 1. 모든 컨테이너 + 볼륨 삭제
docker compose down -v

# 2. 재기동 (자동으로 migrate + seed 실행)
docker compose up -d --build

# 3. 기동 로그 확인
docker compose logs be-service -f
```

정상 완료 시 로그:

```
[entrypoint] prisma migrate deploy complete
[entrypoint] seed complete
```

---

## 4. restart loop 확인

be-service가 migrate 실패로 exit 1을 반복하는 경우 (`restart: on-failure:3` 정책):

```sh
# 재시작 횟수 확인
docker inspect be-service --format '{{.RestartCount}}'

# 3회 실패 후 stopped 상태 확인
docker compose ps be-service
```

3회 초과 후에는 수동으로 원인 해결 + 재기동 필요:

```sh
docker compose up -d be-service
```

---

## 5. prod 배포 시 백업 절차 (placeholder)

> sprint-10 scope 외. 실 prod 배포 전 아래 항목 구체화 필요.

- [ ] RDS snapshot 생성 (배포 직전)
- [ ] 마이그레이션 dry-run 환경에서 검증 후 prod 적용
- [ ] 마이그레이션 실패 시 RDS snapshot으로 point-in-time recovery
- [ ] `prisma migrate resolve --rolled-back` + 역적용 SQL 사전 준비
- [ ] oncall escalation 경로 정의 (3회 restart 후 알림)

---

## 참고 명령 모음

```sh
# 마이그레이션 상태 확인 (호스트)
pnpm --filter @study-note/api prisma:migrate:deploy

# be-service 실시간 로그
docker compose logs be-service -f

# be-service만 재기동 (data 보존)
docker compose up -d --force-recreate --build be-service

# DB 직접 접속
docker compose exec db-service mysql -u study_note -pstudy_note study_note

# 전체 초기화 (데이터 삭제)
docker compose down -v && docker compose up -d --build
```
