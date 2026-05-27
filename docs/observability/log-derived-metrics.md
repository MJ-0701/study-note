# Log-derived metrics (SoT)

sprint-W22-sprint-24 / AC4 + AC15. 본 문서가 단일 원천 (SoT).
Datadog UI 의 *Logs → Generate Metrics* 등록 시 본 정의에 1:1 맞춘다.

## 등록 정책

- namespace = `study_note.event.*` (dot.case). Prom 으로 export 시 자동 `_` 치환.
- type = `count` (각 log line 1회 카운트). distribution / gauge 아님.
- group by = **없음**. user / route / status 분리 X — 본 metric 은 비즈니스 이벤트 빈도만 본다.
- filter query 가 PII 필드를 포함해서는 안 된다 (AC15). emit 단계에서 schema 가 `{event, kind}` 만이라 PII 가 log 에 진입할 수 없다.
- retention = Datadog 기본 (15개월 metric retention).

## auth / identity (5) — implemented

`Logger("study-note.metric-event")` context 가 출력하는 1줄 문자열. payload 없음.

| metric | log line (substring filter) | 소스 |
|---|---|---|
| `study_note.event.signup` | `event=study_note.event.signup` | `apps/api/src/auth/auth.controller.ts:signUp` 성공 분기. |
| `study_note.event.signin` | `event=study_note.event.signin` | `apps/api/src/auth/auth.controller.ts:signIn` 200 응답 직전. |
| `study_note.event.pdf_upload` | `event=study_note.event.pdf_upload` | `apps/api/src/materials/materials.controller.ts:completeUpload` 성공. |
| `study_note.event.annotation_put` | `event=study_note.event.annotation_put` | `apps/api/src/pdf-annotations/pdf-annotations.service.ts:putAnnotation` 성공. |
| `study_note.event.mcp_call` | `event=study_note.event.mcp_call` | `apps/api/src/persona/persona-turn.controller.ts:run` 성공. |

Datadog 설정: `Logs → Generate Metrics` → filter `"event=study_note.event.signup"` (등) 의 quoted substring 사용. logger context 가 `study-note.metric-event` 이므로 pipeline 에서 `@logger.name:study-note.metric-event` 로 추가 정밀화 가능.

## widget create (5) — implemented (FE telemetry beacon)

FE 가 widget add 시점에 `POST /v1/telemetry/widget-create { kind }` 호출 (fire-and-forget).
BE TelemetryController 가 받아 `event=study_note.event.<kind>_create` 1줄 emit.

| metric | log line (substring) | FE 트리거 |
|---|---|---|
| `study_note.event.chart_create` | `event=study_note.event.chart_create` | `main.ts` PDF surface click + selectedTool=chart → `addChart` 직후. |
| `study_note.event.table_create` | `event=study_note.event.table_create` | selectedTool=table → `addTable` 직후. |
| `study_note.event.star_create` | `event=study_note.event.star_create` | selectedTool=star → `addStarMark` 직후. |
| `study_note.event.drill_create` | `event=study_note.event.drill_create` | inspector drill-item click (`select-drill-item` action). |
| `study_note.event.eraser_create` | `event=study_note.event.eraser_create` | selectedTool=eraser → eraser drag 시작 시 (session 단위). |

### 운영 메모

- "drill" / "eraser" 는 strictly "create" 가 아니라 "사용 세션 시작". metric naming 은 5개 통일을 위해 `_create` 접미사 유지. 실제 의미 = "활성화/실행".
- eraser 는 drag 시작 1회만 emit (drag 안의 모든 stroke 삭제 동안 추가 emit 없음).
- FE beacon 실패 시 console.warn 후 swallow — UX 영향 0, metric 만 손실.

## emit schema 불변식 (AC15)

```ts
this.metricsLogger.log("event=study_note.event.<name>");
```

- 1줄 문자열만. message body 는 위 표의 substring 한 줄과 동일.
- 동일 줄에 추가 키 (`userId`, `studentNumber`, `email`, `materialId`, `payload`, `requestBody`, `token`) 절대 포함 X.
- grep guard: `rg -nE "metricsLogger\.log.*\b(userId|studentNumber|email|payload|materialId|token)\b" apps/api/src` = 0.
- log level = `log` (NestJS Logger.log → stdout). warn / error 가 아님.

## 활성화 순서

1. BE deploy → annotation PUT 에서 log line emit 시작.
2. Datadog UI 에서 metric 정의 등록 (`Logs → Generate Metrics`).
3. Grafana Product dashboard 의 widget_create_rate panel 이 자동으로 채워짐.
