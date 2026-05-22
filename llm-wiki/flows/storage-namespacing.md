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

→ 위 2개는 UI preference 라 cross-user 무해.

> **sprint-4/S1 변경**: 이전엔 `study-note.session.lastUserId` marker 가
> A→B detection + legacy migration owner gate 두 용도로 쓰였지만 marker 자체가
> 제거됐다. A→B detection 은 in-memory `lastSessionUserId` 만으로 충분 (page
> reload 시 pending PUT 도 사라지므로 marker 가 cross-page 보존할 필요 없음).
> legacy migration 도 helper 자체가 삭제됨.

## Legacy migration (sprint-4/S1 이전) — DEPRECATED

`migrateLegacyNotebookForUser` / `migrateLegacyPdfWorkspaceForUser` 는 sprint-4/S1
에서 함수 자체가 삭제됐다. 정책 변경 이유:

- marker (`study-note.session.lastUserId`) 가 제거되면서 owner gate 신호가
  사라짐.
- gate 없이 legacy 데이터를 자동으로 migrate 하면 shared browser scenario 에서
  user B 가 user A 의 pre-sprint-3 데이터를 자동 흡수.
- gate 없이 항상 drop 한다면 helper 가 사실상 cleanup 만 수행 — 그것조차도
  사용자가 "로컬 import 초기화" 버튼으로 명시 수행하면 충분.

→ 현재 정책: legacy unscoped key 가 어떤 브라우저에 잔존해도 절대 read 하지
않는다. 사용자가 명시적으로 reset 버튼을 누를 때만 removeItem 으로 정리.
server autosave 가 SoT 이므로 데이터 손실 X (GET hydrate 가 복원).

## Module-init / load 분기

```
module-init (boot, isBrowserRuntime = window 존재):
  notebook = sampleLectureNote
  pdfWorkspaceStore = { workspaces: {} }
  authSession = undefined
  lastSessionUserId = undefined        (sprint-4/S1: marker 제거, in-memory only)

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

- [I1 — User data isolation](../ddd/invariants.md#i1-user-data-isolation-cross-user-leak-금지)
- [I6 — Server autosave = SoT, localStorage = cache](../ddd/invariants.md#i6-server-autosave--sot-localstorage--cache)

## 검증

`apps/web/src/__tests__/storage-namespacing.spec.ts` — 13 case (sprint-4/S1
에서 owner gate × 8 case 제거):
- buildNotebookKey / buildPdfWorkspaceKey shape (4 + 5)
- 네임스페이스 격리 모양 (2 + 2)

## 변경 이력

- sprint-3/S1 — notebook namespacing + migration + owner gate
- sprint-3/S2 — pdfWorkspace namespacing + migration + owner gate (S1 패턴 미러)
- sprint-3/S3 — `applySessionTransitionForUser` 의 destructive wipe 제거 (namespacing 이 격리)
- sprint-4/S1 — marker (`study-note.session.lastUserId`) write 제거 + `migrateLegacy*ForUser` helper 2개 삭제 + owner gate spec 8 case 제거. `lastSessionUserId` = in-memory only.

## Open / TODO

- `lastSessionUserStorageKey` marker 완전 deprecation 시점.
- 추가 user-scoped storage (예: 사용자 settings) 도입 시 동일 패턴 follow.
- 운영 metric: migration 발생률 / failure rate.
