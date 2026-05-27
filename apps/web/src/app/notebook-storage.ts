// sprint-2026-W22-sprint-19 / layer D/slice-1 — notebook localStorage adapter.
// 4 fn + 1 const + 2 module-private state + 1 callback param.
//
// invariant (보안 closure):
//   (a) persistence boundary — user-id namespaced scoped key, cross-user 격리.
//   (b) JSON parse safety — try/catch + sampleLectureNote fallback.
//   (c) schema guard — hasCurrentSubjectSet 의 subject id 집합 검증.
//   (d) storage exception — getItem/setItem/removeItem throw 전파 차단.
//   (e) reported-once banner — storageError 갱신 + errorReported flag 로
//       같은 outage 안 typing focus loss 방지.
//
// state transition contract (saveNotebook + clearNotebookStorageError):
//   INITIAL: storageError=undefined, errorReported=false.
//   SUCCESS (after error):
//     storageError → undefined, errorReported → false, onErrorChanged() 호출.
//   FAIL (first):
//     storageError = "<message>", errorReported false → true,
//     onErrorChanged() 호출.
//   FAIL (already reported):
//     storageError = "<message>" 갱신, onErrorChanged() 호출 안 함.
//   MANUAL CLEAR (had error):
//     storageError → undefined, errorReported → false, onErrorChanged() 호출.
//   MANUAL CLEAR (no prior error):
//     noop, onErrorChanged() 호출 안 함.

import { type StudyNotebook } from "@study-note/domain";
import { sampleLectureNote } from "../data/sampleLectureNote";

export const notebookStorageKey = "study-note.notebook.v2";

// Module-private state (외부 reader 는 getNotebookStorageError() 만 사용).
let storageError: string | undefined;
let errorReported = false;

export function buildNotebookKey(userId: string): string {
  return `${notebookStorageKey}:${userId}`;
}

export function loadStoredNotebook(userId: string): StudyNotebook {
  const scopedKey = buildNotebookKey(userId);
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(scopedKey);
  } catch {
    return sampleLectureNote;
  }

  if (!stored) {
    return sampleLectureNote;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StudyNotebook>;

    if (
      typeof parsed.id === "string" &&
      Array.isArray(parsed.subjects) &&
      hasCurrentSubjectSet(parsed)
    ) {
      return parsed as StudyNotebook;
    }

    try { window.localStorage.removeItem(scopedKey); } catch { /* ignore */ }
  } catch {
    try { window.localStorage.removeItem(scopedKey); } catch { /* ignore */ }
  }

  return sampleLectureNote;
}

export function hasCurrentSubjectSet(candidate: Partial<StudyNotebook>): boolean {
  const expectedIds = sampleLectureNote.subjects.map((subject) => subject.id).sort();
  const candidateIds = candidate.subjects
    ?.map((subject: { id?: string }) => subject.id)
    .filter((id: string | undefined): id is string => typeof id === "string")
    .sort();

  if (candidateIds === undefined) {
    return false;
  }
  return (
    candidateIds.length === expectedIds.length &&
    candidateIds.every((id, index) => id === expectedIds[index])
  );
}

export function saveNotebook(
  notebook: StudyNotebook,
  userId: string | undefined,
  onErrorChanged?: () => void
): boolean {
  // sprint-3/S1: require an authenticated userId. Saving without one would
  // either land on a legacy unscoped key (leak vector) or empty namespace
  // (data loss). Boot-phase no-op: next save after session attach persists.
  if (!userId) {
    return true;
  }
  const scopedKey = buildNotebookKey(userId);
  try {
    window.localStorage.setItem(scopedKey, JSON.stringify(notebook));
    // SUCCESS-after-error: clear banner + notify.
    if (storageError !== undefined) {
      storageError = undefined;
      errorReported = false;
      onErrorChanged?.();
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // sprint-19 / Gate 6 self R1 P1: diagnostic log 제거 (AC6 PII boundary 0 매치 요구).
    // caller 는 boolean return value 로 실패 인지.
    storageError = `메모/노트가 브라우저 저장공간에 기록되지 않았습니다 (예: 시크릿 모드, 용량 부족). 새로고침 시 변경 내용이 사라질 수 있으므로 저장 가능한 환경으로 옮기거나 새 탭에서 다시 시도하세요. (${message})`;
    if (!errorReported) {
      // First failure — fire callback once. Subsequent failures within the
      // same outage do not re-fire (avoids focus loss during typing).
      errorReported = true;
      onErrorChanged?.();
    }
    return false;
  }
}

export function getNotebookStorageError(): string | undefined {
  return storageError;
}

export function clearNotebookStorageError(onErrorChanged?: () => void): void {
  if (storageError === undefined && !errorReported) {
    return;
  }
  storageError = undefined;
  errorReported = false;
  onErrorChanged?.();
}

// Test-only reset hook (module-private state 검증용). production 사용 X.
export function __resetNotebookStorageStateForTesting__(): void {
  storageError = undefined;
  errorReported = false;
}
