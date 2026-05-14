# Claude Desktop MCP 설정 가이드

study-note corpus + 페르소나 prompt 를 Claude Desktop 에 연결하는 1회 설정 절차입니다.

## 사전 준비

1. Claude Desktop 을 설치하고 본인 계정으로 로그인합니다.
2. study-note 에서 sign-in 한 학번을 확인합니다 (8자리).
3. 로컬 study-note repo 가 빌드된 상태인지 확인합니다 (`apps/mcp/dist/index.js` 존재).

## 설정 단계

### Step 1 — Developer 탭 열기

Claude Desktop 메뉴 → 설정 → Developer 탭을 엽니다.

<!-- screenshot: claude-desktop-settings-developer.png -->

### Step 2 — config 파일 열기

`claude_desktop_config.json` 열기 버튼을 클릭합니다.

<!-- screenshot: claude-desktop-config-open.png -->

### Step 3 — mcpServers 항목 추가

아래 JSON 을 `mcpServers` 항목에 추가합니다.  
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

<!-- screenshot: claude-desktop-config-json-edited.png -->

### Step 4 — Claude Desktop 재시작

파일을 저장한 뒤 Claude Desktop 을 완전히 종료하고 재시작합니다.

<!-- screenshot: claude-desktop-restart.png -->

### Step 5 — 페르소나 호출 확인

새 채팅을 열고 아래 문구를 입력합니다:

> 디공이로 디지털 회로 강의 1주차 요약해줘

응답에 강의 자료 내용이 포함되면 연결 성공입니다.

<!-- screenshot: claude-desktop-persona-response.png -->

## 미지원

Bedrock + 자체 API key 등록은 본 sprint 의 미지원 항목입니다.  
study-note 는 본인 구독 client 의 MCP 호출 path 만 지원합니다.
