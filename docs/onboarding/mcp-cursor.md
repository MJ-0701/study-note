# Cursor MCP 설정 가이드

study-note corpus + 페르소나 prompt 를 Cursor 에 연결하는 1회 설정 절차입니다.

## 사전 준비

1. Cursor 를 설치하고 본인 계정으로 로그인합니다.
2. study-note 에서 sign-in 한 학번을 확인합니다 (8자리).
3. 로컬 study-note repo 가 빌드된 상태인지 확인합니다 (`apps/mcp/dist/index.js` 존재).

## 설정 단계

### Step 1 — MCP 설정 파일 열기

Cursor Settings → MCP Servers 를 열거나, `~/.cursor/mcp.json` 파일을 직접 편집기로 엽니다.

<!-- screenshot: cursor-settings-mcp-servers.png -->

### Step 2 — mcpServers 항목 추가

Claude Desktop 과 동일한 JSON 을 추가합니다.  
`<YOUR_STUDENT_NUMBER>`, `<YOUR_DATABASE_URL>` 를 본인 환경값으로 교체합니다.

```json
{
  "mcpServers": {
    "study-note": {
      "command": "node",
      "args": ["/path/to/study-note/apps/mcp/dist/index.js"],
      "env": {
        "STUDY_NOTE_AUTH_DEV_ENABLED": "true",
        "STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER": "<YOUR_STUDENT_NUMBER>",
        "DATABASE_URL": "<YOUR_DATABASE_URL>"
      }
    }
  }
}
```

<!-- screenshot: cursor-mcp-json-edited.png -->

### Step 3 — Cursor 재시작

파일을 저장한 뒤 Cursor 를 완전히 종료하고 재시작합니다.

<!-- screenshot: cursor-restart.png -->

### Step 4 — 페르소나 호출 확인

채팅창에서 study-note MCP 서버가 활성화됐는지 확인한 뒤, 아래 문구를 입력합니다:

> 디공이로 디지털 회로 강의 1주차 요약해줘

응답에 강의 자료 내용이 포함되면 연결 성공입니다.

<!-- screenshot: cursor-persona-response.png -->

## 미지원

Bedrock + 자체 API key 등록은 본 sprint 의 미지원 항목입니다.  
study-note 는 본인 구독 client 의 MCP 호출 path 만 지원합니다.
