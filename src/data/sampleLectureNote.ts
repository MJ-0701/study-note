import type { StudyNotebook, SubjectNote } from "../domain/lectureNote";

const digitalEngineering: SubjectNote = {
  id: "digital-engineering",
  title: "디지털공학개론",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  summary: {
    goal: "논리게이트, 부울대수, 조합논리 회로를 시험 직전 계산 문제 중심으로 정리한다.",
    examScope: "number system, boolean algebra, logic gate, combinational circuit",
    weekRange: "4월 30일(목)-6월 13일(토)",
    mustKnowConceptIds: [
      "de-number-system",
      "de-boolean-algebra",
      "de-combinational-circuit"
    ],
    weakSpots: ["카르노맵 간소화는 실제 강의자료로 보강 필요"],
    strategy: "진법 변환과 논리식 간소화를 먼저 풀고, 마지막에 회로도 해석 문제로 확인한다."
  },
  sources: [
    {
      id: "de-pdf-08-14",
      title: "디지털공학개론 교수님 PDF 기말 범위",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "p.1-p.72",
      note: "원문 PDF는 로컬 자료로만 보관하고 reader에는 출처 힌트와 파생 요약만 둔다."
    },
    {
      id: "de-prof-keywords",
      title: "디지털공학개론 교수님 중요 키워드",
      kind: "manual-keyword",
      visibility: "derived-note-only",
      note: "수업 중 시험 가능성이 언급된 키워드를 coverage 상태로 추적한다."
    }
  ],
  requiredKeywords: [
    {
      id: "de-kw-number-system",
      label: "진법 변환",
      status: "covered",
      professorSignal: "2진수/8진수/16진수 변환 계산 강조",
      conceptIds: ["de-number-system"]
    },
    {
      id: "de-kw-boolean",
      label: "부울대수",
      status: "covered",
      professorSignal: "논리식 간소화 출제 가능",
      conceptIds: ["de-boolean-algebra"]
    },
    {
      id: "de-kw-combinational",
      label: "조합논리 회로",
      status: "covered",
      professorSignal: "truth table과 회로도 상호 변환 강조",
      conceptIds: ["de-combinational-circuit"]
    },
    {
      id: "de-kw-kmap",
      label: "카르노맵",
      status: "missing",
      professorSignal: "실제 강의자료 기반 보강 필요",
      conceptIds: []
    }
  ],
  concepts: [
    {
      id: "de-number-system",
      title: "진법 변환",
      priority: "must-know",
      summary: "숫자를 2진수, 8진수, 10진수, 16진수 표현 사이에서 바꾸는 절차다.",
      easyExplanation: "같은 값을 서로 다른 표기법으로 적는 것이며, 자리값의 기준만 달라진다.",
      sourceHints: ["교수님 PDF p.6-p.14", "진법 변환 계산 예제"],
      relatedKeywordIds: ["de-kw-number-system"],
      exampleQuestionIds: ["de-q-number-system"]
    },
    {
      id: "de-boolean-algebra",
      title: "부울대수와 논리식 간소화",
      priority: "must-know",
      summary: "AND, OR, NOT 연산을 법칙으로 정리해 같은 출력을 더 단순한 식으로 표현한다.",
      easyExplanation: "복잡한 조건문을 같은 결과가 나오도록 짧게 줄이는 과정과 비슷하다.",
      sourceHints: ["교수님 PDF p.18-p.29", "드모르간 법칙"],
      relatedKeywordIds: ["de-kw-boolean"],
      exampleQuestionIds: ["de-q-boolean"]
    },
    {
      id: "de-combinational-circuit",
      title: "조합논리 회로",
      priority: "high",
      summary: "현재 입력 조합만으로 출력이 결정되는 논리회로다.",
      easyExplanation: "기억장치 없이 입력 스위치 조합에 따라 바로 결과가 나오는 회로다.",
      sourceHints: ["교수님 PDF p.40-p.56", "truth table과 회로도 변환"],
      relatedKeywordIds: ["de-kw-combinational"],
      exampleQuestionIds: ["de-q-combinational"]
    }
  ],
  exampleQuestions: [
    {
      id: "de-q-number-system",
      conceptId: "de-number-system",
      difficulty: "basic",
      prompt: "10진수 45를 2진수로 변환하라.",
      answer: "101101이다.",
      explanation: "45 = 32 + 8 + 4 + 1 이므로 각 자리값을 표시하면 101101이 된다."
    },
    {
      id: "de-q-boolean",
      conceptId: "de-boolean-algebra",
      difficulty: "applied",
      prompt: "A + AB를 간소화하라.",
      answer: "A다.",
      explanation: "흡수 법칙 A + AB = A를 적용한다."
    },
    {
      id: "de-q-combinational",
      conceptId: "de-combinational-circuit",
      difficulty: "applied",
      prompt: "truth table에서 출력이 1인 minterm을 보고 논리식을 작성하는 절차를 설명하라.",
      answer: "출력 1인 행마다 입력 조합의 곱항을 만들고, 모든 곱항을 OR로 연결한다.",
      explanation: "SOP 형태로 truth table을 논리식으로 옮기는 기본 절차다."
    }
  ],
  weekNotes: [
    {
      id: "de-week-08",
      label: "4월 30일(목)",
      title: "진법과 코드",
      focus: "진법 변환 계산 절차를 반복한다.",
      sourceMaterialIds: ["de-pdf-08-14"],
      requiredKeywordIds: ["de-kw-number-system"],
      conceptIds: ["de-number-system"],
      exampleQuestionIds: ["de-q-number-system"],
      reviewStatus: "ready"
    },
    {
      id: "de-week-10",
      label: "5월 2일(토)",
      title: "부울대수",
      focus: "드모르간 법칙과 흡수 법칙을 문제에 적용한다.",
      sourceMaterialIds: ["de-pdf-08-14"],
      requiredKeywordIds: ["de-kw-boolean", "de-kw-kmap"],
      conceptIds: ["de-boolean-algebra"],
      exampleQuestionIds: ["de-q-boolean"],
      reviewStatus: "needs-fill"
    },
    {
      id: "de-week-12",
      label: "5월 7일(목)",
      title: "조합논리 회로",
      focus: "truth table, 논리식, 회로도 변환 흐름을 잡는다.",
      sourceMaterialIds: ["de-pdf-08-14"],
      requiredKeywordIds: ["de-kw-combinational"],
      conceptIds: ["de-combinational-circuit"],
      exampleQuestionIds: ["de-q-combinational"],
      reviewStatus: "ready"
    }
  ]
};

