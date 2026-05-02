---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-4"
goal: "해당 프로젝트는 시험 대비를 위한 lectture note임"
created_at: "2026-05-01T22:20:27+09:00"
last_touched_at: 2026-05-01T22:25:50+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
---

# Brainstorm — 시험 대비 Lecture Note 웹사이트

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 은 raw 를 §8 에 기록한 뒤
> AI runtime 에서 Solon CEO 가 §1~§7 을 채운다. direct bash 는 capture-only 다.
> 생명주기: 본 문서는 진행 중 workbench 이다. Sprint close 후 핵심 문제/성공상태만
> `report.md` 로 압축되고, raw history 는 `retro.md` / session log 가 담당한다.

---

## §1. Raw Brief / Conversation Notes

- 중간고사 때 Notion 에 정리한 전공강의 핵심 요약본으로 공부하려 했지만, 양이 방대해지고 핵심 개념의 우선순위가 흐려졌다.
- 시간이 충분하면 교재와 강의자료를 함께 정독할 수 있지만, 직장인 전형 대학생의 시험 직전 상황에서는 읽을 양을 줄이고 바로 이해 가능한 요약이 필요하다.
- 기존 방식은 Claude 에 교수님 강의 PDF 를 제공해 핵심 개념 요약 PDF 를 만들고, 교수님이 던진 시험/중요 키워드는 반드시 포함시키며, 예제문제까지 생성하는 흐름이었다.
- Notion 은 페이지가 분리되어 있어 시험 직전 빠르게 훑고 연결해서 보기 불편했다. 사용자는 이 부분을 본인 설계 문제로도 보고 있다.
- 구축하려는 웹사이트는 교수님 수업 PDF 와 시험 출제/중요 키워드를 입력받아, 기말고사 대비용으로 보기 쉽고 이해하기 쉬운 lecture note 를 만드는 서비스다.
- 친한 동생도 같은 직장인 전형 대학생이고, 강의노트 기반 영상을 만들어 시험 준비에 활용한다고 한다. 사용자는 본인과 동기들이 공유해서 볼 수 있는 형태를 원한다.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 직장과 학업을 병행하는 대학생, 특히 시험 직전에 강의 PDF/노트/키워드를 빠르게 소화해야 하는 사용자와 동기들.
- 왜 지금 풀어야 하는가: 기말고사 대비 시점에 맞춰 실제로 사용할 수 있어야 하며, 중간고사 때 Notion 기반 정리의 한계를 이미 경험했다.
- 기존 방식의 불편함:
  - 강의 요약본이 길어질수록 핵심 개념과 부가 설명의 우선순위가 흐려진다.
  - Notion 페이지 분리 때문에 시험 직전 흐름 있게 읽기 어렵고 이동 비용이 크다.
  - Claude 로 만든 PDF 요약은 생성물 자체는 유용하지만, 시험 범위/키워드/예제문제/공유용 reader 로 묶이지 않는다.
  - 교수님이 강조한 키워드가 빠지면 시험 대비용 신뢰도가 떨어진다.
- 성공하면 어떤 상태가 되는가:
  - 사용자가 강의 PDF 와 시험 중요 키워드를 넣으면, 시험 범위 중심의 단일 lecture note 가 생성된다.
  - note 는 핵심 개념, 쉬운 설명, 교수님 키워드 반영 여부, 예제문제를 한 화면에서 빠르게 볼 수 있다.
  - 동기들과 공유해도 페이지 이동 없이 시험 직전 읽기 좋은 구조를 유지한다.

## §3. Constraints / Context

- 기술 제약:
  - 교수님 강의 PDF 를 입력 자료로 다루므로 PDF 업로드, 텍스트 추출, 원문 출처 추적, 파일 저장이 필요할 수 있다.
  - AI 생성 note 는 환각/누락 위험이 있으므로 필수 키워드 coverage 와 출처 근거 표시가 중요하다.
  - 기존 stack 결정은 `Decision 0001 — Stack lock-in: NestJS + Vite + MySQL + S3 + .env` 이므로, 구현 sprint 에서는 Vite/NestJS/MySQL/S3 를 기본 전제로 삼는다.
- 배포/운영 제약:
  - 동기들과 공유 예정이지만 공개 서비스보다는 제한된 사용자/수업 단위 공유가 더 안전하다.
  - 교수님 PDF 는 저작권/수업자료 성격이 강하므로 원문 파일과 생성 note 의 공개 범위를 제한해야 한다.
- 시간/비용 제약:
  - 시험 대비용이므로 완벽한 지식관리 시스템보다 빠르게 읽고 복습 가능한 MVP 가 우선이다.
  - AI API/파일 처리 비용은 작게 시작해야 한다. 수동 업로드 + 수동 생성 요청 흐름도 MVP 로 유효하다.
