export interface ExamPrepChapter {
  label: string;
  title: string;
  focus: string;
  sourceHint: string;
}

export interface ExamPrepConcept {
  title: string;
  points: string[];
}

export interface ExamPrepQuestion {
  id: string;
  title: string;
  priority: "최우선" | "중요" | "연습";
  tags: string[];
  answer: string[];
  explanation: string[];
  code?: string;
}

export interface ExamPrepTerm {
  term: string;
  definition: string;
  note: string;
}

export interface SubjectExamPrepArtifact {
  subjectId: string;
  artifactSlug: string;
  title: string;
  sourceLabel: string;
  markdownHref: string;
  note: string;
  studyOrder: string[];
  chapters: ExamPrepChapter[];
  concepts: ExamPrepConcept[];
  questions: ExamPrepQuestion[];
  terms: ExamPrepTerm[];
  checklist: string[];
}

const DIGITAL_ENGINEERING: SubjectExamPrepArtifact = {
  subjectId: "digital-engineering",
  artifactSlug: "digital-engineering",
  title: "디지털공학개론 기말 실전 템플릿",
  sourceLabel: "6, 7, 8장 + 힌트 PDF + 퀴즈 PDF",
  markdownHref: "/exam-prep/digital-engineering/workbook.md",
  note: "힌트 PDF와 퀴즈 PDF에 나온 유형을 6장 간소화, 7장 조합논리회로, 8장 플립플롭 순서로 다시 묶었습니다.",
  studyOrder: [
    "힌트/퀴즈 PDF에 나온 회로식과 진리표 문제를 먼저 한 번 풀기",
    "6장 카르노맵, 무관항, NAND/NOR 변환을 계산형으로 반복",
    "7장 가산기, 비교기, 디코더/인코더, MUX/DEMUX를 기능과 선택선 기준으로 암기",
    "8장 SR 래치와 D/JK/T 플립플롭의 입력별 다음 상태를 표로 고정"
  ],
  chapters: [
    {
      label: "6장",
      title: "논리식의 간소화",
      focus: "카르노맵, 무관항, 드모르간, NAND/NOR 변환, XOR/XNOR",
      sourceHint: "제06장 논리식의 간소화 + 힌트 PDF 3쪽/마지막 회로"
    },
    {
      label: "7장",
      title: "조합논리회로",
      focus: "회로의 논리식, 반가산기/전가산기, 비교기, 디코더/인코더, MUX/DEMUX",
      sourceHint: "제07장 조합논리회로 + 퀴즈 PDF 5쪽"
    },
    {
      label: "8장",
      title: "플립플롭",
      focus: "NOR SR 래치, SR/D/JK/T 플립플롭 진리표, 특성표, 파형",
      sourceHint: "제08장 플립플롭 + 힌트 PDF 파형"
    }
  ],
  concepts: [
    {
      title: "카르노맵과 논리식 간소화",
      points: [
        "진리표나 논리식을 minterm 번호로 옮긴 뒤 SOP 형태로 생각한다.",
        "카르노맵 행/열은 Gray code 순서인 00, 01, 11, 10을 사용한다.",
        "1과 필요한 무관항 X를 1, 2, 4, 8개처럼 2의 거듭제곱 크기로 최대한 크게 묶는다.",
        "묶음 안에서 변하지 않는 변수만 남기고, 변하는 변수는 제거한다.",
        "답을 쓰기 전 모든 1이 최소 한 번 포함됐는지 확인한다."
      ]
    },
    {
      title: "NAND/NOR 변환과 드모르간",
      points: [
        "NAND와 NOR는 모든 논리식을 만들 수 있는 범용 게이트다.",
        "NAND 회로는 각 중간 출력에 보수가 붙으므로 괄호를 끝까지 유지한다.",
        "드모르간 법칙은 (AB)' = A' + B', (A + B)' = A'B'다.",
        "NAND만으로 OR를 만들 때는 입력을 각각 반전한 뒤 NAND를 사용한다.",
        "NOR만으로 AND를 만들 때는 입력을 각각 반전한 뒤 NOR를 사용한다."
      ]
    },
    {
      title: "조합논리회로 계산 공식",
      points: [
        "반가산기: S = A xor B, C = AB",
        "전가산기: S = A xor B xor Cin",
        "전가산기 자리올림: Cout = AB + ACin + BCin",
        "전감산기 빌림: Bout = A'B + A'Bin + BBin",
        "1비트 비교기: A>B = AB', A=B = AB + A'B', A<B = A'B"
      ]
    },
    {
      title: "디코더/인코더/MUX/DEMUX",
      points: [
        "디코더는 n비트 입력을 2^n개 출력 중 하나로 풀어내는 회로다.",
        "인코더는 여러 입력 중 활성화된 입력의 번호를 이진 코드로 바꾼다.",
        "MUX는 여러 입력 중 선택선이 가리키는 하나를 출력으로 보낸다.",
        "DEMUX는 하나의 입력을 선택선이 가리키는 출력선 하나로 보낸다.",
        "선택선이 n개이면 MUX/DEMUX는 보통 2^n개 경로를 고를 수 있다."
      ]
    },
    {
      title: "래치와 플립플롭 상태 판단",
      points: [
        "래치는 enable이 열려 있는 동안 입력을 반영하고, 플립플롭은 클록 에지에서 상태가 변한다.",
        "NOR SR 래치에서 S/R = 00은 유지, 01은 Reset, 10은 Set, 11은 금지다.",
        "D 플립플롭은 다음 상태 Q+가 D와 같다.",
        "JK 플립플롭은 00 유지, 01 Reset, 10 Set, 11 toggle이다.",
        "T 플립플롭은 T=0 유지, T=1 toggle이다."
      ]
    }
  ],
  questions: [
    {
      id: "de-q-logic-expression",
      title: "7장 회로의 논리식을 쓰고 두 회로가 같은지 판단",
      priority: "최우선",
      tags: ["회로식", "인수분해"],
      answer: [
        "왼쪽 회로는 위 AND가 HD, 아래 AND가 DK이고 OR 출력은 F = HD + DK다.",
        "공통 인수 D를 묶으면 F = D(H + K)가 된다.",
        "오른쪽 회로는 먼저 H + K를 만들고 D와 AND하므로 F = D(H + K)다.",
        "따라서 두 회로는 같은 논리식을 갖는다."
      ],
      explanation: [
        "게이트마다 중간 출력을 적고 마지막에 간소화하면 실수가 줄어든다.",
        "시험에서는 완성식만 쓰기보다 HD + DK에서 D(H + K)로 가는 과정이 보이게 쓰는 편이 안전하다."
      ]
    },
    {
      id: "de-q-kmap-basic",
      title: "6장 카르노맵으로 논리식 간소화",
      priority: "최우선",
      tags: ["카르노맵", "무관항"],
      answer: [
        "각 곱항을 minterm으로 표시하고 3변수 카르노맵 열을 yz = 00, 01, 11, 10 순서로 배치한다.",
        "인접한 1을 가능한 크게 묶고, 묶음 안에서 변하지 않는 변수만 남긴다.",
        "무관항 X는 더 큰 묶음을 만들 수 있을 때만 1처럼 사용한다."
      ],
      explanation: [
        "카르노맵 문제의 핵심 실수는 Gray code 순서를 일반 이진 순서로 쓰는 것이다.",
        "보수 표시 x', y', z'를 먼저 minterm 번호로 바꿔두면 풀이가 안정된다.",
        "묶음이 겹쳐도 되지만 모든 1이 포함되어야 하고, 불필요하게 작은 묶음을 만들면 식이 길어진다."
      ]
    },
    {
      id: "de-q-dont-care",
      title: "6장 무관항을 포함한 카르노맵",
      priority: "중요",
      tags: ["무관항", "간소화"],
      answer: [
        "무관항 X는 반드시 사용하지 않아도 된다.",
        "더 큰 묶음을 만들 수 있을 때만 X를 1처럼 포함한다.",
        "X를 포함해도 최종식은 실제 1이 되는 minterm을 모두 덮어야 한다."
      ],
      explanation: [
        "무관항은 입력 조합이 실제로 발생하지 않거나 출력이 중요하지 않은 경우다.",
        "시험에서는 X를 무조건 1로 처리하는 실수가 많다. 식이 더 짧아지는 경우에만 사용한다."
      ]
    },
    {
      id: "de-q-adders",
      title: "7장 반가산기와 전가산기 식",
      priority: "최우선",
      tags: ["가산기", "공식"],
      answer: [
        "반가산기: S = A xor B, C = AB",
        "전가산기: S = A xor B xor Cin",
        "전가산기 자리올림: Cout = AB + ACin + BCin",
        "감산기에서 빌림은 작은 자리에서 빌려와야 하는 조건을 논리식으로 표현한다."
      ],
      explanation: [
        "자리올림은 입력 셋 중 적어도 두 개가 1이면 1이 된다고 이해하면 AB + ACin + BCin을 바로 복원할 수 있다.",
        "병렬 가산기/감산기는 1비트 전가산기를 자리수만큼 연결하고, 이전 자리의 carry/borrow가 다음 자리로 넘어간다고 보면 된다."
      ]
    },
    {
      id: "de-q-comparator",
      title: "7장 1비트 비교기와 다중 비트 비교",
      priority: "중요",
      tags: ["비교기"],
      answer: [
        "A > B는 AB', A = B는 AB + A'B', A < B는 A'B다.",
        "여러 비트 비교기는 최상위 비트부터 우선 비교한다."
      ],
      explanation: [
        "A = B 식은 XNOR와 같다. 다중 비트 비교는 낮은 자리보다 높은 자리의 결과가 먼저 결정권을 가진다."
      ]
    },
    {
      id: "de-q-decoder-mux",
      title: "7장 디코더/인코더/MUX/DEMUX 구분",
      priority: "중요",
      tags: ["디코더", "MUX"],
      answer: [
        "디코더는 n비트 입력을 받아 2^n개 출력 중 하나를 활성화한다.",
        "인코더는 활성화된 입력선의 번호를 이진 코드로 출력한다.",
        "MUX는 여러 입력 중 선택선이 지정한 하나를 출력으로 보낸다.",
        "DEMUX는 하나의 입력을 선택선이 지정한 출력선 하나로 보낸다."
      ],
      explanation: [
        "디코더와 DEMUX는 출력선이 여러 개라는 점에서 헷갈리지만, 디코더는 입력 코드 자체를 해석하고 DEMUX는 데이터 입력 하나를 분배한다.",
        "MUX 문제는 선택선 값이 어느 입력 번호를 가리키는지 먼저 표로 적으면 빠르다."
      ]
    },
    {
      id: "de-q-nor-sr-latch",
      title: "8장 NOR SR 래치 진리표와 파형",
      priority: "최우선",
      tags: ["SR 래치", "파형"],
      answer: [
        "S=0, R=0이면 유지, S=0, R=1이면 Reset, S=1, R=0이면 Set, S=1, R=1이면 부정/금지다.",
        "초기 Q=0이면 S 펄스 구간에서 Q=1, R 펄스 구간에서 Q=0, 둘 다 0인 구간에서는 이전 Q를 유지한다."
      ],
      explanation: [
        "파형 문제는 시간축을 외우려 하지 말고 각 구간의 S/R 조합을 표에 대입하면 된다.",
        "금지 입력 이후의 상태는 회로가 안정적으로 예측되지 않으므로 시험 답안에는 금지/부정 상태라고 명확히 쓴다."
      ]
    },
    {
      id: "de-q-flipflop-types",
      title: "8장 D/JK/T 플립플롭 다음 상태",
      priority: "최우선",
      tags: ["플립플롭", "진리표"],
      answer: [
        "D 플립플롭은 Q+ = D다.",
        "JK 플립플롭은 J/K = 00 유지, 01 Reset, 10 Set, 11 Toggle이다.",
        "T 플립플롭은 T=0 유지, T=1 Toggle이다."
      ],
      explanation: [
        "D는 입력을 그대로 저장하는 형태라 파형 문제에서 가장 단순하다.",
        "JK는 SR의 금지 상태를 toggle로 바꾼 형태로 외우면 된다.",
        "T는 toggle 전용 플립플롭처럼 보고, 입력이 1인 클록 에지마다 Q가 반전된다고 판단한다."
      ]
    },
    {
      id: "de-q-nand-output",
      title: "6장 NAND 회로 출력 간소화",
      priority: "중요",
      tags: ["NAND", "드모르간"],
      answer: [
        "B가 먼저 반전되어 B'가 된다.",
        "첫 NAND 출력은 (AB')'이고 마지막 NAND 출력은 X = ((AB')'B')'이다.",
        "드모르간을 적용하면 X = A + B다."
      ],
      explanation: [
        "NAND 회로는 출력마다 보수가 붙으므로 중간 출력을 괄호로 정확히 적는 것이 가장 중요하다."
      ]
    }
  ],
  terms: [
    { term: "minterm", definition: "특정 입력 조합 하나를 나타내는 곱항", note: "SOP/K-map 시작점" },
    { term: "무관항", definition: "출력이 0이어도 1이어도 상관없는 입력 조합", note: "간소화에 도움될 때만 사용" },
    { term: "Gray code", definition: "인접한 코드가 한 비트만 다른 순서", note: "K-map 00,01,11,10" },
    { term: "드모르간 법칙", definition: "AND/OR의 보수를 서로 바꾸고 각 항을 반전하는 법칙", note: "(AB)' = A' + B'" },
    { term: "범용 게이트", definition: "단독 종류만으로 모든 논리회로를 구성할 수 있는 게이트", note: "NAND, NOR" },
    { term: "전가산기", definition: "A, B, Cin 세 입력으로 합과 자리올림을 구하는 회로", note: "Cout = AB + ACin + BCin" },
    { term: "비교기", definition: "두 이진수의 대소/같음을 판단하는 조합회로", note: "상위 비트 우선" },
    { term: "디코더", definition: "n비트 입력을 2^n개 출력 중 하나로 변환", note: "코드 해석" },
    { term: "MUX", definition: "여러 입력 중 선택선이 가리키는 하나를 출력", note: "데이터 선택" },
    { term: "SR 래치", definition: "Set/Reset 입력으로 1비트 상태를 저장하는 기억 회로", note: "NOR형 11 금지" },
    { term: "JK 플립플롭", definition: "SR의 금지 입력을 toggle 동작으로 바꾼 플립플롭", note: "J=K=1 toggle" },
    { term: "T 플립플롭", definition: "T=1일 때마다 상태가 반전되는 플립플롭", note: "카운터 기본" }
  ],
  checklist: [
    "카르노맵 열 순서 00, 01, 11, 10",
    "minterm 번호와 보수 변수 변환 먼저 적기",
    "무관항은 도움이 될 때만 사용",
    "NAND/NOR 회로는 중간 출력 괄호와 보수 유지",
    "전가산기 Cout = AB + ACin + BCin",
    "디코더는 코드 해석, MUX는 데이터 선택",
    "NOR SR 래치 11 금지",
    "D는 Q+=D, JK 11 toggle, T 1 toggle"
  ]
};

