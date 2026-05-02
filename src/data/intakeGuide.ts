export interface IntakeFileRole {
  label: string;
  location: string;
  rule: string;
}

export interface IntakeStep {
  title: string;
  description: string;
  detail: string;
}

export const localIntakeGuide = {
  title: "자료 투입 방식",
  summary:
    "현재 버전은 서버 업로드나 Bedrock 연결 없이, 과목별 화면에서 Claude로 생성한 lecture note JSON을 브라우저로 불러와 reader에 반영하는 방식입니다.",
  roles: [
    {
      label: "교수님 PDF",
      location: "local-materials/{subject}/{date}-professor.pdf",
      rule: "원문은 로컬 전용 자료로 보관하고 git에 올리지 않습니다."
    },
    {
      label: "중요 키워드",
      location: "local-materials/{subject}/{date}-keywords.md",
      rule: "수업 중 강조된 표현을 그대로 적어 Claude 요청에 함께 넣습니다."
    },
    {
      label: "Claude 산출물",
      location: "local-materials/{subject}/{date}-note.json",
      rule: "사람용 PDF가 아니라 앱 스키마에 맞춘 JSON으로 받습니다."
    },
    {
      label: "앱 반영 데이터",
      location: "src/data/sampleLectureNote.ts",
      rule: "현재 prototype에서는 검수한 JSON 내용을 TypeScript fixture에 반영합니다."
    }
  ] satisfies IntakeFileRole[],
  steps: [
    {
      title: "1. 과목/수업일별로 원자료를 나눕니다.",
      description: "4과목 전체를 한 번에 처리하지 않고, 과목과 수업일을 고정한 뒤 요청합니다.",
      detail: "예: 디지털공학개론 5월 2일(토), C언어 5월 7일(목)처럼 작은 단위로 생성해야 누락 키워드를 확인하기 쉽습니다."
    },
    {
      title: "2. Claude에는 PDF와 키워드를 함께 줍니다.",
      description: "교수님 PDF, 시험 범위, 강조 키워드, 원하는 문제 수를 하나의 요청으로 묶습니다.",
      detail: "요청의 목표는 요약문 생성이 아니라 수업일 단위 WeekNote JSON 생성이라고 명시합니다."
    },
    {
      title: "3. JSON을 검수한 뒤 앱 데이터에 반영합니다.",
      description: "covered/missing 상태, conceptIds, exampleQuestionIds가 끊기지 않았는지 봅니다.",
      detail: "현재는 src/data/sampleLectureNote.ts에 직접 붙이고, 추후 src/content JSON 자동 로딩으로 분리할 수 있습니다."
    },
    {
      title: "4. 빌드로 깨진 링크를 확인합니다.",
      description: "fixture integrity와 TypeScript build를 통과해야 reader에 올립니다.",
      detail: "원문 PDF 링크나 공개 URL은 넣지 않고 source metadata만 남깁니다."
    }
  ] satisfies IntakeStep[],
  folderTree: [
    "local-materials/",
    "  digital-engineering/",
    "    2026-05-02-professor.pdf",
    "    2026-05-02-keywords.md",
    "    2026-05-02-note.json",
    "  c-language/",
    "    2026-05-07-professor.pdf",
    "    2026-05-07-keywords.md",
    "    2026-05-07-note.json"
  ],
  promptChecklist: [
    "과목명과 수업일",
    "시험 범위",
    "교수님 강조 키워드",
    "출력 형식: 수업일 단위 WeekNote JSON only",
    "필수 키워드 covered/missing 표시",
    "개념 설명, 출처 힌트, 예제문제 포함"
  ],
  exampleFile: "examples/digital-engineering-week-note.example.json",
  insertionContract: [
    "subject.id는 기존 과목 id와 일치해야 합니다.",
    "week.id는 과목 안에서 유일해야 합니다. 라벨은 수업일 날짜로 둡니다.",
    "requiredKeywordIds, conceptIds, exampleQuestionIds는 실제 id만 참조해야 합니다.",
    "SourceMaterial에는 원문 URL 대신 title, pages, note만 남깁니다."
  ],
  samplePayload: {
    schemaVersion: "study-note.week-note.v1",
    subjectId: "digital-engineering",
    sourceMaterials: [
      {
        id: "de-pdf-20260502",
        title: "디지털공학개론 5월 2일(토) 교수님 PDF",
        kind: "professor-pdf",
        visibility: "private-source",
        pages: "p.1-p.38",
        note: "원문은 local-materials에만 보관하고 reader에는 메타데이터만 둔다."
      }
    ],
    requiredKeywords: [
      {
        id: "de-kw-kmap",
        label: "카르노맵",
        status: "covered",
        professorSignal: "논리식 간소화 계산 강조",
        conceptIds: ["de-kmap"]
      }
    ],
    concepts: [
      {
        id: "de-kmap",
        title: "카르노맵 간소화",
        priority: "high",
        summary: "인접한 1을 묶어 부울식을 더 단순하게 만드는 방법이다.",
        easyExplanation: "truth table에서 출력 1인 칸들을 보기 좋게 묶어 더 짧은 논리식으로 바꾸는 절차다.",
        sourceHints: ["교수님 PDF p.22-p.30"],
        relatedKeywordIds: ["de-kw-kmap"],
        exampleQuestionIds: ["de-q-kmap"]
      }
    ],
    exampleQuestions: [
      {
        id: "de-q-kmap",
        conceptId: "de-kmap",
        difficulty: "applied",
        prompt: "카르노맵에서 인접한 1을 묶는 이유를 설명하라.",
        answer: "논리식의 항과 변수를 줄여 같은 출력을 더 단순한 회로로 표현하기 위해서다.",
        explanation: "간소화의 목적과 회로 복잡도 감소를 함께 설명하면 된다."
      }
    ],
    weekNote: {
      id: "de-session-20260502",
      label: "5월 2일(토)",
      title: "카르노맵",
      focus: "인접 묶음으로 부울식을 간소화하는 절차를 연습한다.",
      sourceMaterialIds: ["de-pdf-20260502"],
      requiredKeywordIds: ["de-kw-kmap"],
      conceptIds: ["de-kmap"],
      exampleQuestionIds: ["de-q-kmap"],
      reviewStatus: "ready"
    }
  }
};
