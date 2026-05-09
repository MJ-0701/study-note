---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W19-sprint-5"
workspace: "2026-W19-sprint-5"
handoff_dir: "docs/2026-W19-sprint-5/20260509"
goal: ""
created_at: ""
last_touched_at: "2026-05-09T12:58:13+09:00"
closed_at: 2026-05-09T12:58:13+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **UX-first per-slice cadence (Q2=A 채택)** — UI 슬라이스 (S1~S5) 어셈블리마다 사용자 review checkpoint. 사용자 풀 신호 3건 모두 정확히 catch (S4 chunk 본문 noise → C 옵션 reverse / S5 디공이 수준 탐색 질문 → multi-turn 발견 / Gate 6 round 2 markdown raw text → CSS patch). 이게 sprint-5 의 최대 가치. backend-first sprint (3/4) 와 비교해 사용자 use-case 의 *진짜 critical* 항목이 빠르게 표면화.
- **self → cross review 시퀀싱 강화** (sprint-3/4 의 정책 강화). Gate 3 self-CPO 5 round (G1~G19 19 gap patch) → codex round 5 PASS. Gate 6 self-CPO 1 round + codex 3 round → PASS. 사용자가 `/sfs review --gate 3` 호출 시 "self 통과 후 cross 체크" 명시 회복 (sprint-5 round 1 시 누락 → 사용자 corrective).
- **Plan SSoT 의 *implement-driven reverse* 명시** (round 6 = G20 D-S5-2 third trigger by user). plan 본문 + frontmatter `implementation_reverse_note` + §0 압축 marker + AC2/AC4/AC7 본문 reverse marking — 모두 정직 trace. 향후 sprint 의 mid-implementation reverse 패턴 표준.
- **Additive 변경 원칙**: sprint-3 `resolveProviderMode(env)` → `resolveProviderMode(env, requestMode?)` *signature additive 확장* (D-S5-3 b lock). 기존 호출처 무영향, 회귀 spec 4 case PASS, 신규 1 case (priority lock) PASS = sprint-3 invariant 그대로. sprint-3/4 의 모든 lock (stdout schema 9 필드 / persona invariant / ADR 0004 본문) 변경 0.
- **Gate-agnostic self → cross review 정책 명시**: 사용자 corrective ("리뷰 규칙이 언제부터 cross만 했음??") 후 plan §47 의 verified-before-advance 정책 일관 적용. sprint-3/4 와 동일 패턴 정착.

## 2. 문제

- **Gate 3 5 round 자체-CPO loop 의 evidence packaging 한계**: codex Gate 3 round 1~4 의 partial 사유 다수 = "self-CPO 본문이 review prompt 에 truncate 되어 detect 안 됨". round 4 G15 patch 로 §0 압축 summary frontmatter 추가 → round 5 PASS. SFS review prompt size 한계가 sprint-3 의 9 round 트라우마와 같은 systemic 이슈, sprint-5 에서 "frontmatter + §0 압축" 패턴으로 우회 정착.
- **Plan SSoT cascade drift**: round 6 chunks endpoint reverse 시 AC2/AC4/AC7 본문은 reverse marking 했지만 surrounding §1/R1/R6/§3.1.5/§4/§5.1 등 6 곳 stale text 잔존 → codex Gate 3 round 4 partial. round 5 G16~G19 cascade cleanup 후 PASS. plan 본문 변경 시 cascade 일관성 점검이 필요.
- **사용자 paste 가 design lens 의 visual evidence 부족**: codex Gate 6 round 2 partial 의 핵심 = "screen capture 미embed". UX-first cadence 의 사용자 paste 는 텍스트라 design lens 가 markdown 시각 렌더 verify 못함. round 3 markdown CSS patch (.response-markdown selector) + 사용자 implicit confirm 후 PASS. 향후 design lens 와 텍스트 paste 의 mismatch 정책 결정 필요.
- **Backend 재기동 누락 → real Claude timeout 30s fail**: S6 의 timeout 30→90s patch 후 backend 재기동 안 함 → 사용자 real 호출이 30s 초과 → 500. 이건 사용자 dev workflow 문제 + plan §6 K# → implement 단계 코드 적용 cascade 누락. round 4 의 `.env` 자동화 + `--env-file-if-exists` 로 retry 부담 줄임.
- **Multi-turn 사용자 풀 신호 3차 누적**: sprint-5 비범위 (plan §4.2) 결정이 정확했지만 *real Claude 의 페르소나 invariant ("수준 탐색 질문") 발동* 으로 사용자가 *답할 UI 0* 을 3번 catch. 1차 (S5 review) → 2차 (Gate 6 round 2) → 3차 (Gate 6 round 3+4 — 디공이 self-aware 우회 패턴). single-turn 의 D2 페르소나 톤이 *학습 도구 use-case 와 부분 충돌*. sprint-6 priority 1 강화.
- **Visible copy 의 internal process 텍스트 노출**: header/hint/legend 에 "sprint-5 S5 — ...", "fixture/real" 같은 internal 용어 노출 → codex Gate 6 round 1 finding F3. 학습 도구 친화 톤 ("데모 / Claude 호출", "디지털공학개론 페르소나와 1 turn 대화") 으로 round 2 patch. 향후 sprint 의 user-facing copy 정책 명시 필요.
- **Dev infra 부재로 매번 export 필요 → 사용자 fatigue**: sprint-3/4 의 `db:up-persistent` 가 stdout 출력만 했고 export 사용자 책임 → S3 review 흐름이 무거움. round 4 의 `.env` 자동 write + Node `--env-file-if-exists` 로 fix. Full docker compose 통합은 sprint-5.5 hotfix 또는 sprint-6 sub-item 으로 carry.