const informationCommunication: SubjectNote = {
  id: "information-communication",
  title: "정보통신개론",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  summary: {
    goal: "통신 기본 모델, 전송매체, 네트워크 계층 구조를 용어 비교 중심으로 정리한다.",
    examScope: "communication model, signal, transmission media, OSI/TCP-IP",
    weekRange: "4월 30일(목)-6월 13일(토)",
    mustKnowConceptIds: ["ic-signal", "ic-osi-model", "ic-transmission-media"],
    weakSpots: ["변조 방식 세부 비교는 강의자료로 보강 필요"],
    strategy: "정의 암기보다 계층별 역할과 비교 포인트를 먼저 고정한다."
  },
  sources: [
    {
      id: "ic-pdf-08-14",
      title: "정보통신개론 교수님 PDF 기말 범위",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "p.3-p.68",
      note: "reader는 원문 대신 시험 대비 핵심 정의와 비교표 역할을 한다."
    }
  ],
  requiredKeywords: [
    {
      id: "ic-kw-signal",
      label: "아날로그/디지털 신호",
      status: "covered",
      professorSignal: "신호 차이와 장단점 비교 강조",
      conceptIds: ["ic-signal"]
    },
    {
      id: "ic-kw-osi",
      label: "OSI 7계층",
      status: "covered",
      professorSignal: "각 계층 역할 암기 강조",
      conceptIds: ["ic-osi-model"]
    },
    {
      id: "ic-kw-media",
      label: "전송매체",
      status: "covered",
      professorSignal: "유선/무선 매체 비교 가능",
      conceptIds: ["ic-transmission-media"]
    },
    {
      id: "ic-kw-modulation",
      label: "변조",
      status: "missing",
      professorSignal: "ASK/FSK/PSK는 실제 자료로 보강 필요",
      conceptIds: []
    }
  ],
  concepts: [
    {
      id: "ic-signal",
      title: "아날로그 신호와 디지털 신호",
      priority: "must-know",
      summary: "아날로그는 연속적인 값, 디지털은 이산적인 값으로 정보를 표현한다.",
      easyExplanation: "아날로그는 부드러운 곡선, 디지털은 0과 1 같은 단계적 표현에 가깝다.",
      sourceHints: ["교수님 PDF p.10-p.18"],
      relatedKeywordIds: ["ic-kw-signal"],
      exampleQuestionIds: ["ic-q-signal"]
    },
    {
      id: "ic-osi-model",
      title: "OSI 7계층",
      priority: "must-know",
      summary: "통신 기능을 7개 계층으로 나눠 각 계층의 책임을 구분하는 모델이다.",
      easyExplanation: "택배가 포장, 운송, 주소 확인, 전달 절차로 나뉘듯 통신도 역할을 나눈다.",
      sourceHints: ["교수님 PDF p.25-p.39"],
      relatedKeywordIds: ["ic-kw-osi"],
      exampleQuestionIds: ["ic-q-osi"]
    },
    {
      id: "ic-transmission-media",
      title: "전송매체",
      priority: "high",
      summary: "데이터가 지나가는 물리적 경로이며 유선과 무선 매체로 나뉜다.",
      easyExplanation: "정보가 이동하는 도로가 케이블인지 공기 중 전파인지 구분하는 것이다.",
      sourceHints: ["교수님 PDF p.44-p.53"],
      relatedKeywordIds: ["ic-kw-media"],
      exampleQuestionIds: ["ic-q-media"]
    }
  ],
  exampleQuestions: [
    {
      id: "ic-q-signal",
      conceptId: "ic-signal",
      difficulty: "basic",
      prompt: "아날로그 신호와 디지털 신호의 차이를 한 문장으로 설명하라.",
      answer: "아날로그는 연속적인 값으로, 디지털은 이산적인 값으로 정보를 표현한다.",
      explanation: "연속/이산 표현 차이가 핵심이다."
    },
    {
      id: "ic-q-osi",
      conceptId: "ic-osi-model",
      difficulty: "basic",
      prompt: "OSI 7계층을 사용하는 이유를 설명하라.",
      answer: "통신 기능을 계층별로 나누어 이해, 설계, 문제 해결을 쉽게 하기 위해서다.",
      explanation: "계층화와 역할 분리가 답안에 들어가야 한다."
    },
    {
      id: "ic-q-media",
      conceptId: "ic-transmission-media",
      difficulty: "applied",
      prompt: "유선 전송매체와 무선 전송매체의 차이를 예시와 함께 설명하라.",
      answer: "유선은 꼬임쌍선/광섬유처럼 물리 선로를 쓰고, 무선은 전파를 통해 전송한다.",
      explanation: "전송 경로와 예시를 같이 쓰면 된다."
    }
  ],
  weekNotes: [
    {
      id: "ic-week-08",
      label: "4월 30일(목)",
      title: "신호와 데이터",
      focus: "아날로그/디지털 신호 차이를 구분한다.",
      sourceMaterialIds: ["ic-pdf-08-14"],
      requiredKeywordIds: ["ic-kw-signal"],
      conceptIds: ["ic-signal"],
      exampleQuestionIds: ["ic-q-signal"],
      reviewStatus: "ready"
    },
    {
      id: "ic-week-10",
      label: "5월 2일(토)",
      title: "네트워크 계층 모델",
      focus: "OSI 7계층의 순서와 역할을 외운다.",
      sourceMaterialIds: ["ic-pdf-08-14"],
      requiredKeywordIds: ["ic-kw-osi"],
      conceptIds: ["ic-osi-model"],
      exampleQuestionIds: ["ic-q-osi"],
      reviewStatus: "ready"
    },
    {
      id: "ic-week-12",
      label: "5월 7일(목)",
      title: "전송매체와 변조",
      focus: "전송매체 비교를 먼저 보고 변조 방식은 보강한다.",
      sourceMaterialIds: ["ic-pdf-08-14"],
      requiredKeywordIds: ["ic-kw-media", "ic-kw-modulation"],
      conceptIds: ["ic-transmission-media"],
      exampleQuestionIds: ["ic-q-media"],
      reviewStatus: "needs-fill"
    }
  ]
};