const INFORMATION_COMMUNICATION: SubjectExamPrepArtifact = {
  subjectId: "information-communication",
  artifactSlug: "information-communication",
  title: "정보통신개론 레포트2 시험직결 템플릿",
  sourceLabel: "6, 7, 8, 9장 + 별도 PDF + 레포트2",
  markdownHref: "/exam-prep/information-communication/workbook.md",
  note: "레포트 문항에서 그대로 출제된다는 기준으로, 선행개념과 문항별 답안 흐름을 한 화면에 묶었습니다.",
  studyOrder: [
    "선행개념을 먼저 읽고 용어의 계층/역할을 고정",
    "설명형 18문항을 제목만 보고 말로 답해보기",
    "IP/TCP 헤더와 장비-계층 매칭은 빈칸형으로 반복",
    "마지막에 용어 정의와 시험 직전 암기표만 훑기"
  ],
  chapters: [
    {
      label: "6장",
      title: "네트워크 구성 장비",
      focus: "트랜시버, 리피터, 허브, 브리지, 스위치, 라우터, 게이트웨이와 OSI 계층",
      sourceHint: "장비 이름과 계층을 같이 암기"
    },
    {
      label: "7장",
      title: "교환기술",
      focus: "회선교환, 데이터그램, 가상회선, 패킷교환 비교",
      sourceHint: "경로 설정 여부와 순서 보장 여부 중심"
    },
    {
      label: "8장",
      title: "TCP/IP",
      focus: "TCP/IP 계층, 주소 3가지, IP/TCP 헤더, ARP/RARP/DNS, IPv6",
      sourceHint: "레포트 문항 11~17 최우선"
    },
    {
      label: "9장",
      title: "고속/광역 데이터 서비스",
      focus: "RIP/OSPF와 고속망 용어를 단답식으로 정리",
      sourceHint: "라우팅 방식과 기준 비교"
    }
  ],
  concepts: [
    {
      title: "LAN과 IEEE 802",
      points: [
        "LAN은 좁은 범위의 장치를 연결하는 근거리 통신망이며 빠른 속도와 낮은 오류율이 특징이다.",
        "IEEE 802 데이터링크 계층은 LLC와 MAC으로 나뉜다.",
        "LLC는 상위 계층 인터페이스와 흐름/오류/순서 제어, MAC은 매체 접근과 MAC 주소/프레임/FCS 처리를 맡는다."
      ]
    },
    {
      title: "매체 접근 제어",
      points: [
        "CSMA/CD는 유선 이더넷의 충돌 검출 방식이다.",
        "CSMA/CA는 무선랜의 충돌 회피 방식이다.",
        "토큰링/토큰버스는 토큰을 가진 장치만 전송해 충돌을 방지한다."
      ]
    },
    {
      title: "장비와 OSI 계층",
      points: [
        "리피터와 허브는 1계층, 브리지와 스위치는 2계층, 라우터는 3계층 장비다.",
        "게이트웨이는 상위 계층까지 포함해 서로 다른 프로토콜을 변환한다.",
        "계층이 올라갈수록 더 많은 주소와 프로토콜 정보를 해석한다."
      ]
    },
    {
      title: "TCP/IP 핵심",
      points: [
        "OSI는 7계층 이론 모델, TCP/IP는 인터넷에서 쓰는 4계층 실무 모델이다.",
        "MAC 주소는 데이터링크, IP 주소는 네트워크, 도메인 이름은 응용 계층 관점의 주소다.",
        "TCP는 연결형/신뢰성/순서 보장, UDP는 비연결형/가벼움/빠른 전송이 핵심이다."
      ]
    }
  ],
  questions: [
    {
      id: "ic-q-01",
      title: "LAN의 정의 및 특징, MAC 계층과 LLC 계층의 기능",
      priority: "최우선",
      tags: ["LAN", "IEEE 802"],
      answer: [
        "LAN은 건물, 학교, 회사처럼 제한된 지역 안의 장치를 연결해 데이터와 자원을 공유하는 근거리 통신망이다.",
        "전송 거리가 짧고 속도가 빠르며 오류율이 낮고 설치/확장이 비교적 쉽다.",
        "LLC는 상위 계층 인터페이스와 흐름/오류/순서 제어를 맡고, MAC은 매체 접근 제어, MAC 주소 처리, 프레임 생성, FCS 오류 검출을 맡는다."
      ],
      explanation: [
        "LAN 정의만 쓰면 부족하다. LAN 특징, LLC 기능, MAC 기능을 반드시 세 덩어리로 써야 한다."
      ]
    },
    {
      id: "ic-q-02",
      title: "LAN 토폴로지 5개",
      priority: "중요",
      tags: ["토폴로지"],
      answer: [
        "성형은 중앙 허브/스위치에 연결, 버스형은 공통 케이블 공유, 링형은 고리 순환, 트리형은 계층 확장, 망형은 다중 경로 직접 연결 구조다."
      ],
      explanation: [
        "객관식은 중앙 장치, 공통 케이블, 고리, 계층, 그물이라는 키워드로 구분하면 된다."
      ]
    },
    {
      id: "ic-q-03",
      title: "CSMA/CD 특징, 동작원리, 이더넷 프레임 구조",
      priority: "최우선",
      tags: ["CSMA/CD", "Ethernet"],
      answer: [
        "CSMA/CD는 전송 전 매체가 비었는지 듣고, 전송 중 충돌이 나면 감지해 중단한 뒤 Jam 신호와 백오프 후 재전송하는 방식이다.",
        "이더넷 프레임은 Preamble(7), SFD(1), Destination MAC(6), Source MAC(6), Length/Type(2), Data(46~1500), FCS(4) 순서다."
      ],
      explanation: [
        "듣고, 비면 보내고, 충돌 나면 멈추고, 랜덤 대기 후 재전송으로 외운다.",
        "프레임 byte 수 7,1,6,6,2,46~1500,4는 빈칸형 최우선이다."
      ]
    },
    {
      id: "ic-q-04",
      title: "토큰링과 토큰버스",
      priority: "중요",
      tags: ["Token"],
      answer: [
        "둘 다 토큰 패싱 방식이며 토큰을 가진 노드만 전송할 수 있어 충돌이 발생하지 않는다.",
        "토큰링은 물리/논리적으로 링 구조를 사용하고, 토큰버스는 물리적으로 버스지만 논리적으로 토큰 순서를 가진다."
      ],
      explanation: [
        "CSMA/CD와 비교해 충돌 검출이 아니라 충돌 방지 구조라는 점을 강조한다."
      ]
    },
    {
      id: "ic-q-05",
      title: "10BASE-T, 10BASE5, 10BASE-F 의미",
      priority: "중요",
      tags: ["Ethernet"],
      answer: [
        "10은 10Mbps, BASE는 baseband 전송을 뜻한다.",
        "T는 twisted pair, 5는 세그먼트 최대 약 500m 동축 케이블, F는 fiber optic 광섬유를 뜻한다."
      ],
      explanation: [
        "숫자/BASE/매체 기호를 분리해서 해석하면 된다."
      ]
    },
    {
      id: "ic-q-06",
      title: "무선랜 IEEE 802.11",
      priority: "최우선",
      tags: ["802.11", "CSMA/CA"],
      answer: [
        "무선랜은 BSS, ESS, Ad-hoc 형태로 구성될 수 있고 물리층에는 FHSS, DSSS, IR, OFDM 방식이 있다.",
        "무선에서는 송신 중 충돌 감지가 어려워 CSMA/CA로 충돌을 피하며 RTS/CTS로 숨겨진 터미널 문제를 줄인다.",
        "무선랜 MAC 프레임은 AP/분배 시스템을 고려해 주소 필드가 최대 4개까지 사용될 수 있다."
      ],
      explanation: [
        "BSS/ESS/Ad-hoc, 물리층 방식, CSMA/CA, MAC 프레임 주소 필드를 나누어 외우면 긴 답안을 안정적으로 쓸 수 있다."
      ]
    },
    {
      id: "ic-q-07",
      title: "트랜시버, 리피터, 허브, 브리지, 스위치, 라우터, 게이트웨이",
      priority: "최우선",
      tags: ["장비", "OSI"],
      answer: [
        "트랜시버는 신호 변환/송수신, 리피터는 약해진 신호 재생, 허브는 여러 포트로 신호를 반복 전달한다.",
        "브리지는 MAC 주소로 LAN 세그먼트를 연결/필터링하고, 스위치는 브리지 기능을 고속 다중 포트로 수행한다.",
        "라우터는 IP 주소로 패킷 경로를 선택하고, 게이트웨이는 서로 다른 프로토콜/네트워크를 변환한다."
      ],
      explanation: [
        "허브까지는 물리, 브리지/스위치는 MAC, 라우터는 IP, 게이트웨이는 변환으로 묶어 외운다."
      ]
    },
    {
      id: "ic-q-08",
      title: "리피터, 브리지, 라우터, 게이트웨이와 OSI 7계층",
      priority: "최우선",
      tags: ["OSI"],
      answer: [
        "리피터는 1계층 물리계층, 브리지는 2계층 데이터링크 계층, 라우터는 3계층 네트워크 계층에서 동작한다.",
        "게이트웨이는 응용 계층까지 포함해 서로 다른 프로토콜을 변환할 수 있다."
      ],
      explanation: [
        "계층 매칭은 단답식으로 나올 가능성이 높으므로 장비명과 계층 번호를 함께 암기한다."
      ]
    },
    {
      id: "ic-q-09",
      title: "브리지와 스위치 비교",
      priority: "중요",
      tags: ["Bridge", "Switch"],
      answer: [
        "둘 다 데이터링크 계층에서 MAC 주소를 보고 프레임을 필터링/전달한다.",
        "브리지는 소수 포트 중심의 세그먼트 연결 장비이고, 스위치는 다중 포트와 하드웨어 기반 고속 처리로 각 포트 충돌 도메인을 분리한다."
      ],
      explanation: [
        "공통점은 MAC 주소 기반 2계층 장비, 차이점은 포트 수와 성능/동시 전송으로 정리한다."
      ]
    },
    {
      id: "ic-q-10",
      title: "회선교환망과 패킷교환망 비교",
      priority: "중요",
      tags: ["교환기술"],
      answer: [
        "회선교환은 통신 전에 전용 경로를 설정해 순서와 지연이 안정적이지만 자원 낭비가 생길 수 있다.",
        "패킷교환은 데이터를 패킷으로 나눠 전송해 효율이 좋지만 지연과 순서 변동이 생길 수 있다.",
        "패킷교환은 데이터그램 방식과 가상회선 방식으로 나뉜다."
      ],
      explanation: [
        "경로 설정 여부, 순서 보장 여부, 효율, 지연, 장단점을 비교 축으로 잡는다."
      ]
    },
    {
      id: "ic-q-11",
      title: "OSI 참조모델과 TCP/IP 비교, TCP/IP 계층별 프로토콜",
      priority: "최우선",
      tags: ["TCP/IP", "OSI"],
      answer: [
        "OSI는 7계층 이론 모델이고 TCP/IP는 인터넷에서 실제 사용하는 4계층 모델이다.",
        "TCP/IP 응용 계층은 OSI 응용/표현/세션, 전송 계층은 OSI 전송, IP 계층은 OSI 네트워크, 네트워크 액세스 계층은 OSI 데이터링크/물리와 대응한다.",
        "응용 계층에는 HTTP/FTP/SMTP/DNS, 전송 계층에는 TCP/UDP, IP 계층에는 IP/ICMP/IGMP/ARP/RARP, 네트워크 액세스에는 Ethernet/Wi-Fi가 연결된다."
      ],
      explanation: [
        "계층 대응과 프로토콜 예시를 같이 써야 답안이 완성된다."
      ]
    },
    {
      id: "ic-q-12",
      title: "인터넷 사용에 필요한 주소 3가지",
      priority: "최우선",
      tags: ["주소"],
      answer: [
        "MAC 주소는 데이터링크 계층 주소이고 NIC에 저장된다.",
        "IP 주소는 네트워크 계층 논리 주소이고 운영체제의 네트워크 설정에 저장된다.",
        "호스트/도메인 이름은 사람이 읽기 쉬운 응용 계층 이름이고 DNS가 IP 주소로 변환한다."
      ],
      explanation: [
        "계층, 저장 위치, 역할을 빠뜨리면 감점된다."
      ]
    },
    {
      id: "ic-q-13",
      title: "IP 주소 체계 클래스 분류",
      priority: "중요",
      tags: ["IPv4"],
      answer: [
        "A 클래스는 첫 비트 0, B 클래스는 10, C 클래스는 110으로 시작한다.",
        "D 클래스는 멀티캐스트, E 클래스는 실험/예약 주소로 사용된다.",
        "클래스는 네트워크 부분과 호스트 부분의 크기를 구분하기 위한 IPv4 주소 체계다."
      ],
      explanation: [
        "첫 옥텟 범위와 용도를 같이 외우면 객관식 대응이 쉽다."
      ]
    },
    {
      id: "ic-q-14",
      title: "TCP와 UDP 특징",
      priority: "최우선",
      tags: ["TCP", "UDP"],
      answer: [
        "TCP는 연결형 프로토콜로 신뢰성, 순서 보장, 오류제어, 흐름제어를 제공한다.",
        "UDP는 비연결형 프로토콜로 신뢰성 보장은 약하지만 헤더가 단순하고 빠르다.",
        "TCP는 파일 전송/웹처럼 정확성이 필요한 곳, UDP는 스트리밍/음성처럼 속도가 중요한 곳에 적합하다."
      ],
      explanation: [
        "TCP=정확성, UDP=속도로 외우면 된다."
      ]
    },
    {
      id: "ic-q-15",
      title: "IP 헤더와 TCP 헤더 구조",
      priority: "최우선",
      tags: ["헤더", "빈칸형"],
      answer: [
        "IPv4 헤더에는 Version, Header Length, Service Type, Total Length, Identification, Flags, Fragment Offset, TTL, Protocol, Header Checksum, Source/Destination IP 등이 있다.",
        "Identification, Flags, Fragment Offset은 단편화와 재조립에 사용된다.",
        "TCP 헤더에는 Source/Destination Port, Sequence Number, Acknowledgment Number, Header Length, Code Bits, Window, Checksum, Urgent Pointer 등이 있다.",
        "Code bit U/A/P/R/S/F는 Urgent, ACK, Push, Reset, SYN, FIN을 뜻한다."
      ],
      explanation: [
        "레포트에 수시시험 10점이라고 표시된 최우선 문항이다.",
        "IP는 단편화 3종 세트, TCP는 순서 번호/ACK 번호/윈도우/코드 비트를 집중 암기한다."
      ]
    },
    {
      id: "ic-q-16",
      title: "ARP와 RARP 비교",
      priority: "중요",
      tags: ["ARP", "RARP"],
      answer: [
        "ARP는 IP 주소를 MAC 주소로 변환한다.",
        "RARP는 MAC 주소를 IP 주소로 변환한다.",
        "둘 다 같은 LAN 안에서 주소 해석에 쓰이며, DNS는 도메인 이름을 IP 주소로 바꾸는 이름 해석이다."
      ],
      explanation: [
        "ARP=IP to MAC, RARP=MAC to IP로 방향을 정확히 외운다."
      ]
    },
    {
      id: "ic-q-17",
      title: "IPv6 특징 및 장점",
      priority: "중요",
      tags: ["IPv6"],
      answer: [
        "IPv6는 128비트 주소를 사용해 주소 공간을 크게 확장한다.",
        "헤더가 단순화되고 보안, QoS, 자동 구성, 이동성 지원이 강화된다.",
        "IPv4 주소 부족 문제를 해결하기 위해 도입되었다."
      ],
      explanation: [
        "128비트, 헤더 단순화, 보안/QoS/자동구성을 핵심 키워드로 쓴다."
      ]
    },
    {
      id: "ic-q-18",
      title: "RIP와 OSPF 비교",
      priority: "중요",
      tags: ["Routing"],
      answer: [
        "RIP는 거리 벡터 방식이며 홉 수를 기준으로 경로를 선택한다.",
        "OSPF는 링크 상태 방식이며 비용을 기준으로 최단 경로를 계산한다.",
        "RIP는 단순해 작은 네트워크에 적합하고, OSPF는 복잡하지만 큰 네트워크에 적합하다."
      ],
      explanation: [
        "RIP=hop count, OSPF=link state/cost로 대비한다."
      ]
    }
  ],
  terms: [
    { term: "BSS", definition: "하나의 AP 또는 기본 무선랜 서비스 영역", note: "무선랜 구성 단위" },
    { term: "ESS", definition: "여러 BSS를 연결한 확장 서비스 영역", note: "AP 여러 개" },
    { term: "Ad-hoc", definition: "AP 없이 단말끼리 직접 연결하는 무선랜", note: "임시 네트워크" },
    { term: "FCS", definition: "프레임 오류 검출을 위한 검사 필드", note: "Ethernet/WLAN 프레임" },
    { term: "TTL", definition: "패킷 생존 시간을 제한하는 IP 헤더 필드", note: "라우터마다 감소" },
    { term: "ICMP", definition: "IP 오류 보고와 제어 메시지 프로토콜", note: "ping과 연결" },
    { term: "IGMP", definition: "IP 멀티캐스트 그룹 관리를 위한 프로토콜", note: "멀티캐스트" },
    { term: "ARP", definition: "IP 주소를 MAC 주소로 변환", note: "IP -> MAC" },
    { term: "RARP", definition: "MAC 주소를 IP 주소로 변환", note: "MAC -> IP" },
    { term: "DNS", definition: "도메인 이름을 IP 주소로 변환", note: "이름 해석" },
    { term: "RIP", definition: "홉 수 기반 거리 벡터 라우팅 프로토콜", note: "작은 네트워크" },
    { term: "OSPF", definition: "비용 기반 링크 상태 라우팅 프로토콜", note: "큰 네트워크" }
  ],
  checklist: [
    "장비-계층: 허브 1, 스위치 2, 라우터 3, 게이트웨이 상위",
    "CSMA/CD는 충돌 검출, CSMA/CA는 충돌 회피",
    "이더넷 프레임 byte: 7,1,6,6,2,46~1500,4",
    "TCP=연결형/신뢰성, UDP=비연결형/가벼움",
    "ARP=IP to MAC, RARP=MAC to IP, DNS=Name to IP",
    "RIP=홉 수, OSPF=비용"
  ]
};

