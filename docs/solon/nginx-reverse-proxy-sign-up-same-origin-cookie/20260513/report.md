---
phase: report
status: final
sprint_id: "2026-W20-sprint-3"
workspace: "nginx-reverse-proxy-sign-up-same-origin-cookie"
handoff_dir: "docs/solon/nginx-reverse-proxy-sign-up-same-origin-cookie/20260513"
goal: "nginx reverse proxy + sign-up 홈 이동 + same-origin cookie 정착"
created_at: "2026-05-13T16:42:00+09:00"
last_touched_at: "2026-05-13T16:42:00+09:00"
closed_at: "2026-05-13T16:42:00+09:00"
---

# 보고서

## 1. 결과

- 목표: nginx reverse proxy + sign-up 홈 이동 + same-origin cookie 정착
- 상태: **done** (3 slice + 17 smoke PASS + live curl evidence)
- 판정: codex Gate 6 partial → CTO push-back accepted (1 round, sprint-2 의 6-round thrashing 학습)
- 한 줄 결과: web 의 nginx 가 `/api/*` 를 be-service:3000 으로 reverse proxy + apiBaseUrl/BACKEND_BASE 5 파일 relative `""` 갱신 + main.ts sign-up tab + persona-turn sign-up 제거 → localhost / 127.0.0.1 둘 다 cookie 작동

## 2. 완료한 것

- **slice-1 nginx + fetch base**: apps/web/nginx.conf 신규 (`/api/` → be-service:3000) + Dockerfile nginx stage 갱신. main.ts/admin.tsx/MCPOnboardingGate.tsx/personaTurns.ts/App.tsx 의 BACKEND_BASE `""` 로 변경. bundle 안 `127.0.0.1:3001` = 0 occurrence.
- **slice-2 sign-up UX**: main.ts (lecture-reader) 의 sign-in form 영역에 sign-up tab toggle 추가 (AuthMode + authMode state + 2 tab handlers + signup form action). persona-turn (App.tsx) 의 sign-up tab + state + handler 제거 + "회원가입은 홈(/) 에서 진행하세요" link.
- **slice-3 regression + handoff**: docker compose up -d --build fe-service + 17 smoke sweep PASS + live curl evidence (localhost /:200, /api/health:200, sign-in:200, me:200).

## 3. 결정

- nginx reverse proxy (옵션 A) — same-origin cookie 자동 작동. localhost / 127.0.0.1 둘 다 OK.
- sign-up = 홈 lecture-reader tab toggle.
- persona-turn = sign-in form 만 + "회원가입은 홈에서" link.
- SameSite/Secure 변경 X — HttpOnly + Secure + SameSite=Lax 유지.
- 신규 ADR 없음 — sprint-1 의 ADR 0001/0002/0003 그대로.

## 4. 검증

### 자동
| Build | Result |
|:--|:--|
| `@study-note/web build` | exit 0 (4 dist HTML entries) |
| `docker compose up -d --build fe-service` | exit 0 |
| bundle inspect `127.0.0.1:3001` | 0 occurrence |

| Smoke (17) | Result |
|:--|:--|
| auth-* (6) + mcp-* (4) + admin-* (4) + normal-access + persona-turn + corpus-ingest | 17/17 PASS |

### Live UAT curl
```
curl http://localhost/                                       → 200
curl http://localhost/api/health                              → 200
curl POST http://localhost/api/v1/auth/sign-in (채명정/20264514) → 200 + Set-Cookie HttpOnly Secure SameSite=Lax
curl GET  http://localhost/api/v1/auth/me  (with cookie)      → 200 + {userId:user-dev-1, role:master}
```

### 수동 (사용자 UAT)
- http://localhost/ 의 sign-in/회원가입 tab toggle 작동
- sign-up 신규 학번 → 즉시 sign-in + lecture-reader 진입
- /persona-turn.html not-signed-in → sign-in form + "회원가입은 홈에서" link
- /admin.html / /onboarding-mcp.html cookie 자동 전송 + role-aware UI

## 5. 위험 / 후속

- **위험 (수용)**: codex ops lens unbounded rubric (sprint-2 + sprint-3 동일) — push-back default 정합
- **후속** (handoff.md 5건):
  1. nginx server_name 도메인 화
  2. HTTPS / TLS termination
  3. vite dev server proxy
  4. sprint-1 + sprint-2 carry items
  5. onboarding doc 의 localhost troubleshooting

## 6. 남긴 것 / 접은 것

- **남김 (durable)**: `docs/solon/nginx-reverse-proxy-sign-up-same-origin-cookie/20260513/{retro,report}.md`
- **private (`.sfs-local/`)**: `sprints/2026-W20-sprint-3/{brainstorm,plan,review,handoff}.md` + tmp/review-{prompts,runs}

## 7. 다음

- 사용자 UAT (browser 의 localhost + 127.0.0.1 둘 다 sign-in/up 흐름 확인)
- Sprint-1 / 2 / 3 누적 commit (`sfs commit plan` + `sfs commit apply`)
- 후속 sprint 우선순위:
  - Conversation routes 인증 + ConversationService ownerId 본인 user 라우팅
  - AdminModule refactor (AuthModule 도입)
  - audit log 자동 smoke

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (193 tracked files), domains=0, last_review=partial, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-13T16:42:00+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