const cLanguage: SubjectNote = {
  id: "c-language",
  title: "C언어",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  summary: {
    goal: "포인터, 배열, 함수, 구조체를 코드 읽기와 출력 예측 문제 중심으로 정리한다.",
    examScope: "pointer, array, function, struct, file I/O",
    weekRange: "4월 30일(목)-6월 13일(토)",
    mustKnowConceptIds: ["c-pointer", "c-array-function", "c-struct"],
    weakSpots: ["파일 입출력은 실제 예제 코드로 보강 필요"],
    strategy: "개념 정의보다 코드 실행 흐름과 메모리 주소 변화를 먼저 추적한다."
  },
  sources: [
    {
      id: "c-pdf-08-14",
      title: "C언어 교수님 PDF 기말 범위",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "p.5-p.82",
      note: "코드 원문은 강의자료를 기준으로 확인하고 reader에는 시험용 설명과 예제만 둔다."
    }
  ],
  requiredKeywords: [
    {
      id: "c-kw-pointer",
      label: "포인터",
      status: "covered",
      professorSignal: "주소와 역참조 개념 강조",
      conceptIds: ["c-pointer"]
    },
    {
      id: "c-kw-array",
      label: "배열과 함수",
      status: "covered",
      professorSignal: "배열 전달 방식과 출력 예측 가능",
      conceptIds: ["c-array-function"]
    },
    {
      id: "c-kw-struct",
      label: "구조체",
      status: "covered",
      professorSignal: "멤버 접근 연산자 구분 강조",
      conceptIds: ["c-struct"]
    },
    {
      id: "c-kw-file",
      label: "파일 입출력",
      status: "missing",
      professorSignal: "fopen/fscanf/fprintf 예제 보강 필요",
      conceptIds: []
    }
  ],
  concepts: [
    {
      id: "c-pointer",
      title: "포인터와 역참조",
      priority: "must-know",
      summary: "포인터는 변수의 메모리 주소를 저장하고, 역참조로 그 주소의 값을 읽거나 쓴다.",
      easyExplanation: "값이 적힌 종이를 직접 들고 있는 게 아니라, 그 종이가 있는 위치를 들고 있는 것이다.",
      sourceHints: ["교수님 PDF p.12-p.28", "주소 출력 예제"],
      relatedKeywordIds: ["c-kw-pointer"],
      exampleQuestionIds: ["c-q-pointer"]
    },
    {
      id: "c-array-function",
      title: "배열과 함수 전달",
      priority: "must-know",
      summary: "배열 이름은 많은 상황에서 첫 원소의 주소처럼 동작해 함수 안에서 원본 값을 바꿀 수 있다.",
      easyExplanation: "배열 전체를 복사해서 넘기는 게 아니라 시작 위치를 알려주는 것에 가깝다.",
      sourceHints: ["교수님 PDF p.31-p.44"],
      relatedKeywordIds: ["c-kw-array"],
      exampleQuestionIds: ["c-q-array"]
    },
    {
      id: "c-struct",
      title: "구조체와 멤버 접근",
      priority: "high",
      summary: "서로 다른 타입의 값을 하나의 사용자 정의 자료형으로 묶는 방법이다.",
      easyExplanation: "학생의 이름, 학번, 점수를 하나의 묶음으로 다루는 형태다.",
      sourceHints: ["교수님 PDF p.55-p.66"],
      relatedKeywordIds: ["c-kw-struct"],
      exampleQuestionIds: ["c-q-struct"]
    }
  ],
  exampleQuestions: [
    {
      id: "c-q-pointer",
      conceptId: "c-pointer",
      difficulty: "applied",
      prompt: "int a = 3; int *p = &a; *p = 5; 이후 a의 값은?",
      answer: "5다.",
      explanation: "p가 a의 주소를 가리키고 있으므로 *p에 대입하면 a의 값이 바뀐다."
    },
    {
      id: "c-q-array",
      conceptId: "c-array-function",
      difficulty: "applied",
      prompt: "함수에 배열을 넘겼을 때 함수 안에서 arr[0]을 바꾸면 원본 배열은 어떻게 되는가?",
      answer: "원본 배열의 첫 원소도 바뀐다.",
      explanation: "배열의 시작 주소가 전달되어 같은 메모리 위치를 수정하기 때문이다."
    },
    {
      id: "c-q-struct",
      conceptId: "c-struct",
      difficulty: "basic",
      prompt: "구조체 변수의 멤버와 구조체 포인터의 멤버에 접근하는 연산자를 각각 쓰라.",
      answer: "구조체 변수는 . 연산자, 구조체 포인터는 -> 연산자를 쓴다.",
      explanation: "변수 자체인지 포인터인지에 따라 접근 연산자가 달라진다."
    }
  ],
  weekNotes: [
    {
      id: "c-week-08",
      label: "4월 30일(목)",
      title: "포인터",
      focus: "주소, 포인터 변수, 역참조 관계를 코드로 추적한다.",
      sourceMaterialIds: ["c-pdf-08-14"],
      requiredKeywordIds: ["c-kw-pointer"],
      conceptIds: ["c-pointer"],
      exampleQuestionIds: ["c-q-pointer"],
      reviewStatus: "ready"
    },
    {
      id: "c-week-10",
      label: "5월 2일(토)",
      title: "배열과 함수",
      focus: "배열 전달과 원본 수정 여부를 구분한다.",
      sourceMaterialIds: ["c-pdf-08-14"],
      requiredKeywordIds: ["c-kw-array"],
      conceptIds: ["c-array-function"],
      exampleQuestionIds: ["c-q-array"],
      reviewStatus: "ready"
    },
    {
      id: "c-week-12",
      label: "5월 7일(목)",
      title: "구조체와 파일",
      focus: "구조체 멤버 접근을 먼저 정리하고 파일 입출력은 보강한다.",
      sourceMaterialIds: ["c-pdf-08-14"],
      requiredKeywordIds: ["c-kw-struct", "c-kw-file"],
      conceptIds: ["c-struct"],
      exampleQuestionIds: ["c-q-struct"],
      reviewStatus: "needs-fill"
    }
  ]
};