- 사용자 역량/학습 맥락:
  - 사용자는 현직 백엔드 개발자이고, 컴공 1학년 수준의 전공 학습을 병행 중이다.
  - 풀스택 웹사이트 구현도 부수 학습 목표가 될 수 있다.
- 아직 모르는 것:
  - v1 이 AI 생성까지 웹에서 자동화해야 하는지, 아니면 Claude 로 만든 note 를 업로드/정리하는 reader 부터 시작할지.
  - note 의 기본 출력 단위: 과목별, 주차별, 시험범위별, PDF 파일별 중 무엇인지.
  - 공유 방식: 로그인 사용자만, 공유 링크, 공통 계정, 읽기 전용 공개 URL 중 무엇인지.
  - 영상 생성은 v1 scope 인지, 후속 sprint 후보인지.

## §4. Options

최소 2개 이상. "아무것도 안 한다" 도 유효한 옵션이다.

- **Option A: Notion/Claude/PDF 수동 워크플로 유지**
  - 장점: 구현 비용이 없고, Claude 로 바로 요약 PDF 를 만들 수 있다.
  - 단점: 핵심 개념 우선순위, 키워드 coverage, 예제문제, 공유 reader 경험이 흩어진다.
  - 버릴/보류할 이유: 중간고사 때 이미 양이 방대해지고 페이지 이동이 불편하다는 문제가 검증됐다.
- **Option B: 작은 MVP — 시험범위 중심 Lecture Note Reader**
  - 장점: 사용자가 Claude 로 만든 요약/키워드/예제문제를 넣더라도 웹에서 단일 화면 reader, 목차, 키워드 coverage, 예제문제 보기로 즉시 개선 가능하다.
  - 단점: PDF -> AI note 생성 자동화가 v1 에서는 제한될 수 있다.
  - 채택할 이유: 시험 전 실제 사용 가능성이 가장 높고, 제품 가치를 작게 검증할 수 있다.
- **Option C: 자동 생성 MVP — PDF + 키워드 입력 -> AI lecture note 생성**
  - 장점: 사용자가 원하는 핵심 흐름에 가장 가깝다. PDF/키워드 기반 note 와 예제문제를 자동 생성할 수 있다.
  - 단점: PDF 파싱, prompt 설계, 출처 추적, 비용, AI 품질 검증까지 한 번에 커진다.
  - 보류/단계화 이유: v1 에서 핵심 reader 구조와 note schema 를 먼저 고정한 뒤 자동 생성 파이프라인을 붙이는 편이 안전하다.
- **Option D: 확장형 — 강의노트 기반 영상/오디오 생성**
  - 장점: 이동 중 학습이나 반복 청취에 유용하고, 사용자 지인의 실제 학습 방식과 맞다.
  - 단점: 영상 생성 비용/시간/품질 검증 부담이 크며, 시험 직전 MVP 로는 과하다.
  - 보류할 이유: lecture note 본문 구조와 핵심 개념 품질이 먼저 검증되어야 한다.

## §5. Scope Seed

- 이번 sprint 에 넣을 것:
  - 제품 문제 정의: "시험 직전 핵심 개념을 빠르게 이해하는 lecture note" 로 목적 고정.
  - 사용자와 공유 대상: 본인 + 같은 수업을 듣는 동기, 특히 직장인 전형 대학생.
  - v1 정보 구조 후보: 과목, 시험범위, 강의 PDF, 교수님 중요 키워드, 핵심 개념, 쉬운 설명, 예제문제, 공유 상태.
  - 첫 구현 후보를 결정할 수 있는 AC seed: 단일 lecture note reader, 키워드 coverage 표시, 예제문제 섹션, 공유용 읽기 흐름.
- 이번 sprint 에서 뺄 것:
  - 영상/오디오 자동 생성.
  - 공개 마켓플레이스나 다수 학교/과목 확장.
  - 완전 자동 PDF ingestion/RAG 품질 보장.
  - 저작권 검토가 끝나지 않은 원문 PDF 공개 공유.
- 다음 sprint 후보:
  - Lecture note data model/schema 와 생성물 JSON/Markdown contract.
  - Vite 기반 note reader UI prototype.
  - PDF upload + keyword input + manual note creation flow.
  - AI generation prompt/coverage checker.
  - 제한 공유/권한 모델.

## §6. Plan Seed

`/sfs plan` 으로 넘길 때 필요한 최소 재료.

