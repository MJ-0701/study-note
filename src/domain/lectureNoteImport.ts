import {
  getIntegrityWarnings,
  type Concept,
  type ExampleQuestion,
  type RequiredKeyword,
  type SourceMaterial,
  type StudyNotebook,
  type SubjectNote,
  type WeekNote
} from "./lectureNote";

export interface WeekNoteImportPayload {
  schemaVersion: "study-note.week-note.v1";
  subjectId: string;
  sourceMaterials: SourceMaterial[];
  requiredKeywords: RequiredKeyword[];
  concepts: Concept[];
  exampleQuestions: ExampleQuestion[];
  weekNote: WeekNote;
}

export interface ImportValidationResult {
  ok: boolean;
  errors: string[];
  payload?: WeekNoteImportPayload;
}

export interface ApplyImportResult {
  notebook: StudyNotebook;
  subject: SubjectNote;
  weekNote: WeekNote;
  warnings: string[];
}

const sourceKinds = ["professor-pdf", "claude-summary", "manual-keyword"];
const sourceVisibilities = ["private-source", "derived-note-only"];
const keywordStatuses = ["covered", "missing"];
const conceptPriorities = ["must-know", "high", "review"];
const questionDifficulties = ["basic", "applied"];
const reviewStatuses = ["ready", "needs-fill"];

export function validateWeekNoteImportPayload(
  input: unknown
): ImportValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["JSON root must be an object."] };
  }

  requireLiteral(
    input.schemaVersion,
    "study-note.week-note.v1",
    "schemaVersion",
    errors
  );
  requireString(input.subjectId, "subjectId", errors);
  validateObjectArray(input.sourceMaterials, "sourceMaterials", errors, validateSource);
  validateObjectArray(input.requiredKeywords, "requiredKeywords", errors, validateKeyword);
  validateObjectArray(input.concepts, "concepts", errors, validateConcept);
  validateObjectArray(
    input.exampleQuestions,
    "exampleQuestions",
    errors,
    validateQuestion
  );
  validateWeekNote(input.weekNote, "weekNote", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    payload: input as unknown as WeekNoteImportPayload
  };
}

export function sanitizeWeekNoteImportPayload(
  payload: WeekNoteImportPayload
): WeekNoteImportPayload {
  return {
    schemaVersion: payload.schemaVersion,
    subjectId: cleanText(payload.subjectId),
    sourceMaterials: payload.sourceMaterials.map((source) => ({
      ...source,
      id: cleanText(source.id),
      title: cleanText(source.title),
      pages: source.pages ? cleanText(source.pages) : undefined,
      note: cleanText(source.note)
    })),
    requiredKeywords: payload.requiredKeywords.map((keyword) => ({
      ...keyword,
      id: cleanText(keyword.id),
      label: cleanText(keyword.label),
      professorSignal: cleanText(keyword.professorSignal),
      conceptIds: keyword.conceptIds.map(cleanText)
    })),
    concepts: payload.concepts.map((concept) => ({
      ...concept,
      id: cleanText(concept.id),
      title: cleanText(concept.title),
      summary: cleanText(concept.summary),
      easyExplanation: cleanText(concept.easyExplanation),
      sourceHints: concept.sourceHints.map(cleanText),
      relatedKeywordIds: concept.relatedKeywordIds.map(cleanText),
      exampleQuestionIds: concept.exampleQuestionIds.map(cleanText)
    })),
    exampleQuestions: payload.exampleQuestions.map((question) => ({
      ...question,
      id: cleanText(question.id),
      conceptId: cleanText(question.conceptId),
      prompt: cleanText(question.prompt),
      answer: cleanText(question.answer),
      explanation: cleanText(question.explanation)
    })),
    weekNote: {
      ...payload.weekNote,
      id: cleanText(payload.weekNote.id),
      label: cleanText(payload.weekNote.label),
      title: cleanText(payload.weekNote.title),
      focus: cleanText(payload.weekNote.focus),
      sourceMaterialIds: payload.weekNote.sourceMaterialIds.map(cleanText),
      requiredKeywordIds: payload.weekNote.requiredKeywordIds.map(cleanText),
      conceptIds: payload.weekNote.conceptIds.map(cleanText),
      exampleQuestionIds: payload.weekNote.exampleQuestionIds.map(cleanText)
    }
  };
}

