---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
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

# 회고

## 1. 계속할 것

- 사용자의 “화면 뎁스” 지적을 route/sidebar contract로 먼저 고정한 뒤 구현한 방식은 효과적이었다.
- visible UI 변경에는 source test + build + Playwright desktop/mobile smoke를 같이 묶는다.
- PDF metadata처럼 운영 persistence가 필요한 값은 frontend-only 상태로 두지 않고 backend API까지 붙인다.

## 2. 문제

- 이전 sprint report/retro body가 같은 handoff path에 남아 있어 `sfs retro` 후에도 본문이 sprint 4 내용이었다.
- `classDate` parser는 문자열 외 값도 `String()`으로 바꿀 수 있다. 기존 parser 패턴과 맞췄지만 새 endpoint hardening 후보가 생겼다.
- Playwright가 현재 repo에 없어서 다른 workspace의 Playwright dependency를 `NODE_PATH`로 참조했다.

## 3. 시도할 것

- 같은 날짜/feature handoff path를 재사용할 때 report body가 현재 sprint인지 확인하는 checklist를 둔다.
- API metadata parser는 다음 hardening에서 strict string validation으로 조인다.
- UI smoke가 반복된다면 repo devDependency에 Playwright를 명시하거나 프로젝트 smoke script로 편입한다.

## 4. 이어갈 것

- 수업일/요약본 서버 persistence 설계.
- PDF annotation 저장 경계를 `subjectId`에서 `materialId` 중심으로 분리할지 결정.
- `ownerId`/`uploaderId`/annotation owner 용어를 PDF domain glossary에 정리.

## 5. 종료 체크

- [x] report 가 sprint 8 내용으로 최신이다.
- [x] Gate 6 (Review) PASS evidence가 있다.
- [x] workbench 가 접혔다.
