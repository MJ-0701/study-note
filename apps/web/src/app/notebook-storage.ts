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

import { type StudyNotebook, type SubjectNote, type WeekNote } from "@study-note/domain";
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
      const upgraded = applyBundledContentUpdates(parsed as StudyNotebook);
      if (upgraded !== parsed) {
        try { window.localStorage.setItem(scopedKey, JSON.stringify(upgraded)); } catch { /* ignore */ }
      }
      return upgraded;
    }

    try { window.localStorage.removeItem(scopedKey); } catch { /* ignore */ }
  } catch {
    try { window.localStorage.removeItem(scopedKey); } catch { /* ignore */ }
  }

  return sampleLectureNote;
}

const DIGITAL_ENGINEERING_ID = "digital-engineering";
const OLD_DIGITAL_ENGINEERING_GOAL =
  "6장 논리식 간소화, 7장 조합논리회로, 8장 플립플롭을 힌트/퀴즈 PDF 유형 중심으로 정리한다.";
const OLD_DIGITAL_ENGINEERING_STRATEGY =
  "힌트 PDF와 퀴즈 PDF 유형을 먼저 풀고, 6장 계산형 -> 7장 공식/선택회로형 -> 8장 표/파형형 순서로 반복한다.";
const OLD_DIGITAL_ENGINEERING_KMAP_ANSWER =
  "minterm을 표시하고 Gray code 순서로 배치한 뒤 가능한 큰 묶음을 만들고 변하지 않는 변수만 남긴다.";

function applyBundledContentUpdates(notebook: StudyNotebook): StudyNotebook {
  const bundledDigitalEngineering = sampleLectureNote.subjects.find(
    (subject) => subject.id === DIGITAL_ENGINEERING_ID
  );

  if (!bundledDigitalEngineering) {
    return notebook;
  }

  let changed = false;
  const subjects = notebook.subjects.map((subject) => {
    if (subject.id !== DIGITAL_ENGINEERING_ID || !isStockDigitalEngineeringContent(subject)) {
      return subject;
    }
    changed = true;
    return mergeBundledSubjectPreservingUserWork(subject, bundledDigitalEngineering);
  });

  if (!changed) {
    return notebook;
  }

  return {
    ...notebook,
    updatedAt: sampleLectureNote.updatedAt,
    subjects
  };
}

function isStockDigitalEngineeringContent(subject: SubjectNote): boolean {
  const kmapQuestion = subject.exampleQuestions.find((question) => question.id === "de-q-kmap");

  return (
    subject.summary.goal === OLD_DIGITAL_ENGINEERING_GOAL ||
    subject.summary.strategy === OLD_DIGITAL_ENGINEERING_STRATEGY ||
    kmapQuestion?.answer === OLD_DIGITAL_ENGINEERING_KMAP_ANSWER
  );
}

function mergeBundledSubjectPreservingUserWork(stored: SubjectNote, bundled: SubjectNote): SubjectNote {
  return {
    ...bundled,
    termId: stored.termId ?? bundled.termId,
    sources: mergeById(bundled.sources, stored.sources),
    requiredKeywords: mergeById(bundled.requiredKeywords, stored.requiredKeywords),
    concepts: mergeById(bundled.concepts, stored.concepts),
    exampleQuestions: mergeById(bundled.exampleQuestions, stored.exampleQuestions),
    weekNotes: mergeWeekNotesPreservingUserNotes(bundled.weekNotes, stored.weekNotes)
  };
}

function mergeById<T extends { id: string }>(bundledItems: T[], storedItems: T[]): T[] {
  const bundledIds = new Set(bundledItems.map((item) => item.id));
  return [
    ...bundledItems,
    ...storedItems.filter((item) => !bundledIds.has(item.id))
  ];
}

function mergeWeekNotesPreservingUserNotes(bundledWeeks: WeekNote[], storedWeeks: WeekNote[]): WeekNote[] {
  const storedById = new Map(storedWeeks.map((week) => [week.id, week]));
  const bundledIds = new Set(bundledWeeks.map((week) => week.id));
  const mergedBundledWeeks = bundledWeeks.map((week) => {
    const storedWeek = storedById.get(week.id);
    if (typeof storedWeek?.userNotes !== "string") {
      return week;
    }
    return {
      ...week,
      userNotes: storedWeek.userNotes
    };
  });

  return [
    ...mergedBundledWeeks,
    ...storedWeeks.filter((week) => !bundledIds.has(week.id))
  ];
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
