---
name: slice-5 audit log smoke constraints
description: Constraints for sprint-5 audit log + CANNOT_MODIFY_MASTER smoke scripts
type: project
---

Nest Logger writes audit lines to **stdout** (not stderr). The pii-redaction pattern (collect both stdout+stderr into logLines[]) correctly captures them. The admin-role-promote pattern (forward to stderr, no capture) is only correct for smokes that don't need log assertion.

Audit log format confirmed from admin.service.ts:
- `[Admin] role update userId=<id> from=<UPPER> to=<UPPER> actor=<actorId> at=<iso>`
- `[Admin] devUserFlag update userId=<id> from=<bool> to=<bool> actor=<actorId> at=<iso>`
- `[Admin] review marked userId=<id> reviewedAt=<iso> actor=<actorId>`

Sign-up response returns `{ userId, studentNumber, name, role }` — extract newUserId from `body.userId`.

Per-line actor= check (not global) is required — global check lets any single line lose `actor=` and still pass.

CANNOT_MODIFY_MASTER smoke: 1 case only (admin → user-dev-1/master, PUT NORMAL → 403). D-plan lock. ADMIN_CANNOT_PROMOTE_TO_MASTER case already lives in smoke-admin-role-promote.

Port ranges used: audit-log 4100+, cannot-modify-master 4200+ (avoid collision with other smokes using 4000+).

**Why:** Sprint-5 scope was "audit log emit + CANNOT_MODIFY_MASTER regression guard". 3 mutations by master on fresh sign-up user (not existing user-dev-1/2/3 to avoid cross-smoke interference).

**How to apply:** When writing log-capture smokes, always use pii-redaction's startBackend shape (both stdout+stderr piped into logLines[]). Use per-line find+includes for each expected log substring, not allLog.includes().
