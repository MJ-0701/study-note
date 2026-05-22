export type SourceKind = "professor-pdf" | "claude-summary" | "manual-keyword";
export type SourceVisibility = "private-source" | "derived-note-only";
export type KeywordCoverageStatus = "covered" | "missing";
export type ConceptPriority = "must-know" | "high" | "review";
export type ShareAccess = "owner-only" | "small-cohort-readonly";

export interface SourceMaterial {
  id: string;
  title: string;
  kind: SourceKind;
  visibility: SourceVisibility;
  pages?: string;
  note: string;
}

export interface RequiredKeyword {
  id: string;
  label: string;
  status: KeywordCoverageStatus;
  professorSignal: string;
  conceptIds: string[];
}

export interface Concept {
  id: string;
  title: string;
  priority: ConceptPriority;
  summary: string;
  easyExplanation: string;
  sourceHints: string[];
  relatedKeywordIds: string[];
  exampleQuestionIds: string[];
}

export interface ExampleQuestion {
  id: string;
  conceptId: string;
  difficulty: "basic" | "applied";
  prompt: string;
  answer: string;
  explanation: string;
}

export interface WeekNote {
  id: string;
  label: string;
  title: string;
  focus: string;
  sourceMaterialIds: string[];
  requiredKeywordIds: string[];
  conceptIds: string[];
  exampleQuestionIds: string[];
  reviewStatus: "ready" | "needs-fill";
  /** sprint-1: 사용자 자유 메모 (localStorage + sprint-2 BE sync). */
  userNotes?: string;
  /** sprint-2: subject.examPhase override. 특정 주차가 다른 구간일 때만 명시. */
  examPhase?: ExamPhase;
}

export interface SubjectSummary {
  goal: string;
  examScope: string;
  weekRange: string;
  mustKnowConceptIds: string[];
  weakSpots: string[];
  strategy: string;
}

export type ExamPhase = "midterm" | "final";

export interface SubjectNote {
  id: string;
  title: string;
  professor: string;
  examLabel: string;
  /** sprint-2: 현재 학기 기준 subject 의 시험 구간. WeekNote.examPhase 가 override. */
  examPhase?: ExamPhase;
  summary: SubjectSummary;
  sources: SourceMaterial[];
  requiredKeywords: RequiredKeyword[];
  concepts: Concept[];
  exampleQuestions: ExampleQuestion[];
  weekNotes: WeekNote[];
}

export interface SharePolicy {
  access: ShareAccess;
  rawSourceRule: string;
  noteRule: string;
  disclaimer: string;
}

export interface StudyNotebook {
  id: string;
  title: string;
  updatedAt: string;
  term: string;
  audience: string;
  sourceWorkspaceUrl?: string;
  subjects: SubjectNote[];
  sharePolicy: SharePolicy;
}

export interface CoverageSummary {
  total: number;
  covered: number;
  missing: number;
  coverageRate: number;
}

export function getSubjectCoverage(subject: SubjectNote): CoverageSummary {
  const total = subject.requiredKeywords.length;
  const covered = subject.requiredKeywords.filter(
    (keyword) => keyword.status === "covered"
  ).length;
  const missing = total - covered;

  return {
    total,
    covered,
    missing,
    coverageRate: total === 0 ? 0 : Math.round((covered / total) * 100)
  };
}

export function getNotebookCoverage(notebook: StudyNotebook): CoverageSummary {
  const subjectCoverages = notebook.subjects.map(getSubjectCoverage);
  const total = subjectCoverages.reduce((sum, coverage) => sum + coverage.total, 0);
  const covered = subjectCoverages.reduce(
    (sum, coverage) => sum + coverage.covered,
    0
  );
  const missing = total - covered;

  return {
    total,
    covered,
    missing,
    coverageRate: total === 0 ? 0 : Math.round((covered / total) * 100)
  };
}

export function getConceptById(
  subject: SubjectNote,
  conceptId: string
): Concept | undefined {
  return subject.concepts.find((concept) => concept.id === conceptId);
}

export function getQuestionById(
  subject: SubjectNote,
  questionId: string
): ExampleQuestion | undefined {
  return subject.exampleQuestions.find((question) => question.id === questionId);
}

export function getKeywordById(
  subject: SubjectNote,
  keywordId: string
): RequiredKeyword | undefined {
  return subject.requiredKeywords.find((keyword) => keyword.id === keywordId);
}

export function getSourceById(
  subject: SubjectNote,
  sourceId: string
): SourceMaterial | undefined {
  return subject.sources.find((source) => source.id === sourceId);
}

export function getIntegrityWarnings(notebook: StudyNotebook): string[] {
  const warnings: string[] = [];

  for (const subject of notebook.subjects) {
    const conceptIds = new Set(subject.concepts.map((concept) => concept.id));
    const keywordIds = new Set(
      subject.requiredKeywords.map((keyword) => keyword.id)
    );
    const questionIds = new Set(
      subject.exampleQuestions.map((question) => question.id)
    );
    const sourceIds = new Set(subject.sources.map((source) => source.id));

    for (const keyword of subject.requiredKeywords) {
      if (keyword.status === "covered" && keyword.conceptIds.length === 0) {
        warnings.push(`${subject.title}/${keyword.label}: covered keyword has no linked concept`);
      }

      for (const conceptId of keyword.conceptIds) {
        if (!conceptIds.has(conceptId)) {
          warnings.push(`${subject.title}/${keyword.label}: linked concept ${conceptId} is missing`);
        }
      }
    }

    for (const concept of subject.concepts) {
      for (const keywordId of concept.relatedKeywordIds) {
        if (!keywordIds.has(keywordId)) {
          warnings.push(`${subject.title}/${concept.title}: linked keyword ${keywordId} is missing`);
        }
      }

      for (const questionId of concept.exampleQuestionIds) {
        if (!questionIds.has(questionId)) {
          warnings.push(`${subject.title}/${concept.title}: linked question ${questionId} is missing`);
        }
      }
    }

    for (const question of subject.exampleQuestions) {
      if (!conceptIds.has(question.conceptId)) {
        warnings.push(`${subject.title}/${question.id}: linked concept ${question.conceptId} is missing`);
      }
    }

    for (const weekNote of subject.weekNotes) {
      for (const sourceId of weekNote.sourceMaterialIds) {
        if (!sourceIds.has(sourceId)) {
          warnings.push(`${subject.title}/${weekNote.label}: linked source ${sourceId} is missing`);
        }
      }

      for (const keywordId of weekNote.requiredKeywordIds) {
        if (!keywordIds.has(keywordId)) {
          warnings.push(`${subject.title}/${weekNote.label}: linked keyword ${keywordId} is missing`);
        }
      }

      for (const conceptId of weekNote.conceptIds) {
        if (!conceptIds.has(conceptId)) {
          warnings.push(`${subject.title}/${weekNote.label}: linked concept ${conceptId} is missing`);
        }
      }

      for (const questionId of weekNote.exampleQuestionIds) {
        if (!questionIds.has(questionId)) {
          warnings.push(`${subject.title}/${weekNote.label}: linked question ${questionId} is missing`);
        }
      }
    }
  }

  return warnings;
}
