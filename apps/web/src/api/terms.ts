// sprint-W21-sprint-1 / S1 — Term/Subject FE API client.

const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "";

export interface TermAdminResponse {
  id: string;
  grade: number;
  semester: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  createdById?: string;
  updatedAt?: string;
}

export interface SubjectResponse {
  id: string;
  title: string;
  termId: string | null;
  createdAt: string;
}

export interface TermCreateBody {
  grade: number;
  semester: number;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TermUpdateBody {
  grade?: number;
  semester?: number;
  title?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ApiErrorBody {
  errorCode?: string;
  errorMessage?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string | undefined;
  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.errorMessage ?? `request failed (${status})`);
    this.status = status;
    this.errorCode = body?.errorCode;
  }
}

async function request<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${input}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body as ApiErrorBody | null);
  }
  return body as T;
}

export function listTerms(): Promise<TermAdminResponse[]> {
  return request<TermAdminResponse[]>("/api/v1/terms");
}

export function createTerm(body: TermCreateBody): Promise<TermAdminResponse> {
  return request<TermAdminResponse>("/api/v1/terms", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function updateTerm(id: string, body: TermUpdateBody): Promise<TermAdminResponse> {
  return request<TermAdminResponse>(`/api/v1/terms/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export function deleteTerm(id: string): Promise<void> {
  return request<void>(`/api/v1/terms/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export function getTermChildCount(id: string): Promise<{ subjectCount: number }> {
  return request<{ subjectCount: number }>(`/api/v1/terms/${encodeURIComponent(id)}/child-count`);
}

export function listSubjects(): Promise<SubjectResponse[]> {
  return request<SubjectResponse[]>("/api/v1/subjects");
}

export function createSubject(termId: string, title: string): Promise<SubjectResponse> {
  return request<SubjectResponse>(`/api/v1/terms/${encodeURIComponent(termId)}/subjects`, {
    method: "POST",
    body: JSON.stringify({ title })
  });
}

/** S1 AC4 — rename only. Subject move 는 S7 의 별도 endpoint. */
export function updateSubject(id: string, body: { title: string }): Promise<SubjectResponse> {
  return request<SubjectResponse>(`/api/v1/subjects/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export function deleteSubject(id: string): Promise<void> {
  return request<void>(`/api/v1/subjects/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export function getSubjectChildCount(id: string): Promise<{ materialCount: number }> {
  return request<{ materialCount: number }>(`/api/v1/subjects/${encodeURIComponent(id)}/child-count`);
}

/** S7 AC32 — Subject move. Subject.termId 만 변경 (Subject = metadata-only, ADR-4). */
export function moveSubject(id: string, targetTermId: string): Promise<SubjectResponse> {
  return request<SubjectResponse>(`/api/v1/subjects/${encodeURIComponent(id)}/move`, {
    method: "PUT",
    body: JSON.stringify({ targetTermId })
  });
}