export function applyWeekNoteImport(
  notebook: StudyNotebook,
  payload: WeekNoteImportPayload
): ApplyImportResult {
  const subject = notebook.subjects.find((item) => item.id === payload.subjectId);

  if (!subject) {
    throw new Error(`Unknown subjectId: ${payload.subjectId}`);
  }

  const updatedSubject: SubjectNote = {
    ...subject,
    sources: upsertById(subject.sources, payload.sourceMaterials),
    requiredKeywords: upsertById(
      subject.requiredKeywords,
      payload.requiredKeywords
    ),
    concepts: upsertById(subject.concepts, payload.concepts),
    exampleQuestions: upsertById(
      subject.exampleQuestions,
      payload.exampleQuestions
    ),
    weekNotes: upsertById(subject.weekNotes, [payload.weekNote])
  };

  const updatedNotebook: StudyNotebook = {
    ...notebook,
    updatedAt: new Date().toISOString().slice(0, 10),
    subjects: notebook.subjects.map((item) =>
      item.id === payload.subjectId ? updatedSubject : item
    )
  };

  return {
    notebook: updatedNotebook,
    subject: updatedSubject,
    weekNote: payload.weekNote,
    warnings: getIntegrityWarnings(updatedNotebook)
  };
}

function upsertById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
}

function validateSource(value: Record<string, unknown>, path: string, errors: string[]): void {
  requireString(value.id, `${path}.id`, errors);
  requireString(value.title, `${path}.title`, errors);
  requireEnum(value.kind, sourceKinds, `${path}.kind`, errors);
  requireEnum(value.visibility, sourceVisibilities, `${path}.visibility`, errors);
  requireOptionalString(value.pages, `${path}.pages`, errors);
  requireString(value.note, `${path}.note`, errors);
}

function validateKeyword(value: Record<string, unknown>, path: string, errors: string[]): void {
  requireString(value.id, `${path}.id`, errors);
  requireString(value.label, `${path}.label`, errors);
  requireEnum(value.status, keywordStatuses, `${path}.status`, errors);
  requireString(value.professorSignal, `${path}.professorSignal`, errors);
  requireStringArray(value.conceptIds, `${path}.conceptIds`, errors);
}

function validateConcept(value: Record<string, unknown>, path: string, errors: string[]): void {
  requireString(value.id, `${path}.id`, errors);
  requireString(value.title, `${path}.title`, errors);
  requireEnum(value.priority, conceptPriorities, `${path}.priority`, errors);
  requireString(value.summary, `${path}.summary`, errors);
  requireString(value.easyExplanation, `${path}.easyExplanation`, errors);
  requireStringArray(value.sourceHints, `${path}.sourceHints`, errors);
  requireStringArray(value.relatedKeywordIds, `${path}.relatedKeywordIds`, errors);
  requireStringArray(value.exampleQuestionIds, `${path}.exampleQuestionIds`, errors);
}

function validateQuestion(value: Record<string, unknown>, path: string, errors: string[]): void {
  requireString(value.id, `${path}.id`, errors);
  requireString(value.conceptId, `${path}.conceptId`, errors);
  requireEnum(value.difficulty, questionDifficulties, `${path}.difficulty`, errors);
  requireString(value.prompt, `${path}.prompt`, errors);
  requireString(value.answer, `${path}.answer`, errors);
  requireString(value.explanation, `${path}.explanation`, errors);
}

function validateWeekNote(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  requireString(value.id, `${path}.id`, errors);
  requireString(value.label, `${path}.label`, errors);
  requireString(value.title, `${path}.title`, errors);
  requireString(value.focus, `${path}.focus`, errors);
  requireStringArray(value.sourceMaterialIds, `${path}.sourceMaterialIds`, errors);
  requireStringArray(value.requiredKeywordIds, `${path}.requiredKeywordIds`, errors);
  requireStringArray(value.conceptIds, `${path}.conceptIds`, errors);
  requireStringArray(value.exampleQuestionIds, `${path}.exampleQuestionIds`, errors);
  requireEnum(value.reviewStatus, reviewStatuses, `${path}.reviewStatus`, errors);
}

function validateObjectArray(
  value: unknown,
  path: string,
  errors: string[],
  validator: (item: Record<string, unknown>, itemPath: string, errors: string[]) => void
): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${path}[${index}] must be an object.`);
      return;
    }

    validator(item, `${path}[${index}]`, errors);
  });
}

function requireLiteral(
  value: unknown,
  literal: string,
  path: string,
  errors: string[]
): void {
  if (value !== literal) {
    errors.push(`${path} must be "${literal}".`);
  }
}

function requireString(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`);
  }
}

function requireOptionalString(value: unknown, path: string, errors: string[]): void {
  if (value !== undefined && typeof value !== "string") {
    errors.push(`${path} must be a string when provided.`);
  }
}

function requireStringArray(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${path} must be an array of strings.`);
  }
}

function requireEnum(
  value: unknown,
  allowed: string[],
  path: string,
  errors: string[]
): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${path} must be one of: ${allowed.join(", ")}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: string): string {
  return value
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
