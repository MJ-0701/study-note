---
id: study-note-flow-storage-namespacing
title: localStorage userId Namespacing
language: ko
load_when:
  - localStorage
  - namespacing
  - migration
  - owner gate
  - sprint-3
  - cross-user leak
summary: sprint-3 의 localStorage `{base}:{userId}` namespacing 정책. notebook + pdfWorkspace + marker semantics.
---

# localStorage userId Namespacing

원문: sprint-3/S1 ([PR #30](https://github.com/MJ-0701/study-note/pull/30)), sprint-3/S2+S3 ([PR #31](https://github.com/MJ-0701/study-note/pull/31)).

## 정책 요약

- **user-scoped key**: `{base}:{userId}` 형태로 분리.
- **non-user-scoped key**: 전역 유지 (UI preference 등).
- **legacy unscoped key**: 1회 owner-gated migration 후 drop.
- **failure policy**: localStorage 손실 허용 — server autosave 가 SoT.

## Key map

### User-scoped (namespaced)

| base | scoped 형태 | aggregate |
|---|---|---|
| `study-note.notebook.v2` | `study-note.notebook.v2:<userId>` | Notebook |
| `study-note.pdf-workspaces.v1` | `study-note.pdf-workspaces.v1:<userId>` | PdfWorkspace |

### Global (전역 유지)

| key | 의미 |
|---|---|
| `studyNote.pdfWorkspace.inspectorDrill` | inspector drill UI state |
| `studyNote.pdfWorkspace.inspectorOpen` | inspector 펼침/접힘 |
| `study-note.session.lastUserId` | A→B detection + migration owner gate |

→ 위 3개는 UI preference / session marker 라 cross-user 무해.

## Migration 알고리즘

`migrateLegacyNotebookForUser(userId)` / `migrateLegacyPdfWorkspaceForUser(userId)`:

```
1. localStorage[<base>] 읽기 (legacy)
   - 없으면 return undefined (migration 불필요)

2. localStorage[<lastSessionUserStorageKey>] 읽기 (owner marker)
   - marker 부재 OR marker ≠ userId
     → legacy drop (removeItem)
     → return undefined
   - marker === userId → 진행

3. legacy 페이로드 JSON parse + shape 검증
   - invalid → legacy drop, return undefined
   - valid → 진행

4. 2-phase write
   a. localStorage[<scopedKey>] = legacy 페이로드 (setItem)
      - 실패 (quota / private mode):
          - legacy 그대로 남김 (다음 load 재시도)
          - return parsed (in-memory copy, current session 보존)
   b. setItem 성공 시 localStorage.removeItem(legacy)
      - removeItem 실패: silent (scoped 이미 적힘 → idempotent)
      - return parsed
```

→ 2-phase 의 의미: setItem 실패가 데이터 손실로 이어지지 않게.

## Owner gate 의 이유

shared browser 시나리오:

```
이전 버전 (sprint-2 이전): user A 가 localStorage 에 unscoped notebook 적음
upgrade 후: user B 가 같은 브라우저에서 처음 로그인
  if no owner gate: B 의 첫 load 가 A 의 notebook 을 B 의 namespace 로 migrate
                    → B 가 A 의 데이터 보임 + 자기 BE 에 A 의 body PUT
  with owner gate: marker = "user-a", B = "user-b" → 불일치
                    legacy drop, B 는 빈 namespace 에서 시작
                    A 의 데이터는 영구 손실 (의도된 trade-off — A 가 다른
                    브라우저에서 재로그인하면 BE GET hydrate 로 복원)
```

## Module-init / load 분기

```
module-init (boot, isBrowserRuntime = window 존재):
  notebook = sampleLectureNote
  pdfWorkspaceStore = { workspaces: {} }
  authSession = undefined
  lastSessionUserId = localStorage[lastSessionUserStorageKey] ?? undefined

  (sprint-3 이전엔 module-init 에서 localStorage read 했지만, userId 없이는
  scoped key 선택 불가. boot 는 fixture/empty 로 시작 + session attach 시 load.)
```

## save 분기

```
saveNotebook(notebook, userId = authSession?.user.id):
  if !userId: return  (session 부재 = save noop)
  localStorage[buildNotebookKey(userId)] = JSON.stringify(notebook)
  실패 시 banner 1회

savePdfWorkspaceStore(userId = authSession?.user.id):
  if !userId: return
  localStorage[buildPdfWorkspaceKey(userId)] = JSON.stringify(pdfWorkspaceStore)
  실패 시 silent (서버 autosave 가 SoT)
```

## "로컬 import 초기화" 버튼 동작

```
remove buildNotebookKey(userId)     (현재 user 의 scoped key)
remove buildPdfWorkspaceKey(userId)
remove notebookStorageKey           (legacy)
remove pdfWorkspaceStorageKey       (legacy)
notebook = sampleLectureNote
pdfWorkspaceStore = { workspaces: {} }
```

## 관련 invariant

- [I1 — User data isolation](../domain/invariants.md#i1-user-data-isolation-cross-user-leak-금지)
- [I6 — Server autosave = SoT, localStorage = cache](../domain/invariants.md#i6-server-autosave--sot-localstorage--cache)

## 검증

`apps/web/src/__tests__/storage-namespacing.spec.ts` — 21 case:
- buildNotebookKey / buildPdfWorkspaceKey shape (4 + 5)
- 마이그레이션 후 store 모양 (2 + 2)
- 오너 게이트 (4 + 4)

## 변경 이력

- sprint-3/S1 — notebook namespacing + migration + owner gate
- sprint-3/S2 — pdfWorkspace namespacing + migration + owner gate (S1 패턴 미러)
- sprint-3/S3 — `applySessionTransitionForUser` 의 destructive wipe 제거 (namespacing 이 격리)

## Open / TODO

- `lastSessionUserStorageKey` marker 완전 deprecation 시점.
- 추가 user-scoped storage (예: 사용자 settings) 도입 시 동일 패턴 follow.
- 운영 metric: migration 발생률 / failure rate.