const C_LANGUAGE: SubjectExamPrepArtifact = {
  subjectId: "c-language",
  artifactSlug: "c-language",
  title: "C언어 기말 참고자료 풀이 템플릿",
  sourceLabel: "별도 PDF",
  markdownHref: "/exam-prep/c-language/workbook.md",
  note: "기말고사 참고자료의 코드 읽기, 빈칸, 출력 예측, 배열/함수 문제를 실전 답안 카드로 정리했습니다.",
  studyOrder: [
    "각 문제의 출력과 오류 원인을 먼저 말로 설명",
    "함수 원형, 반환값, call by value, 배열 대입 금지를 반복",
    "반복문 출력 문제는 손으로 행/열 변수를 추적",
    "마지막에 O/X와 빈칸 유형만 빠르게 재확인"
  ],
  chapters: [
    {
      label: "별도 PDF",
      title: "제어문과 함수",
      focus: "continue, 함수 원형, 반환값, 지역/전역 변수, static",
      sourceHint: "기말고사 참고자료 1~11번"
    },
    {
      label: "별도 PDF",
      title: "배열과 반복문",
      focus: "배열 선언 O/X, 배열 복사, 총점/평균, 피라미드, 구구단",
      sourceHint: "기말고사 참고자료 4, 6, 7, 13, 15, 16번"
    },
    {
      label: "별도 PDF",
      title: "코드 작성형",
      focus: "최댓값, 원의 넓이, 홀수 합, 복사 함수 작성",
      sourceHint: "기말고사 참고자료 8, 12, 14, 16번"
    }
  ],
  concepts: [
    {
      title: "함수와 스코프",
      points: [
        "함수 호출 인자 수는 함수 정의의 매개변수 수와 맞아야 한다.",
        "지역변수는 같은 이름의 전역변수를 가린다.",
        "return 값을 호출한 쪽 변수에 저장하지 않으면 결과가 반영되지 않는다.",
        "static 지역변수는 함수 호출이 끝나도 값이 유지된다."
      ]
    },
    {
      title: "배열",
      points: [
        "배열 전체는 =로 대입 복사할 수 없다.",
        "크기보다 많은 초기값을 넣으면 오류다.",
        "초기값 개수로 배열 크기를 생략할 수 있다.",
        "배열 복사는 반복문으로 원소별 대입해야 한다."
      ]
    },
    {
      title: "출력 예측",
      points: [
        "continue는 현재 반복의 아래 문장을 건너뛰고 다음 반복으로 간다.",
        "call by value 함수는 원본 변수를 바꾸지 못한다.",
        "중첩 반복문은 바깥 i 한 번마다 안쪽 j/k가 처음부터 돈다."
      ]
    }
  ],
  questions: [
    {
      id: "c-q-01",
      title: "홀수만 출력하기",
      priority: "최우선",
      tags: ["continue", "출력"],
      answer: ["짝수일 때 printf를 건너뛰어야 하므로 빈칸은 continue; 이다.", "출력은 1 3 5 7 9다."],
      explanation: ["continue는 반복문을 종료하지 않고 현재 반복의 남은 부분만 건너뛴다."]
    },
    {
      id: "c-q-02",
      title: "Max 함수 에러 원인, 수정, 출력",
      priority: "최우선",
      tags: ["함수", "스코프"],
      answer: [
        "Max 함수는 인자 3개를 받는데 2개만 전달한 것이 오류다.",
        "main의 지역변수 max가 전역변수 max를 가리고, Max 반환값도 저장하지 않았다.",
        "Max(3, 4, 5)의 결과를 지역변수 max에 저장하면 출력은 가장 큰 수는 5입니다."
      ],
      explanation: ["인자 수, 변수 가림, 반환값 저장 여부를 세트로 확인한다."],
      code: "max = Max(3, 4, 5);\nprintf(\"가장 큰 수는 %d입니다.\", max);"
    },
    {
      id: "c-q-03",
      title: "swap 결과 예측",
      priority: "최우선",
      tags: ["call by value"],
      answer: ["swap(int x, int y)는 값을 복사해서 받으므로 main의 c, d는 바뀌지 않는다.", "swap 후에도 c=10, d=20이다."],
      explanation: ["포인터를 넘기지 않는 한 함수 안의 x, y 변경은 원본 변수에 반영되지 않는다."]
    },
    {
      id: "c-q-04",
      title: "배열 선언 O/X",
      priority: "중요",
      tags: ["배열"],
      answer: [
        "double arr[0]은 X, int brr[a]는 a가 선언/초기화되지 않아 X다.",
        "short crr[] = {1,2,3,4,5}는 O, int drr[4]에 초기값 5개는 X, float krr[5] = {0.0}은 O다."
      ],
      explanation: ["배열 크기, 초기값 개수, 미선언 변수 사용 여부를 보면 된다."]
    },
    {
      id: "c-q-05",
      title: "입력받은 정수까지 합계",
      priority: "중요",
      tags: ["함수", "반복문"],
      answer: ["함수 원형은 int sum(int a);, 함수 정의도 int sum(int a)로 쓴다.", "Input 함수는 입력받은 num을 return num;으로 반환한다."],
      explanation: ["함수 원형, 정의, 호출부의 반환 타입이 일치해야 한다."]
    },
    {
      id: "c-q-06",
      title: "배열 전체 복사 오류",
      priority: "최우선",
      tags: ["배열 복사"],
      answer: ["잘못된 라인은 brr = arr; 이다.", "C에서 배열 전체를 =로 복사할 수 없으므로 for문으로 brr[i] = arr[i]를 수행한다."],
      explanation: ["배열 이름은 대입 가능한 일반 변수가 아니다."],
      code: "for (i = 0; i < 5; i++) {\n    brr[i] = arr[i];\n}"
    },
    {
      id: "c-q-07",
      title: "# 피라미드 출력",
      priority: "중요",
      tags: ["중첩 반복문"],
      answer: ["i행마다 앞 공백은 6 - i개, # 출력은 i개 반복한다.", "각 행 끝에서 printf(\"\\n\");을 호출한다."],
      explanation: ["출력 모양 문제는 행 번호 i와 공백/문자 개수의 관계를 먼저 표로 잡는다."]
    },
    {
      id: "c-q-08",
      title: "AAA 함수 작성",
      priority: "중요",
      tags: ["함수 작성", "홀수 합"],
      answer: ["1부터 x까지 반복하면서 i % 2 == 1인 경우에만 sum += i를 수행하고 sum을 반환한다."],
      explanation: ["홀수 판별 조건과 누적 변수 초기화가 핵심이다."]
    },
    {
      id: "c-q-09",
      title: "지역변수와 static",
      priority: "중요",
      tags: ["static"],
      answer: ["일반 지역변수는 함수 호출마다 새로 초기화되지만 static 지역변수는 이전 호출 값을 유지한다."],
      explanation: ["출력 예측에서 static은 누적, 일반 지역변수는 매 호출 초기화로 판단한다."]
    },
    {
      id: "c-q-10",
      title: "블록 스코프와 전역변수",
      priority: "연습",
      tags: ["스코프"],
      answer: ["블록 안에서 선언된 변수는 그 블록 안에서만 유효하며, 같은 이름이면 가까운 블록의 변수가 우선된다."],
      explanation: ["이름이 같을 때 어느 변수를 읽는지 범위를 기준으로 추적한다."]
    },
    {
      id: "c-q-11",
      title: "홀수/짝수 판별",
      priority: "연습",
      tags: ["조건문"],
      answer: ["num % 2 == 0이면 짝수, 그렇지 않으면 홀수다."],
      explanation: ["나머지 연산자 % 사용 여부를 확인한다."]
    },
    {
      id: "c-q-12",
      title: "원의 넓이",
      priority: "연습",
      tags: ["함수 작성"],
      answer: ["반지름 r에 대해 area = PI * r * r을 계산한다."],
      explanation: ["상수, 매개변수, 반환 타입을 맞추는 문제다."]
    },
    {
      id: "c-q-13",
      title: "이중 while문 구구단",
      priority: "연습",
      tags: ["while", "중첩 반복"],
      answer: ["바깥 while은 단, 안쪽 while은 곱하는 수를 담당한다."],
      explanation: ["안쪽 반복 변수는 바깥 반복이 한 번 돌 때마다 다시 초기화해야 한다."]
    },
    {
      id: "c-q-14",
      title: "3개의 정수 중 최댓값",
      priority: "중요",
      tags: ["조건식", "함수"],
      answer: ["세 수 중 큰 값을 비교해 max에 저장하고 반환한다."],
      explanation: ["두 개를 먼저 비교한 뒤 남은 하나와 다시 비교하면 된다."]
    },
    {
      id: "c-q-15",
      title: "배열로 총점과 평균",
      priority: "중요",
      tags: ["배열", "평균"],
      answer: ["배열 원소를 반복문으로 모두 더해 total을 구하고 average = total / 개수로 계산한다."],
      explanation: ["정수 나눗셈과 실수 평균 여부를 문제 요구에 맞춘다."]
    },
    {
      id: "c-q-16",
      title: "배열 복사 함수 작성",
      priority: "최우선",
      tags: ["배열", "함수"],
      answer: ["copy_arr 함수에 원본 배열, 대상 배열, 크기를 넘기고 반복문으로 각 원소를 복사한다."],
      explanation: ["배열은 함수 인자로 전달될 때 시작 주소처럼 동작하므로 함수 안에서 대상 배열 원소를 바꾸면 원본 대상 배열이 바뀐다."]
    }
  ],
  terms: [
    { term: "continue", definition: "현재 반복의 남은 문장을 건너뛰고 다음 반복으로 이동", note: "홀수 출력 문제" },
    { term: "call by value", definition: "값을 복사해 함수에 전달하는 방식", note: "swap 원본 불변" },
    { term: "static 지역변수", definition: "함수 호출이 끝나도 값이 유지되는 지역변수", note: "출력 누적" },
    { term: "배열 대입", definition: "C에서는 배열 전체를 =로 직접 복사할 수 없음", note: "반복문 복사" }
  ],
  checklist: [
    "함수 인자 수와 반환값 저장 여부 확인",
    "지역변수가 전역변수를 가리는지 확인",
    "배열 전체 대입 금지",
    "continue와 break 구분",
    "static 지역변수는 값 유지",
    "중첩 반복문은 안쪽 변수 초기화 확인"
  ]
};

