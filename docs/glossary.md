---
title: study-note 용어집 (Ubiquitous Language)
audience: 면접관 + 개발자
status: live
created_at: 2026-05-28
---

# 용어집 — 비개발자도 이해할 수 있도록

이 문서는 README · admin SPA · 코드 안 모든 곳에서 같은 의미로 쓰는 용어 정의입니다.
면접관 (비개발자) 가 화면 봐도 매칭 가능하게 한국어 풀이 우선.

## 비개발자 면접관 — 5 분 안 알아야 할 핵심

| 화면에 보이는 단어 | 진짜 의미 |
|---|---|
| **학기** | 1학년 1학기 / 2학년 2학기 등. 학생이 한 텀 동안 듣는 강의 묶음. |
| **과목** | 학기 안의 과목 (디지털공학개론 / C언어 등). 학기 안에 여러 개 있음. |
| **수업** | 과목 안의 한 주차 수업. 보통 수업일 (예: 5월 7일) 1개와 PDF 자료 1개가 묶임. |
| **PDF 자료** | 교수님이 올린 강의 자료 PDF 파일. 학생이 다운로드 + 그 위에 필기. |
| **필기 / 메모** | 학생이 PDF 위에 직접 그리는 펜·포스트잇·별표·체크리스트·표·그래프. |
| **수업일 미지정** | PDF 가 어느 주차 수업에 속하는지 아직 안 정한 상태. 나중에 수업일 지정 가능. |
| **사용자 관리** | 가입한 학생/관리자 목록. 신규 가입자 승인·반려·권한 변경 화면. |
| **운영 지표** | 서버가 안정한지 / 사용자가 잘 쓰고 있는지 모니터링 화면. |

## 권한 (사용자 등급)

| 권한 | 누가 | 권한 범위 |
|---|---|---|
| **MASTER** | 운영자 (mj 본인 + 시연용 리뷰어) | 모든 화면 + 사용자 관리 + 학기/과목 생성·삭제 |
| **ADMIN** | 협업자 (조교/공동 관리자) | MASTER 와 동일하지만 다른 사람을 MASTER 로 승급은 불가 |
| **NORMAL** | 일반 학생 | 본인 자료 보기 + 본인 필기 + 강의자료 보기 (운영자가 올린 PDF) |

## 데이터 위계 (모델)

```
학기 (Term)
└─ 과목 (Subject)
   ├─ PDF 자료 (PdfMaterial)
   │  └─ 필기 (AnnotationSnapshot)  ← 학생별로 따로 저장
   └─ 주차 노트 (WeekNote)
      └─ 자유 메모 (userNotes)
```

- **Term (학기)** — `1학년 1학기 기본 학기` 같은 묶음. 학년·학기·제목 으로 식별.
- **Subject (과목)** — Term 안의 과목 row.
- **PdfMaterial** — Subject 안의 강의 자료 PDF.
- **AnnotationSnapshot** — PDF 위 필기. 같은 PDF 라도 학생마다 본인 row.
- **WeekNote** — Subject 안의 한 주차. 자유 메모 보유.

## 사용 시나리오 (학생 입장)

1. 학기 생성 → 과목 추가 → 주차 수업일 추가.
2. 운영자가 PDF 업로드 → 학생이 다운로드해서 본문 봄.
3. PDF 위에 포스트잇·펜·별표·체크리스트·표·그래프 widget 으로 필기.
4. 필기는 자동저장 + 다른 기기 로그인 시 cross-device sync.
5. 시험 직전 = 주차 노트 + PDF 필기 다시 봄.

## 사용 시나리오 (운영자 = mj / 리뷰어)

1. `/admin.html` 접속 → 사용자 관리 + 학기/과목 관리.
2. 학기·과목 추가/이동/삭제. 학생 가입 승인/반려.
3. 운영 지표 탭에서 서버 상태·사용자 활동 monitoring.
4. PDF 업로드 시 권한이 MASTER/ADMIN 이면 자동 "공유 자료" — 모든 학생이 download 가능.

## 기술 용어 (개발자 면접관용)

