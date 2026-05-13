---
name: slice-1 nginx + fetch base constraints (2026-W20-sprint-3)
description: personaTurns.ts and App.tsx also have own BACKEND_BASE (not just admin/MCPOnboardingGate); App.tsx BACKEND_BASE flip is slice-1 even though UX is slice-2
type: project
---

personaTurns.ts (persona-turn/api/personaTurns.ts) has its own BACKEND_BASE constant with hardcoded default `http://127.0.0.1:3001` — not just admin.tsx and MCPOnboardingGate.tsx. Bundle inspection would fail unless this is also flipped to `?? ""`.

App.tsx (persona-turn/App.tsx) also has its own BACKEND_BASE constant. The sign-up tab UX is slice-2, but the BACKEND_BASE constant flip is the same one-liner change as admin.tsx and is owned by slice-1 for fetch-base unification.

**Why:** Plan §5.1 says "personaTurns.ts — base URL 검사"; actual code has its own BACKEND_BASE, not an apiBaseUrl prop. Bundle inspection threshold = 0 occurrences of 127.0.0.1 in dist/assets/*.js.

**How to apply:** When spec lists files with BACKEND_BASE to fix, grep all web src for BACKEND_BASE first — there may be more files than the spec lists. Fix all; boundary with slice-2 is UX/sign-up logic, not the constant line.

---
**Slice-2 additions (2026-W20-sprint-3):**
- `authMode: "login" | "signup"` module-level state added to main.ts
- `auth-tab-login` / `auth-tab-signup` data-actions in `handleDocumentClick`
- `handleDocumentSubmit` now handles both `action === "login"` and `action === "signup"`
- Sign-up success: calls `revalidateStoredSession()` (re-calls /me + PDF restore)
- CSS: `.auth-tabs`, `.auth-tab`, `.auth-tab.is-active` added to styles.css
- `<h1>` on login page changed to "study-note" (was "study-note 로그인") — tabs are self-describing
- `v1/auth/sign-up` URL appears in main bundle as template literal fragment (split by `${apiBaseUrl}` prefix); 0 occurrences in persona-turn bundle (correct)
