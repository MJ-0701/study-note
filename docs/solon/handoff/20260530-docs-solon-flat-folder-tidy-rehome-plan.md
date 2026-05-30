---
phase: handoff
status: draft
created_at: "2026-05-30"
goal: "docs/solon legacy flat workspace folder 26개 진단 + domain-first rehome 계획 + 제품 정책 집행 gap 분석"
related: ["templates/.sfs-local-template/context/commands/tidy.md", "sfs.md rule 13"]
---

# docs/solon flat folder tidy — 진단 / rehome 계획 / 제품 gap

> 본 문서는 Cowork 세션(렉 걸린 "Solon document status review" 세션 이어받음)에서
> docs/solon 실측 후 작성. 실제 mv / git commit 은 미적용(draft). 사용자 승인 후 집행.

## 1. 진단 (실측, 2026-05-30)

docs/solon top-level 42개 = `.md` 3개 + 디렉터리 39개.
디렉터리 39개 중 **26개가 legacy flat workspace 덤프** (`<workspace-slug>/<yyyyMMdd>/report.md (+retro.md)`).
나머지 13개는 정상 domain-first 도메인(account, admin, design, document, handoff,
identity, lecture-note, persona, platform, user, web, decisions + pdf-fullscreen-hotkeys).

> 멈춘 세션의 잠정값 "25개"는 실측 결과 **26개**로 정정.

flat 26개는 전부 report.md frontmatter 에 `domain:` 필드가 없고 `workspace:` slug 만 있다.
→ 생성 시 domain-first 라우팅이 적용되지 않은 것이 근본 원인(§3).

## 2. Rehome 계획

tidy.md 규칙: "high-confidence flat legacy folder 는 domain-first 로 rehome,
ambiguous/conflicting 은 review 위해 visible 유지." 삭제(prune) 대상 없음 —
26개 모두 report/retro evidence 라 durable record 로 rehome 만 한다.

### 2A. HIGH confidence — 즉시 rehome 가능 (9개)

기존 domain-first 트리에 **같은 naming family sibling 이 이미 존재**하므로 confident.

| flat folder | → 목표 domain-first | 근거 sibling |
|---|---|---|
| main-ts-layer-b-slice-2b-classdate-touch-swipe-nav-fullscreen | document/pdf/ | document/pdf/main-ts-layer-b-slice-2a, -2c, -2f-iv |
| main-ts-layer-b-slice-2d-drill-highlight | document/pdf/ | 〃 |
| main-ts-layer-b-slice-2e-star-mark | document/pdf/ | 〃 |
| main-ts-layer-b-slice-2f-i-chart-widget | document/pdf/ | 〃 |
| main-ts-layer-b-slice-2f-ii-table-widget | document/pdf/ | 〃 |
| main-ts-layer-b-slice-2f-iii-simple-widget-cleanup-... | document/pdf/ | 〃 |
| main-ts-layer-b-slice-2g-chart-render-widget | document/pdf/ | 〃 |
| main-ts-layer-b-slice-2g-table-table-render-widget | document/pdf/ | 〃 |
| layer-d-slice-1-notebook-storage-module-... | user/accounts/ | user/accounts/layer-d-slice-4-user-notes-sync |

mv 후 결과 경로 예: `docs/solon/document/pdf/main-ts-layer-b-slice-2b-.../20260525/report.md`.

### 2B. AMBIGUOUS — 사용자 판단 필요 (17개)

domain 후보가 둘 이상이라 자동 rehome 보류. 각 행 "lean" 은 권장안.

