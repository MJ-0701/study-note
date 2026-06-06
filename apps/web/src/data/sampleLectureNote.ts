import type { StudyNotebook, SubjectNote } from "@study-note/domain";

const digitalEngineering: SubjectNote = {
  id: "digital-engineering",
  title: "디지털공학개론",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  examPhase: "final",
  summary: {
    goal: "6장 논리식 간소화, 7장 조합논리회로, 8장 플립플롭을 힌트/퀴즈 PDF 유형 중심으로 정리한다.",
    examScope: "6장 논리식의 간소화, 7장 조합논리회로, 8장 플립플롭, 별도 힌트/퀴즈 PDF",
    weekRange: "6장, 7장, 8장 + 별도 PDF",
    examChapters: [
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
    mustKnowConceptIds: [
      "de-kmap",
      "de-universal-gates",
      "de-combinational-circuit",
      "de-selector-circuits",
      "de-flipflop"
    ],
    weakSpots: ["무관항 사용 여부", "NAND/NOR 회로 중간 출력", "디코더/MUX 선택선", "D/JK/T 다음 상태", "SR 래치 파형 구간별 상태"],
    strategy: "힌트 PDF와 퀴즈 PDF 유형을 먼저 풀고, 6장 계산형 -> 7장 공식/선택회로형 -> 8장 표/파형형 순서로 반복한다."
  },
  sources: [
    {
      id: "de-pdf-06-08",
      title: "디지털공학개론 6-8장 교수님 PDF",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "6장-8장",
      note: "원문 PDF는 로컬 자료로만 보관하고 reader에는 출처 힌트와 파생 요약만 둔다."
    },
    {
      id: "de-hint-quiz-pdf",
      title: "디지털공학개론 힌트/퀴즈 PDF",
      kind: "manual-keyword",
      visibility: "derived-note-only",
      note: "힌트 PDF와 퀴즈 PDF에 나온 계산/표/파형 유형을 시험 대비 우선순위로 추적한다."
    }
  ],
  requiredKeywords: [
    {
      id: "de-kw-kmap",
      label: "카르노맵과 minterm",
      status: "covered",
      professorSignal: "힌트 PDF와 퀴즈 PDF에 반복 등장",
      conceptIds: ["de-kmap"]
    },
    {
      id: "de-kw-dont-care",
      label: "무관항",
      status: "covered",
      professorSignal: "간소화 과정에서 도움이 될 때만 사용하는 조건",
      conceptIds: ["de-kmap"]
    },
    {
      id: "de-kw-nand-nor",
      label: "NAND/NOR 변환",
      status: "covered",
      professorSignal: "회로 출력 간소화 유형",
      conceptIds: ["de-universal-gates"]
    },
    {
      id: "de-kw-combinational",
      label: "가산기/감산기/비교기",
      status: "covered",
      professorSignal: "회로식, 가산기, 비교기, 가산기/감산기 명칭",
      conceptIds: ["de-combinational-circuit"]
    },
    {
      id: "de-kw-decoder-mux",
      label: "디코더/인코더/MUX/DEMUX",
      status: "covered",
      professorSignal: "7장 선택선과 출력선 개수 비교형",
      conceptIds: ["de-selector-circuits"]
    },
    {
      id: "de-kw-flipflop",
      label: "SR 래치",
      status: "covered",
      professorSignal: "NOR SR 래치 진리표와 파형",
      conceptIds: ["de-flipflop"]
    },
    {
      id: "de-kw-flipflop-types",
      label: "D/JK/T 플립플롭",
      status: "covered",
      professorSignal: "입력별 다음 상태와 toggle 조건",
      conceptIds: ["de-flipflop"]
    }
  ],
  concepts: [
    {
      id: "de-kmap",
      title: "6장 카르노맵과 논리식 간소화",
      priority: "must-know",
      summary: "진리표나 논리식을 minterm으로 옮기고 Gray code 순서의 맵에서 1과 필요한 무관항을 크게 묶어 식을 줄인다.",
      easyExplanation: "1이 있는 칸을 큰 사각형으로 묶어, 묶음 안에서 변하지 않는 변수만 답에 남기는 절차다. X는 식이 짧아질 때만 같이 묶는다.",
      sourceHints: ["6장 논리식의 간소화", "힌트 PDF 3쪽", "퀴즈 PDF 진리표 간소화"],
      relatedKeywordIds: ["de-kw-kmap", "de-kw-dont-care"],
      exampleQuestionIds: ["de-q-kmap", "de-q-dont-care"]
    },
    {
      id: "de-universal-gates",
      title: "6장 NAND/NOR와 드모르간",
      priority: "must-know",
      summary: "NAND와 NOR는 범용 게이트이며, 출력마다 보수가 붙는 구조를 드모르간 법칙으로 풀어 최종식을 구한다.",
      easyExplanation: "NAND/NOR 회로는 중간 출력에 작은 따옴표가 계속 붙는다고 생각하고, 괄호를 풀 때 드모르간으로 AND와 OR를 바꾼다.",
      sourceHints: ["6장 논리식의 간소화", "힌트 PDF 마지막 회로"],
      relatedKeywordIds: ["de-kw-nand-nor"],
      exampleQuestionIds: ["de-q-nand-output"]
    },
    {
      id: "de-combinational-circuit",
      title: "7장 가산기/감산기/비교기",
      priority: "must-know",
      summary: "현재 입력만으로 출력이 결정되는 회로이며 반가산기/전가산기, 감산기, 비교기 식을 계산한다.",
      easyExplanation: "기억 없이 입력 조합을 바로 결과로 바꾸는 회로다. 가산기는 합과 자리올림, 비교기는 대소/같음을 출력한다.",
      sourceHints: ["7장 조합논리회로", "힌트 PDF 회로식", "퀴즈 PDF 4비트 병렬 가산기/감산기"],
      relatedKeywordIds: ["de-kw-combinational"],
      exampleQuestionIds: ["de-q-logic-expression", "de-q-adders", "de-q-comparator"]
    },
    {
      id: "de-selector-circuits",
      title: "7장 디코더/인코더/MUX/DEMUX",
      priority: "must-know",
      summary: "디코더와 인코더는 코드 변환, MUX와 DEMUX는 데이터 선택과 분배를 담당한다.",
      easyExplanation: "디코더는 번호를 여러 출력선 중 하나로 풀고, MUX는 여러 데이터 중 하나를 고른다. 선택선 n개면 보통 2^n개 경로를 다룬다.",
      sourceHints: ["7장 조합논리회로", "디코더/인코더", "MUX/DEMUX"],
      relatedKeywordIds: ["de-kw-decoder-mux"],
      exampleQuestionIds: ["de-q-decoder-mux"]
    },
    {
      id: "de-flipflop",
      title: "8장 래치와 D/JK/T 플립플롭",
      priority: "must-know",
      summary: "이전 상태를 기억하는 순서논리 기본소자이며 SR 래치와 D/JK/T 플립플롭의 입력별 다음 상태를 판단한다.",
      easyExplanation: "입력만 보는 조합회로와 달리 직전 Q 값을 기억한다. D는 그대로 저장, JK의 11과 T의 1은 toggle이다.",
      sourceHints: ["8장 플립플롭", "힌트 PDF NOR SR 래치 파형", "퀴즈 PDF SR 플립플롭 진리표"],
      relatedKeywordIds: ["de-kw-flipflop", "de-kw-flipflop-types"],
      exampleQuestionIds: ["de-q-sr-latch", "de-q-flipflop-types"]
    }
  ],
  exampleQuestions: [
    {
      id: "de-q-kmap",
      conceptId: "de-kmap",
      difficulty: "applied",
      prompt: "진리표에서 1이 되는 항을 카르노맵으로 묶어 논리식을 간소화하는 절차를 설명하라.",
      answer: "minterm을 표시하고 Gray code 순서로 배치한 뒤 가능한 큰 묶음을 만들고 변하지 않는 변수만 남긴다.",
      explanation: "열 순서 00, 01, 11, 10과 모든 1 포함 여부가 핵심 감점 포인트다."
    },
    {
      id: "de-q-dont-care",
      conceptId: "de-kmap",
      difficulty: "applied",
      prompt: "카르노맵에서 무관항 X를 언제 사용하는지 설명하라.",
      answer: "무관항은 더 큰 묶음을 만들어 식이 짧아질 때만 1처럼 사용하고, 필요 없으면 사용하지 않는다.",
      explanation: "X는 정답에 반드시 포함해야 하는 1이 아니다. 간소화에 도움이 되는 선택지로 보는 것이 안전하다."
    },
    {
      id: "de-q-nand-output",
      conceptId: "de-universal-gates",
      difficulty: "applied",
      prompt: "NAND 회로에서 중간 출력을 적어 최종 출력을 간소화하라.",
      answer: "중간 NAND 출력을 괄호와 보수로 적고 드모르간을 적용해 최종식을 구한다.",
      explanation: "힌트 PDF 마지막 회로는 B'와 (AB')'를 거쳐 X = A + B로 간소화된다."
    },
    {
      id: "de-q-logic-expression",
      conceptId: "de-combinational-circuit",
      difficulty: "applied",
      prompt: "두 회로가 각각 F = HD + DK와 F = D(H + K)를 만들 때 같은 회로인지 판단하라.",
      answer: "HD + DK = D(H + K)이므로 두 회로는 같은 논리식이다.",
      explanation: "게이트별 중간 출력을 먼저 쓰고 공통 인수 D를 묶는다."
    },
    {
      id: "de-q-adders",
      conceptId: "de-combinational-circuit",
      difficulty: "basic",
      prompt: "반가산기와 전가산기의 합과 자리올림 식을 쓰라.",
      answer: "반가산기 S=A xor B, C=AB. 전가산기 S=A xor B xor Cin, Cout=AB+ACin+BCin.",
      explanation: "자리올림은 입력 셋 중 적어도 두 개가 1인 경우다. 병렬 가산기는 전가산기를 자리수만큼 이어 붙인 구조로 본다."
    },
    {
      id: "de-q-comparator",
      conceptId: "de-combinational-circuit",
      difficulty: "basic",
      prompt: "1비트 비교기의 A>B, A=B, A<B 식을 쓰라.",
      answer: "A>B는 AB', A=B는 AB + A'B', A<B는 A'B다.",
      explanation: "같음은 XNOR이며 다중 비트 비교는 최상위 비트부터 판단한다."
    },
    {
      id: "de-q-decoder-mux",
      conceptId: "de-selector-circuits",
      difficulty: "basic",
      prompt: "디코더, 인코더, MUX, DEMUX의 역할을 각각 구분하라.",
      answer: "디코더는 n비트 코드를 2^n 출력 중 하나로 풀고, 인코더는 활성 입력 번호를 코드로 바꾼다. MUX는 여러 입력 중 하나를 선택해 출력하고, DEMUX는 하나의 입력을 여러 출력 중 하나로 보낸다.",
      explanation: "디코더/인코더는 코드 변환, MUX/DEMUX는 데이터 선택과 분배로 나눠 외우면 헷갈림이 줄어든다."
    },
    {
      id: "de-q-sr-latch",
      conceptId: "de-flipflop",
      difficulty: "applied",
      prompt: "NOR SR 래치의 S/R 입력에 따른 다음 Q 상태를 설명하라.",
      answer: "00은 유지, 01은 Reset, 10은 Set, 11은 금지/부정 상태다.",
      explanation: "파형 문제는 각 구간의 S/R 조합을 표에 대입하면 된다."
    },
    {
      id: "de-q-flipflop-types",
      conceptId: "de-flipflop",
      difficulty: "basic",
      prompt: "D, JK, T 플립플롭의 다음 상태를 설명하라.",
      answer: "D는 Q+=D, JK는 00 유지/01 Reset/10 Set/11 Toggle, T는 0 유지/1 Toggle이다.",
      explanation: "JK의 11과 T의 1이 toggle이라는 점이 8장 단답과 파형 문제의 핵심이다."
    }
  ],
  weekNotes: [
    {
      id: "de-chapter-06",
      label: "6장",
      title: "논리식의 간소화",
      focus: "카르노맵, 무관항, NAND/NOR 변환을 계산형으로 반복한다.",
      sourceMaterialIds: ["de-pdf-06-08", "de-hint-quiz-pdf"],
      requiredKeywordIds: ["de-kw-kmap", "de-kw-dont-care", "de-kw-nand-nor"],
      conceptIds: ["de-kmap", "de-universal-gates"],
      exampleQuestionIds: ["de-q-kmap", "de-q-dont-care", "de-q-nand-output"],
      reviewStatus: "ready"
    },
    {
      id: "de-chapter-07",
      label: "7장",
      title: "조합논리회로",
      focus: "회로식, 가산기, 비교기, 디코더/인코더, MUX/DEMUX 유형을 외운다.",
      sourceMaterialIds: ["de-pdf-06-08", "de-hint-quiz-pdf"],
      requiredKeywordIds: ["de-kw-combinational", "de-kw-decoder-mux"],
      conceptIds: ["de-combinational-circuit", "de-selector-circuits"],
      exampleQuestionIds: ["de-q-logic-expression", "de-q-adders", "de-q-comparator", "de-q-decoder-mux"],
      reviewStatus: "ready"
    },
    {
      id: "de-chapter-08",
      label: "8장",
      title: "플립플롭",
      focus: "NOR SR 래치 진리표와 파형, D/JK/T 다음 상태와 toggle을 마지막에 확인한다.",
      sourceMaterialIds: ["de-pdf-06-08", "de-hint-quiz-pdf"],
      requiredKeywordIds: ["de-kw-flipflop", "de-kw-flipflop-types"],
      conceptIds: ["de-flipflop"],
      exampleQuestionIds: ["de-q-sr-latch", "de-q-flipflop-types"],
      reviewStatus: "ready"
    }
  ]
};

const informationCommunication: SubjectNote = {
  id: "information-communication",
  title: "정보통신개론",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  examPhase: "final",
  summary: {
    goal: "6~9장 강의자료와 레포트2 문항을 시험 답안 형태로 암기한다.",
    examScope: "6장 네트워크 구성 장비, 7장 교환기술, 8장 TCP/IP, 9장 고속/광역 데이터 서비스, 별도 레포트2 PDF",
    weekRange: "6장, 7장, 8장, 9장 + 별도 PDF",
    examChapters: [
      {
        label: "6장",
        title: "네트워크 구성 장비",
        focus: "트랜시버, 리피터, 허브, 브리지, 스위치, 라우터, 게이트웨이와 OSI 계층",
        sourceHint: "레포트 문항 7~9"
      },
      {
        label: "7장",
        title: "교환기술",
        focus: "회선교환, 데이터그램, 가상회선, 패킷교환 비교",
        sourceHint: "레포트 문항 10"
      },
      {
        label: "8장",
        title: "TCP/IP",
        focus: "OSI/TCP-IP 비교, 주소 3가지, IP/TCP 헤더, ARP/RARP, IPv6",
        sourceHint: "레포트 문항 11~17"
      },
      {
        label: "9장",
        title: "고속/광역 데이터 서비스",
        focus: "RIP와 OSPF, 고속망 용어 정의",
        sourceHint: "레포트 문항 18 + 용어 정의"
      }
    ],
    mustKnowConceptIds: ["ic-lan-802", "ic-network-devices", "ic-switching", "ic-tcp-ip", "ic-ip-tcp-headers"],
    weakSpots: ["IP/TCP 헤더 필드명과 비트 위치", "장비별 OSI 계층", "RIP/OSPF 비교 기준"],
    strategy: "선행개념을 먼저 고정한 뒤 레포트 설명형 18문항을 제목만 보고 말로 답하고, 헤더/장비/용어는 빈칸형으로 반복한다."
  },
  sources: [
    {
      id: "ic-pdf-06-09",
      title: "정보통신개론 6-9장 교수님 PDF",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "6장-9장",
      note: "reader는 원문 대신 시험 대비 핵심 정의와 비교표 역할을 한다."
    },
    {
      id: "ic-report2",
      title: "정보통신개론 레포트2 시험직결 PDF",
      kind: "manual-keyword",
      visibility: "derived-note-only",
      note: "교수님이 시험문제를 그대로 낸다고 안내한 레포트 문항을 답안화한다."
    }
  ],
  requiredKeywords: [
    {
      id: "ic-kw-lan",
      label: "LAN과 IEEE 802",
      status: "covered",
      professorSignal: "레포트 문항 1~6",
      conceptIds: ["ic-lan-802"]
    },
    {
      id: "ic-kw-devices",
      label: "네트워크 장비와 OSI 계층",
      status: "covered",
      professorSignal: "장비 이름과 계층 매칭 단답식 가능",
      conceptIds: ["ic-network-devices"]
    },
    {
      id: "ic-kw-switching",
      label: "회선교환/패킷교환",
      status: "covered",
      professorSignal: "경로 설정 여부와 순서 보장 비교",
      conceptIds: ["ic-switching"]
    },
    {
      id: "ic-kw-tcpip",
      label: "TCP/IP 계층과 주소",
      status: "covered",
      professorSignal: "OSI/TCP-IP 비교와 주소 3가지",
      conceptIds: ["ic-tcp-ip"]
    },
    {
      id: "ic-kw-headers",
      label: "IP/TCP 헤더",
      status: "covered",
      professorSignal: "수시시험 10점 표시, 빈칸형 최우선",
      conceptIds: ["ic-ip-tcp-headers"]
    },
    {
      id: "ic-kw-routing",
      label: "RIP와 OSPF",
      status: "covered",
      professorSignal: "9장 라우팅 비교",
      conceptIds: ["ic-routing"]
    }
  ],
  concepts: [
    {
      id: "ic-lan-802",
      title: "LAN과 IEEE 802 데이터링크 계층",
      priority: "must-know",
      summary: "LAN은 제한된 지역의 장치를 연결하는 근거리 통신망이고, IEEE 802는 데이터링크 계층을 LLC와 MAC으로 나눈다.",
      easyExplanation: "LAN 특징을 말한 뒤 LLC는 상위계층 연결, MAC은 매체 접근과 프레임 처리를 맡는다고 쓰면 된다.",
      sourceHints: ["레포트 문항 1", "6장 LAN/IEEE 802"],
      relatedKeywordIds: ["ic-kw-lan"],
      exampleQuestionIds: ["ic-q-lan"]
    },
    {
      id: "ic-network-devices",
      title: "6장 네트워크 장비와 OSI 계층",
      priority: "must-know",
      summary: "리피터/허브는 1계층, 브리지/스위치는 2계층, 라우터는 3계층, 게이트웨이는 상위 계층 변환 장비다.",
      easyExplanation: "장비가 보는 정보가 비트, MAC, IP, 프로토콜 순서로 깊어진다고 외운다.",
      sourceHints: ["레포트 문항 7~9", "6장 네트워크 구성 장비"],
      relatedKeywordIds: ["ic-kw-devices"],
      exampleQuestionIds: ["ic-q-devices"]
    },
    {
      id: "ic-switching",
      title: "7장 교환기술",
      priority: "high",
      summary: "회선교환은 전용 경로를 먼저 잡고, 패킷교환은 데이터를 패킷으로 나눠 효율적으로 전송한다.",
      easyExplanation: "전화처럼 길을 먼저 잡는 방식과, 택배처럼 조각별로 보내는 방식을 비교한다.",
      sourceHints: ["레포트 문항 10", "7장 교환기술"],
      relatedKeywordIds: ["ic-kw-switching"],
      exampleQuestionIds: ["ic-q-switching"]
    },
    {
      id: "ic-tcp-ip",
      title: "8장 TCP/IP 계층과 인터넷 주소",
      priority: "must-know",
      summary: "OSI 7계층과 TCP/IP 4계층을 대응시키고 MAC/IP/도메인 이름의 계층과 역할을 구분한다.",
      easyExplanation: "실제 인터넷 모델은 TCP/IP이고, 주소는 MAC-장치, IP-논리 위치, 도메인-사람용 이름으로 나뉜다.",
      sourceHints: ["레포트 문항 11~14", "8장 TCP/IP"],
      relatedKeywordIds: ["ic-kw-tcpip"],
      exampleQuestionIds: ["ic-q-tcpip", "ic-q-address", "ic-q-tcp-udp"]
    },
    {
      id: "ic-ip-tcp-headers",
      title: "IP 헤더와 TCP 헤더",
      priority: "must-know",
      summary: "IP 헤더는 단편화/TTL/Protocol/주소 필드, TCP 헤더는 포트/순서/ACK/윈도우/코드 비트가 핵심이다.",
      easyExplanation: "IP는 목적지까지 가는 봉투 정보, TCP는 순서와 확인응답을 관리하는 운송장 정보로 보면 된다.",
      sourceHints: ["레포트 문항 15", "수시시험 10점 표시"],
      relatedKeywordIds: ["ic-kw-headers"],
      exampleQuestionIds: ["ic-q-headers"]
    },
    {
      id: "ic-routing",
      title: "9장 RIP와 OSPF",
      priority: "high",
      summary: "RIP는 홉 수 기반 거리 벡터, OSPF는 비용 기반 링크 상태 라우팅 프로토콜이다.",
      easyExplanation: "RIP는 몇 번 거치는지, OSPF는 링크 상태와 비용으로 길을 고른다.",
      sourceHints: ["레포트 문항 18", "9장 고속/광역 데이터 서비스"],
      relatedKeywordIds: ["ic-kw-routing"],
      exampleQuestionIds: ["ic-q-routing"]
    }
  ],
  exampleQuestions: [
    {
      id: "ic-q-lan",
      conceptId: "ic-lan-802",
      difficulty: "basic",
      prompt: "LAN의 정의와 특징, LLC/MAC 기능을 설명하라.",
      answer: "LAN은 제한된 지역의 근거리 통신망이며 빠른 속도, 낮은 오류율, 쉬운 확장이 특징이다. LLC는 상위계층 인터페이스와 제어, MAC은 매체 접근과 프레임/FCS 처리를 맡는다.",
      explanation: "정의, 특징, LLC, MAC 순서로 답안을 구성한다."
    },
    {
      id: "ic-q-devices",
      conceptId: "ic-network-devices",
      difficulty: "basic",
      prompt: "리피터, 브리지, 라우터, 게이트웨이가 동작하는 OSI 계층을 쓰라.",
      answer: "리피터는 1계층, 브리지는 2계층, 라우터는 3계층, 게이트웨이는 상위 계층까지 포함해 프로토콜을 변환한다.",
      explanation: "허브까지는 물리, 브리지/스위치는 MAC, 라우터는 IP로 외운다."
    },
    {
      id: "ic-q-switching",
      conceptId: "ic-switching",
      difficulty: "applied",
      prompt: "회선교환망과 패킷교환망을 비교하라.",
      answer: "회선교환은 통신 전에 전용 경로를 설정해 안정적이지만 비효율이 생길 수 있고, 패킷교환은 패킷 단위로 전송해 효율적이지만 지연/순서 변동이 생길 수 있다.",
      explanation: "경로 설정 여부와 순서 보장 여부를 비교 축으로 삼는다."
    },
    {
      id: "ic-q-tcpip",
      conceptId: "ic-tcp-ip",
      difficulty: "basic",
      prompt: "OSI 참조모델과 TCP/IP를 비교하고 계층별 프로토콜 예를 쓰라.",
      answer: "OSI는 7계층 이론 모델, TCP/IP는 인터넷 4계층 모델이다. 응용에는 HTTP/DNS, 전송에는 TCP/UDP, IP 계층에는 IP/ICMP/ARP, 네트워크 액세스에는 Ethernet/Wi-Fi가 있다.",
      explanation: "계층 대응과 프로토콜 예시를 같이 써야 한다."
    },
    {
      id: "ic-q-address",
      conceptId: "ic-tcp-ip",
      difficulty: "basic",
      prompt: "인터넷 사용에 필요한 주소 3가지를 계층, 저장 위치, 역할로 설명하라.",
      answer: "MAC 주소는 데이터링크 계층 주소로 NIC에 저장되고, IP 주소는 네트워크 계층 논리 주소로 OS 네트워크 설정에 저장되며, 도메인 이름은 응용 계층의 사람용 이름으로 DNS가 IP로 변환한다.",
      explanation: "계층, 저장 위치, 역할 세 칸을 모두 채워야 한다."
    },
    {
      id: "ic-q-tcp-udp",
      conceptId: "ic-tcp-ip",
      difficulty: "basic",
      prompt: "TCP와 UDP의 특징을 비교하라.",
      answer: "TCP는 연결형, 신뢰성, 순서 보장, 흐름/오류제어가 핵심이고 UDP는 비연결형, 단순한 헤더, 빠른 전송이 핵심이다.",
      explanation: "TCP=정확성, UDP=속도다."
    },
    {
      id: "ic-q-headers",
      conceptId: "ic-ip-tcp-headers",
      difficulty: "applied",
      prompt: "IP 헤더와 TCP 헤더의 핵심 필드를 설명하라.",
      answer: "IP 헤더는 Version, Header Length, Total Length, Identification, Flags, Fragment Offset, TTL, Protocol, Source/Destination IP가 핵심이다. TCP 헤더는 Source/Destination Port, Sequence Number, ACK Number, Window, Code Bits가 핵심이다.",
      explanation: "IP 단편화 3종 세트와 TCP 순서/ACK/윈도우/코드 비트를 먼저 외운다."
    },
    {
      id: "ic-q-routing",
      conceptId: "ic-routing",
      difficulty: "basic",
      prompt: "RIP와 OSPF를 비교하라.",
      answer: "RIP는 홉 수 기반 거리 벡터 방식이고 작은 네트워크에 적합하다. OSPF는 비용 기반 링크 상태 방식이고 큰 네트워크에 적합하다.",
      explanation: "RIP=홉 수, OSPF=비용/링크 상태로 대비한다."
    }
  ],
  weekNotes: [
    {
      id: "ic-chapter-06",
      label: "6장",
      title: "네트워크 구성 장비와 LAN",
      focus: "LAN/IEEE 802, 무선랜, 장비-OSI 계층을 레포트 문항 순서대로 외운다.",
      sourceMaterialIds: ["ic-pdf-06-09", "ic-report2"],
      requiredKeywordIds: ["ic-kw-lan", "ic-kw-devices"],
      conceptIds: ["ic-lan-802", "ic-network-devices"],
      exampleQuestionIds: ["ic-q-lan", "ic-q-devices"],
      reviewStatus: "ready"
    },
    {
      id: "ic-chapter-07",
      label: "7장",
      title: "교환기술",
      focus: "회선교환과 패킷교환, 데이터그램과 가상회선 차이를 비교한다.",
      sourceMaterialIds: ["ic-pdf-06-09", "ic-report2"],
      requiredKeywordIds: ["ic-kw-switching"],
      conceptIds: ["ic-switching"],
      exampleQuestionIds: ["ic-q-switching"],
      reviewStatus: "ready"
    },
    {
      id: "ic-chapter-08",
      label: "8장",
      title: "TCP/IP와 인터넷 주소",
      focus: "TCP/IP 계층, 주소 3가지, TCP/UDP, IP/TCP 헤더를 빈칸형으로 반복한다.",
      sourceMaterialIds: ["ic-pdf-06-09", "ic-report2"],
      requiredKeywordIds: ["ic-kw-tcpip", "ic-kw-headers"],
      conceptIds: ["ic-tcp-ip", "ic-ip-tcp-headers"],
      exampleQuestionIds: ["ic-q-tcpip", "ic-q-address", "ic-q-tcp-udp", "ic-q-headers"],
      reviewStatus: "ready"
    },
    {
      id: "ic-chapter-09",
      label: "9장",
      title: "고속/광역 데이터 서비스와 라우팅",
      focus: "RIP/OSPF 비교와 용어 정의를 단답형으로 정리한다.",
      sourceMaterialIds: ["ic-pdf-06-09", "ic-report2"],
      requiredKeywordIds: ["ic-kw-routing"],
      conceptIds: ["ic-routing"],
      exampleQuestionIds: ["ic-q-routing"],
      reviewStatus: "ready"
    }
  ]
};

const cLanguage: SubjectNote = {
  id: "c-language",
  title: "C언어",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  examPhase: "final",
  summary: {
    goal: "별도 PDF의 코드 읽기, 출력 예측, 빈칸, 배열/함수 작성형을 시험 답안 형태로 정리한다.",
    examScope: "C언어 별도 PDF 기말 참고자료",
    weekRange: "별도 PDF",
    examChapters: [
      {
        label: "별도 PDF",
        title: "제어문과 함수",
        focus: "continue, 함수 원형, 반환값, call by value, 지역/전역 변수, static",
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
    mustKnowConceptIds: ["c-function-scope", "c-array-copy", "c-loop-output"],
    weakSpots: ["배열 전체 대입 금지", "함수 반환값 저장 누락", "static 지역변수 출력 예측"],
    strategy: "문제별 출력과 오류 원인을 먼저 말로 설명하고, 배열/함수 작성형은 손으로 코드를 한 번씩 써본다."
  },
  sources: [
    {
      id: "c-final-reference",
      title: "C언어 기말고사 참고자료 별도 PDF",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "기말고사 참고자료",
      note: "코드 원문은 강의자료를 기준으로 확인하고 reader에는 시험용 설명과 예제만 둔다."
    }
  ],
  requiredKeywords: [
    {
      id: "c-kw-function",
      label: "함수와 스코프",
      status: "covered",
      professorSignal: "Max, swap, static, 지역/전역 변수 문제",
      conceptIds: ["c-function-scope"]
    },
    {
      id: "c-kw-array-copy",
      label: "배열 선언과 복사",
      status: "covered",
      professorSignal: "배열 O/X, brr = arr 오류, copy_arr 작성",
      conceptIds: ["c-array-copy"]
    },
    {
      id: "c-kw-loop-output",
      label: "반복문 출력 예측",
      status: "covered",
      professorSignal: "홀수 출력, 피라미드, 구구단, 총점/평균",
      conceptIds: ["c-loop-output"]
    },
    {
      id: "c-kw-code-writing",
      label: "코드 작성형",
      status: "covered",
      professorSignal: "홀수 합, 원의 넓이, 최댓값 함수",
      conceptIds: ["c-function-scope", "c-loop-output", "c-array-copy"]
    }
  ],
  concepts: [
    {
      id: "c-function-scope",
      title: "함수, 반환값, 스코프",
      priority: "must-know",
      summary: "함수 호출 인자 수, 반환값 저장, 지역변수와 전역변수의 이름 가림, static 지역변수의 값 유지가 핵심이다.",
      easyExplanation: "함수는 값을 돌려줄 수 있지만 호출한 쪽에서 받아야 하고, 같은 이름이면 가까운 지역변수가 우선된다.",
      sourceHints: ["기말고사 참고자료 2, 3, 5, 9, 10, 12, 14번"],
      relatedKeywordIds: ["c-kw-function", "c-kw-code-writing"],
      exampleQuestionIds: ["c-q-max", "c-q-swap", "c-q-input-sum", "c-q-static", "c-q-block-scope", "c-q-circle-area", "c-q-max-three"]
    },
    {
      id: "c-array-copy",
      title: "배열 선언과 원소별 복사",
      priority: "must-know",
      summary: "C에서 배열 전체는 =로 복사할 수 없고, 크기와 초기값 개수를 맞추며 반복문으로 원소별 복사해야 한다.",
      easyExplanation: "배열은 통째로 대입하는 상자가 아니라, 각 칸을 하나씩 옮겨야 하는 묶음이다.",
      sourceHints: ["기말고사 참고자료 4, 6, 15, 16번"],
      relatedKeywordIds: ["c-kw-array-copy", "c-kw-code-writing"],
      exampleQuestionIds: ["c-q-array-ox", "c-q-array-copy", "c-q-array-score-average", "c-q-copy-arr-function"]
    },
    {
      id: "c-loop-output",
      title: "반복문 출력과 누적",
      priority: "high",
      summary: "continue, 조건문, 중첩 반복문, 누적 변수를 이용해 출력 모양과 합계/평균을 계산한다.",
      easyExplanation: "바깥 반복은 줄, 안쪽 반복은 칸이라고 생각하면 피라미드와 구구단을 추적하기 쉽다.",
      sourceHints: ["기말고사 참고자료 1, 5, 7, 8, 11, 13, 15번"],
      relatedKeywordIds: ["c-kw-loop-output", "c-kw-code-writing"],
      exampleQuestionIds: ["c-q-continue", "c-q-input-sum", "c-q-pyramid", "c-q-odd-sum", "c-q-even-odd", "c-q-gugudan", "c-q-array-score-average"]
    }
  ],
  exampleQuestions: [
    {
      id: "c-q-continue",
      conceptId: "c-loop-output",
      difficulty: "applied",
      prompt: "짝수일 때 아래 printf를 건너뛰고 홀수만 출력하려면 어떤 문장을 쓰는가?",
      answer: "continue;를 쓴다.",
      explanation: "continue는 현재 반복의 남은 문장을 건너뛰고 다음 반복으로 이동한다."
    },
    {
      id: "c-q-max",
      conceptId: "c-function-scope",
      difficulty: "applied",
      prompt: "Max 함수 호출 오류와 출력 수정 포인트를 설명하라.",
      answer: "인자 3개를 맞춰 Max(3,4,5)를 호출하고 반환값을 main의 max에 저장한다.",
      explanation: "인자 수, 지역변수 가림, 반환값 저장 누락을 함께 확인한다."
    },
    {
      id: "c-q-swap",
      conceptId: "c-function-scope",
      difficulty: "basic",
      prompt: "swap(int x, int y) 호출 후 원본 c, d가 바뀌지 않는 이유를 설명하라.",
      answer: "값을 복사해서 전달하는 call by value이므로 함수 안의 x, y 변경은 원본 c, d에 반영되지 않는다.",
      explanation: "포인터를 넘기지 않는 한 원본 변수는 바뀌지 않는다."
    },
    {
      id: "c-q-static",
      conceptId: "c-function-scope",
      difficulty: "applied",
      prompt: "static 지역변수와 일반 지역변수의 출력 차이를 설명하라.",
      answer: "일반 지역변수는 호출마다 새로 초기화되고 static 지역변수는 이전 호출 값을 유지한다.",
      explanation: "출력 예측에서 static은 누적값으로 판단한다."
    },
    {
      id: "c-q-input-sum",
      conceptId: "c-loop-output",
      difficulty: "applied",
      prompt: "입력받은 정수까지 합계를 구하는 코드에서 함수 원형, 정의, 반환값을 어떻게 맞추는가?",
      answer: "함수 원형과 정의를 int sum(int a)처럼 맞추고, 입력 함수는 입력받은 num을 return num;으로 반환한다.",
      explanation: "함수 원형, 정의, 호출부의 반환 타입이 어긋나면 컴파일 오류나 의도와 다른 결과가 난다."
    },
    {
      id: "c-q-array-ox",
      conceptId: "c-array-copy",
      difficulty: "basic",
      prompt: "배열 선언 O/X에서 주로 확인할 조건은 무엇인가?",
      answer: "배열 크기, 초기값 개수, 미선언 변수 사용 여부를 확인한다.",
      explanation: "크기 4 배열에 초기값 5개를 넣는 식은 X다."
    },
    {
      id: "c-q-array-copy",
      conceptId: "c-array-copy",
      difficulty: "applied",
      prompt: "brr = arr;가 잘못된 이유와 수정 방법을 쓰라.",
      answer: "C에서 배열 전체는 =로 복사할 수 없으므로 for문으로 brr[i] = arr[i]를 수행한다.",
      explanation: "배열 이름은 대입 가능한 일반 변수가 아니다."
    },
    {
      id: "c-q-pyramid",
      conceptId: "c-loop-output",
      difficulty: "applied",
      prompt: "# 피라미드 출력에서 공백과 # 반복 수를 설명하라.",
      answer: "i행에서 앞 공백은 6-i개, #은 i개 출력하고 줄바꿈한다.",
      explanation: "바깥 i는 행, 안쪽 j/k는 공백과 문자 개수다."
    },
    {
      id: "c-q-odd-sum",
      conceptId: "c-loop-output",
      difficulty: "basic",
      prompt: "1부터 x까지 홀수의 합을 구하는 AAA 함수의 핵심 조건은?",
      answer: "i % 2 == 1일 때만 sum += i를 수행하고 sum을 반환한다.",
      explanation: "홀수 판별 조건과 누적 변수 초기화가 핵심이다."
    },
    {
      id: "c-q-block-scope",
      conceptId: "c-function-scope",
      difficulty: "basic",
      prompt: "블록 스코프와 전역변수가 함께 있을 때 어떤 변수가 우선 사용되는가?",
      answer: "가장 가까운 블록에서 선언된 지역변수가 우선 사용되고, 그 블록 밖에서는 바깥 변수나 전역변수가 사용된다.",
      explanation: "같은 이름의 변수가 여러 개일 때는 현재 코드 위치를 감싸는 가장 가까운 범위를 먼저 찾는다."
    },
    {
      id: "c-q-even-odd",
      conceptId: "c-loop-output",
      difficulty: "basic",
      prompt: "정수가 홀수인지 짝수인지 판별하는 조건을 쓰라.",
      answer: "num % 2 == 0이면 짝수이고, 그렇지 않으면 홀수다.",
      explanation: "나머지 연산자 %로 2로 나누었을 때의 나머지를 확인한다."
    },
    {
      id: "c-q-circle-area",
      conceptId: "c-function-scope",
      difficulty: "basic",
      prompt: "원의 넓이를 구하는 함수에서 계산식과 반환값을 어떻게 쓰는가?",
      answer: "반지름 r에 대해 area = PI * r * r을 계산하고 그 값을 반환한다.",
      explanation: "상수 PI, 매개변수 r, 반환 타입이 문제의 함수 선언과 맞아야 한다."
    },
    {
      id: "c-q-gugudan",
      conceptId: "c-loop-output",
      difficulty: "applied",
      prompt: "이중 while문으로 구구단을 출력할 때 안쪽 반복 변수는 언제 초기화해야 하는가?",
      answer: "바깥 while이 한 단을 시작할 때마다 안쪽 반복 변수를 다시 초기화해야 한다.",
      explanation: "바깥 반복은 단, 안쪽 반복은 곱하는 수를 담당한다. 안쪽 변수를 초기화하지 않으면 다음 단이 출력되지 않는다."
    },
    {
      id: "c-q-max-three",
      conceptId: "c-function-scope",
      difficulty: "basic",
      prompt: "3개의 정수 중 최댓값을 구하는 함수의 기본 비교 흐름은?",
      answer: "첫 값을 max에 둔 뒤 나머지 두 값과 차례로 비교해 더 큰 값으로 max를 갱신하고 반환한다.",
      explanation: "두 개를 먼저 비교한 뒤 남은 하나와 다시 비교해도 되고, max 변수를 갱신하는 방식으로 써도 된다."
    },
    {
      id: "c-q-array-score-average",
      conceptId: "c-array-copy",
      difficulty: "applied",
      prompt: "배열로 점수 총점과 평균을 구할 때 반복문에서 무엇을 누적하는가?",
      answer: "배열 원소를 반복문으로 모두 더해 total을 구하고 average = total / 개수로 계산한다.",
      explanation: "평균이 실수로 필요하면 정수 나눗셈이 되지 않도록 형 변환이나 실수 변수를 사용한다."
    },
    {
      id: "c-q-copy-arr-function",
      conceptId: "c-array-copy",
      difficulty: "applied",
      prompt: "배열 복사 함수 copy_arr는 어떤 인자와 반복문으로 작성하는가?",
      answer: "원본 배열, 대상 배열, 크기를 인자로 받고 for문으로 target[i] = source[i]를 수행한다.",
      explanation: "배열은 함수 인자로 전달될 때 시작 주소처럼 동작하므로 함수 안에서 대상 배열 원소를 바꾸면 호출한 쪽 배열도 바뀐다."
    }
  ],
  weekNotes: [
    {
      id: "c-final-functions",
      label: "별도 PDF",
      title: "제어문과 함수",
      focus: "continue, Max, swap, static, 스코프 문제를 출력 예측 중심으로 본다.",
      sourceMaterialIds: ["c-final-reference"],
      requiredKeywordIds: ["c-kw-function", "c-kw-code-writing"],
      conceptIds: ["c-function-scope", "c-loop-output"],
      exampleQuestionIds: ["c-q-continue", "c-q-max", "c-q-swap", "c-q-input-sum", "c-q-static", "c-q-block-scope", "c-q-even-odd"],
      reviewStatus: "ready"
    },
    {
      id: "c-final-arrays",
      label: "별도 PDF",
      title: "배열과 반복문",
      focus: "배열 O/X, 배열 복사, 피라미드와 총점/평균을 손으로 추적한다.",
      sourceMaterialIds: ["c-final-reference"],
      requiredKeywordIds: ["c-kw-array-copy", "c-kw-loop-output"],
      conceptIds: ["c-array-copy", "c-loop-output"],
      exampleQuestionIds: ["c-q-array-ox", "c-q-array-copy", "c-q-pyramid", "c-q-gugudan", "c-q-array-score-average"],
      reviewStatus: "ready"
    },
    {
      id: "c-final-code-writing",
      label: "별도 PDF",
      title: "코드 작성형",
      focus: "홀수 합, 원의 넓이, 3개 최댓값, 배열 복사 함수를 손으로 작성한다.",
      sourceMaterialIds: ["c-final-reference"],
      requiredKeywordIds: ["c-kw-code-writing", "c-kw-array-copy"],
      conceptIds: ["c-function-scope", "c-loop-output", "c-array-copy"],
      exampleQuestionIds: ["c-q-odd-sum", "c-q-circle-area", "c-q-max-three", "c-q-copy-arr-function"],
      reviewStatus: "ready"
    }
  ]
};

const computerIntroduction: SubjectNote = {
  id: "computer-introduction",
  title: "컴퓨터개론",
  professor: "교수님 강의 PDF 기반",
  examLabel: "기말고사",
  examPhase: "final",
  summary: {
    goal: "확정된 통신, 프로그래밍언어, 데이터베이스, 보안 네 축을 기준으로 2024년도 문제형 답안을 암기한다.",
    examScope: "통신, 프로그래밍언어, 데이터베이스, 보안",
    weekRange: "10장 통신, 8장 프로그래밍 언어1, 9장 데이터베이스, 13장 정보보안",
    examChapters: [
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
        focus: "관계형 데이터베이스의 기본키와 외부/개념/내부 스키마",
        sourceHint: "2024년도 시험문제 1, 6번"
      },
      {
        label: "13장",
        title: "정보보안",
        focus: "공개키/비공개키 암호, 스니핑, 스푸핑",
        sourceHint: "2024년도 시험문제 3, 8번"
      }
    ],
    mustKnowConceptIds: ["ci-network-web", "ci-programming-language", "ci-database", "ci-security"],
    weakSpots: ["DNS 서버 2종류의 수업자료 용어", "컴파일러와 인터프리터 한 문장 구분", "기본키와 후보키의 표현 차이", "외부/개념/내부 스키마 순서", "스니핑과 스푸핑 한 문장 구분"],
    strategy: "네 확정축을 먼저 제목만 보고 말한 뒤, 통신과 보안은 비교형, 프로그래밍언어와 데이터베이스는 정확한 용어 정의형으로 반복한다."
  },
  sources: [
    {
      id: "ci-pdf-08-09-10-13",
      title: "컴퓨터개론 수업자료 기말 범위",
      kind: "professor-pdf",
      visibility: "private-source",
      pages: "8장, 9장, 10장, 13장",
      note: "원문은 private source로 유지하고 reader에는 시험용 개념 지도만 둔다."
    },
    {
      id: "ci-2024-exam",
      title: "컴퓨터개론 2024년도 시험문제",
      kind: "manual-keyword",
      visibility: "derived-note-only",
      note: "사용자가 타이핑한 8문항을 시험 답안과 해설 중심으로 정리한다."
    }
  ],
  requiredKeywords: [
    {
      id: "ci-kw-switching",
      label: "회선교환과 패킷교환",
      status: "covered",
      professorSignal: "통신 확정범위, 2024년도 시험문제 5번",
      conceptIds: ["ci-network-web"]
    },
    {
      id: "ci-kw-dns",
      label: "DNS 서버 종류",
      status: "covered",
      professorSignal: "통신 확정범위, 2024년도 시험문제 7번",
      conceptIds: ["ci-network-web"]
    },
    {
      id: "ci-kw-programming",
      label: "프로그래밍 언어",
      status: "covered",
      professorSignal: "프로그래밍언어 확정범위",
      conceptIds: ["ci-programming-language"]
    },
    {
      id: "ci-kw-algorithm",
      label: "알고리즘과 소스 코드",
      status: "covered",
      professorSignal: "프로그래밍언어 확정범위",
      conceptIds: ["ci-programming-language"]
    },
    {
      id: "ci-kw-compiler-interpreter",
      label: "컴파일러와 인터프리터",
      status: "covered",
      professorSignal: "프로그래밍언어 확정범위",
      conceptIds: ["ci-programming-language"]
    },
    {
      id: "ci-kw-primary-key",
      label: "기본키와 후보키",
      status: "covered",
      professorSignal: "2024년도 시험문제 1번",
      conceptIds: ["ci-database"]
    },
    {
      id: "ci-kw-db-schema",
      label: "DB 3단계 추상화",
      status: "covered",
      professorSignal: "2024년도 시험문제 6번",
      conceptIds: ["ci-database"]
    },
    {
      id: "ci-kw-crypto",
      label: "공개키/비공개키 암호",
      status: "covered",
      professorSignal: "2024년도 시험문제 3번",
      conceptIds: ["ci-security"]
    },
    {
      id: "ci-kw-sniffing-spoofing",
      label: "스니핑과 스푸핑",
      status: "covered",
      professorSignal: "2024년도 시험문제 8번",
      conceptIds: ["ci-security"]
    }
  ],
  concepts: [
    {
      id: "ci-programming-language",
      title: "프로그래밍언어: 알고리즘과 번역",
      priority: "must-know",
      summary: "프로그래밍 언어는 알고리즘을 컴퓨터가 실행할 수 있는 명령으로 표현하고, 컴파일러나 인터프리터가 실행 가능한 형태로 처리한다.",
      easyExplanation: "알고리즘은 해결 절차, 소스 코드는 그 절차를 언어로 쓴 것, 컴파일러는 전체 번역, 인터프리터는 바로 해석 실행이다.",
      sourceHints: ["단원08 프로그래밍 언어1.pdf"],
      relatedKeywordIds: ["ci-kw-programming", "ci-kw-algorithm", "ci-kw-compiler-interpreter"],
      exampleQuestionIds: ["ci-q-programming-language", "ci-q-compiler-interpreter"]
    },
    {
      id: "ci-database",
      title: "9장 데이터베이스 키와 3단계 스키마",
      priority: "must-know",
      summary: "관계형 모델에서 기본키로 튜플을 식별하고, 외부/개념/내부 단계로 데이터베이스 관점을 나눈다.",
      easyExplanation: "기본키는 한 행을 찍어내는 이름표이고, 3단계 스키마는 사용자 눈, 전체 설계도, 실제 저장 방식이다.",
      sourceHints: ["단원09 데이터베이스.pdf", "2024년도 시험문제 1, 6번"],
      relatedKeywordIds: ["ci-kw-primary-key", "ci-kw-db-schema"],
      exampleQuestionIds: ["ci-q-primary-key", "ci-q-db-three-level"]
    },
    {
      id: "ci-network-web",
      title: "통신: 교환 방식과 DNS",
      priority: "must-know",
      summary: "회선교환과 패킷교환을 대표 예로 비교하고, DNS 서버의 역할 차이를 설명한다.",
      easyExplanation: "전화망은 길을 먼저 잡고, 인터넷은 조각을 그때그때 보낸다. DNS는 주소 이름을 IP로 바꿔준다.",
      sourceHints: ["단원10 컴퓨터 네트워크와 월드와이드웹.pdf", "2024년도 시험문제 5, 7번"],
      relatedKeywordIds: ["ci-kw-switching", "ci-kw-dns"],
      exampleQuestionIds: ["ci-q-switching", "ci-q-dns-server-types"]
    },
    {
      id: "ci-security",
      title: "13장 정보보안",
      priority: "must-know",
      summary: "공개키/비공개키 암호 알고리즘 예시와 스니핑/스푸핑의 공격 의미를 구분한다.",
      easyExplanation: "RSA는 키 한 쌍, AES는 같은 비밀키다. 스니핑은 엿보기, 스푸핑은 속이기다.",
      sourceHints: ["단원13 정보보안.pdf", "2024년도 시험문제 3, 8번"],
      relatedKeywordIds: ["ci-kw-crypto", "ci-kw-sniffing-spoofing"],
      exampleQuestionIds: ["ci-q-crypto", "ci-q-sniffing-spoofing"]
    }
  ],
  exampleQuestions: [
    {
      id: "ci-q-switching",
      conceptId: "ci-network-web",
      difficulty: "applied",
      prompt: "전화망처럼 미리 설정된 경로를 쓰는 방식과 인터넷처럼 가장 좋은 경로를 찾아 보내는 방식의 이름을 쓰라.",
      answer: "A는 회선교환 방식, B는 패킷교환 방식이다.",
      explanation: "회선교환은 전용 경로를 잡고, 패킷교환은 패킷마다 경로를 유동적으로 선택한다."
    },
    {
      id: "ci-q-dns-server-types",
      conceptId: "ci-network-web",
      difficulty: "applied",
      prompt: "DNS 서비스를 제공하는 서버 2종류와 각각의 특징을 설명하라.",
      answer: "주 DNS 서버는 도메인의 원본 zone 레코드를 관리하고, 보조 DNS 서버는 그 정보를 복제해 백업과 부하 분산을 담당한다.",
      explanation: "교재가 재귀/권한 DNS로 설명했다면 재귀 DNS는 클라이언트 대신 질의하고 캐시하며, 권한 DNS는 해당 도메인의 최종 레코드를 가진 서버라고 답한다."
    },
    {
      id: "ci-q-programming-language",
      conceptId: "ci-programming-language",
      difficulty: "basic",
      prompt: "프로그래밍 언어를 배우는 이유를 설명하라.",
      answer: "문제 해결 절차인 알고리즘을 컴퓨터가 실행할 수 있는 명령으로 표현하기 위해서다.",
      explanation: "프로그래밍 언어는 사람이 설계한 절차를 소스 코드로 작성하고, 컴퓨터가 처리할 수 있게 만드는 도구다."
    },
    {
      id: "ci-q-compiler-interpreter",
      conceptId: "ci-programming-language",
      difficulty: "basic",
      prompt: "컴파일러와 인터프리터의 차이를 설명하라.",
      answer: "컴파일러는 소스 프로그램 전체를 한 번에 번역해 실행 가능한 형태를 만들고, 인터프리터는 명령 단위로 해석하면서 바로 실행한다.",
      explanation: "컴파일러는 전체 번역, 인터프리터는 즉시 해석 실행으로 대비하면 단답형 답안이 선명하다."
    },
    {
      id: "ci-q-primary-key",
      conceptId: "ci-database",
      difficulty: "basic",
      prompt: "관계형 데이터베이스 모델에서 여러 튜플 중 하나의 튜플을 유일하게 식별할 수 있는 키는 무엇인가.",
      answer: "기본키다. 후보키 중 대표 식별자로 선택된 키이며 중복과 NULL을 허용하지 않는다.",
      explanation: "유일 식별성만 보면 후보키도 맞는 성질이지만, 시험 단답은 기본키로 쓰는 것이 가장 안전하다."
    },
    {
      id: "ci-q-crypto",
      conceptId: "ci-security",
      difficulty: "basic",
      prompt: "공개키 암호 알고리즘과 비공개키 암호 알고리즘의 예를 각각 하나씩 쓰라.",
      answer: "공개키 암호의 예는 RSA, 비공개키 또는 대칭키 암호의 예는 AES다.",
      explanation: "RSA는 공개키/개인키 한 쌍, AES는 송수신자가 공유하는 같은 비밀키를 사용한다."
    },
    {
      id: "ci-q-db-three-level",
      conceptId: "ci-database",
      difficulty: "basic",
      prompt: "데이터베이스를 바라보는 관점에 따라 추상화한 3가지를 쓰라.",
      answer: "외부 단계, 개념 단계, 내부 단계다. 외부 스키마, 개념 스키마, 내부 스키마라고도 한다.",
      explanation: "외부는 사용자별 view, 개념은 전체 논리 구조, 내부는 실제 저장 구조다."
    },
    {
      id: "ci-q-sniffing-spoofing",
      conceptId: "ci-security",
      difficulty: "basic",
      prompt: "스니핑과 스푸핑을 각각 간단히 설명하라.",
      answer: "스니핑은 네트워크 패킷을 몰래 엿보거나 가로채는 공격이고, 스푸핑은 주소나 신원을 위조해 다른 주체처럼 속이는 공격이다.",
      explanation: "스니핑은 도청, 스푸핑은 위장으로 기억한다."
    }
  ],
  weekNotes: [
    {
      id: "ci-week-10",
      label: "10장",
      title: "통신",
      focus: "회선교환/패킷교환과 DNS 서버 종류를 비교형 답안으로 정리한다.",
      sourceMaterialIds: ["ci-pdf-08-09-10-13", "ci-2024-exam"],
      requiredKeywordIds: ["ci-kw-switching", "ci-kw-dns"],
      conceptIds: ["ci-network-web"],
      exampleQuestionIds: ["ci-q-switching", "ci-q-dns-server-types"],
      reviewStatus: "ready"
    },
    {
      id: "ci-week-08",
      label: "8장",
      title: "프로그래밍언어",
      focus: "프로그래밍 언어 목적, 알고리즘/소스 코드, 컴파일러/인터프리터 차이를 정리한다.",
      sourceMaterialIds: ["ci-pdf-08-09-10-13"],
      requiredKeywordIds: ["ci-kw-programming", "ci-kw-algorithm", "ci-kw-compiler-interpreter"],
      conceptIds: ["ci-programming-language"],
      exampleQuestionIds: ["ci-q-programming-language", "ci-q-compiler-interpreter"],
      reviewStatus: "ready"
    },
    {
      id: "ci-week-09",
      label: "9장",
      title: "데이터베이스",
      focus: "기본키와 외부/개념/내부 스키마를 단답형으로 반복한다.",
      sourceMaterialIds: ["ci-pdf-08-09-10-13", "ci-2024-exam"],
      requiredKeywordIds: ["ci-kw-primary-key", "ci-kw-db-schema"],
      conceptIds: ["ci-database"],
      exampleQuestionIds: ["ci-q-primary-key", "ci-q-db-three-level"],
      reviewStatus: "ready"
    },
    {
      id: "ci-week-13",
      label: "13장",
      title: "정보보안",
      focus: "RSA/AES 예시와 스니핑/스푸핑 정의를 한 문장으로 고정한다.",
      sourceMaterialIds: ["ci-pdf-08-09-10-13", "ci-2024-exam"],
      requiredKeywordIds: ["ci-kw-crypto", "ci-kw-sniffing-spoofing"],
      conceptIds: ["ci-security"],
      exampleQuestionIds: ["ci-q-crypto", "ci-q-sniffing-spoofing"],
      reviewStatus: "ready"
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
