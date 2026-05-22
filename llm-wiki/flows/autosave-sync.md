---
id: study-note-flow-autosave
title: Autosave / BE Sync Flow
language: ko
load_when:
  - autosave
  - debounce
  - put chain
  - AbortController
  - 5xx backoff
  - hot path GET
  - sync
summary: userNotes / pdf-annotations 의 debounce → chain → fetch → success/failure 흐름. invariant I2~I5 와 짝.
---

# Autosave / BE Sync Flow

원문: `apps/web/src/main.ts` (sync 헬퍼, 약 820~1500 라인) + `apps/api/src/user-notes/`, `apps/api/src/pdf-annotations/`.

## Resource

- **userNotes**: `WeekNote.userNotes` (사용자 자유 메모) — BE URL
  `/api/v1/notes/subject/:subjectId/week/:weekId` (FE 호출: `apps/web/src/main.ts:979, 1055`).
  userId 는 cookie session 에서 BE 가 추출.
- **pdf-annotations**: SubjectPdfWorkspace 의 annotation 묶음 (sticky / ink /
  textBox / checklist / table / chart 모두 동일 payload 안) — BE URL
  `/api/v1/pdf-annotations/:materialId` (FE 호출: `apps/web/src/main.ts:1168, 1264`).
  userId / subjectId 는 URL 에 없고 cookie session 으로 BE 가 식별.

> client-side cache / mutex key (`userNotesPutTimers` / `annotationPutAborts` 의
> Map key) 는 `<userId>:<subjectId>:<weekId>` / `<userId>:<subjectId>:<materialId>`
> 형태로 사용하지만 이는 **FE 메모리 안의 mutex key** 이고 URL path key 가
> 아니다. 둘을 분리해서 읽는다.

## 상수

| 이름 | 값 | 의미 |
|---|---|---|
| `USER_NOTES_PUT_DEBOUNCE_MS` | 500 | userNotes 타이핑 debounce |
| `ANNOTATION_PUT_DEBOUNCE_MS` | 750 | annotation 변경 debounce |
| `SYNC_FAILURE_PAUSE_THRESHOLD` | 3 | 연속 5xx 카운트 |
| `SYNC_FAILURE_PAUSE_WINDOW_MS` | 5 * 60 * 1000 | 5분 윈도우 |

## State

- `userNotesPutTimers: Map<key, setTimeout>` — debounce timer
- `userNotesPutAborts: Map<key, AbortController>` — in-flight cancel
- `userNotesPutChains: Map<key, Promise<void>>` — per-key FIFO (I3)
- `userNotesFetchedKeys: Set<key>` — hot path GET dedup (I4)
- (annotation 도 동일 4종 구조)
- `lastHydratedAnnotationByMaterial: Map<key, materialId>` — A→B→A 재방문 refetch trigger
- `syncFailureTracker: { recentFailures: number[]; paused: boolean }` — backoff state (I5)

## PUT flow

```
사용자 mutation (notebook edit / annotation 추가/이동/삭제)
  │
  ▼
saveNotebook / savePdfWorkspaceStore   (localStorage cache)
  │
  ▼
scheduleUserNotesPut(key, body) / scheduleAnnotationPut(key, body)
  │
  ├─ 이전 timer cancel (timers.set 으로 덮어쓰기)
  │
  ▼
setTimeout(debounceMs)
  │
  ▼
performPut(key, body)
  │
  ├─ syncFailureTracker.paused → 차단 + banner
  │
  ▼
새 AbortController 생성 + aborts.set(key, ac)
  │
  ▼
chain = chains.get(key) ?? Promise.resolve()
new = chain.then(() => fetch(url, { method: 'PUT', body, signal, credentials: 'include' }))
chains.set(key, new)   (FIFO chain — 다음 PUT 는 이 promise 가 settle 한 뒤)
  │
  ▼
fetch 응답
  ├─ 2xx: failure tracker recover (recentFailures purge) + chain entry drop
  ├─ 4xx: warn 로그 + chain drop, banner 안 띄움 (요청 자체 invalid)
  ├─ 5xx: failure tracker push(now), 3/5min 초과 → paused=true + banner
  └─ aborted: chain entry drop, 다음 transition 의 일부
```

