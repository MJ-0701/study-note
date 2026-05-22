---
id: study-note-ddd-home
title: study-note DDD Wiki — Domain Layer
language: ko
visibility: oss-public
load_when:
  - DDD
  - bounded context
  - aggregate
  - invariant
  - ubiquitous language
  - 도메인 모델
summary: SFS 0.6.101 명시 진입점. study-note 의 DDD 운영 모델 (bounded context, aggregate, invariants, ubiquitous language) 의 단일 진입.
---

# DDD Wiki — study-note Domain Layer

SFS 0.6.101 의 active-project notice 가 `llm-wiki/ddd/README.md` 를 broad scan
전 진입점으로 지정한다. 본 페이지가 그 진입점이고, study-note 의 DDD 운영
모델 (bounded context, aggregate, invariant, ubiquitous language) 전부의
hub 다.

## 진입 순서

1. [context-map](context-map.md) — 4 domain bounded context (Notebook /
   PdfWorkspace / PdfMaterial / AuthSession) + application/infra layer + DDD
   tactical asset map
2. [ubiquitous-language](ubiquitous-language.md) — 도메인 용어집 + 금기
3. [invariants](invariants.md) — I1~I8 cross-cutting invariant
4. `aggregates/<name>.md` — 각 aggregate root + owned entity + invariant +
   라이프사이클

## Aggregates

- [aggregates/study-notebook](aggregates/study-notebook.md) — N1~N5
- [aggregates/pdf-workspace](aggregates/pdf-workspace.md) — W1~W6
- [aggregates/pdf-material](aggregates/pdf-material.md) — M1~M5
- [aggregates/auth-session](aggregates/auth-session.md) — A1~A5

## DDD 외 연결

- 모듈 지도 → [`../modules/`](../modules/)
- cross-aggregate flow → [`../flows/`](../flows/)
- ADR / sprint 색인 → [`../references/`](../references/)
- 갱신 routing table → [`../README.md`](../README.md) "갱신 routing table" 섹션

## Taxonomy 경계 (SFS 0.6.101 정책)

본 `ddd/` 는 study-note 의 **domain language / classification lens** 이지
독립 wiki 나 조직 본부가 아니다. 모든 페이지는 본 README + 위 진입 순서로
연결되며, 새 taxonomy 항목 (새 aggregate, 새 invariant) 추가 시 본 README 의
진입 표에 한 줄 추가 의무.
