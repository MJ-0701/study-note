---
phase: retro
gate_id: G5
sprint_id: 2026-W18-sprint-2
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T14:16:56+00:00
closed_at: 2026-04-30T14:16:56+00:00
---

# Retro — <sprint title>

> Sprint **G5 — Sprint Retro** 산출물. 학습 루프 (정성, N PDCA 집계).
> `/sfs retro --close` 로 본 sprint 의 `closed_at` 을 frontmatter 에 기록 + `.sfs-local/events.jsonl` 의 `sprint_close` event append.
> SSoT: `gates.md §1` (G5) + `05-gate-framework.md §5.1.3` (Sprint Retro).

---

## §1. KPT (Keep / Problem / Try)

### Keep — 잘 된 것 (계속)

- **Brainstorm CEO 정리 흐름이 작동함**: 사용자 raw 입력 → §1~§7 자동 정리 → Q&A 4회로 미세결정 lock-in 까지 한 sprint 안에서 완료. Notion 폐기·S3 단일화·docker-compose 같은 굵직한 결정이 brainstorm 단계에서 나옴.
- **Plan §3 D1~D5 + frontmatter `stack` 필드 + Anti-AC4** 조합으로 stack drift 차단 장치를 plan 안에 박아둠. 후속 sprint 의 G2/G3 review 가 이걸 자동 검증 가능.
- **Independent codex CPO** 가 claude-claude self-validation 을 한 번에 무력화. partial → patch → pass 흐름 그대로 evidence 로 남음.

### Problem — 안 된 것 / 막힌 것

- **`sfs-review.sh:641` syntax error** 로 첫 codex `--run` 이 깨졌음. 사용자가 별도로 수정. → 본 프로젝트 외부 이슈지만 retro 학습 가치 있음.
- **review.md 가 호출마다 전체 템플릿 + 컨텍스트 번들을 append** 해서 1 sprint 안에 ~3900 lines / 268KB 까지 부풀어 단일 read 한계 초과. claude verdict 를 canonical 섹션에 쓰려고 sed/python 수술까지 필요.
- **embed window cap (plan.md 260 lines)** 이 plan 보강 후 codex 가 §9~§11 을 못 보는 partial 오판 유발. 사용자 결정으로 800/400/220/80 패치 → 같은 plan 으로 partial→pass 전환.
- **claude self-review 가 "pass" 라고 한 plan** 이 independent codex 에서는 partial 로 5개 누락(분류표·manifest schema·diagram·data model·게이트 정답 변수명) 지적받음. self-validation 의 신뢰성 한계 실증.

### Try — 다음 sprint 시도

- **Phase 1 implementation sprint 시작**: backlog 1·2·3 (repo scaffold + dev compose + DB schema + manifest schema) 묶어 1 sprint, 4·5 (S3 integration + gate) 묶어 1 sprint 권장.
- **G2 design review 는 처음부터 codex/gemini executor 로** — claude generator 와 분리해서 self-validation 사슬을 처음부터 깬다.
- **secret drift 가드**: G2 design 에서 `Course.professor_name` / `schedule_day` 컬럼이 게이트 정답 저장소가 되지 않도록 명시 (codex G1 review 의 minor finding 이행).
- **review.md 비대화 mitigation**: bash adapter 가 "각 invocation 마다 전체 템플릿 + 컨텍스트를 append" 하는 패턴은 retro 시점에 한 번 검토할 만함 (별도 WU 후보).

## §2. PDCA 학습

- **Plan (P)**: brainstorm `A4` 답변 시점에 "공유 ID/PW + 4문항" 까지만 결정했고 통과 N(4/4 vs 3/4) / rate limit / 정답 secret 이름까지 plan 단계로 넘기다 codex 가 "plan 본문에 게이트 정답 env 이름이 없다" 로 partial 지적. → 다음부터는 brainstorm Q&A 단계에서 "운영 변수까지" 묶어 결정하는 것이 plan partial 횟수를 줄임.
- **Do (D)**: 이번 sprint 는 코드 구현 0건(planning sprint). 대신 plan §10 데이터 모델 / §8 manifest schema / §9 다이어그램을 1차 텍스트로 만들어두면 G2 design 시 ORM·JSON Schema 변환만 하면 되어 시간이 압축됨. learning candidate: **"plan 단계의 텍스트 산출물은 G2 codegen 의 입력 그 자체"** (P-001 후보).
- **Check (C)**: G1 review verdict trace = pass(claude self) → partial(codex, 누락 5종) → partial(codex, embed cutoff) → pass(codex, embed 800). 3회 partial 모두 다른 원인 → CPO review 는 "어디까지 보였는지" 의 evidence 윈도우 자체가 verdict 의 절반을 결정한다는 학습.
- **Act (A)**: (1) `sfs-review.sh` embed window 수정사항을 `0001-stack-lock-in...md` 와 같은 ADR 으로 분리할지 검토(별도 ADR 후보). (2) 다음 plan 작성 시 frontmatter 에 stack/secret/scope 같은 운영 lock-in 필드를 의도적으로 채우도록 convention 화. (3) 다음 sprint 의 G1 review 는 처음부터 `--executor codex --generator claude` 로.

## §3. 정량 메트릭

- **계획 대비 시간**: 본 sprint 는 시간 estimate 가 plan 에 명시 안 됨 → unknown.
- **AC 통과율 (G1)**: AC1~AC10 (10개) + Anti-AC1~Anti-AC4 (4개) = 14/14 codex pass.
- **review verdict 변동**: 4회 (claude pass → codex partial → codex partial → codex pass).
- **plan.md 크기**: 466 lines, 5섹션(§7~§11) 신규 추가.
- **review.md 누적 크기**: 약 3934 lines / 268 KB (호출 8회 누적). 향후 mitigation 후보.
- **events.jsonl 의 G1 관련 이벤트 수**: unknown (확인 필요, 본 retro 작성 시점에 event grep 안 함).

## §4. 다음 sprint 인계

- **이어가는 항목**:
  - Phase 1 implementation: backlog 1~3 (repo scaffold / dev compose / DB schema / manifest schema) 1 sprint.
  - Phase 1 implementation: backlog 4~5 (S3 integration / gate 4문항 + signed cookie) 1 sprint.
  - G2 design review (component diagram·manifest·data model 의 코드 산출물 1차) — codex executor 로.
- **분기되는 WU/sprint 후보**:
  - Phase 2: 시험범위 reader 의 연속 스크롤 / 진행도 UI / 책 모드 톤 가이드 (AC8 rubric).
  - Phase 3 (optional): 동영상 업로드/재생 + 외부 호스팅 링크 모드.
  - Operations WU: `sfs-review.sh` review.md append 비대화 패턴 mitigation.
- **결정 대기 (W10 후보)**:
  - ORM 픽: Prisma vs TypeORM (Phase 1 backlog 2 시점).
  - Repo 형태: monorepo (`apps/api` + `apps/web`) vs 멀티 폴더.
  - S3 bucket 명·region·CORS 도메인 화이트리스트 (Phase 1 backlog 4).

## §5. G5 close 체크

- [x] events.jsonl 마지막 entry 에 G1 review pass 가 남아 있는지 확인 → 사용자 측 events 파일 직접 확인 권장.
- [ ] `closed_at` frontmatter 기록 (`/sfs retro --close` 가 자동 채움)
- [ ] HANDOFF / sessions log 에 본 sprint 결과 link 1줄 추가 (별도 sessions log 미사용 시 skip 가능)