- Goal: 기말고사 대비용 lecture note 웹사이트의 v1 제품 범위와 첫 구현 slice 를 정의한다. 핵심은 "교수님 PDF + 시험 중요 키워드 기반으로, 페이지 이동 없이 읽기 쉬운 시험 대비 note 를 만든다" 이다.
- Acceptance Criteria 후보:
  - AC1: plan 은 v1 대상 사용자를 "직장인 전형 대학생 + 같은 수업 동기"로 명확히 고정한다.
  - AC2: plan 은 lecture note 의 최소 구성요소를 정의한다: 과목/시험범위, 원자료, 필수 키워드, 핵심 개념 설명, 예제문제, 공유 상태.
  - AC3: plan 은 첫 구현 slice 를 하나로 좁힌다: note reader UI, note schema, PDF/키워드 입력, AI 생성 파이프라인 중 1개.
  - AC4: plan 은 저작권/공유 범위/AI hallucination risk 를 명시하고 v1 anti-scope 를 둔다.
  - AC5: plan 은 다음 구현 명령(`/sfs implement`)으로 바로 넘길 수 있는 CTO deliverable 과 CPO validation 기준을 포함한다.
- 주요 risk:
  - PDF 원문이 저작권/수업자료라서 공유 범위를 잘못 잡으면 문제가 될 수 있다.
  - AI 요약이 시험 핵심을 누락하거나 잘못 설명하면 학습 신뢰도가 깨진다.
  - "노트 생성", "reader", "영상", "공유"를 한 sprint 에 모두 넣으면 범위가 터진다.
  - Notion 의 불편함을 단순히 웹으로 옮기면 제품 가치가 없다. 정보 구조와 읽기 흐름을 먼저 설계해야 한다.
- generator agent 가 만들 산출물:
  - v1 scope plan 과 anti-scope.
  - lecture note domain model 초안.
  - 첫 구현 slice 후보와 권장 순서.
  - CPO review 가 확인할 UX/품질/위험 기준.
- evaluator agent 가 검증할 기준:
  - 사용자의 중간고사 pain 이 plan 의 AC 로 연결되는가.
  - 시험 직전 사용 시나리오에서 읽기 흐름이 Notion 대비 분명히 나아지는가.
  - 교수님 키워드가 필수 coverage 로 다뤄지는가.
  - 원문 PDF/공유/AI 오류 위험이 anti-AC 로 관리되는가.

### Open Questions for G1

1. v1 은 Claude 로 만든 note 를 사람이 업로드/편집하는 reader 부터 만들 것인가, 아니면 웹에서 PDF+키워드 입력 후 AI 생성까지 바로 만들 것인가?
2. 첫 화면의 기본 단위는 과목, 시험, 주차, PDF 파일 중 무엇으로 잡을 것인가?
3. 동기 공유는 로그인 기반 private 공유, 공유 링크, 공통 계정 중 어떤 방식이 현실적인가?

## §7. G0 Checklist

- [x] raw brief / 대화 메모가 남아 있다
- [x] 문제와 성공 상태가 한 줄로 설명된다
- [x] 대안 2개 이상을 비교했다
- [x] in/out scope seed 가 있다
- [x] generator/evaluator 계약에 넘길 재료가 있다

> checklist 가 대체로 채워지면 `/sfs plan` 으로 이동한다.

## §8. Append Log

`/sfs brainstorm <text>` 또는 `/sfs brainstorm --stdin` 입력이 append 되는 영역.

### 2026-05-01T22:25:50+09:00 — raw input

```text
해당 페이지를 기획하게 된 이유는 내가 중간고사때 노션에 정리된 전공강의 핵심 요약본들을 보면서 공부하려고 했는데 일단 양이 너무 방대해졌고, 진짜 핵심 개념들 정리가 하나도 안돼있는 느낌 정리 방법은 교수님 강의 pdf파일을 클로드한테 제공해주고 그걸 기반으로 클로드가 핵심 개념 요약 pdf파일을 만들어주고 + 교수님이 키워드를 던져주면 거기에있는 개념이 pdf에 필수로 들어감 + 예제문제 생성까지 시간이 많으면 책과 함께 정독을 했겠지만, 시간이 없는상태에서 보려니까 양이 너무 방대했고, 또 노션 특성상 페이지를 분리해놓으니까 페이지 이동하면서 보는게 너무 보기 불편했음(이건 근데 내 설계미스이긴 함) 그래서 내가 지금 구축하고자 하는 기능은 교수님 수업 pdf를 제공해줄예정이고 + 시험에 나온다고 한 키워드나 중요하다고한 키워드들을 제공해줄거임 그걸 기반으로 기말고사 대비 note를 만들고 + 좀 보기 쉽고 이해하기 쉬운 말그대로 lectture note를 만드는것 내 친한 동생도 나랑 같은 직장인 전형의 대학생인데 강의노트 기반 영상으로 만들어달라고 한다음에 그거 보고 시험친다고 하더라 나도 이런게 좀 필요할거 같아서 만드는 웹사이트임 + 동기들과 공유할 예정
```
