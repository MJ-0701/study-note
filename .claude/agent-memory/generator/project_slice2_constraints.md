---
name: slice-2 auth migration build constraints
description: Key build boundary decisions from the slice-2 auth+session cookie migration
type: project
---

@types/express is NOT a declared dependency of @study-note/api. Import `type { Request, Response } from "express"` causes TS error. Pattern: define minimal inline interface types (NestRequest, NestResponse) instead.

packages/auth must not import from apps/api (build boundary). Any shared utility (PII redactor functions) must be inlined in auth.service.ts with a comment pointing to the canonical location in apps/api/src/common/logger/redactor.ts.

Why: discovered during slice-2 TS build — both fixed by rewriting types inline.
How to apply: check package.json devDependencies before any import from non-workspace external type packages in @study-note/api; check workspace boundary before cross-package imports between packages/ and apps/.
