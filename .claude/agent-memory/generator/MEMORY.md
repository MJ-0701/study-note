# Generator Agent Memory

- [slice-1 nginx+fetch base constraints (2026-W20-sprint-3)](project_slice1_w20s3_constraints.md) — personaTurns.ts + App.tsx also have own BACKEND_BASE; App.tsx constant flip is slice-1 not slice-2
- [slice-2 auth migration build constraints](project_slice2_constraints.md) — @types/express not in @study-note/api; inline minimal types pattern
- [slice-3 admin API build constraints](project_slice3_constraints.md) — user-dev-3 devUserFlag=false blocks sign-in; smoke uses sign-up for normal cookie; PrismaModule @Global so no re-declare needed; AdminModule redeclares auth chain
- [slice-4 web UI build constraints](project_slice4_constraints.md) — persona-turn had no auth before slice-4; admin role API is lowercase; smoke-persona-turn is API-only not browser
