---
id: study-note-invariants
title: Cross-cutting Invariants
language: ko
load_when:
  - invariant
  - 불변식
  - 위반하면 안 되는
  - 전역 규칙
summary: 여러 aggregate / 모듈을 가로지르는 invariant 모음. 위반 = 사용자 데이터 손상 / 인증 누수 / 동기화 깨짐.
---

# Cross-cutting Invariants

aggregate 별 invariant 는 각 aggregate page 에. 여기는 **여러 context 를
가로지르는** 규칙만.

## I1. User data isolation (cross-user leak 금지)

> 한 user 의 메모/필기/annotation 은 다른 user 의 namespace 에서 read/write 될
> 수 없다.

- **Client (FE) localStorage**: 모든 user-scoped key 는 `{base}:{userId}` 형태.
  - `study-note.notebook.v2:<userId>` (sprint-3/S1)
  - `study-note.pdf-workspaces.v1:<userId>` (sprint-3/S2)
  legacy unscoped key 는 한 번 owner-gated migration 후 drop. owner mismatch =
  migrate 없이 drop (data loss 허용 — server autosave 가 SoT).
- **Server (BE) authorization**: URL path 에 userId 가 **없다** (userNotes,
  pdf-annotations 모두). NestJS guard (cookie session) → `request.user.id` 로
  ownership 을 식별 후 그 userId 기반 storage key / DB row 를 작성한다. 즉
  "URL ownerId 검증" 이 아니라 **URL 에 userId 가 들어가지 않게 설계** 함으로써
  client 가 다른 user 의 자원에 접근할 표면 자체가 없다.
- **PdfMaterial 예외**: shared-read 정책 ([private 0005](../references/decisions.md#private-0005)).
  uploader (ownerId) 만 write/delete 가능하지만 같은 cohort 의 read 는 허용.
  shared-read 가 적용되는 read endpoint 는 ownership check 가 "uploader OR cohort
  member" 로 완화되며 write 는 여전히 ownerId strict (`apps/api/src/materials/materials.service.ts`
  의 `where: { id, ownerId, deletedAt: null }` 패턴).
- 위반 사례: shared browser 에서 A 로그인 → B 로그인 시 A 의 localStorage 가
  B 의 BE record 로 PUT. sprint-2 가 wipe 로 1차 완화, sprint-3 가 namespacing
  으로 구조적 차단.
- **원문**: `apps/web/src/main.ts:660-800` (notebook), `1815-1985` (pdfWorkspace),
  `apps/api/src/user-notes/user-notes.controller.ts`, `apps/api/src/pdf-annotations/pdf-annotations.controller.ts`,
  `apps/api/src/materials/materials.service.ts` (ownerId guard),
  [flows/storage-namespacing](../flows/storage-namespacing.md)

## I2. AbortController on session transition

> A → B 전환 시 wire 에 떠 있는 PUT 은 abort. server arrival 자체는 막을 수
> 없으나 client 가 새 user 의 cookie 아래에서 chained PUT 을 실행하지 않는다.

- `userNotesPutAborts.values().forEach(ac => ac.abort())`
- `annotationPutAborts.values().forEach(ac => ac.abort())`
- chained promise 도 clear (`userNotesPutChains.clear()` 등) — abort 후
  `.then()` 가 새 session 에서 실행되지 않도록.
- 위반 사례: A 의 debounced PUT 이 B 의 cookie 와 함께 도착 → 서버가 B 의
  user record 에 A 의 body 를 기록.
- **원문**: `apps/web/src/main.ts` `applySessionTransitionForUser` (S3 이후
  wipe 는 사라졌지만 abort 는 유지).

## I3. PUT ordering per key

> 같은 key (userId+subjectId / materialId) 의 PUT 은 server 도착 순서가
> client issue 순서와 같다.

- `userNotesPutChains` / `annotationPutChains` map = per-key FIFO promise chain.
  새 PUT 은 이전 chain entry 가 settle 한 뒤에 `fetch` 호출.
- last-write-wins 는 cross-device race 에만 적용. 같은 device 에서는 chain 이
  순서 보장.
- 위반 사례: 두 debounced PUT 이 동시에 wire 위에 → 서버가 이전 body 로
  덮어쓰는 reorder.
- **원문**: `apps/web/src/main.ts` 의 `userNotesPutChains` /
  `annotationPutChains` 정의 + 사용처.

## I4. Hot path GET dedup

> 같은 key 에 대한 GET hydrate 는 view 진입 시 최대 1회. renderApp 가 매번
> 호출돼도 network 폭주가 없다.

- `userNotesFetchedKeys` / `annotationFetchedKeys` Set 가 1회 fetch marker.
- material A → B → A 재방문은 `lastHydratedAnnotationByMaterial` 로 force-refetch
  trigger.
- 위반 사례: renderApp 호출마다 GET 발사 → ACA cold start + rate limit.
- **원문**: `apps/web/src/main.ts` line 848-870 부근.

## I5. Backoff pause + banner

> 5xx 3회 / 5분 윈도우 → autosave pause + 사용자에게 banner. 자동 재시도 X.

- `SYNC_FAILURE_PAUSE_THRESHOLD = 3`, `SYNC_FAILURE_PAUSE_WINDOW_MS = 5 * 60 * 1000`
- `syncFailureTracker.paused = true` → 모든 PUT 게이트.
- 위반 사례: ACA outage 동안 무한 retry → 사용자 작업 손실 + 비용.
- **원문**: `apps/web/src/main.ts` `SYNC_FAILURE_PAUSE_*` 상수 + 사용.

## I6. Server autosave = SoT, localStorage = cache

> localStorage 데이터 손실은 허용. server PUT 성공이 진실의 원천. migration
> failure / quota exception 발생 시 fallback = 다음 GET hydrate.

- 결과: localStorage 코드 path 의 try/catch 는 silent fail 허용 (UX banner 만).
- migration 2-phase write 는 setItem 실패 시 legacy 보존 (다음 load 재시도) +
  in-memory return.
- 위반 사례: localStorage 실패 시 throw → boot 깨짐.
- **원문**: sprint-3/S1+S2 의 `migrateLegacy*ForUser` 2-phase 블록.

## I7. R2 키는 user-scoped, BC 명칭은 그대로 두기

> 신규 storage 작업은 새 R2 provider 불필요. 기존 `StoragePort`/`S3StorageService`
> 의 `putObject`/`getObject` 재사용 + key prefix 만 분리 (`materials/`, `notes/`,
> `annotations/`).

- AWS S3 명칭 (`STORAGE_PROVIDER=s3`, `S3_*`) = R2 endpoint. 인프라 = Cloudflare R2.
- 위반 사례: 새 R2 SDK 추가 → 환경변수 중복 + secret 관리 fragmentation.
- **원문**: `CLAUDE.md` 의 "인프라 현황 (운영)" 섹션.

## I8. Solon bash adapter SSoT

> sfs CLI 명령은 deterministic bash adapter 가 SSoT. paraphrase / 추측 출력
> 금지. empty output ≠ success (start/brainstorm/plan/implement/review/retro 등
> visible 명령은 stdout 또는 artifact 변경 필수).

- 위반 사례: agent 가 bash output 을 요약해서 보여주고 실제 명령 출력은 다름.
- **원문**: `CLAUDE.md` 의 SFS dispatch table.