## GET (hydrate) flow

```
view 진입 (renderApp) — material/subject 확인
  │
  ▼
fetchUserNoteIfMissing(key) / fetchAnnotationIfMissing(key)
  │
  ├─ fetchedKeys.has(key) → return
  │  (material 재방문은 lastHydratedAnnotationByMaterial 비교로 force refetch)
  │
  ▼
GET /api/v1/notes/subject/<subjectId>/week/<weekId>
  또는 GET /api/v1/pdf-annotations/<materialId>
  │
  ▼
응답 처리
  ├─ 200 → notebook/pdfWorkspaceStore 에 merge
  │       updatePdfWorkspaceStoreFromServer 가 mergeUpdatedAt 비교 (서버 newer 면 적용)
  │       savePdfWorkspaceStore 직접 호출 (PUT 발사 X — 루프 방지)
  ├─ 404 → 신규 (server 에 없음) — local state 유지
  ├─ 4xx → warn
  └─ 5xx → failure tracker 등록 (PUT 과 동일 정책)
  │
  ▼
fetchedKeys.add(key)
lastHydratedAnnotationByMaterial.set(`${userId}:${subjectId}`, materialId)
```

## Session transition 시 sync state

A→B 전환 (`applySessionTransitionForUser`):

```
for ac in userNotesPutAborts.values(): ac.abort()
for ac in annotationPutAborts.values(): ac.abort()
userNotesPutAborts.clear(); annotationPutAborts.clear()
userNotesPutTimers.values() 각각 clearTimeout; userNotesPutTimers.clear()
annotationPutTimers 동일
userNotesPutChains.clear(); annotationPutChains.clear()
userNotesFetchedKeys.clear(); annotationFetchedKeys.clear()
lastHydratedAnnotationByMaterial.clear()
syncFailureTracker.paused = false; recentFailures = []
```

같은 user 재attach 면 위 reset 없음 (lastSessionUserId === newUserId).

## clearAuthSession 시 sync state

logout / transient /v1/auth/me 실패:

```
authBootRequestId++
clearAuthBootTimers()
revokeAllPdfObjectUrls()
hotkeyHelpModalOpen = false
(위 transition 과 동일한 sync state reset)
```

→ destructive data wipe X. notebook / pdfWorkspaceStore in-memory 는 그대로 두고, 다음 attach 의 namespaced load 가 결정.

## 관련 invariant

- [I2 — AbortController on session transition](../ddd/invariants.md#i2-abortcontroller-on-session-transition)
- [I3 — PUT ordering per key](../ddd/invariants.md#i3-put-ordering-per-key)
- [I4 — Hot path GET dedup](../ddd/invariants.md#i4-hot-path-get-dedup)
- [I5 — Backoff pause + banner](../ddd/invariants.md#i5-backoff-pause--banner)
- [I6 — Server autosave = SoT, localStorage = cache](../ddd/invariants.md#i6-server-autosave--sot-localstorage--cache)

## 변경 이력

- sprint-2/S2 — autosave debounce + abort + chain + failure tracker 도입.
- sprint-2/S3 — chain map (#NEW-22, codex P1) 도입, transition 시 chain clear.
- sprint-3/S1+S2+S3 — sync state reset 은 유지, data wipe 제거 (namespacing 으로 대체).

## Open / TODO

- revision check (server-side updatedAt 비교) = sprint-3 backlog.
- batch GET (`fetchAllAnnotationsForSubject`) 도입 검토 — material list 진입 시 N+1.
- Datadog metric 연동 — sync.put.success / failure, sync.paused.
