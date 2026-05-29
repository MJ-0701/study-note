// sprint-W21-sprint-1 / S1 / AC5 + AC5b — 학기/과목 admin panel.
//
// Term/Subject CRUD UI:
// - Term: grade 1~4 select + semester 1~2 select + title required + startDate/endDate optional
// - Subject: term select + title
// - Delete confirm modal + child-count preflight (count>0 = disabled hint)
// - XSS rendering: React 텍스트 노드 자동 escape (AC1b)

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createSubject,
  createTerm,
  deleteSubject,
  deleteTerm,
  getSubjectChildCount,
  getTermChildCount,
  listSubjects,
  listTerms,
  moveSubject,
  updateSubject,
  updateTerm,
  type SubjectResponse,
  type TermAdminResponse
} from "../api/terms";

type UserRole = "master" | "admin" | "reviewer" | "normal";

export interface TermsPanelProps {
  viewerId: string;
  viewerRole: UserRole;
}

type Mode = "list" | "create-term" | "edit-term" | "create-subject" | "edit-subject" | "move-subject";

interface ConfirmDelete {
  kind: "term" | "subject";
  id: string;
  label: string;
  childCount: number | null;
  childLabel: string;
  loadingCount: boolean;
}

export function TermsPanel({ viewerId, viewerRole }: TermsPanelProps) {
  const [terms, setTerms] = useState<TermAdminResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [editingTerm, setEditingTerm] = useState<TermAdminResponse | null>(null);
  const [editingSubject, setEditingSubject] = useState<SubjectResponse | null>(null);
  const [movingSubject, setMovingSubject] = useState<SubjectResponse | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDelete | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [termsRes, subjectsRes] = await Promise.all([listTerms(), listSubjects()]);
      setTerms(termsRes);
      setSubjects(subjectsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subjectsByTerm = useMemo(() => {
    const map = new Map<string, SubjectResponse[]>();
    for (const s of subjects) {
      const key = s.termId ?? "__orphan__";
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [subjects]);

  function canEditTerm(term: TermAdminResponse): boolean {
    if (viewerRole === "master") return true;
    if (viewerRole !== "admin") return false;
    return term.createdById === viewerId;
  }

  async function openDeleteTerm(term: TermAdminResponse) {
    setConfirm({
      kind: "term",
      id: term.id,
      label: `${term.grade}학년 ${term.semester}학기 ${term.title}`,
      childCount: null,
      childLabel: "Subject",
      loadingCount: true
    });
    try {
      const { subjectCount } = await getTermChildCount(term.id);
      setConfirm((prev) => (prev && prev.id === term.id ? { ...prev, childCount: subjectCount, loadingCount: false } : prev));
    } catch (err) {
      setConfirm((prev) => (prev && prev.id === term.id ? { ...prev, childCount: 0, loadingCount: false } : prev));
      setError(err instanceof Error ? err.message : "자식 카운트 조회 실패");
    }
  }

  async function openDeleteSubject(subject: SubjectResponse) {
    setConfirm({
      kind: "subject",
      id: subject.id,
      label: subject.title,
      childCount: null,
      childLabel: "PdfMaterial",
      loadingCount: true
    });
    try {
      const { materialCount } = await getSubjectChildCount(subject.id);
      setConfirm((prev) => (prev && prev.id === subject.id ? { ...prev, childCount: materialCount, loadingCount: false } : prev));
    } catch (err) {
      setConfirm((prev) => (prev && prev.id === subject.id ? { ...prev, childCount: 0, loadingCount: false } : prev));
      setError(err instanceof Error ? err.message : "자식 카운트 조회 실패");
    }
  }

  async function confirmDelete() {
    if (!confirm || confirm.childCount === null || confirm.childCount > 0) return;
    try {
      if (confirm.kind === "term") {
        await deleteTerm(confirm.id);
      } else {
        await deleteSubject(confirm.id);
      }
      setConfirm(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  return (
    <section className="terms-panel" aria-label="학기/과목 관리">
      <header className="terms-panel-header">
        <h2>학기/과목 관리</h2>
        <div className="terms-panel-actions">
          <button type="button" className="action-btn primary" onClick={() => setMode("create-term")}>
            + 학기 추가
          </button>
          <button type="button" className="action-btn" onClick={() => setMode("create-subject")} disabled={terms.length === 0}>
            + 과목 추가
          </button>
          <button type="button" className="action-btn" onClick={refresh} disabled={loading}>
            {loading ? "..." : "새로고침"}
          </button>
        </div>
      </header>

      {error && <div className="admin-error-banner" role="alert">{error}</div>}

      {terms.length === 0 && !loading && (
        <p className="terms-empty">등록된 학기가 없습니다. "학기 추가" 로 시작하세요.</p>
      )}

      {/* Codex Round-2 P2: backfill 전 termId=null orphan Subject 가 invisible
          하지 않도록 별도 section. master 만 수정/삭제 가능 (BE ensureParentTermAllowed). */}
      {(() => {
        const orphans = subjectsByTerm.get("__orphan__") ?? [];
        if (orphans.length === 0) return null;
        const canMutateOrphan = viewerRole === "master";
        return (
          <section className="term-card term-card-orphan" aria-label="미할당 과목">
            <div className="term-card-header">
              <span className="term-card-meta" style={{ color: "#b45309" }}>⚠ 미할당</span>
              <strong className="term-card-title">학기 미배정 과목 ({orphans.length}건)</strong>
              <span className="term-card-date" style={{ color: "#b45309" }}>
                backfill 스크립트 실행 전까지 임시 표시 — master 만 수정/삭제 가능
              </span>
            </div>
            <ul className="subject-list">
              {orphans.map((subject) => (
                <li key={subject.id} className="subject-row">
                  <span className="subject-title">{subject.title}</span>
                  <span className="subject-row-actions">
                    <button
                      type="button"
                      className="action-btn small"
                      disabled={!canMutateOrphan}
                      title={canMutateOrphan ? "수정" : "master 권한 필요"}
                      onClick={() => {
                        setEditingSubject(subject);
                        setMode("edit-subject");
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="action-btn small danger"
                      disabled={!canMutateOrphan}
                      title={canMutateOrphan ? "삭제" : "master 권한 필요"}
                      onClick={() => openDeleteSubject(subject)}
                    >
                      삭제
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      <ul className="terms-list">
        {terms.map((term) => {
          const termSubjects = subjectsByTerm.get(term.id) ?? [];
          const editable = canEditTerm(term);
          return (
            <li key={term.id} className="term-card">
              <div className="term-card-header">
                <span className="term-card-meta">{term.grade}학년 {term.semester}학기</span>
                <strong className="term-card-title">{term.title}</strong>
                {(term.startDate || term.endDate) && (
                  <span className="term-card-date">
                    {term.startDate ?? "?"} ~ {term.endDate ?? "?"}
                  </span>
                )}
                <span className="term-card-actions">
                  <button
                    type="button"
                    className="action-btn"
                    disabled={!editable}
                    title={editable ? "수정" : "수정 권한 없음"}
                    onClick={() => {
                      setEditingTerm(term);
                      setMode("edit-term");
                    }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="action-btn danger"
                    disabled={!editable}
                    title={editable ? "삭제" : "삭제 권한 없음"}
                    onClick={() => openDeleteTerm(term)}
                  >
                    삭제
                  </button>
                </span>
              </div>
              <ul className="subject-list">
                {termSubjects.length === 0 && (
                  <li className="subject-empty">과목 없음</li>
                )}
                {termSubjects.map((subject) => (
                  <li key={subject.id} className="subject-row">
                    <span className="subject-title">{subject.title}</span>
                    <span className="subject-row-actions">
                      <button
                        type="button"
                        className="action-btn small"
                        disabled={!editable}
                        onClick={() => {
                          setEditingSubject(subject);
                          setMode("edit-subject");
                        }}
                      >
                        수정
                      </button>
                      {/* S7 AC33 — Subject 이관 (다른 학기로 옮기기). */}
                      <button
                        type="button"
                        className="action-btn small"
                        disabled={!editable || terms.length < 2}
                        title={
                          terms.length < 2
                            ? "이관할 다른 학기가 없습니다"
                            : editable
                              ? "다른 학기로 이관"
                              : "이관 권한 없음"
                        }
                        onClick={() => {
                          setMovingSubject(subject);
                          setMode("move-subject");
                        }}
                      >
                        이관
                      </button>
                      <button
                        type="button"
                        className="action-btn small danger"
                        disabled={!editable}
                        onClick={() => openDeleteSubject(subject)}
                      >
                        삭제
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {mode === "create-term" && (
        <TermFormDialog
          mode="create"
          onClose={() => setMode("list")}
          onSave={async (body) => {
            try {
              await createTerm(body);
              setMode("list");
              await refresh();
            } catch (err) {
              throw err instanceof ApiError ? err : new Error("학기 생성 실패");
            }
          }}
        />
      )}
      {mode === "edit-term" && editingTerm && (
        <TermFormDialog
          mode="edit"
          initial={editingTerm}
          onClose={() => {
            setMode("list");
            setEditingTerm(null);
          }}
          onSave={async (body) => {
            try {
              await updateTerm(editingTerm.id, body);
              setMode("list");
              setEditingTerm(null);
              await refresh();
            } catch (err) {
              throw err instanceof ApiError ? err : new Error("학기 수정 실패");
            }
          }}
        />
      )}
      {mode === "create-subject" && (
        <SubjectFormDialog
          mode="create"
          terms={terms}
          onClose={() => setMode("list")}
          onSave={async ({ termId, title }) => {
            try {
              await createSubject(termId, title);
              setMode("list");
              await refresh();
            } catch (err) {
              throw err instanceof ApiError ? err : new Error("과목 생성 실패");
            }
          }}
        />
      )}
      {mode === "edit-subject" && editingSubject && (
        <SubjectFormDialog
          mode="edit"
          terms={terms}
          initial={editingSubject}
          onClose={() => {
            setMode("list");
            setEditingSubject(null);
          }}
          onSave={async ({ title }) => {
            try {
              await updateSubject(editingSubject.id, { title });
              setMode("list");
              setEditingSubject(null);
              await refresh();
            } catch (err) {
              throw err instanceof ApiError ? err : new Error("과목 수정 실패");
            }
          }}
        />
      )}

      {mode === "move-subject" && movingSubject && (
        <SubjectMoveDialog
          subject={movingSubject}
          terms={terms}
          viewerId={viewerId}
          viewerRole={viewerRole}
          onClose={() => {
            setMode("list");
            setMovingSubject(null);
          }}
          onMove={async (targetTermId) => {
            try {
              await moveSubject(movingSubject.id, targetTermId);
              setMode("list");
              setMovingSubject(null);
              await refresh();
            } catch (err) {
              throw err instanceof ApiError ? err : new Error("과목 이관 실패");
            }
          }}
        />
      )}

      {confirm && (
        <DeleteConfirmDialog
          confirm={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}

interface SubjectMoveDialogProps {
  subject: SubjectResponse;
  terms: TermAdminResponse[];
  viewerId: string;
  viewerRole: UserRole;
  onClose: () => void;
  onMove: (targetTermId: string) => Promise<void>;
}

function SubjectMoveDialog({ subject, terms, viewerId, viewerRole, onClose, onMove }: SubjectMoveDialogProps) {
  // 출발지 학기 제외 + PR #50 codex Round-1 P2: BE 가 actor 위계 검사 (도착지
  // Term 도 admin↔master ADR-5) 이므로 UI 도 동일하게 destination 후보를
  // 위계 허용된 것만 표시. admin 이 master/other-admin 학기로 이관 시도해서
  // 100% 403 fail 하는 dead UX 차단.
  const canMoveTo = (t: TermAdminResponse): boolean => {
    if (viewerRole === "master") return true;
    if (viewerRole !== "admin") return false;
    return t.createdById === viewerId;
  };
  const candidates = terms.filter((t) => t.id !== subject.termId && canMoveTo(t));
  const [targetTermId, setTargetTermId] = useState<string>(candidates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetTermId) {
      setError("이관 대상 학기를 선택하세요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onMove(targetTermId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이관 실패");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="과목 이관">
      <form className="dialog" onSubmit={handleSubmit}>
        <h3>과목 이관</h3>
        <p className="dialog-body">대상: <strong>{subject.title}</strong></p>
        {candidates.length === 0 ? (
          <p className="dialog-error" role="alert">이관 가능한 다른 학기가 없습니다.</p>
        ) : (
          <label className="dialog-field">
            <span>이동할 학기</span>
            <select value={targetTermId} onChange={(e) => setTargetTermId(e.target.value)} required>
              {candidates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.grade}학년 {t.semester}학기 {t.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <p className="dialog-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="action-btn" onClick={onClose} disabled={saving}>취소</button>
          <button
            type="submit"
            className="action-btn primary"
            disabled={saving || candidates.length === 0 || !targetTermId}
          >
            {saving ? "이관 중..." : "이관"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface TermFormBody {
  grade: number;
  semester: number;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface TermFormDialogProps {
  mode: "create" | "edit";
  initial?: TermAdminResponse;
  onClose: () => void;
  onSave: (body: TermFormBody) => Promise<void>;
}

function TermFormDialog({ mode, initial, onClose, onSave }: TermFormDialogProps) {
  const [grade, setGrade] = useState<number>(initial?.grade ?? 1);
  const [semester, setSemester] = useState<number>(initial?.semester ?? 1);
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [startDate, setStartDate] = useState<string>(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState<string>(initial?.endDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: TermFormBody = {
        grade,
        semester,
        title: title.trim(),
        startDate: startDate ? startDate : null,
        endDate: endDate ? endDate : null
      };
      await onSave(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={mode === "create" ? "학기 추가" : "학기 수정"}>
      <form className="dialog" onSubmit={handleSubmit}>
        <h3>{mode === "create" ? "학기 추가" : "학기 수정"}</h3>
        <label className="dialog-field">
          <span>학년</span>
          <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
        </label>
        <label className="dialog-field">
          <span>학기</span>
          <select value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
            {[1, 2].map((s) => <option key={s} value={s}>{s}학기</option>)}
          </select>
        </label>
        <label className="dialog-field">
          <span>이름</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={1}
            maxLength={40}
            placeholder="예: 2026 1학기 / 계절학기 / 보강"
          />
        </label>
        <label className="dialog-field">
          <span>시작일 (선택)</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="dialog-field">
          <span>종료일 (선택)</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="action-btn" onClick={onClose} disabled={saving}>취소</button>
          <button type="submit" className="action-btn primary" disabled={saving || title.trim().length === 0}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface SubjectFormDialogProps {
  mode: "create" | "edit";
  terms: TermAdminResponse[];
  initial?: SubjectResponse;
  onClose: () => void;
  onSave: (body: { termId: string; title: string }) => Promise<void>;
}

function SubjectFormDialog({ mode, terms, initial, onClose, onSave }: SubjectFormDialogProps) {
  const isCreate = mode === "create";
  const [termId, setTermId] = useState<string>(initial?.termId ?? terms[0]?.id ?? "");
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCreate && !termId) {
      setError("학기를 선택하세요");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ termId: isCreate ? termId : (initial?.termId ?? ""), title: title.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={isCreate ? "과목 추가" : "과목 수정"}>
      <form className="dialog" onSubmit={handleSubmit}>
        <h3>{isCreate ? "과목 추가" : "과목 수정"}</h3>
        {isCreate ? (
          <label className="dialog-field">
            <span>학기</span>
            <select value={termId} onChange={(e) => setTermId(e.target.value)} required>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.grade}학년 {t.semester}학기 {t.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="dialog-body" style={{ color: "var(--ds-fg-soft, #6b7280)", fontSize: 13 }}>
            과목 이동(다른 학기로 옮기기) 은 별도 메뉴로 제공됩니다.
          </p>
        )}
        <label className="dialog-field">
          <span>이름</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={1}
            maxLength={40}
            placeholder="예: C언어"
          />
        </label>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="action-btn" onClick={onClose} disabled={saving}>취소</button>
          <button type="submit" className="action-btn primary" disabled={saving || title.trim().length === 0 || (isCreate && !termId)}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface DeleteConfirmProps {
  confirm: ConfirmDelete;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmDialog({ confirm, onCancel, onConfirm }: DeleteConfirmProps) {
  const blocked = confirm.childCount !== null && confirm.childCount > 0;
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="삭제 확인">
      <div className="dialog">
        <h3>{confirm.kind === "term" ? "학기 삭제" : "과목 삭제"}</h3>
        <p className="dialog-body">대상: <strong>{confirm.label}</strong></p>
        {confirm.loadingCount && <p className="dialog-body">자식 카운트 조회 중...</p>}
        {!confirm.loadingCount && blocked && (
          <p className="dialog-error" role="alert">
            하위 {confirm.childLabel} {confirm.childCount}건이 있어 삭제할 수 없습니다. 먼저 이동/삭제하세요.
          </p>
        )}
        {!confirm.loadingCount && !blocked && (
          <p className="dialog-body">정말 삭제하시겠습니까?</p>
        )}
        <div className="dialog-actions">
          <button type="button" className="action-btn" onClick={onCancel}>취소</button>
          <button
            type="button"
            className="action-btn danger"
            onClick={onConfirm}
            disabled={confirm.loadingCount || blocked}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
