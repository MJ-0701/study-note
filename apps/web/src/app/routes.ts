// sprint-2026-W21-sprint-2 / layer A (routing/shell) — pure routing helpers.
// 본 모듈은 main.ts 의 Route 타입 + parseRoute + *Path helper 를 그대로
// 이동. DOM/모듈 state 접근 없음. unit test = app/__tests__/routes.spec.ts.

import type { SubjectNote, WeekNote } from "@study-note/domain";

export type Route =
  | { name: "home" }
  | { name: "intake" }
  | { name: "pdf-workspaces" }
  | { name: "subject"; subjectId: string }
  | { name: "subject-class"; subjectId: string }
  | { name: "subject-summaries"; subjectId: string }
  | { name: "subject-summary-detail"; subjectId: string; weekId: string }
  | { name: "subject-mcp"; subjectId: string }
  | { name: "subject-memorize"; subjectId: string }
  | { name: "subject-exam-prep"; subjectId: string }
  | { name: "subject-intake"; subjectId: string }
  | { name: "pdf-workspace"; subjectId: string }
  | { name: "week"; subjectId: string; weekId: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const rawParts = path.split("/").filter(Boolean);
  const parts = rawParts.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });

  if (parts[0] === "subjects" && parts[1] && parts[2] === "weeks" && parts[3]) {
    return { name: "week", subjectId: parts[1], weekId: parts[3] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "intake") {
    return { name: "subject-intake", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "pdf-workspace") {
    return { name: "pdf-workspace", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "class") {
    return { name: "subject-class", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "summaries" && parts[3]) {
    return { name: "subject-summary-detail", subjectId: parts[1], weekId: parts[3] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "summaries") {
    return { name: "subject-summaries", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "summary") {
    return { name: "subject-summaries", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "mcp") {
    return { name: "subject-mcp", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "memorize") {
    return { name: "subject-memorize", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "exam-prep") {
    return { name: "subject-exam-prep", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1]) {
    return { name: "subject", subjectId: parts[1] };
  }

  if (parts[0] === "pdf-workspaces") {
    return { name: "pdf-workspaces" };
  }

  if (parts[0] === "intake") {
    return { name: "intake" };
  }

  return { name: "home" };
}

export function intakePath(): string {
  return "#/intake";
}

export function subjectClassPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/class`;
}

export function subjectSummaryPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/summaries`;
}

export function weekSummaryPath(subject: SubjectNote, week: WeekNote): string {
  return `#/subjects/${subject.id}/summaries/${week.id}`;
}

export function weekPath(subject: SubjectNote, week: WeekNote): string {
  return `#/subjects/${subject.id}/weeks/${week.id}`;
}

export function subjectMcpPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/mcp`;
}

export function subjectMemorizePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/memorize`;
}

export function subjectExamPrepPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/exam-prep`;
}

export function subjectIntakePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/intake`;
}

export function subjectPdfWorkspacePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/pdf-workspace`;
}
