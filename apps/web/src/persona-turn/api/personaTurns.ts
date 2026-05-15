// sprint-5 plan §5.3 신규 Port — frontend HTTP wrapper for POST /api/v1/persona-turns.
// CORS 는 backend `enableCors({origin:true})` 로 5173↔3001 cross-origin 허용 (plan K6).

const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "";

/**
 * sprint-2 AC3 — single-source agent enum. backend `LLM_AGENT_IDS` (canonical source
 * at `backend/src/persona/providers/llm-provider.port.ts`) 와 *값 동일* lock.
 * frontend ↔ backend 가 별도 bundle 이라 import 불가 — string literal 동기 검증
 * (CI 또는 grep diff). drift 시 sprint-3+ 의 shared types package 후보.
 */
export type Agent = "claude-cli" | "gemini-cli";

export interface PersonaTurnSource {
  ord: number;
  corpusId: string;
  sourcePdfPath: string;
  score: number;
}

export interface PersonaTurnResult {
  personaName: string;
  subject: string;
  query: string;
  k: number;
  response: string;
  sources: PersonaTurnSource[];
  provider: string;
  modelName: string;
  retrievalCount: number;
  isFallback: boolean;
  conversationId?: string;
  turnId?: string;
  createdAt?: string;
}

export interface BackendErrorResponse {
  errorCode: string;
  errorMessage: string;
}

export class PersonaTurnApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  constructor(status: number, body: BackendErrorResponse | undefined, fallback: string) {
    super(body?.errorMessage ?? fallback);
    this.status = status;
    this.errorCode = body?.errorCode ?? "UNKNOWN";
  }
}

export interface PersonaTurnSubmit {
  subject: string;
  query: string;
  k?: number;
  mode?: "fixture" | "real";
  agent?: Agent;
}

export interface ConversationSummary {
  id: string;
  subject: string;
  personaName: string;
  createdAt: string;
}

export interface ConversationTurn {
  turnId: string;
  conversationId: string;
  subject: string;
  query: string;
  k: number;
  response: string;
  sources: PersonaTurnSource[];
  provider: string;
  modelName: string;
  retrievalCount: number;
  isFallback: boolean;
  createdAt: string;
}

export interface ConversationHistory extends ConversationSummary {
  turns: ConversationTurn[];
}

// sprint-8 slice-1 backend GET /v1/conversations 의 item shape mirror.
// backend (ConversationListItem) 와 동일 — frontend bundle 분리라 import 불가하니
// string 동기 검증 (CI 또는 grep diff) 으로 lock.
export interface ConversationListItem {
  id: string;
  subject: string;
  personaName: string;
  derivedTitle: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
}

export async function createConversation(subject: string): Promise<ConversationSummary> {
  const res = await fetch(`${BACKEND_BASE}/api/v1/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject })
  });
  return parseJsonResponse<ConversationSummary>(res);
}

export async function fetchConversation(id: string): Promise<ConversationHistory> {
  const res = await fetch(`${BACKEND_BASE}/api/v1/conversations/${encodeURIComponent(id)}`);
  return parseJsonResponse<ConversationHistory>(res);
}

// sprint-8 slice-2 — GET /v1/conversations[?subject=<slug>] frontend port.
// cookie-auth (credentials: "include") + subject 선택 filter.
// backend ValidationPipe 가 subject regex 위반 시 400 VALIDATION_ERROR.
export async function listConversations(
  subject?: string
): Promise<ConversationListItem[]> {
  const url = subject
    ? `${BACKEND_BASE}/api/v1/conversations?subject=${encodeURIComponent(subject)}`
    : `${BACKEND_BASE}/api/v1/conversations`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include"
  });
  return parseJsonResponse<ConversationListItem[]>(res);
}

export async function appendConversationTurn(input: {
  conversationId: string;
  query: string;
  k?: number;
  mode?: "fixture" | "real";
  agent?: Agent;
}): Promise<PersonaTurnResult> {
  const res = await fetch(
    `${BACKEND_BASE}/api/v1/conversations/${encodeURIComponent(input.conversationId)}/turns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input.query,
        k: input.k,
        mode: input.mode,
        agent: input.agent
      })
    }
  );
  return parseJsonResponse<PersonaTurnResult>(res);
}

export async function submitPersonaTurn(input: PersonaTurnSubmit): Promise<PersonaTurnResult> {
  const res = await fetch(`${BACKEND_BASE}/api/v1/persona-turns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  return parseJsonResponse<PersonaTurnResult>(res);
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: BackendErrorResponse | undefined;
    try {
      body = (await res.json()) as BackendErrorResponse;
    } catch {
      // backend 가 JSON 외 텍스트 emit (예: 5xx 일반 에러) — body undefined 유지
    }
    throw new PersonaTurnApiError(res.status, body, `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}
