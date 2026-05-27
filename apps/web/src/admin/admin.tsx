// admin.tsx — 관리자 대시보드 React entry.
// Mount on #admin-root.
import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";
import "./styles.css";
import { TermsPanel } from "./terms-panel";

const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "";

// 운영 지표 탭의 외부 원본 대시보드 link.
// VITE_PUBLIC_DASHBOARD_URL — primary (Datadog Public Dashboard 권장).
// VITE_GRAFANA_URL — secondary (self-host Grafana, 선택). 미설정 시 link 숨김.
interface ExternalDashboardLink {
  url: string;
  label: string;
}
function readExternalLinks(): ExternalDashboardLink[] {
  const links: ExternalDashboardLink[] = [];
  const ddUrl = (import.meta.env.VITE_PUBLIC_DASHBOARD_URL as string | undefined)?.trim();
  if (ddUrl) {
    const label =
      (import.meta.env.VITE_PUBLIC_DASHBOARD_LABEL as string | undefined)?.trim() ||
      "Datadog 원본 대시보드 (전문가용)";
    links.push({ url: ddUrl, label });
  }
  const grafanaUrl = (import.meta.env.VITE_GRAFANA_URL as string | undefined)?.trim();
  if (grafanaUrl) {
    const label =
      (import.meta.env.VITE_GRAFANA_LABEL as string | undefined)?.trim() ||
      "자체 Grafana 대시보드";
    links.push({ url: grafanaUrl, label });
  }
  return links;
}
const EXTERNAL_DASHBOARD_LINKS: ExternalDashboardLink[] = readExternalLinks();

type UserRole = "master" | "admin" | "normal";

type RoleFilter = "all" | "master" | "admin" | "normal";
type FlagFilter = "all" | "active" | "rejected";
type ReviewFilter = "all" | "reviewed" | "unreviewed";
type PageSize = 10 | 20 | 50;

function asRoleFilter(v: string): RoleFilter {
  if (v === "master" || v === "admin" || v === "normal") return v;
  return "all";
}

function asFlagFilter(v: string): FlagFilter {
  if (v === "active" || v === "rejected") return v;
  return "all";
}

function asReviewFilter(v: string): ReviewFilter {
  if (v === "reviewed" || v === "unreviewed") return v;
  return "all";
}

function asPageSize(v: string): PageSize {
  if (v === "10") return 10;
  if (v === "50") return 50;
  return 20;
}

interface AuthUser {
  userId: string;
  studentNumber: string;
  name: string;
  role: UserRole;
}

interface AdminUser {
  id: string;
  studentNumber: string;
  displayName: string;
  role: string;
  devUserFlag: boolean;
  reviewedAt: string | null;
  createdAt: string;
}

type OpsDashboardStatus = "ready" | "partial" | "not_configured" | "error";
type OpsCardStatus = "ok" | "warn" | "error" | "unknown";
type OpsCardSource = "apm" | "logs" | "rum";
type OpsCardUnit = "count" | "ms" | "percent";

interface OpsDashboardCard {
  id: string;
  label: string;
  value: number | null;
  unit: OpsCardUnit;
  status: OpsCardStatus;
  source: OpsCardSource;
  query: string;
  errorMessage?: string;
}

interface OpsDashboardResponse {
  source: "datadog";
  status: OpsDashboardStatus;
  message?: string;
  generatedAt: string;
  window: {
    from: string;
    to: string;
    minutes: number;
  };
  services: {
    api: string;
    web: string;
    env: string;
    site: string;
  };
  cards: OpsDashboardCard[];
}

type BootState = "checking" | "unauth" | "forbidden" | "ready" | "error";