const COMPUTER_INTRODUCTION: SubjectExamPrepArtifact = {
  subjectId: "computer-introduction",
  artifactSlug: "computer-introduction",
  title: "컴퓨터개론 확정범위 시험 대비 템플릿",
  sourceLabel: "통신, 프로그래밍언어, 데이터베이스, 보안 + 2024년도 시험문제",
  markdownHref: "",
  note: "확정된 네 축을 기준으로 2024년도 문제형 답안과 수업자료 선행개념을 한 화면에서 바로 외우도록 묶었습니다.",
  studyOrder: [
    "통신은 회선교환/패킷교환과 DNS 서버 종류를 비교형으로 정리",
    "프로그래밍언어는 알고리즘, 소스 코드, 컴파일러/인터프리터 흐름을 단답형으로 고정",
    "데이터베이스는 기본키/후보키와 외부/개념/내부 스키마를 정확한 용어로 암기",
    "보안은 공개키/비공개키 암호와 스니핑/스푸핑을 한 문장 정의로 반복"
  ],
  chapters: [
    {
      label: "10장",
      title: "통신",
      focus: "회선교환/패킷교환, DNS 서버 종류와 역할",
      sourceHint: "단원10 컴퓨터 네트워크와 월드와이드웹.pdf, 2024년도 시험문제 5, 7번"
    },
    {
      label: "8장",
      title: "프로그래밍언어",
      focus: "프로그래밍 언어의 목적, 알고리즘 표현, 컴파일러와 인터프리터",
      sourceHint: "단원08 프로그래밍 언어1.pdf"
    },
    {
      label: "9장",
      title: "데이터베이스",
      focus: "기본키, 후보키, 관계형 모델, 외부/개념/내부 스키마",
      sourceHint: "2024년도 시험문제 1, 6번"
    },
    {
      label: "13장",
      title: "정보보안",
      focus: "공개키/비공개키 암호, 스니핑, 스푸핑",
      sourceHint: "2024년도 시험문제 3, 8번"
    }
  ],
  concepts: [
    {
      title: "통신: 교환 방식과 DNS",
      points: [
        "회선교환은 통신 전에 전용 경로를 설정하고 전화망이 대표 예다.",
        "패킷교환은 데이터를 패킷으로 나누어 상황에 맞는 경로로 보내며 인터넷이 대표 예다.",
        "DNS는 도메인 이름을 IP 주소로 바꾸는 이름 해석 서비스다.",
        "DNS 서버 2종류는 수업자료 용어가 주/보조라면 주 DNS와 보조 DNS로 답하고, 재귀/권한으로 배웠다면 그 역할 차이를 함께 대비한다."
      ]
    },
    {
      title: "프로그래밍언어: 알고리즘과 번역",
      points: [
        "프로그래밍 언어는 문제 해결 절차를 컴퓨터가 실행할 수 있는 명령으로 표현하는 언어다.",
        "알고리즘은 문제 해결 절차이고, 소스 코드는 그 절차를 프로그래밍 언어로 작성한 것이다.",
        "컴파일러는 소스 코드를 한 번에 번역해 목적 코드나 실행 파일을 만든다.",
        "인터프리터는 소스 코드를 한 줄 또는 명령 단위로 해석하며 실행한다.",
        "답안에서는 컴파일러는 일괄 번역, 인터프리터는 즉시 해석 실행으로 대비하면 된다."
      ]
    },
    {
      title: "데이터베이스: 키와 3단계 스키마",
      points: [
        "튜플을 유일하게 식별하는 대표 키는 기본키다.",
        "후보키는 유일성과 최소성을 만족하는 키이고, 기본키는 후보키 중 선택된 대표 키다.",
        "기본키는 중복될 수 없고 NULL 값을 가질 수 없다고 함께 쓰면 답안이 단단해진다.",
        "외부 단계는 사용자나 응용 프로그램별로 보이는 데이터 관점이다.",
        "개념 단계는 전체 데이터베이스의 논리적 구조이고, 내부 단계는 실제 저장장치에 저장되는 물리적 구조다."
      ]
    },
    {
      title: "보안: 암호와 네트워크 공격",
      points: [
        "공개키 암호는 RSA처럼 공개키와 개인키 한 쌍을 사용한다.",
        "비공개키 암호 또는 대칭키 암호는 AES처럼 송수신자가 같은 비밀키를 공유한다.",
        "스니핑은 패킷을 몰래 엿보는 것이고, 스푸핑은 다른 주체로 속여 접근하는 것이다."
      ]
    }
  ],
  questions: [
    {
      id: "ci-q-switching",
      title: "전화망과 인터넷의 데이터 전달 방식",
      priority: "최우선",
      tags: ["통신", "교환방식"],
      answer: [
        "A는 회선교환 방식이다.",
        "B는 패킷교환 방식이다."
      ],
      explanation: [
        "회선교환은 통신 전에 송신자와 수신자 사이의 전용 경로를 설정하고, 통신 중에는 그 경로를 다른 단말이 사용할 수 없다.",
        "패킷교환은 데이터를 패킷으로 나누고, 미리 고정된 경로 없이 네트워크 상황에 따라 적절한 경로로 전달한다."
      ]
    },
    {
      id: "ci-q-dns-server-types",
      title: "DNS 서비스를 제공하는 서버 2종류와 특징",
      priority: "중요",
      tags: ["통신", "DNS"],
      answer: [
        "수업자료가 주 DNS/보조 DNS로 구분했다면, 주 DNS 서버는 도메인의 원본 zone 정보와 레코드를 관리하는 서버다.",
        "보조 DNS 서버는 주 DNS 서버의 zone 정보를 복제해 백업, 부하 분산, 장애 대비 역할을 하는 서버다."
      ],
      explanation: [
        "DNS 서버 종류는 교재마다 주/보조 DNS 또는 재귀/권한 DNS로 설명될 수 있다.",
        "재귀/권한 DNS로 묻는 맥락이라면 재귀 DNS 서버는 클라이언트 대신 여러 DNS 서버를 질의하고 결과를 캐시하는 서버, 권한 DNS 서버는 특정 도메인의 최종 레코드를 보유한 서버라고 쓰면 된다.",
        "문제 표현이 '2종류의 DNS 서버'라고만 되어 있으면 수업자료 용어를 우선하고, 답안에는 역할 차이를 분명히 적는 것이 중요하다."
      ]
    },
    {
      id: "ci-q-programming-language",
      title: "프로그래밍 언어를 배우는 이유",
      priority: "최우선",
      tags: ["프로그래밍언어", "알고리즘"],
      answer: [
        "프로그래밍 언어는 문제 해결 절차를 컴퓨터가 이해하고 실행할 수 있는 명령으로 표현하기 위해 사용한다.",
        "사람이 설계한 알고리즘을 소스 코드로 작성하고, 이를 컴파일러나 인터프리터가 실행 가능한 형태로 처리한다."
      ],
      explanation: [
        "프로그래밍 언어 문항은 길게 쓰기보다 문제 해결 절차, 컴퓨터가 실행할 수 있는 명령, 알고리즘 표현이라는 세 표현을 붙이면 충분하다.",
        "알고리즘은 해결 절차, 프로그램은 그 절차를 특정 언어로 작성한 결과라고 구분한다."
      ]
    },
    {
      id: "ci-q-compiler-interpreter",
      title: "컴파일러와 인터프리터 차이",
      priority: "최우선",
      tags: ["프로그래밍언어", "번역"],
      answer: [
        "컴파일러는 소스 프로그램 전체를 한 번에 번역해 목적 코드나 실행 파일을 만든 뒤 실행한다.",
        "인터프리터는 소스 프로그램을 한 줄 또는 명령 단위로 해석하면서 바로 실행한다."
      ],
      explanation: [
        "컴파일러는 초기 번역 시간이 있지만 실행 시 효율이 좋고, 인터프리터는 실행 흐름을 바로 확인하기 쉽지만 매번 해석 과정이 필요하다.",
        "시험 답안은 전체 번역과 즉시 해석 실행의 대비만 선명하면 된다."
      ]
    },
    {
      id: "ci-q-primary-key",
      title: "관계형 데이터베이스에서 하나의 튜플을 유일하게 식별하는 키",
      priority: "최우선",
      tags: ["DB", "키"],
      answer: [
        "정답은 기본키(Primary Key)다.",
        "기본키는 관계형 데이터베이스에서 각 튜플을 유일하게 식별하기 위해 선택한 대표 키다."
      ],
      explanation: [
        "넓게 보면 유일 식별성을 만족하는 키는 후보키이고, 그 후보키들 중 테이블의 대표 식별자로 선택한 것이 기본키다.",
        "시험 답안에는 기본키라고 쓰고, 보충 설명으로 중복 불가와 NULL 불가를 붙이면 안전하다."
      ]
    },
    {
      id: "ci-q-crypto",
      title: "공개키 암호와 비공개키 암호의 예",
      priority: "최우선",
      tags: ["암호", "보안"],
      answer: [
        "공개키 암호 알고리즘의 예는 RSA다.",
        "비공개키 암호, 즉 대칭키 암호 알고리즘의 예는 AES다."
      ],
      explanation: [
        "공개키 암호는 공개키와 개인키 한 쌍을 사용한다. 공개키로 암호화하면 개인키로 복호화하고, 개인키로 서명하면 공개키로 검증한다.",
        "비공개키 암호는 송신자와 수신자가 같은 비밀키를 공유해 암호화와 복호화에 사용한다. DES도 예시로 쓸 수 있지만 AES가 더 표준적인 답이다."
      ]
    },
    {
      id: "ci-q-db-three-level",
      title: "데이터베이스를 바라보는 3가지 추상화 관점",
      priority: "최우선",
      tags: ["DB", "스키마"],
      answer: [
        "외부 단계, 개념 단계, 내부 단계다.",
        "또는 외부 스키마, 개념 스키마, 내부 스키마라고 쓸 수 있다."
      ],
      explanation: [
        "외부 단계는 사용자별 view, 개념 단계는 전체 데이터베이스의 논리적 구조, 내부 단계는 실제 저장 방식이다.",
        "세 단계 추상화는 사용자 관점과 물리 저장 방식을 분리해 데이터 독립성을 높이기 위한 구조다."
      ]
    },
    {
      id: "ci-q-sniffing-spoofing",
      title: "스니핑과 스푸핑 설명",
      priority: "최우선",
      tags: ["보안공격", "네트워크"],
      answer: [
        "스니핑은 네트워크를 지나가는 패킷을 몰래 가로채거나 엿보아 정보를 수집하는 공격이다.",
        "스푸핑은 IP, MAC, DNS, 이메일 주소 등을 위조해 자신을 다른 사용자나 시스템처럼 속이는 공격이다."
      ],
      explanation: [
        "스니핑의 핵심은 도청과 정보 탈취다.",
        "스푸핑의 핵심은 신원 위장이다. 공격자가 신뢰받는 주체처럼 보이게 만들어 접근 권한을 얻거나 사용자를 속인다."
      ]
    }
  ],
  terms: [
    { term: "회선교환", definition: "통신 전에 전용 경로를 설정해 데이터를 전달하는 방식", note: "전화망" },
    { term: "패킷교환", definition: "데이터를 패킷으로 나누고 상황에 맞는 경로로 전달하는 방식", note: "인터넷" },
    { term: "DNS", definition: "도메인 이름을 IP 주소로 변환하는 이름 해석 서비스", note: "URL/IP 변환" },
    { term: "주 DNS 서버", definition: "도메인의 원본 zone 정보와 레코드를 관리하는 서버", note: "primary" },
    { term: "보조 DNS 서버", definition: "주 DNS 서버의 정보를 복제해 백업과 부하 분산을 담당하는 서버", note: "secondary" },
    { term: "프로그래밍 언어", definition: "알고리즘을 컴퓨터가 실행할 수 있는 명령으로 표현하는 언어", note: "8장" },
    { term: "알고리즘", definition: "문제를 해결하기 위한 단계적 절차", note: "프로그램의 설계" },
    { term: "소스 코드", definition: "프로그래밍 언어로 작성한 프로그램 문장", note: "번역 전" },
    { term: "컴파일러", definition: "소스 프로그램 전체를 번역해 목적 코드나 실행 파일을 만드는 프로그램", note: "일괄 번역" },
    { term: "인터프리터", definition: "소스 프로그램을 명령 단위로 해석하며 바로 실행하는 프로그램", note: "즉시 실행" },
    { term: "기본키", definition: "관계형 테이블에서 튜플을 유일하게 식별하도록 선택한 대표 키", note: "중복 불가, NULL 불가" },
    { term: "후보키", definition: "유일성과 최소성을 만족해 기본키가 될 수 있는 키", note: "기본키의 후보" },
    { term: "외부 스키마", definition: "사용자나 응용 프로그램별로 보이는 데이터 관점", note: "사용자 view" },
    { term: "개념 스키마", definition: "전체 데이터베이스의 논리적 구조", note: "전체 설계" },
    { term: "내부 스키마", definition: "데이터가 저장장치에 실제 저장되는 물리적 구조", note: "저장 방식" },
    { term: "공개키 암호", definition: "공개키와 개인키 한 쌍을 사용하는 암호 방식", note: "RSA" },
    { term: "비공개키 암호", definition: "송수신자가 같은 비밀키를 공유하는 암호 방식", note: "AES, 대칭키" },
    { term: "스니핑", definition: "네트워크 패킷을 몰래 관찰하거나 가로채는 공격", note: "도청" },
    { term: "스푸핑", definition: "주소나 신원을 위조해 다른 주체처럼 속이는 공격", note: "위장" }
  ],
  checklist: [
    "통신은 회선교환=전화망, 패킷교환=인터넷으로 고정",
    "DNS 서버 종류는 주/보조와 재귀/권한 대체 표현까지 대비",
    "프로그래밍언어는 알고리즘을 실행 가능한 명령으로 표현하는 도구",
    "컴파일러는 전체 번역, 인터프리터는 명령 단위 해석 실행",
    "기본키 답안에 후보키와의 관계를 보충할 수 있는지 확인",
    "외부/개념/내부 스키마 순서 암기",
    "RSA는 공개키, AES는 비공개키/대칭키로 고정",
    "스니핑은 도청, 스푸핑은 위장"
  ]
};

const EXAM_PREP_ARTIFACTS: Record<string, SubjectExamPrepArtifact> = {
  [INFORMATION_COMMUNICATION.subjectId]: INFORMATION_COMMUNICATION,
  [DIGITAL_ENGINEERING.subjectId]: DIGITAL_ENGINEERING,
  [C_LANGUAGE.subjectId]: C_LANGUAGE,
  [COMPUTER_INTRODUCTION.subjectId]: COMPUTER_INTRODUCTION,
};

export function getSubjectExamPrepArtifact(subjectId: string): SubjectExamPrepArtifact | null {
  return EXAM_PREP_ARTIFACTS[subjectId] ?? null;
}

export function hasSubjectExamPrepArtifact(subjectId: string): boolean {
  return getSubjectExamPrepArtifact(subjectId) !== null;
}
