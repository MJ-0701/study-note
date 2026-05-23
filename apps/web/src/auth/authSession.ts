export interface AuthSession {
  user: {
    id: string;
    displayName: string;
    studentNumber: string;
    role: string;
    email?: string;
  };
}

export type AuthMode = "login" | "signup";

export type LoginFeedback =
  | {
      kind: "error" | "success";
      title: string;
      detail: string;
    }
  | undefined;

// /v1/auth/me response shape: {userId, studentNumber, name, role}
export interface AuthMeResponse {
  userId: string;
  studentNumber: string;
  name: string;
  role: string;
}

// sign-in response shape: same as /me but returned on POST sign-in.
export type AuthSignInResponse = AuthMeResponse;

export function isAuthMeResponse(value: unknown): value is AuthMeResponse {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<AuthMeResponse>;
  return (
    typeof c.userId === "string" &&
    typeof c.studentNumber === "string" &&
    typeof c.name === "string" &&
    typeof c.role === "string"
  );
}

export function isAuthSignInResponse(value: unknown): value is AuthSignInResponse {
  return isAuthMeResponse(value);
}

export function meResponseToSession(resp: AuthMeResponse): AuthSession {
  return {
    user: {
      id: resp.userId,
      displayName: resp.name,
      studentNumber: resp.studentNumber,
      role: resp.role
    }
  };
}