function isUserRole(r: string): r is UserRole {
  return r === "master" || r === "admin" || r === "normal";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function formatOpsValue(card: OpsDashboardCard): string {
  if (card.value === null) return "-";

  if (card.unit === "count") {
    return card.value.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  }

  if (card.unit === "ms") {
    return `${card.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} ms`;
  }

  return `${card.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function opsStatusLabel(status: OpsCardStatus | OpsDashboardStatus): string {
  switch (status) {
    case "ready":
    case "ok":
      return "정상";
    case "partial":
    case "warn":
      return "주의";
    case "error":
      return "오류";
    case "not_configured":
    case "unknown":
      return "미설정";
    default:
      return status;
  }
}

function sourceLabel(source: OpsCardSource): string {
  if (source === "apm") return "백엔드";
  if (source === "logs") return "로그";
  return "사용자";
}

// 비개발자 친화 카드 설명. card.id 별 매핑. status 색상은 그대로 전달.
interface OpsCardCopy {
  title: string;
  description: string;
  emptyValue?: string;
}
const OPS_CARD_COPY: Record<string, OpsCardCopy> = {
  api_requests: {
    title: "백엔드 호출량",
    description: "최근 15분 동안 서버로 들어온 요청 수입니다. 0 = 트래픽 없음."
  },
  api_errors: {
    title: "백엔드 오류",
    description: "서버 5xx 응답 건수. 0 = 정상."
  },
  api_p95_latency: {
    title: "응답 지연 (상위 5%)",
    description: "응답 속도 하위 5% 사례 기준. 800ms 이하 정상, 2초 이상 오류.",
    emptyValue: "응답 즉시"
  },
  sync_put_success: {
    title: "필기 자동저장 성공",
    description: "PDF 위 필기·메모가 서버에 자동저장된 횟수."
  },
  sync_put_failure: {
    title: "필기 자동저장 실패",
    description: "자동저장 실패 횟수. 0 = 안정. 양수면 BE 5xx 또는 네트워크 문제."
  },
  sync_conflicts: {
    title: "동시 편집 충돌",
    description: "여러 기기에서 같은 PDF 를 편집해서 발생한 충돌 수. 0 = 정상."
  },
  rum_sessions: {
    title: "방문 세션",
    description: "최근 15분 동안 학생 브라우저에서 발생한 학습 세션 수."
  },
  rum_errors: {
    title: "프론트엔드 오류",
    description: "사용자 브라우저에서 발생한 JS 오류 수. 0 = 정상."
  },
  rum_actions: {
    title: "사용자 동작",
    description: "클릭·입력·페이지 이동 등 사용자 인터랙션 카운트."
  }
};

function getOpsCardCopy(card: OpsDashboardCard): OpsCardCopy {
  return OPS_CARD_COPY[card.id] ?? { title: card.label, description: "" };
}

function RoleBadge({ role }: { role: string }) {
  const cls = role === "master" ? "master" : role === "admin" ? "admin" : "normal";
  return <span className={`role-badge ${cls}`}>{role}</span>;
}

function FlagBadge({ active }: { active: boolean }) {
  return (
    <span className={`flag-badge ${active ? "active" : "rejected"}`}>
      {active ? "활성" : "반려"}
    </span>
  );
}

function ReviewBadge({ reviewedAt }: { reviewedAt: string | null }) {
  if (!reviewedAt) {
    return <span className="review-badge unreviewed">미review</span>;
  }
  return <span className="review-badge reviewed">{formatDate(reviewedAt)}</span>;
}

// Roles available in the dropdown, conditioned on viewer role.
function roleOptions(viewerRole: UserRole): { value: string; label: string }[] {
  if (viewerRole === "master") {
    return [
      { value: "MASTER", label: "MASTER" },
      { value: "ADMIN", label: "ADMIN" },
      { value: "NORMAL", label: "NORMAL" }
    ];
  }
  // admin: no MASTER option
  return [
    { value: "ADMIN", label: "ADMIN" },
    { value: "NORMAL", label: "NORMAL" }
  ];
}

type AdminTab = "users" | "ops";

function asAdminTab(hash: string): AdminTab {
  // location.hash includes leading `#`. tolerate both `#ops` and bare `ops`.
  const trimmed = hash.replace(/^#\/?/, "").trim().toLowerCase();
  if (trimmed === "ops") return "ops";
  return "users";
}

function AdminApp() {
  const [bootState, setBootState] = useState<BootState>("checking");
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [opsDashboard, setOpsDashboard] = useState<OpsDashboardResponse | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  // Tab routing — sidebar 의 '관리자' 메뉴 하위로 사용자 관리 / 운영 지표 두 별도 페이지.
  // URL hash 로 라우팅 (#users / #ops). default = users.
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    typeof window === "undefined" ? "users" : asAdminTab(window.location.hash)
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => setActiveTab(asAdminTab(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Per-row action state: keyed by user id
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string | null>>({});
  // Per-row role select state
  const [rowRoleSelect, setRowRoleSelect] = useState<Record<string, string>>({});

  // Filter / search / pagination state
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [searchQ, setSearchQ] = useState<string>("");
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Boot: fetch /me
  useEffect(() => {
    fetch(`${BACKEND_BASE}/api/v1/auth/me`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401 || res.status === 503) {
          setBootState("unauth");
          return;
        }
        if (!res.ok) {
          setBootState("error");
          return;
        }
        const data = await res.json() as { userId: string; studentNumber: string; name: string; role: string };
        if (!isUserRole(data.role)) {
          setBootState("error");
          return;
        }
        if (data.role === "normal") {
          setBootState("forbidden");
          return;
        }
        setViewer({ userId: data.userId, studentNumber: data.studentNumber, name: data.name, role: data.role });
        setBootState("ready");
      })
      .catch(() => {
        setBootState("error");
      });
  }, []);

  const fetchUsers = useCallback(() => {
    setListLoading(true);
    setListError(null);
    fetch(`${BACKEND_BASE}/api/v1/admin/users`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { errorMessage?: string };
          setListError(body.errorMessage ?? `사용자 목록 조회 실패 (${res.status})`);
          return;
        }
        // Normalize role to lowercase defensively (API already lowercases, but guard drift)
        const normalized = (await res.json() as AdminUser[]).map((u) => ({
          ...u,
          role: u.role.toLowerCase()
        }));
        setUsers(normalized);
        // Initialize role selects to current role (uppercased for PUT body)
        const initial: Record<string, string> = {};
        for (const u of normalized) {
          initial[u.id] = u.role.toUpperCase();
        }
        setRowRoleSelect(initial);
      })
      .catch(() => {
        setListError("네트워크 오류 — backend 가 떠있는지 확인하세요.");
      })
      .finally(() => setListLoading(false));
  }, []);

  const fetchOpsDashboard = useCallback(() => {
    setOpsLoading(true);
    setOpsError(null);
    fetch(`${BACKEND_BASE}/api/v1/admin/ops-dashboard`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { errorMessage?: string };
          setOpsError(body.errorMessage ?? `운영 지표 조회 실패 (${res.status})`);
          return;
        }
        const snapshot = await res.json() as OpsDashboardResponse;
        setOpsDashboard(snapshot);
      })
      .catch(() => {
        setOpsError("Datadog 운영 지표 네트워크 오류");
      })
      .finally(() => setOpsLoading(false));
  }, []);

  useEffect(() => {
    if (bootState !== "ready") return;
    // tab 별 lazy fetch — users / ops 진입할 때만 해당 API 호출.
    if (activeTab === "users") {
      fetchUsers();
    } else {
      fetchOpsDashboard();
    }
  }, [bootState, activeTab, fetchUsers, fetchOpsDashboard]);

  // Reset currentPage to 1 when filters/search/pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, flagFilter, reviewFilter, searchQ, pageSize]);

  function setRowBusy(id: string, busy: boolean) {
    setRowLoading((prev) => ({ ...prev, [id]: busy }));
  }
  function setRowErr(id: string, msg: string | null) {
    setRowError((prev) => ({ ...prev, [id]: msg }));
  }

  async function handleRoleChange(targetId: string) {
    if (!viewer) return;
    const role = rowRoleSelect[targetId];
    if (!role) return;
    setRowBusy(targetId, true);
    setRowErr(targetId, null);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/v1/admin/users/${encodeURIComponent(targetId)}/role`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { errorMessage?: string };
        setRowErr(targetId, body.errorMessage ?? `등업 실패 (${res.status})`);
        return;
      }
      fetchUsers();
    } catch {
      setRowErr(targetId, "네트워크 오류");
    } finally {
      setRowBusy(targetId, false);
    }
  }

  async function handleFlagToggle(targetId: string, currentFlag: boolean) {
    if (!viewer) return;
    setRowBusy(targetId, true);
    setRowErr(targetId, null);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/v1/admin/users/${encodeURIComponent(targetId)}/dev-user-flag`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devUserFlag: !currentFlag })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { errorMessage?: string };
        setRowErr(targetId, body.errorMessage ?? `반려/활성 변경 실패 (${res.status})`);
        return;
      }
      fetchUsers();
    } catch {
      setRowErr(targetId, "네트워크 오류");
    } finally {
      setRowBusy(targetId, false);
    }
  }

  async function handleReview(targetId: string) {
    if (!viewer) return;
    setRowBusy(targetId, true);
    setRowErr(targetId, null);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/v1/admin/users/${encodeURIComponent(targetId)}/review`, {
        method: "PUT",
        credentials: "include"
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { errorMessage?: string };
        setRowErr(targetId, body.errorMessage ?? `review 실패 (${res.status})`);
        return;
      }
      fetchUsers();
    } catch {
      setRowErr(targetId, "네트워크 오류");
    } finally {
      setRowBusy(targetId, false);
    }
  }

  // Boot states
  if (bootState === "checking") {
    return (
      <div className="admin-page">
        <div className="admin-status">
          <p className="admin-status-title">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (bootState === "unauth") {
    return (
      <div className="admin-page">
        <div className="admin-status">
          <p className="admin-status-title">사인인이 필요합니다</p>
          <p className="admin-status-body">대시보드에 접근하려면 먼저 로그인하세요.</p>
          <a href="/" style={{ marginTop: 12 }}>홈으로 돌아가기</a>
        </div>
      </div>
    );
  }

  if (bootState === "forbidden") {
    return (
      <div className="admin-page">
        <div className="admin-status">
          <p className="admin-status-title">관리자 권한이 필요합니다</p>
          <p className="admin-status-body">403 — master 또는 admin 계정으로 로그인하세요.</p>
          <a href="/" style={{ marginTop: 12 }}>홈으로 돌아가기</a>
        </div>
      </div>
    );
  }

  if (bootState === "error") {
    return (
      <div className="admin-page">
        <div className="admin-status">
          <p className="admin-status-title">오류가 발생했습니다</p>
          <p className="admin-status-body">페이지를 새로고침하거나 backend 상태를 확인하세요.</p>
          <a href="/admin.html" style={{ marginTop: 12 }}>새로고침</a>
        </div>
      </div>
    );
  }

  // Dashboard
  // unreviewedCount always computed from raw users (filter-independent)
  const unreviewedCount = users.filter((u) => u.reviewedAt === null).length;
  const viewerRole = viewer!.role;

  return (
    <div className="admin-page">
      <div className="admin-inner">
        <header className="admin-header">
          <a className="admin-home-link" href="/" aria-label="홈으로 돌아가기">← 홈</a>
          <h1>관리자 대시보드</h1>
          <span className="admin-meta">
            {viewer!.name} ({viewer!.studentNumber}) · {viewerRole}
          </span>
        </header>

        <nav className="admin-tabs" role="tablist" aria-label="관리자 탭">
          <a
            href="#users"
            role="tab"
            aria-selected={activeTab === "users"}
            className={`admin-tab ${activeTab === "users" ? "is-active" : ""}`}
          >
            사용자 관리
          </a>
          <a
            href="#ops"
            role="tab"
            aria-selected={activeTab === "ops"}
            className={`admin-tab ${activeTab === "ops" ? "is-active" : ""}`}
          >
            운영 지표
          </a>
        </nav>

        {activeTab === "ops" && (
          <OpsDashboardPanel
            dashboard={opsDashboard}
            loading={opsLoading}
            error={opsError}
            onRefresh={fetchOpsDashboard}
          />
        )}

        {activeTab === "users" && unreviewedCount > 0 && (
          <div className="unreviewed-badge" role="status" aria-label={`신규 가입 미review ${unreviewedCount}명`}>
            <span className="unreviewed-badge-count">{unreviewedCount}</span>
            신규 가입 (미review)
          </div>
        )}

        {activeTab === "users" && listError && (
          <div className="admin-error-banner" role="alert">
            {listError}
          </div>
        )}

        {activeTab === "users" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={fetchUsers}
              disabled={listLoading}
              aria-label="목록 새로고침"
            >
              {listLoading ? "불러오는 중..." : "새로고침"}
            </button>
          </div>
        )}

        {activeTab === "users" && (<>
        {/* Toolbar */}
        <div className="admin-toolbar" role="search" aria-label="사용자 필터 및 검색">
          <label className="admin-toolbar-item">
            <span className="admin-toolbar-label">Role</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(asRoleFilter(e.target.value))}
              aria-label="Role 필터"
            >
              <option value="all">all</option>
              <option value="master">master</option>
              <option value="admin">admin</option>
              <option value="normal">normal</option>
            </select>
          </label>

          <label className="admin-toolbar-item">
            <span className="admin-toolbar-label">Flag</span>
            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(asFlagFilter(e.target.value))}
              aria-label="devUserFlag 필터"
            >
              <option value="all">all</option>
              <option value="active">active</option>
              <option value="rejected">rejected</option>
            </select>
          </label>

          <label className="admin-toolbar-item">
            <span className="admin-toolbar-label">Review</span>
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(asReviewFilter(e.target.value))}
              aria-label="review 상태 필터"
            >
              <option value="all">all</option>
              <option value="reviewed">reviewed</option>
              <option value="unreviewed">unreviewed</option>
            </select>
          </label>

          <label className="admin-toolbar-item admin-toolbar-search">
            <span className="admin-toolbar-label">Search</span>
            <input
              type="search"
              placeholder="학번 또는 이름"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              aria-label="학번 또는 이름 검색"
            />
          </label>

          <label className="admin-toolbar-item">
            <span className="admin-toolbar-label">PageSize</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(asPageSize(e.target.value))}
              aria-label="페이지 크기"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>

        {listLoading && users.length === 0 ? (
          <div className="admin-status" style={{ minHeight: "20vh" }}>
            <p className="admin-status-body">목록 불러오는 중...</p>
          </div>
        ) : (
          <FilteredTable
            users={users}
            listLoading={listLoading}
            roleFilter={roleFilter}
            flagFilter={flagFilter}
            reviewFilter={reviewFilter}
            searchQ={searchQ}
            pageSize={pageSize}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            viewer={viewer!}
            viewerRole={viewerRole}
            rowLoading={rowLoading}
            rowError={rowError}
            rowRoleSelect={rowRoleSelect}
            setRowRoleSelect={setRowRoleSelect}
            handleRoleChange={handleRoleChange}
            handleFlagToggle={handleFlagToggle}
            handleReview={handleReview}
          />
        )}

        <TermsPanel viewerId={viewer!.userId} viewerRole={viewerRole} />
        </>)}
      </div>
    </div>
  );
}

interface OpsDashboardPanelProps {
  dashboard: OpsDashboardResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function summarizeOpsStatus(dashboard: OpsDashboardResponse | null): {
  label: string;
  detail: string;
  tone: OpsCardStatus | OpsDashboardStatus;
} {
  if (!dashboard) {
    return { label: "불러오는 중", detail: "Datadog 응답을 기다리는 중입니다.", tone: "unknown" };
  }
  const okCount = dashboard.cards.filter((c) => c.status === "ok").length;
  const warnCount = dashboard.cards.filter((c) => c.status === "warn").length;
  const errCount = dashboard.cards.filter((c) => c.status === "error").length;
  const total = dashboard.cards.length;

  if (dashboard.status === "not_configured") {
    return {
      label: "미설정",
      detail: "Datadog API 키가 설정되지 않았습니다. 외부 대시보드로 확인하세요.",
      tone: "not_configured" as OpsDashboardStatus
    };
  }
  if (errCount > 0 && errCount === total) {
    return { label: "오류", detail: "지표 조회에 모두 실패했습니다.", tone: "error" };
  }
  if (warnCount > 0 || errCount > 0) {
    return {
      label: "주의",
      detail: `${total} 지표 중 정상 ${okCount} · 주의 ${warnCount} · 오류 ${errCount}.`,
      tone: "warn"
    };
  }
  return {
    label: "정상",
    detail: `최근 ${dashboard.window.minutes}분 — 모든 지표 정상 (${total} 항목).`,
    tone: "ok"
  };
}

function OpsDashboardPanel({ dashboard, loading, error, onRefresh }: OpsDashboardPanelProps) {
  const summary = summarizeOpsStatus(dashboard);
  return (
    <section className="ops-panel" aria-labelledby="ops-dashboard-title">
      <div className="ops-panel-header">
        <div>
          <h2 id="ops-dashboard-title">운영 지표</h2>
          <p className="ops-panel-meta">
            {dashboard
              ? `${formatDate(dashboard.generatedAt)} 기준 · 환경 ${dashboard.services.env}`
              : "운영 지표 불러오는 중..."}
          </p>
        </div>
        <div className="ops-panel-actions">
          <span className={`ops-status ${summary.tone}`}>{summary.label}</span>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "조회 중..." : "지표 새로고침"}
          </button>
        </div>
      </div>

      <p className="ops-panel-summary">
        {summary.detail}
      </p>

      {error && (
        <div className="admin-error-banner" role="alert">
          {error}
        </div>
      )}

      {dashboard?.message && (
        <div className={`ops-message ${dashboard.status}`}>
          {dashboard.message}
        </div>
      )}

      {EXTERNAL_DASHBOARD_LINKS.length > 0 && (
        <div className="ops-external-link" role="note">
          <p>
            <strong>상세 그래프는 외부 운영 대시보드에서 확인하세요.</strong>{" "}
            그래프·필터·시간 범위 조절·전체 히스토리는 아래 링크 클릭.
          </p>
          <div className="ops-external-link-row">
            {EXTERNAL_DASHBOARD_LINKS.map((link) => (
              <a
                key={link.url}
                className="ops-external-link-btn"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label} 열기 ↗
              </a>
            ))}
          </div>
        </div>
      )}

      <details className="ops-card-details">
        <summary>지표 항목 펼쳐 보기 (서비스 별 9 항목)</summary>
        <p className="ops-panel-explainer">
          각 항목은 Datadog (APM · 로그 · 사용자 브라우저 RUM) 의 최근 15 분 데이터를 서버 측에서 가공한 결과입니다.
          숫자 자체보다 <strong>정상 / 주의 / 오류</strong> 색상에 주목하세요. 상세 추세는 위 외부 대시보드.
        </p>
        {loading && !dashboard ? (
          <div className="ops-loading">Datadog 에서 지표를 불러오는 중...</div>
        ) : (
          <div className="ops-card-grid">
            {(dashboard?.cards ?? []).map((card) => {
              const copy = getOpsCardCopy(card);
              const displayValue =
                card.value === 0 && copy.emptyValue ? copy.emptyValue : formatOpsValue(card);
              return (
                <article className={`ops-card ${card.status}`} key={card.id}>
                  <div className="ops-card-topline">
                    <span className="ops-source">{sourceLabel(card.source)}</span>
                    <span className={`ops-card-status ${card.status}`}>
                      {opsStatusLabel(card.status)}
                    </span>
                  </div>
                  <div className="ops-card-value">{displayValue}</div>
                  <h3>{copy.title}</h3>
                  {copy.description && (
                    <p className="ops-card-description">{copy.description}</p>
                  )}
                  {card.errorMessage && (
                    <p className="ops-card-error">
                      Datadog 데이터를 가져오지 못했습니다. 외부 대시보드에서 직접 확인하세요.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </details>
    </section>
  );
}

interface FilteredTableProps {
  users: AdminUser[];
  listLoading: boolean;
  roleFilter: RoleFilter;
  flagFilter: FlagFilter;
  reviewFilter: ReviewFilter;
  searchQ: string;
  pageSize: PageSize;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  viewer: AuthUser;
  viewerRole: UserRole;
  rowLoading: Record<string, boolean>;
  rowError: Record<string, string | null>;
  rowRoleSelect: Record<string, string>;
  setRowRoleSelect: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleRoleChange: (id: string) => void;
  handleFlagToggle: (id: string, currentFlag: boolean) => void;
  handleReview: (id: string) => void;
}

function FilteredTable({
  users,
  listLoading,
  roleFilter,
  flagFilter,
  reviewFilter,
  searchQ,
  pageSize,
  currentPage,
  setCurrentPage,
  viewer,
  viewerRole,
  rowLoading,
  rowError,
  rowRoleSelect,
  setRowRoleSelect,
  handleRoleChange,
  handleFlagToggle,
  handleReview
}: FilteredTableProps) {
  // Pipeline: filter → search → split into pages
  const filteredUsers = useMemo(() => {
    let result = users;

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    // Flag filter: "active" → devUserFlag true, "rejected" → devUserFlag false
    if (flagFilter !== "all") {
      const wantActive = flagFilter === "active";
      result = result.filter((u) => u.devUserFlag === wantActive);
    }

    // Review filter
    if (reviewFilter !== "all") {
      const wantReviewed = reviewFilter === "reviewed";
      result = result.filter((u) => wantReviewed ? u.reviewedAt !== null : u.reviewedAt === null);
    }

    // Search: case-insensitive substring match on studentNumber OR displayName
    const q = searchQ.trim().toLowerCase();
    if (q !== "") {
      result = result.filter(
        (u) =>
          u.studentNumber.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [users, roleFilter, flagFilter, reviewFilter, searchQ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / pageSize)),
    [filteredUsers.length, pageSize]
  );

  // Clamp currentPage if filteredUsers shrinks
  const safePage = Math.min(currentPage, totalPages);

  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  const isEmpty = filteredUsers.length === 0;
  const isRawEmpty = users.length === 0;

  return (
    <>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">학번</th>
              <th scope="col">이름</th>
              <th scope="col">role</th>
              <th scope="col">devUserFlag</th>
              <th scope="col">reviewedAt</th>
              <th scope="col">가입일</th>
              <th scope="col">액션</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u) => {
              const isSelf = viewer.userId === u.id;
              const busy = !!rowLoading[u.id];
              const err = rowError[u.id] ?? null;
              const selectedRole = rowRoleSelect[u.id] ?? u.role.toUpperCase();
              const options = roleOptions(viewerRole);
              // 권한 위계 보호: admin viewer 는 master row 변경 X (backend 도 CANNOT_MODIFY_MASTER 거부).
              const lockedByHierarchy = viewerRole === "admin" && u.role === "master";
              const rowLocked = isSelf || lockedByHierarchy;
              const lockTitle = isSelf
                ? "본인 row 변경 X"
                : lockedByHierarchy
                  ? "admin 권한으로 master 변경 X"
                  : undefined;

              return (
                <tr key={u.id}>
                  <td>{u.studentNumber}</td>
                  <td>{u.displayName}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><FlagBadge active={u.devUserFlag} /></td>
                  <td><ReviewBadge reviewedAt={u.reviewedAt} /></td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--ds-fg-soft)" }}>
                    {formatDate(u.createdAt)}
                  </td>
                  <td>
                    <div className="actions-cell">
                      {/* 등업: role select + apply button */}
                      <select
                        className="role-select"
                        value={selectedRole}
                        onChange={(e) =>
                          setRowRoleSelect((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        disabled={busy || rowLocked}
                        aria-label={`${u.displayName} role 선택`}
                        title={lockTitle}
                      >
                        {options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="action-btn primary"
                        onClick={() => handleRoleChange(u.id)}
                        disabled={busy || rowLocked}
                        aria-label={`${u.displayName} 등업 적용`}
                        title={lockTitle ?? "등업"}
                      >
                        등업
                      </button>

                      {/* 반려/재활성 toggle — master only */}
                      {viewerRole === "master" ? (
                        <button
                          type="button"
                          className={`action-btn ${u.devUserFlag ? "danger" : ""}`}
                          onClick={() => handleFlagToggle(u.id, u.devUserFlag)}
                          disabled={busy || rowLocked}
                          aria-label={
                            u.devUserFlag
                              ? `${u.displayName} 반려`
                              : `${u.displayName} 재활성`
                          }
                          title={lockTitle ?? (u.devUserFlag ? "반려" : "재활성")}
                        >
                          {u.devUserFlag ? "반려" : "재활성"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="action-btn danger"
                          disabled
                          aria-label={`${u.displayName} 반려 (master 권한 필요)`}
                          title="master 권한 필요"
                        >
                          반려
                        </button>
                      )}

                      {/* review 버튼 — master/admin */}
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => handleReview(u.id)}
                        disabled={busy || rowLocked}
                        aria-label={`${u.displayName} review 완료 표시`}
                        title={lockTitle ?? "review 완료 표시"}
                      >
                        review
                      </button>

                      {/* Per-row error */}
                      {err && (
                        <span className="row-error" role="alert">
                          {err}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {isEmpty && !listLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--ds-muted)", padding: "24px 12px" }}>
                  {isRawEmpty
                    ? "사용자가 없습니다."
                    : "조건에 맞는 사용자가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — hidden when 0 results */}
      {!isEmpty && (
        <div className="admin-pagination" role="navigation" aria-label="페이지 네비게이션">
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            aria-label="이전 페이지"
          >
            &#8249; Prev
          </button>

          {totalPages <= 5 ? (
            // Numbered buttons for ≤ 5 pages
            Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`admin-pagination-btn${p === safePage ? " active" : ""}`}
                onClick={() => setCurrentPage(p)}
                aria-label={`페이지 ${p}`}
                aria-current={p === safePage ? "page" : undefined}
              >
                {p}
              </button>
            ))
          ) : (
            // Simple prev/next + page indicator for > 5 pages
            <span className="admin-pagination-info">
              Page {safePage} of {totalPages}
            </span>
          )}

          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            aria-label="다음 페이지"
          >
            Next &#8250;
          </button>
        </div>
      )}
    </>
  );
}

const rootEl = document.getElementById("admin-root");
if (!rootEl) {
  throw new Error("admin-root element missing in admin.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);