const computerIntroduction: SubjectNote = {
  id: "computer-introduction",
  title: "컴퓨터개론",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  summary: {
    goal: "컴퓨터 구조, 운영체제, 데이터 표현, 네트워크 기초를 큰 그림 중심으로 훑는다.",
    examScope: "computer system, data representation, OS basics, network basics",
    weekRange: "4월 30일(목)-6월 13일(토)",
    mustKnowConceptIds: ["ci-system", "ci-data-representation", "ci-os-network"],
    weakSpots: ["보안/소프트웨어 공학 파트는 실제 범위 확인 필요"],
    strategy: "세부 계산보다 각 구성요소가 무엇을 담당하는지 연결해서 본다."
  },
  sources: [
    {
      id: "ci-pdf-08-14",
      title: "컴퓨터개론 교수님 PDF 기말 범위",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "p.2-p.74",
      note: "원문은 private source로 유지하고 reader에는 시험용 개념 지도만 둔다."
    }
  ],
  requiredKeywords: [
    {
      id: "ci-kw-system",
      label: "컴퓨터 시스템 구성",
      status: "covered",
      professorSignal: "하드웨어/소프트웨어 구분 강조",
      conceptIds: ["ci-system"]
    },
    {
      id: "ci-kw-data",
      label: "데이터 표현",
      status: "covered",
      professorSignal: "비트/바이트와 문자 표현 강조",
      conceptIds: ["ci-data-representation"]
    },
    {
      id: "ci-kw-os-network",
      label: "운영체제와 네트워크 기초",
      status: "covered",
      professorSignal: "역할 중심 서술형 가능",
      conceptIds: ["ci-os-network"]
    },
    {
      id: "ci-kw-security",
      label: "정보보안 기초",
      status: "missing",
      professorSignal: "실제 시험 범위 확인 필요",
      conceptIds: []
    }
  ],
  concepts: [
    {
      id: "ci-system",
      title: "컴퓨터 시스템 구성",
      priority: "must-know",
      summary: "컴퓨터 시스템은 하드웨어와 소프트웨어가 함께 동작해 입력, 처리, 저장, 출력을 수행한다.",
      easyExplanation: "기계 부품과 그 부품을 움직이는 명령 체계가 같이 있어야 컴퓨터가 동작한다.",
      sourceHints: ["교수님 PDF p.8-p.18"],
      relatedKeywordIds: ["ci-kw-system"],
      exampleQuestionIds: ["ci-q-system"]
    },
    {
      id: "ci-data-representation",
      title: "데이터 표현",
      priority: "high",
      summary: "컴퓨터는 모든 정보를 비트 조합으로 표현하고 해석 규칙에 따라 숫자, 문자, 이미지로 다룬다.",
      easyExplanation: "같은 0과 1도 어떤 약속으로 읽느냐에 따라 숫자나 글자가 된다.",
      sourceHints: ["교수님 PDF p.22-p.34"],
      relatedKeywordIds: ["ci-kw-data"],
      exampleQuestionIds: ["ci-q-data"]
    },
    {
      id: "ci-os-network",
      title: "운영체제와 네트워크 기초",
      priority: "must-know",
      summary: "운영체제는 자원을 관리하고, 네트워크는 컴퓨터 사이의 데이터 교환을 가능하게 한다.",
      easyExplanation: "운영체제는 컴퓨터 내부 관리자, 네트워크는 다른 컴퓨터와 연결되는 통로에 가깝다.",
      sourceHints: ["교수님 PDF p.42-p.61"],
      relatedKeywordIds: ["ci-kw-os-network"],
      exampleQuestionIds: ["ci-q-os-network"]
    }
  ],
  exampleQuestions: [
    {
      id: "ci-q-system",
      conceptId: "ci-system",
      difficulty: "basic",
      prompt: "컴퓨터 시스템에서 하드웨어와 소프트웨어의 차이를 설명하라.",
      answer: "하드웨어는 물리적 장치이고, 소프트웨어는 하드웨어가 수행할 명령과 프로그램이다.",
      explanation: "물리 장치와 명령 체계의 차이를 구분하면 된다."
    },
    {
      id: "ci-q-data",
      conceptId: "ci-data-representation",
      difficulty: "basic",
      prompt: "비트와 바이트의 관계를 설명하라.",
      answer: "1바이트는 일반적으로 8비트다.",
      explanation: "데이터 표현 단위의 기본 관계를 묻는 문제다."
    },
    {
      id: "ci-q-os-network",
      conceptId: "ci-os-network",
      difficulty: "applied",
      prompt: "운영체제와 네트워크의 역할을 각각 한 문장으로 설명하라.",
      answer: "운영체제는 컴퓨터 자원을 관리하고, 네트워크는 컴퓨터 간 데이터 교환을 지원한다.",
      explanation: "내부 자원 관리와 외부 연결 역할을 구분해야 한다."
    }
  ],
  weekNotes: [
    {
      id: "ci-week-08",
      label: "4월 30일(목)",
      title: "컴퓨터 시스템",
      focus: "하드웨어와 소프트웨어의 역할을 구분한다.",
      sourceMaterialIds: ["ci-pdf-08-14"],
      requiredKeywordIds: ["ci-kw-system"],
      conceptIds: ["ci-system"],
      exampleQuestionIds: ["ci-q-system"],
      reviewStatus: "ready"
    },
    {
      id: "ci-week-10",
      label: "5월 2일(토)",
      title: "데이터 표현",
      focus: "비트/바이트와 정보 표현 방식을 정리한다.",
      sourceMaterialIds: ["ci-pdf-08-14"],
      requiredKeywordIds: ["ci-kw-data"],
      conceptIds: ["ci-data-representation"],
      exampleQuestionIds: ["ci-q-data"],
      reviewStatus: "ready"
    },
    {
      id: "ci-week-12",
      label: "5월 7일(목)",
      title: "운영체제와 네트워크",
      focus: "운영체제와 네트워크의 역할을 큰 그림으로 연결한다.",
      sourceMaterialIds: ["ci-pdf-08-14"],
      requiredKeywordIds: ["ci-kw-os-network", "ci-kw-security"],
      conceptIds: ["ci-os-network"],
      exampleQuestionIds: ["ci-q-os-network"],
      reviewStatus: "needs-fill"
    }
  ]
};

export const sampleLectureNote: StudyNotebook = {
  id: "final-study-notebook-001",
  title: "기말고사 4과목 Lecture Note",
  updatedAt: "2026-05-02",
  term: "2026년 1학기",
  audience: "직장인 전형 대학생 + 같은 수업 동기",
  sourceWorkspaceUrl: "https://www.notion.so/1-33ff019a655181a1813ae6a1ad37a02a",
  subjects: [
    digitalEngineering,
    informationCommunication,
    cLanguage,
    computerIntroduction
  ],
  sharePolicy: {
    access: "small-cohort-readonly",
    rawSourceRule: "교수님 PDF 원문은 private source로 유지하고 reader에서 공개 URL을 만들지 않는다.",
    noteRule: "생성 note는 동기 소수에게 read-only로 공유하는 것을 전제로 한다.",
    disclaimer: "AI 또는 수동 요약은 시험 대비 보조자료이며, 교수님 원문과 수업 공지를 최종 기준으로 확인해야 한다."
  }
};
