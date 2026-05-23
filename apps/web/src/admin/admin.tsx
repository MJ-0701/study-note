// admin.tsx — 관리자 대시보드 React entry.
// Mount on #admin-root.
import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";
import "./styles.css";
import { TermsPanel } from "./terms-panel";

const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined) ?? "";

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

function AdminApp() {
  const [bootState, setBootState] = useState<BootState>("checking");
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

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

  useEffect(() => {
    if (bootState === "ready") fetchUsers();
  }, [bootState, fetchUsers]);

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

        {unreviewedCount > 0 && (
          <div className="unreviewed-badge" role="status" aria-label={`신규 가입 미review ${unreviewedCount}명`}>
            <span className="unreviewed-badge-count">{unreviewedCount}</span>
            신규 가입 (미review)
          </div>
        )}

        {listError && (
          <div className="admin-error-banner" role="alert">
            {listError}
          </div>
        )}

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
      </div>
    </div>
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
