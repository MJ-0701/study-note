---
name: slice-3 admin API build constraints
description: Key technical constraints discovered when implementing slice-3 admin API + RolesGuard wiring
type: project
---

Seed user-dev-3 has devUserFlag=false, blocking sign-in via auth allowlist. Smoke tests needing a normal-role cookie must use sign-up to create a fresh NORMAL user (devUserFlag=true by default).

**Why:** AuthService.login rejects users with devUserFlag=false (F1 allowlist check). The normal user seed is intentionally blocked to test the reject/reactivate flow.

**How to apply:** Any smoke that needs a normal-role session must call POST /v1/auth/sign-up with a unique studentNumber not already seeded, then use the resulting cookie. Count assertions on the admin user list must account for the additional signed-up user.

PrismaModule is @Global() — AdminModule does NOT need to declare PrismaService. From sprint 2026-W20-sprint-4, AuthModule exists at packages/auth/src/auth.module.ts and exports all 5 auth providers. AdminModule and AppModule import AuthModule instead of redeclaring providers individually.

Audit log requires fetching the old value before update (read → update → log pattern). Race condition is acceptable for single-master local-only operation.
