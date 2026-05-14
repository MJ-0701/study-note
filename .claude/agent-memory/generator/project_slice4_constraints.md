---
name: slice-4 web UI build constraints
description: Persona-turn App.tsx had no auth before slice-4; admin role from API is lowercase; smoke-persona-turn is API-only
type: project
---

persona-turn/App.tsx had NO auth state or sign-in form before slice-4. The sign-in form for the main entry lives in `apps/web/src/main.ts` (vanilla TS lecture-reader). Slice-4 adds auth gate + sign-in + sign-up to the React persona-turn entry.

**2026-W20-sprint-3 slice-2 update:** Sign-up tab removed from persona-turn/App.tsx. `AuthForm` type + `switchForm()` + `handleSignUp()` + `authForm` state all removed. Not-signed-in screen now shows sign-in form only + "회원가입은 홈(/) 에서 진행하세요" message with `<a href="/">홈으로 이동</a>` link. Cascade = 0 lines outside App.tsx (all were locally scoped). Sign-up is now handled at `/` (main.ts lecture-reader entry) with tab toggle UI + POST `/api/v1/auth/sign-up` + `revalidateStoredSession()` on success.

**Why:** Sprint-2026-W20-sprint-3 D-plan-3/D-plan-4: sign-up UX consolidated to home; persona-turn sign-up removed.

**How to apply:** If persona-turn auth state changes are needed, only sign-in flow remains. Sign-up lives in main.ts with `authMode: "login" | "signup"` module-level state + `auth-tab-login` / `auth-tab-signup` data-actions.

Admin API (`GET /v1/admin/users`) returns role as **lowercase** (`"master" | "admin" | "normal"`) because `admin.service.ts` calls `user.role.toLowerCase()`. Defensive normalization on receipt is still good practice.

BACKEND_BASE in web = `import.meta.env.VITE_BACKEND_BASE ?? ""`. API calls use `/api/v1/...` prefix (relative, same-origin via nginx reverse proxy set up in slice-1).
