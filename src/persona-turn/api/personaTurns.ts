// sprint-5 plan §5.3 신규 Port — frontend HTTP wrapper for POST /api/v1/persona-turns.
// CORS 는 backend `enableCors({origin:true})` 로 5173↔3001 cross-origin 허용 (plan K6).

const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "http://127.0.0.1:3001";

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
}

export async function submitPersonaTurn(input: PersonaTurnSubmit): Promise<PersonaTurnResult> {
  const res = await fetch(`${BACKEND_BASE}/api/v1/persona-turns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    let body: BackendErrorResponse | undefined;
    try {
      body = (await res.json()) as BackendErrorResponse;
    } catch {
      // backend 가 JSON 외 텍스트 emit (예: 5xx 일반 에러) — body undefined 유지
    }
    throw new PersonaTurnApiError(res.status, body, `HTTP ${res.status}`);
  }

  return (await res.json()) as PersonaTurnResult;
}