| flat folder | 후보 domain | lean | 메모 |
|---|---|---|---|
| layer-c-slice-3-home-intake-... | user/accounts vs lecture-note | lecture-note | 과목 진입/intake 화면 |
| layer-c-slice-4-subject-class-... | user/accounts vs lecture-note | lecture-note | 과목 수업 페이지 |
| layer-c-slice-5-summaries-... | user/accounts vs lecture-note | lecture-note | 요약본 페이지 |
| layer-c-slice-6-subject-memorize-... | user/accounts vs lecture-note | lecture-note | 암기노트 |
| layer-c-slice-7-subject-mcp-...persona-by-subject | persona vs user/accounts | persona | PERSONA_BY_SUBJECT |
| layer-c-slice-10-quick-note-builders-... | user/accounts vs lecture-note | user/accounts | quick note |
| layer-d-slice-3-sidebar-cache-ui-ephemeral-... | web/react-migration vs user/accounts | web | sidebar UI 캐시 |
| main-ts-routing-shell-layer-ddd-app-routes-ts-app-appshell-ts | platform/architecture vs web | platform | app shell/routing |
| main-index-html-main-ts-react-dependency-graph-slice-invariant | web/react-migration vs platform | web | react dep graph (1 file) |
| layer-c-entry-subject-view-hierarchy-decision-first-slice-scope | decisions vs user/accounts | decisions | "decision-first" 결정 문서 성격 |
| 3-ia-ux | lecture-note vs design | lecture-note | 과목학습 3뎁스 IA + 자료실 업로드 |
| cold-start-ux | identity/auth vs document/pdf | identity | 세션 cold start + PDF 업로드 500 (혼합) |
| ui-ux | design/system vs web | design | 반응형 홈 UX |
| mcp-3-ia | lecture-note vs persona | lecture-note | 과목 사이드바 3뎁스 IA |
| be-persistence-ia | user/accounts vs platform | user/accounts | 메모/필기 BE persistence |
| tan-inspector-counts-drill-down | document/pdf vs lecture-note/annotation | lecture-note/annotation | 그래프 tan + inspector drill-down |
| work-slice | (report.md 없음) | review | 내용 확인 후 결정 또는 prune 후보 |

## 3. 제품 정책 집행 gap (solon-product)

### 증상
정책은 존재하는데(`tidy.md` retention + domain-first 라우팅, `sfs.md` rule 13)
이 docset 에는 한 번도 집행되지 않아 flat 26개가 누적됐다.

### 근본 원인
1. **`sfs tidy` 는 자동 파일 이동기가 아니다.** `bin/sfs` → `sfs-dispatch.sh` 가
   routed context `commands/tidy.md` 를 띄우고, **rehome/prune 은 agent 가 직접 수행**하는
   guidance 모델이다. 즉 집행 주체가 "agent 가 tidy 를 실제로 돌리고 domain-first
   workspace 를 선택한다"에 의존한다.
2. **생성 시점 라우팅 미적용.** flat 26개의 report frontmatter 에 `domain:` 필드가
   없다. workspace slug 만으로 폴더가 만들어져, domain-first 경로 결정이 생략됐다.
3. **opt-in 정리.** `tidy --all --apply` 는 사람이 명시적으로 돌려야 rehome 되는데,
   이 repo 에선 실행된 적이 없거나, 긴 slug 가 low-confidence 로 ambiguous 처리돼
   visible 로 남았다.

### 개선 방향 (제품측, 구현은 D-Code 인계 권장)
- **생성 시 domain 강제**: brainstorm/plan 단계에서 `--workspace` 와 별개로
  `domain/subdomain/feature` 를 필수 입력 또는 추론하게 해서 report frontmatter 에
  `domain:` 을 기록. domain 없으면 close(retro) 차단 또는 warn.
- **drift 탐지**: flowcheck/retro 에 "flat fallback 경로에 생성됨" 경고 추가
  (Part E 자기점검과 연결, [[solon_bug_report_and_fcp]]).
- **tidy rehome 자동화 후보**: high-confidence rehome(2A 같은 sibling-match)은
  스크립트화 가능. ambiguous 만 사람에게.

## 4. 집행 메모 (Cowork 제약)
- mv 는 sandbox 에서 가능(파일 이동, git 명령 아님). **git add/commit 은 호스트에서** ([[sandbox_no_git]]).
- 삭제 없음 → allow_cowork_file_delete 불필요.
- 2B ambiguous 및 제품측 구현은 사용자 결정/Code 인계 대상.
