import type { CSSProperties } from "react";
import {
  buildRecentConversationItems,
  type ConversationListItemLike
} from "./recent-conversations";

const SUBJECTS = [
  { id: "digital-engineering", title: "디지털공학개론", nick: "디공이", active: true },
  { id: "information-communication", title: "정보통신개론", nick: "정통이", active: false },
  { id: "c-language", title: "C언어", nick: "씨랭이", active: false },
  { id: "computer-introduction", title: "컴퓨터개론", nick: "컴론이", active: false }
];

const subBase: CSSProperties = { paddingLeft: 24, fontSize: 13 };
const subActive: CSSProperties = { ...subBase, color: "#3b6ef5", fontWeight: 600 };
const subDisabled: CSSProperties = {
  ...subBase,
  opacity: 0.45,
  cursor: "not-allowed",
  pointerEvents: "none"
};

// sprint-8 slice-2 — "최근 대화" group 의 row style.
const recentRowBase: CSSProperties = {
  display: "block",
  paddingLeft: 12,
  fontSize: 13,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};
const recentRowActive: CSSProperties = {
  ...recentRowBase,
  color: "#3b6ef5",
  fontWeight: 600
};
const recentEmpty: CSSProperties = {
  paddingLeft: 12,
  fontSize: 12,
  color: "#9ca3af"
};

export function PersonaSidebar({
  activeSubjectId,
  role,
  conversations,
  activeConversationId
}: {
  activeSubjectId?: string;
  role?: "master" | "admin" | "reviewer" | "normal";
  // sprint-8 slice-2 — backend GET /v1/conversations 응답. App.tsx (slice-3) 가 주입.
  // 기본값 [] 로 slice-2 단독 commit 시에도 컴파일 안전.
  conversations?: ConversationListItemLike[];
  activeConversationId?: string | null;
}) {
  const showAdmin = role === "master" || role === "admin";
  const recentItems = buildRecentConversationItems(
    conversations ?? [],
    activeConversationId
  );
  return (
    <aside className="sidebar" aria-label="학습 내비게이션">
      <a className="wordmark" href="/">study-note</a>
      <div className="sidebar-group">
        <p className="group-label">홈</p>
        <nav>
          <a href="/">전체 현황 (Lecture Reader)</a>
        </nav>
      </div>
      <div className="sidebar-group">
        <p className="group-label">과목 공부</p>
        <nav>
          {SUBJECTS.map((s) => (
            <div key={s.id}>
              <a href={`/#/subjects/${s.id}`}>{s.title}</a>
              {s.active ? (
                <a
                  href={`/persona-turn.html?subject=${s.id}`}
                  style={activeSubjectId === s.id ? subActive : { ...subBase, color: "#3b6ef5" }}
                >
                  ↳ {s.nick} 호출
                </a>
              ) : (
                <a aria-disabled tabIndex={-1} style={subDisabled}>
                  ↳ {s.nick} 호출 (준비 중)
                </a>
              )}
            </div>
          ))}
        </nav>
      </div>
      {/* sprint-8 slice-2 — "최근 대화" group (D3=a lock). 빈 list 일 때 placeholder. */}
      <div className="sidebar-group" data-recent-conversations="true">
        <p className="group-label">💬 최근 대화</p>
        <nav>
          {recentItems.length === 0 ? (
            <p style={recentEmpty}>아직 대화 없음</p>
          ) : (
            recentItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                data-conversation-id={item.id}
                className={item.active ? "active" : undefined}
                title={`${item.subject} · ${item.label}`}
                style={item.active ? recentRowActive : recentRowBase}
              >
                {item.label}
              </a>
            ))
          )}
        </nav>
      </div>
      <div className="sidebar-group">
        <p className="group-label">🧩 MCP 연동</p>
        <nav>
          <a
            href="/onboarding-mcp.html"
            aria-label="MCP 연동 설정 가이드"
          >
            MCP 설정 가이드
          </a>
        </nav>
      </div>
      {showAdmin && (
        <div className="sidebar-group">
          <p className="group-label">🛡️ 관리자</p>
          <nav>
            <a href="/admin.html" aria-label="관리자 대시보드">
              사용자 관리
            </a>
          </nav>
        </div>
      )}
    </aside>
  );
}
