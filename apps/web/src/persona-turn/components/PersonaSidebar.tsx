import type { CSSProperties } from "react";

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

export function PersonaSidebar({
  activeSubjectId,
  role
}: {
  activeSubjectId?: string;
  role?: "master" | "admin" | "normal";
}) {
  const showAdmin = role === "master" || role === "admin";
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
