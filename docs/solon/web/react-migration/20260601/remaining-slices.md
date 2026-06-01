# React 마이그레이션 — 잔여 슬라이스 정리 (2026-06-01)

> S4b-2(subject-class) prod 배포 완료 시점 기준. 코드 실독으로 route 별 island
> 여부 전수 확인. roadmap(20260529) 슬라이스명과 실제 코드 대조 → 정합.

## 1. route 별 island 현황 (12 route 전수)

| route | renderer | 상태 | 슬라이스 |
|:--|:--|:--|:--|
| home | renderHome → slot | ✅ island | S3 |
| intake | renderIntakeGuide → slot | ✅ island | S3 |
| subject-intake | renderSubjectIntakeGuide → slot(IntakeView variant=subject) | ✅ island | S3 |
| sidebar(전 route) | SIDEBAR_PLACEHOLDER → slot | ✅ island | S3b |
| subject-summaries | renderSubjectSummariesSlot | ✅ island | S4a |
| subject-summary-detail | renderSubjectSummaryDetailSlot | ✅ island | S4a |
| subject-mcp | renderSubjectMcpSlot | ✅ island | S4a |
| subject-memorize | renderSubjectMemorizeSlot | ✅ island | S4a |
| subject / subject-class | renderSubjectClassSlot | ✅ island | S4b-2 |
| week | renderWeekSlot | ✅ island | S4b-1 |
| **pdf-workspaces** | **renderPdfWorkspaceIndex (string `<section>`)** | ❌ **string** | **미할당** |
| **pdf-workspace** | **renderPdfWorkspacePage (string)** | ❌ **string** | **S1** |

**= 10 island 완료 / 2 string 잔여.**

(추가: auth = AuthGate island(S2). pdf-toolbar = PdfToolbarPortal(S1a, pdf-workspace
내부 부분 island). admin/persona-turn/onboarding = 별도 vite entry React SPA, scope 밖.)

## 2. 잔여 슬라이스 (2 route + cleanup)

### 🟢 S4c — pdf-workspaces 자료실 인덱스 (신규, **자율 가능**)
- `renderPdfWorkspaceIndex`(pdf-library.ts:149) = presentational string. subject별
  PDF 목록 + 요약 metric. **PDF workspace 내부(pen/canvas) 아님 — 목록 화면.**
- S4a/S4b 패턴 그대로 적용 가능(pure-props island, neg-control loop-gate).
- 재사용: 카드 = renderPdfSubjectLibrarySection/renderPdfMaterialCard(이미 S4b-2
  에서 JSX화한 PdfMaterialCard leaf 와 동형 — 공유 추출 기회).
- **게이트 없음. 자율 진행 가능.**

### 🔴 S1 — pdf-workspace 작업공간 (게이트)
PDF 작업공간 = 가장 무거운 route. 3 sub-slice:
- **S1a(toolbar)** = ✅ 완료(PdfToolbarPortal, fe-v0.1.73).
- **S1b(widgets)** = ❌ 게이트. main.ts 공유 pointer dispatcher + **pen-second-stroke
  버그(REOPENED, project_ipad_pen_second_stroke.md)** 얽힘 → 회귀 구분 불가. native-
  pointer 직결 재작업 + pen-fix 묶음 필요.
- **S1c(annotation sync, INV-4)** = ❌ 게이트. acceptance = iPad↔PC **물리 cross-
  device sync** 검증. 자동화 불가, 사용자 기기 필요.

### 🔴 S5 — cleanup (S1 후행)
- old string renderer 통합/제거(subject-class.ts/pdf-library.ts/home-intake.ts 의
  parity oracle, renderPdfWorkspaceIndex/Page 등). S1 전체 완료가 선행 조건.
- string renderer 제거 = pdf-workspace 마이그레이션 후에만 안전.

## 3. 자율 도달 한계

- **자율 가능**: S4c(pdf-workspaces) = presentational island, 게이트 없음.
- **게이트(사용자/물리/pen)**: S1b(pen-fix) · S1c(물리기기) · S5(S1 선행).
- ⚠️ 조용히 reorder 금지. S5 는 S1 후, S1b 는 pen-fix 후.

## 4. 권장 다음 순서

1. **S4c (pdf-workspaces)** — 자율, presentational island 마지막 깨끗한 슬라이스.
   완료 시 island 화 = 11/12 route(pdf-workspace=S1 만 남음).
2. **S1b/S1c** — 사용자 게이트 해제(pen-fix 결정 + iPad 기기) 후.
3. **S5** — S1 전체 후 string renderer 제거.

## 5. follow-up backlog (별개)
- codex #4(FullscreenButton pure-props, pre-existing prod impurity) = 별도 fix-forward.
- operator 시각 QA(subject-class/week 렌더, auth-gated) = user 후속.
