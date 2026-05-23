import {
  isAuthMeResponse,
  isAuthSignInResponse,
  type AuthMeResponse,
  type AuthSignInResponse
} from "./authSession";

interface AuthCredentials {
  name: string;
  studentNumber: string;
}

export class AuthApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

export async function requestAuthMe(
  apiBaseUrl: string,
  timeoutMs: number
): Promise<Response> {
  return fetchWithTimeout(`${apiBaseUrl}/v1/auth/me`, {
    credentials: "include"
  }, timeoutMs);
}

export async function signIn(
  apiBaseUrl: string,
  credentials: AuthCredentials
): Promise<AuthSignInResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    throw await authApiErrorFromResponse(response, "이름 또는 학번이 올바르지 않습니다.");
  }

  const payload = (await response.json()) as unknown;

  if (!isAuthSignInResponse(payload)) {
    throw new AuthApiError("로그인 응답 형식이 올바르지 않습니다.", response.status);
  }

  return payload;
}

export async function signUp(
  apiBaseUrl: string,
  credentials: AuthCredentials
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/v1/auth/sign-up`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    throw await authApiErrorFromResponse(response, `가입에 실패했습니다. (${String(response.status)})`);
  }
}

export function signOut(apiBaseUrl: string): Promise<Response> {
  return fetch(`${apiBaseUrl}/v1/auth/sign-out`, {
    method: "POST",
    credentials: "include"
  });
}

export function parseAuthMePayload(value: unknown): AuthMeResponse | undefined {
  return isAuthMeResponse(value) ? value : undefined;
}

async function authApiErrorFromResponse(
  response: Response,
  fallbackMessage: string
): Promise<AuthApiError> {
  const body = (await response.json().catch(() => ({}))) as {
    errorCode?: string;
    errorMessage?: string;
  };

  return new AuthApiError(
    body.errorMessage ?? fallbackMessage,
    response.status,
    body.errorCode
  );
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
