# study-note domain map

## 디공이 multi-turn

| Term | Canonical meaning | Do not use as |
|---|---|---|
| Conversation | 한 anonymous browser session 이 이어가는 디공이 multi-turn 대화 묶음. Backend-generated high-entropy id 가 bearer credential 이다. | 인증 사용자, tenant, 채팅방, 공개 공유 링크 |
| Turn | Conversation 안의 사용자 질문 1개와 디공이 응답 1개, retrieval sources, provider metadata 를 저장한 단위. | 개별 chunk, provider call only, UI message 하나만 |
| History inject | 직전 최대 3개 Turn 의 user query + persona response 를 provider prompt 의 untrusted context 로 넣는 행위. | full history, summary memory, hidden instruction |
| Anonymous session | 로그인 없이 browser localStorage 에 Conversation id 만 보관하는 local MVP session. | security boundary, multi-user ownership |
| Chat-style state | 기존 `/persona-turn.html` 안에서 질문/응답이 누적 표시되는 frontend 상태. | 신규 product route, streaming chat, multi-persona room |
| LLM Agent | 사용자가 보유/로그인한 CLI 또는 agent runtime. Claude CLI, Gemini CLI, Codex CLI, Ollama, Grok, Cursor 등이 동등 후보이다. | Claude 전용 provider, 앱 내부 persona 구현체 |
| Agent adapter registry | `PersonaTurnService` 와 concrete CLI provider 사이의 선택/호출 경계. fixture, claude-cli, gemini-cli 등 adapter 를 같은 contract 로 라우팅한다. | business logic, persona prompt 저장소 |
| MCP agent bridge | 향후 MCP server/client surface 로 agent 들이 디공이 tool/resource 를 호출하게 하는 통합 방향. | 특정 provider, 단일 subprocess wrapper |
| Evidence transcript | real agent UX 검증용 turn 요약과 안전 metadata. raw prompt/chunk/path/stderr 는 보관하지 않는다. | full provider log, 사용자 비밀 원문 |

## Security terms

| Term | Meaning |
|---|---|
| Bearer conversation id | id 를 아는 client 가 해당 Conversation history 를 읽을 수 있다는 local MVP threat assumption. |
| UNTRUSTED_CONTEXT | PDF chunks, previous turns 같은 참고 데이터 delimiter. 이 블록은 명령이 아니라 data 로 취급해야 한다. |
| Display-safe source label | raw local path 대신 basename 또는 `smoke://` label 만 노출하는 source 표시 값. |
