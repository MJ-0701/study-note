// sprint-8 slice-2 — PersonaSidebar 의 "최근 대화" group 의 pure view-model 빌더.
//
// 본 모듈은 backend `ConversationListItem` array 와 active id 를 받아 sidebar
// 가 그대로 render 할 view-model array 를 만든다. React 의존 없이 node:test
// 로 단위 검증 가능 — apps/web 의 vitest infra 부재 대응 (sprint-7 slice-1 패턴).

export interface ConversationListItemLike {
  id: string;
  subject: string;
  personaName: string;
  derivedTitle: string;
  turnCount: number;
}

export interface RecentConversationItem {
  /** 백엔드 Conversation id (cuid). */
  id: string;
  /** sidebar 의 anchor 텍스트 (derivedTitle 그대로 — backend 가 PII redact + 40자 truncate 완료). */
  label: string;
  /** subject (소속 페르소나 식별 표시 — 필요 시 sidebar 가 hover/aria-label 에 노출). */
  subject: string;
  /** 활성 conversation 여부. active=true 항목에 highlight className 적용. */
  active: boolean;
  /** URL fragment 라우팅 target. slice-3 의 buildConversationRoute 결과와 동일. */
  href: string;
}

/**
 * View-model 빌더 — sort/filter 등 별 transform 없이 받은 순서 (backend 가 updatedAt
 * desc 로 정렬) 그대로 1:1 매핑한다.
 *
 * 빈 conversations 입력 시 빈 배열 반환 — caller (PersonaSidebar) 가 placeholder
 * ("아직 대화 없음") 결정.
 */
export function buildRecentConversationItems(
  conversations: ConversationListItemLike[],
  activeConversationId: string | null | undefined
): RecentConversationItem[] {
  return conversations.map((c) => ({
    id: c.id,
    label: c.derivedTitle,
    subject: c.subject,
    active: c.id === activeConversationId,
    // slice-3 의 conversation-route.ts 가 정식 buildConversationRoute 를 export 하면
    // 그쪽으로 교체. 지금은 sidebar 가 anchor 만 render 하므로 string fragment 로 충분.
    href: `#/conversation/${c.id}`
  }));
}