| 단어 | 의미 |
|---|---|
| **SoT (Source of Truth)** | "이 데이터의 정답이 어디 있는가" — 예: PDF 원본 = R2, annotation = DB + R2 hybrid. |
| **BE (Backend)** | 서버 코드 = `apps/api` (NestJS). |
| **FE (Frontend)** | 브라우저 코드 = `apps/web` (Vite + TypeScript). |
| **ACA (Azure Container Apps)** | 백엔드 운영 인프라. Docker 컨테이너 호스팅. |
| **SWA / Vercel** | 프론트엔드 운영 인프라 (Vercel SaaS 사용 중. README 의 SWA 언급은 legacy). |
| **R2** | Cloudflare 의 S3 호환 object storage. PDF 원본 + annotation snapshot 저장. |
| **RUM (Real User Monitoring)** | 사용자 브라우저에서 발생하는 click/오류/성능 측정. Datadog SDK. |
| **APM (Application Performance Monitoring)** | 백엔드 요청별 trace + 응답 시간 측정. Datadog dd-trace. |
| **CAS (Compare And Swap)** | 동시 편집 충돌 차단 패턴. annotation save 시 revision 비교 후 다르면 거부. |
| **CSRF / XSS** | 웹 보안 공격. HttpOnly cookie + SameSite=Lax + escape-html 로 차단. |
| **httpOnly cookie** | JS 로 못 읽는 쿠키. session token 만 담음 (사용자 PII X). |
| **session token** | 사용자 로그인 식별자. 32-byte random + HMAC pepper hash 로 DB 저장. |
| **Prisma / MySQL Flex** | DB ORM + 운영 MySQL 호스팅. |
| **dd-trace** | Datadog 의 BE trace agent. |
| **Prometheus / Grafana** | 자체 호스팅 metric stack (Datadog 외 보조). |

## Solon Product SFS / sprint 용어

| 단어 | 의미 |
|---|---|
| **sprint** | 단위 작업 묶음 (Solon Product SFS 의 workflow). 1 sprint = 1 PR 기준. |
| **Gate 2 (Brainstorm)** | sprint 시작 시 요구사항 정리. |
| **Gate 3 (Plan)** | 작업 범위·완료 기준·위험 정리. |
| **Gate 6 (Review)** | 구현 후 self/cross review. |
| **AC (Acceptance Criteria)** | 완료 기준 체크리스트. |
| **ADR (Architecture Decision Record)** | 큰 결정 의 근거 기록. |
| **Layer A/B/C/D** | main.ts 분해 단계 (routing / PDF workspace / subject views / storage·identity·sync). |

## DDD (Domain-Driven Design) 용어

| 단어 | 의미 |
|---|---|
| **Aggregate** | 같이 변경되는 단위 (예: PdfWorkspace = subject 1개 의 모든 widget). |
| **Bounded Context** | 의미가 분리되는 영역 (Notebook / PdfWorkspace / PdfMaterial / AuthSession / Term). |
| **Invariant** | "절대 깨지지 않아야 할 규칙" (예: subject.termId 는 항상 valid Term.id). |
| **Ubiquitous Language** | 코드 · 화면 · 문서 모두에서 **같은 단어** 사용. 이 문서가 그 정의. |

자세한 DDD 모델 = `llm-wiki/ddd/README.md`.

## 줄임말 (자주 등장)

| 줄임 | 풀이 |
|---|---|
| SoT | Source of Truth (정답 위치) |
| SPA | Single Page Application (한 페이지 안에서 화면 전환) |
| BE / FE | Backend / Frontend |
| ACA | Azure Container Apps |
| RUM | Real User Monitoring (사용자 행동 측정) |
| APM | Application Performance Monitoring (서버 trace 측정) |
| CAS | Compare And Swap (충돌 차단) |
| PR | Pull Request (코드 변경 제안) |
| AC | Acceptance Criteria (완료 기준) |
| ADR | Architecture Decision Record (결정 기록) |
| UL | Ubiquitous Language (도메인 용어집) |
| DDD | Domain-Driven Design (도메인 중심 설계) |

## 갱신 의무

- 새 sprint 가 학생이 보는 화면에 새 단어를 추가하면 본 문서에도 1줄 + 의미 추가.
- 줄임말 새로 도입 시 위 줄임말 표 갱신.
- DDD aggregate 추가 시 `llm-wiki/ddd/aggregates/` + 본 문서의 데이터 위계 도식 갱신.