## 3. 시도할 것 (sprint-6+ candidates, 우선순위 정렬)

1. **Multi-turn (대화 history)** — sprint-5 사용자 신호 3차 + codex Gate 6 round 3 명시 carry. backend `Conversation` / `Turn` entity + history persist + system prompt history inject + frontend chat-style state. priority 1.
2. **MCP server 구축 + Provider 분기 architecture** — 사용자 명시 의도 (web hosting + user LLM 분기). 정통 MCP 방향 (Claude Desktop client → mj MCP server) 가 elegant. mj 만 Bedrock + 일반 사용자 자기 Claude Pro. priority 2 (architecture 결정 sprint).
3. **Full docker compose 통합** (sprint-5.5 hotfix 또는 sprint-6 sub-item) — `docker compose up -d --build` 한 줄 + service 별 selective rebuild. backend container 의 Claude CLI 호환성 결정 (host mount vs container install vs Bedrock 만). priority 3.
4. **페르소나 전 과목 (PersonaRegistry)** — sprint-3 retro carry. PersonaService 상수 → PersonaRegistry 모듈, 4 페르소나 × 4 과목. MCP server 가 4 페르소나 모두 노출 가능 (priority 2 와 결합). priority 3.
5. **PDF page metadata preservation** (sprint-4 retro carry) — `pdf-text-extractor` page 단위 분리 + chunker page anchor 보존 + Chunk schema additive migration + persona 출처 `(page=N-M)` 표기. AC6 citation drift 진입점. priority 4.
6. **Bedrock provider for mj** — sprint-6 architecture 의 일부 (priority 2 와 결합). priority 4.
7. **Self-CPO checklist v3** (sprint-4 v2 강화) — UX state lens 추가, 사용자 paste vs visual evidence packaging 차이 정책, plan §6 K# → implement 코드 cascade 1:1 점검 자동화. priority 5.
8. **Plan SSoT cascade lint** — plan 본문 변경 시 surrounding text grep 자동 점검 (G16~G19 같은 cascade drift 회피). priority 5.
9. **Stale chunk-endpoint frontmatter cleanup** (codex Gate 6 round 3 명시) — `implement.md` frontmatter 의 `implementation_reverse_note` 가 reverse 명시했지만 codex 가 frontmatter 의 chunks 텍스트 자체를 stale 로 인식. cosmetic — sprint-6 시작 시 cleanup. priority 6.

## 4. 이어갈 것

- 학습 도구 use-case 자체는 *fixture mode 만으로는 incomplete* — real Claude 응답이 D2 톤 + 시험 우선순위 5단계 + chunk verbatim 인용 + page 인용 패턴을 발동시킴. fixture 는 demo 용. 다음 sprint 의 *진짜 가치* 는 multi-turn + MCP integration 후 user 가 자기 Claude Pro 로 학습 use-case 완성하는 것.
- sprint-3 (corpus) → sprint-4 (실 PDF ingest) → sprint-5 (UI) 의 layered build. sprint-6 가 multi-turn + MCP 로 *production 학습 도구* 완성. sprint-7+ 가 deploy + user onboarding.
- mj 가 명시한 architecture 비전 (web hosting demo + user 자기 LLM via MCP) 은 Anthropic 의 의도된 use case 와 정확 일치. sprint-6 brainstorm 단계에서 정식 결정.

## 5. 종료 체크

- [x] report 가 최신이다 (`docs/2026-W19-sprint-5/20260509/report.md`)
- [x] review 조치가 완료 또는 이월됐다 (Gate 6 round 3 PASS, codex 명시 carry-over 2건 (multi-turn / stale chunk frontmatter) 모두 §3 으로 이월)
- [x] workbench 가 접혔다 (sprint closed via `sfs retro --close`, 새 layout `docs/<workspace>/<yyyyMMdd>/` 으로 retro/report 발행)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (113 tracked files), domains=0, last_review=pass, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T12:58:13+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
