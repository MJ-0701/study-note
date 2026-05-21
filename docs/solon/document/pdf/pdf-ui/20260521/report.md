---
phase: report
status: final
sprint_id: "2026-W21-sprint-8"
workspace: "pdf-ui"
handoff_dir: "docs/solon/document/pdf/pdf-ui/20260521"
goal: "과목 수업일 기반 PDF 매핑 요약본 필수 암기노트 UI 리팩토링"
created_at: "2026-05-21T16:41:47+09:00"
last_touched_at: "2026-05-21T16:45:00+09:00"
closed_at: "2026-05-21T16:41:47+09:00"
domain: "document"
subdomain: "pdf"
feature: "pdf-ui"
---

# 보고서

## 1. 결과

- 목표: 과목 화면을 처음부터 상세 나열하지 않고, 수업일 중심의 카드/list overview와 상세 화면 구조로 재정렬한다.
- 상태: done
- 판정: Gate 3 (Plan) Claude PASS, Gate 6 (Review) Claude PASS.
- 한 줄 결과: `컴퓨터개론` 같은 과목 row 아래에 `수업 / 요약본 / MCP 호출 / 필수 암기노트` hierarchy를 붙이고, 수업일 추가와 PDF 수업일 매핑을 실제 backend metadata update까지 연결했다.

## 2. 완료한 것

- `#/subjects/:subjectId/class`는 수업일 카드/list overview, 수업일 추가 form, PDF 수업일 매핑 UI를 보여준다.
- `#/subjects/:subjectId/summaries`는 날짜별 요약 목록이고, `#/subjects/:subjectId/summaries/:weekId`는 해당 날짜 요약 상세다.
- `#/subjects/:subjectId/memorize`는 시험 직전 필수 암기노트 page다.
- subject sidebar는 현재 과목 parent 아래에 하위 메뉴를 들여쓰기 구조로 표시한다.
- PDF material card에서 수업일 select를 바꾸면 `PATCH /api/materials/:materialId` body `{ classDate }`로 저장한다.
- backend는 master/admin만 material metadata를 수정할 수 있고, uploader-owned material만 업데이트한다.

## 3. 변경 파일

- `apps/web/src/main.ts`
- `apps/web/src/styles.css`
- `apps/web/src/api/materials.ts`
- `apps/web/src/__tests__/pdf-material-library.spec.ts`
- `apps/api/src/materials/materials.controller.ts`
- `apps/api/src/materials/materials.service.ts`
- `apps/api/src/materials/__tests__/shared-materials.spec.ts`

## 4. 검증

- `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-material-library.spec.ts` → 11 tests PASS.
- `pnpm test:backend` → API build + 31 backend tests PASS.
- `pnpm --filter @study-note/web build` → PASS.
- `pnpm build` → web + API build PASS.
- `NODE_PATH=/Users/mj/IdeaProjects/product-image-studio/node_modules node /private/tmp/study-note-sfs8-smoke.cjs` → PASS.
- Playwright evidence: desktop/mobile overflow false, console errors empty, `patchCalls=[{ "classDate": "5월 14일(목)" }]`.
- Screenshots: `/private/tmp/study-note-sfs8-desktop.png`, `/private/tmp/study-note-sfs8-mobile.png`.

## 5. 위험 / 후속

- 수업일 추가는 현재 localStorage scope다. 수업일/요약본 서버 persistence는 후속 WU다.
- PDF 매핑은 기존 `PdfMaterial.classDate` 단일 필드를 사용한다. 다대다 수업일 매핑은 후속 WU다.
- Gate 6 권고: `parseMaterialMetadataBody`의 non-string coercion은 다음 hardening에서 strict string validation으로 조이는 것이 좋다.

## 6. 남긴 것 / 접은 것

- 남김: `.sfs-local/sprints/2026-W21-sprint-8/`에 brainstorm/plan/implement/review/log 기록.
- 접음: sprint closed by `sfs retro`.

## 7. 다음

- 변경분을 커밋하고 frontend/backend 배포를 진행한다.
- 다음 SFS 후보: 수업일/요약본 서버 persistence 또는 PDF annotation을 `materialId` 기준으로 분리 저장.
