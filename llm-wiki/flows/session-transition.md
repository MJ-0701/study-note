---
id: study-note-flow-session-transition
title: Session Transition Flow
language: ko
load_when:
  - session transition
  - applySessionTransitionForUser
  - clearAuthSession
  - 로그인 흐름
  - 로그아웃 흐름
  - cold start
summary: boot → revalidate → sign-in/out → transition → clear 의 단계와 각 단계에서 무엇이 reset 되는지.
---

# Session Transition Flow

원문: `apps/web/src/main.ts` (`attemptSessionRevalidation`, `applySessionTransitionForUser`, `clearAuthSession`) + `apps/api/src/auth/`.

## 상태 분류

| 시점 | authSession | notebook | pdfWorkspaceStore | sync state |
|---|---|---|---|---|
| Boot (window load) | undefined | sampleLectureNote | `{ workspaces: {} }` | empty |
| revalidate in-flight | undefined | sampleLectureNote | `{ workspaces: {} }` | empty |
| revalidate success (same user) | { user } | namespaced load | namespaced load | empty (transition 첫 호출) |
| revalidate success (different user) | { user } | namespaced load | namespaced load | reset |
| revalidate fail (4xx) | undefined | sampleLectureNote | `{ workspaces: {} }` | empty |
| revalidate fail (5xx/timeout, retry exhausted) | undefined | 직전 값 유지 (보존) | 직전 값 유지 | reset (clearAuthSession 안에서) |
| sign-in success | { user } | namespaced load | namespaced load | reset (다른 user) 또는 same-user noop |
| sign-out | undefined | 직전 값 유지 | 직전 값 유지 | reset |

## Boot 시퀀스

```
1. module-init
   notebook = sampleLectureNote
   pdfWorkspaceStore = { workspaces: {} }
   authSession = undefined
   lastSessionUserId = localStorage[lastSessionUserStorageKey]

2. window load
   attemptSessionRevalidation()
     - timeout 45s, retry 3회
     - "깨우는 중" banner 2.5s 후 표시

3-a. revalidate 성공
   authSession = response
   applySessionTransitionForUser(userId)

3-b. revalidate 4xx (unauthorized)
   sign-in UI 노출

3-c. revalidate 5xx 또는 timeout (모든 retry 실패)
   clearAuthSession()
   사용자가 새로고침/재시도 가능
```

## applySessionTransitionForUser 분기

```
applySessionTransitionForUser(newUserId):
  notebook = loadStoredNotebook(newUserId)
  pdfWorkspaceStore = loadPdfWorkspaceStore(newUserId)

  if lastSessionUserId === newUserId:
    return                                 # 같은 user 재attach → 끝

  if lastSessionUserId === undefined:
    lastSessionUserId = newUserId
    localStorage[lastSessionUserStorageKey] = newUserId
    return                                 # 첫 attach → marker 기록만

  # 다른 user 로 전환 (마커 존재 + 일치 X)
  # 동기화 cache 와 in-flight PUT 만 reset.
  # (sprint-3/S3 이후 notebook/pdfWorkspaceStore wipe 는 제거)
  abort all userNotes/annotation PUT
  clear all timers / chains / fetched keys / hydrated marker
  syncFailureTracker reset
  lastSessionUserId = newUserId
  localStorage[lastSessionUserStorageKey] = newUserId
```

## clearAuthSession 분기

```
clearAuthSession():
  authBootRequestId += 1
  authSession = undefined
  clearAuthBootTimers()
  revokeAllPdfObjectUrls()
  hotkeyHelpModalOpen = false

  # sync state reset (transition 의 다른 user 분기와 동일)
  abort all PUT, clear timers/chains/fetched keys/hydrated marker
  syncFailureTracker reset

  # 데이터 destructive reset X
  # notebook / pdfWorkspaceStore 메모리 state 유지
  # localStorage namespaced key 도 유지
```

## A→B 시나리오 (같은 브라우저 다른 user)

```
초기: user A 로그인 + 메모/필기 + annotation
  localStorage:
    study-note.notebook.v2:user-a = { ... A 의 데이터 ... }
    study-note.pdf-workspaces.v1:user-a = { ... }
    study-note.session.lastUserId = "user-a"

A 로그아웃
  authSession = undefined
  notebook = (메모리 A 의 상태 유지)
  pdfWorkspaceStore = (유지)
  localStorage = 유지

B 로그인
  POST /v1/auth/sign-in → success
  applySessionTransitionForUser("user-b"):
    notebook = loadStoredNotebook("user-b") → 빈 namespace → sampleLectureNote (or B 의 이전 데이터)
    pdfWorkspaceStore = loadPdfWorkspaceStore("user-b") → 빈 namespace → { workspaces: {} }
    lastSessionUserId = "user-a", newUserId = "user-b" → 다른 user 분기
    sync state reset (A 의 in-flight PUT abort 보장)
    lastSessionUserId = "user-b"
    localStorage[lastSessionUserStorageKey] = "user-b"

  결과: B 가 A 의 데이터 볼 수 X.
        localStorage 의 A 의 namespaced key 는 그대로 (A 가 재로그인 시 복원).
```

## Cold start 보호

- `/v1/auth/me` 첫 호출 = ACA scale-to-zero 깨우기. ~30s 가능.
- AUTH_SESSION_REQUEST_TIMEOUT_MS = 45s 로 여유.
- 사용자에게 "서버 깨우는 중" banner = AUTH_SESSION_WAKE_NOTICE_DELAY_MS = 2.5s 후 표시.
- 모든 retry 실패 시에만 clearAuthSession + sign-in UI.

## 관련 invariant

- [I1 — User data isolation](../ddd/invariants.md#i1-user-data-isolation-cross-user-leak-금지)
- [I2 — AbortController on session transition](../ddd/invariants.md#i2-abortcontroller-on-session-transition)
- AuthSession aggregate 의 A2~A5 ([ddd/aggregates/auth-session](../ddd/aggregates/auth-session.md))

## 변경 이력

- sprint-2/S3 — wipe-on-transition (codex P1) + `lastSessionUserStorageKey` marker 도입
- sprint-3/S1 — notebook namespacing + module-init notebook empty
- sprint-3/S2 — pdfWorkspace namespacing + module-init empty
- sprint-3/S3 — destructive wipe 제거, namespacing 이 격리 책임

## Open / TODO

- marker 의 deprecation 시점 (legacy 키가 운영상 사라진 뒤).
- sign-in 시점 vs revalidate 시점의 transition 차이 (동일 routine 호출 — 추가 분기 필요할 가능성).
