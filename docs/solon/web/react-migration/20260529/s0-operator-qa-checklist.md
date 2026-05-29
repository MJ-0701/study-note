# S0 Operator Manual QA 체크리스트 (React shell foundation)

> 대상 = branch `feature/react-migration-s0` (commit 051b604, **미머지**). S0 의
> acceptance = **동작/시각 무변경**. 따라서 모든 PASS 기준 = "**S0 전(현 prod
> fe-v0.1.65)과 동일**". 자동검증(tsc/build/node:test/headless smoke)은 통과 —
> 본 문서는 자동화로 못 잡는 **런타임 회귀**(store 이전 누락 / canvas mount /
> 레이아웃 / 인증 흐름 / iPad / cross-device)만 사람이 확인.
>
> ⚠ 새 기능 0. 새 화면 0. 보이는 게 조금이라도 달라지면 = **회귀 의심**.

---

## 0. Setup (로컬, backend 필요)

```bash
git checkout feature/react-migration-s0
pnpm install                       # zustand 설치 반영
# backend (별 터미널) — prisma seed 된 dev 계정 필요
pnpm run prisma:generate && pnpm run prisma:migrate:deploy && pnpm run prisma:seed
pnpm run dev:backend               # NestJS :3010
# frontend (별 터미널)
pnpm run dev                       # vite :5173  (VITE_API_BASE_URL=http://127.0.0.1:3010/api)
```

- 브라우저 = `http://127.0.0.1:5173`.
- 로그인 = **이름 + 학번** (값 = `.env` 의 seed dev 계정, git 비노출).
- PDF 업로드 검증하려면 S3(localstack `:4566`) 도 떠 있어야 함. 없으면 업로드
  케이스(C4)만 skip.
- **비교 기준 탭**: 다른 탭에서 prod(`https://...vercel.app` fe-v0.1.65) 열어두고
  각 단계 결과를 1:1 대조하면 회귀 판별이 쉽다.

---

## A. Boot / 인증 흐름 (store: authStore / 렌더 target / boot revalidate)

| # | 단계 | PASS 기준 | 회귀 신호(S0 원인) |
|---|---|---|---|
| A1 | 시크릿창 첫 진입 `/` | 로그인 페이지("PRIVATE STUDY WORKSPACE" + 이름/학번 폼) 정상 렌더. 네트워크 탭에 `/v1/auth/me` 요청 **없음**(익명=ACA 안 깨움) | 로그인 페이지 빈 화면 / `/auth/me` 호출됨 → boot revalidate gate(revalidateOnBoot) 회귀 |
| A2 | 로그인(이름/학번) → 제출 | 로그인 성공 → 홈(app-shell) 렌더. **본인 notebook/과목 트리** 표시 | 로그인 후 빈/샘플 데이터만 → `notebook` store 이전 누락(loadStoredNotebook→setNotebook) |
| A3 | 로그인된 상태 새로고침 | `/v1/auth/me` 호출(hint 있음) → 세션 복원 → 본인 데이터 유지 | "세션 확인 중" 무한 / 로그인으로 튕김 → authSession store 또는 TDZ 회귀 |
| A4 | 로그아웃 | 로그인 페이지 복귀, 사이드바/필기 캐시 정리 | 데이터 잔존 → clearAuthSession(setAuthSession(undefined)) 회귀 |
| A5 | 로그인 폼에서 잘못된 학번 제출 | 에러 배너(loginFeedback) 표시 | 배너 안 뜸 → loginFeedback store(authStore) 회귀 |
| A6 | 로그인↔회원가입 탭 토글 | 탭 전환 정상(authMode) | 토글 안 됨 → authMode store 회귀 |

---

## B. 라우팅 (React hash router → LegacyView, INV-5)

| # | 단계 | PASS 기준 | 회귀 신호 |
|---|---|---|---|
| B1 | 사이드바로 12 route 순회(홈/intake/pdf-workspaces/과목/수업/요약/요약상세/mcp/암기/과목intake/pdf-workspace/주차) | 각 화면이 S0 전과 동일 렌더. URL 해시 정확 | 특정 route 빈 화면/엉뚱한 화면 → parseRoute 매핑 또는 renderApp 회귀 |
| B2 | 브라우저 뒤로/앞으로 버튼 | 해시 변경 → 올바른 route 재렌더 | 화면 안 바뀜 → router hashchange 구독 회귀 |
| B3 | 주소창에 직접 해시 입력(`#/subjects/<id>/pdf-workspace`) | 해당 route 직접 진입 | 홈으로 fallback → parseRoute 회귀 |
| B4 | 빠르게 여러 route 연속 클릭 | 깜빡임/이중렌더 없이 마지막 route 안착 | 점멸/잔상 → LegacyView 재mount(키 불안정) 의심 |

