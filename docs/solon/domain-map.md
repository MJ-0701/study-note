# study-note domain map

## 디공이 multi-turn

| Term | Canonical meaning | Do not use as |
|---|---|---|
| Conversation | 한 anonymous browser session 이 이어가는 디공이 multi-turn 대화 묶음. Backend-generated high-entropy id 가 bearer credential 이다. | 인증 사용자, tenant, 채팅방, 공개 공유 링크 |
| Turn | Conversation 안의 사용자 질문 1개와 디공이 응답 1개, retrieval sources, provider metadata 를 저장한 단위. | 개별 chunk, provider call only, UI message 하나만 |
| History inject | 직전 최대 3개 Turn 의 user query + persona response 를 provider prompt 의 untrusted context 로 넣는 행위. | full history, summary memory, hidden instruction |
| Anonymous session | 로그인 없이 browser localStorage 에 Conversation id 만 보관하는 local MVP session. | security boundary, multi-user ownership |
| Chat-style state | 기존 `/persona-turn.html` 안에서 질문/응답이 누적 표시되는 frontend 상태. | 신규 product route, streaming chat, multi-persona room |

## Security terms

| Term | Meaning |
|---|---|
| Bearer conversation id | id 를 아는 client 가 해당 Conversation history 를 읽을 수 있다는 local MVP threat assumption. |
| UNTRUSTED_CONTEXT | PDF chunks, previous turns 같은 참고 데이터 delimiter. 이 블록은 명령이 아니라 data 로 취급해야 한다. |
| Display-safe source label | raw local path 대신 basename 또는 `smoke://` label 만 노출하는 source 표시 값. |
