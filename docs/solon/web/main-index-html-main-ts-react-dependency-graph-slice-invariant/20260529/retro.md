---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-2"
workspace: "main-index-html-main-ts-react-dependency-graph-slice-invariant"
handoff_dir: "docs/solon/main-index-html-main-ts-react-dependency-graph-slice-invariant/20260529"
goal: "main 앱(index.html/main.ts) React 점진 마이그레이션 전략 설계 — dependency graph + slice + 회귀 invariant 문서화"
created_at: "2026-05-29T13:35:44+09:00"
last_touched_at: "2026-05-29T13:36:25+09:00"
closed_at: ""
---

# 회고

## 1. 계속할 것

- dependency graph 를 cavecrew-investigator 로 먼저 매핑한 뒤 전략을 짠 것 — 옛 메모리의 "strangler 불가" 전제가 틀렸음(별도 entry React 공존 실증)을 사실로 검증하고 폐기할 수 있었다.
- 막는 질문(접근 A/B/C, PDF 우선순위)만 사용자에게 남기고 설계 디테일(상태관리/이벤트 경계)은 AI 가 제안한 분업 — Gate 결정이 빨랐다.
- zero-code 문서 sprint 를 코드 변경 0(apps/src=0) 으로 명확히 분리한 것.

## 2. 문제

- Codex usage-limit(2026-05-31 06:13 까지) + claude nested-spawn 실패로 Gate 3/6 의 자동 review 러너(executor bridge)가 둘 다 불가. Claude main 수동 self-review + waiver(--allow-unreviewed-plan)로 진행. cross-review(@codex)는 미실행 → Gate 6 보강 이월.
- 작업 디렉토리가 apps/web 로 남아 `sfs start` 가 한 번 실패(repo root 에서 재실행).

## 3. 시도할 것

- review bridge 불가 시 Claude main 수동 self-review 를 표준 fallback 으로(이번에 정착). codex 복구 후 cross 보강.
- S0 구현은 인프라 pivot(최고 위험)이라 INV characterization test(마이그레이션 전 현 동작 캡처)를 first failing evidence 로 선행.

## 4. 이어갈 것

- **cross-review(@codex) 이월**: roadmap 문서 일관성/누락을 codex 복구(5/31) 후 검증.
- **S0 plan sprint 즉시 착수**(사용자 승인): React shell foundation = createRoot(#app) + hash router + LegacyView + Zustand store 4종 + 위임 범위축소. 전 route LegacyView 로 동작 무변경.
- S1(pdf-workspace, PDF-first) 은 S0 직후. INV-2/3/4 가 집중되는 최고 위험 slice.

## 5. 종료 체크

- [x] report 가 최신이다 (roadmap = 산출물, log.md evidence 기록)
- [x] review 조치가 완료 또는 이월됐다 (self PASS 완료, cross @codex 이월)
- [x] workbench 가 접혔다 (.sfs-local step docs 정리, 코드 변경 0)