---

## C. PDF workspace — **최고 위험** (렌더 target redirection + INV-2 canvas + INV-6 sink)

| # | 단계 | PASS 기준 | 회귀 신호(S0 원인) |
|---|---|---|---|
| C1 | 과목 → PDF workspace 진입, PDF 표시 | PDF 캔버스 정상 렌더. 레이아웃(사이드바+본문+인스펙터) S0 전과 동일 | 레이아웃 깨짐 → `display:contents` 컨테이너 회귀 / canvas 안 뜸 → applyPdfCanvasMounts(target=컨테이너) 회귀 |
| C2 | **페이지 넘김(다음/이전)** 반복 | canvas **깜빡임/재마운트 없이** 부드럽게 전환 (INV-2) | 페이지마다 흰 깜빡임/재로드 → 렌더 target getter 또는 morphdom canvas preserve 회귀 |
| C3 | 필기(펜) 1획 → **페이지 넘겼다 복귀** | 필기 보존 + 저장됨 | 필기 소실 → updatePdfWorkspace sink(pdfWorkspaceStore get/set) 회귀 |
| C4 | PDF 업로드(S3 필요) | 업로드 → 자료실 노출. 실패 시 retry CTA(pendingPdfRetry) | retry 버튼 안 뜸 → pendingPdfRetry store 회귀 |
| C5 | 위젯(표/차트/체크리스트/별표/스티키) 1개씩 추가 | 정상 생성/렌더 | 안 됨 → updatePdfWorkspace sink 회귀 |
| C6 | 인스펙터 토글 → **새로고침** | 토글 상태 localStorage 복원(inspectorOpen, uiStore) | 복원 안 됨 → uiStore boot init(setInspectorOpen(readInspectorOpen())) 회귀 |
| C7 | 전체화면 진입/종료 | 툴바 라벨 갱신 + PDF 위치 복귀 | 안 됨 → fullscreenchange→renderApp 회귀 |

---

## D. localStorage round-trip (store 직렬화 키/스키마 불변)

| # | 단계 | PASS 기준 | 회귀 신호 |
|---|---|---|---|
| D1 | 로그인 → 필기/위젯 추가 → **새로고침** | 데이터 그대로 복원 | 손실 → buildPdfWorkspaceKey/notebook 키 변경 의심(불변이어야 함) |
| D2 | DevTools → Application → localStorage 확인 | 키 = `study-note.notebook.v2:<userId>` / `study-note.pdfWorkspace...:<userId>` (S0 전과 동일) | 키 형식 변경 → store 이전 회귀 |
| D3 | 수업일 추가(잘못된 날짜) | 에러 배너(intakeFeedback) 표시 | 배너 안 뜸 → intakeFeedback store(notebookStore) 회귀 |
| D4 | 주차 페이지 quick-note 패널 | 정상 표시 | 안 뜸 → quickNote store 회귀 |

---

## E. iPad 실기기 (INV-1 polyfill — 자동검증 불가, **필수 1회**)

| # | 단계 | PASS 기준 | 회귀 신호 |
|---|---|---|---|
| E1 | iPad Safari 로 접속 → PDF workspace | **PDF canvas 정상 표시(빈 화면 아님)** | canvas blank → polyfills(`Map.prototype.getOrInsertComputed`) 1순위 평가 실패 = INV-1 회귀. Mac Safari 원격 인스펙트로 콘솔 TypeError 확인 ([[feedback-ipad-remote-inspect]]) |
| E2 | iPad 펜 필기 | 그려짐(연속-획 OS 한계는 별개 기지 이슈, S0 무관) | 전혀 안 그려짐 = 회귀 |

> ⚠ E1 = S0 머지 전 **반드시**. polyfill 누락은 prod iPad 전체 blank 재발(과거 #42~#46 saga).

---

## F. cross-device sync 회귀 1회 (INV-4 — 본격 검증은 S1c)

| # | 단계 | PASS 기준 |
|---|---|---|
| F1 | PC 에서 필기 저장 → iPad 에서 동일 자료 열기 | PC 필기가 iPad 에 반영 |
| F2 | PC 에서 필기 삭제 → iPad 새로고침 | 삭제 반영 |

> S0 는 sync 코드 미변경(pdfWorkspaceStore get/set 위임만) → 회귀 없어야 정상.

---

## 결과 기록

- 전 항목 PASS = S0 동작 무변경 입증 → Gate 6 cross(@codex, 5/31 복구 후) → merge.
- FAIL 발견 시: 항목 # + 증상 + (가능하면) DevTools 콘솔/네트워크 캡처 → 회귀
  신호 열의 "S0 원인"이 1차 수색 지점.
- iPad(E) + PDF(C2/C3) 가 최우선. 나머지는 sanity.
