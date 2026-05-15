// sprint-8 slice-3 — `/persona-turn.html` 의 URL fragment 라우팅 (pure 함수).
//
// plan §3 AC3 lock:
//   - hash `#/conversation/<id>` → activeConversationId = <id>
//   - hash `#/` (또는 빈) → activeConversationId = null
//   - id 가 cuid 패턴 미일치 → activeConversationId = null (stale URL leak X)
//
// 본 모듈은 React 의존 없이 node:test 로 단위 검증한다 (apps/web vitest 부재).

// cuid v1 패턴 — sprint-3+ 의 backend 패턴과 동일 (`^c[a-z0-9]{24,}$/i`).
// frontend 는 안전을 위해 lower-bound 24 까지만 본다 (cuid2 등은 후속 sprint).
const CUID_PATTERN = /^c[a-z0-9]{24,}$/i;

export interface ConversationRouteState {
  conversationId: string | null;
}

/**
 * `window.location.hash` 입력을 받아 활성 conversationId 를 결정한다.
 *
 * Accepts:
 *   - `#/conversation/<cuid>` → { conversationId: <cuid> }
 *   - `#/` / `` / 다른 fragment → { conversationId: null }
 *   - id 가 cuid 패턴 미일치 → { conversationId: null } (stale URL leak X)
 */
export function parseConversationRoute(hash: string): ConversationRouteState {
  if (!hash) return { conversationId: null };
  const normalised = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = normalised.match(/^\/conversation\/([^/?#]+)/);
  if (!match) return { conversationId: null };
  const candidate = match[1] ?? "";
  if (!CUID_PATTERN.test(candidate)) return { conversationId: null };
  return { conversationId: candidate };
}

/** activeConversationId 를 URL fragment 로 변환. null 이면 "#/" 반환. */
export function buildConversationRoute(conversationId: string | null): string {
  if (!conversationId) return "#/";
  return `#/conversation/${conversationId}`;
}
