// S4a React island leaf — subject-summaries 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, effect-setState 0. data-action="generate-subject-note" = document 위임 보존.
// JSX 자동 escape, innerHTML 주입 없음 (INV-8).

// ─── public types ────────────────────────────────────────────────────────────

export interface SummaryDayCardItem {
  id: string;
  formattedLabel: string;         // formatWeekLabel(week.label) 결과
  reviewStatusLabel: string;      // "읽기 가능" | "보강 필요"
  title: string;
  focus: string;
  conceptCount: number;
  questionCount: number;
  summaryDetailHref: string;
  classDetailHref: string;
}

export interface SubjectSummariesViewProps {
  subjectId: string;
  subjectTitle: string;
  examLabel: string;
  weekRange: string;
  classPath: string;
  memorizePath: string;
  coverageRate: number;
  covered: number;
  total: number;
  weekCount: number;
  examScope: string;
  examLabelShort: string;
  strategy: string;
  weakSpots: string;
  days: SummaryDayCardItem[];
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SummaryDayCard({ day }: { day: SummaryDayCardItem }): React.ReactElement {
  return (
    <article className="class-day-card">
      <div>
        <p className="meta">{day.formattedLabel} · {day.reviewStatusLabel}</p>
        <h3>{day.title}</h3>
        <p>{day.focus}</p>
      </div>
      <div className="class-day-card__stats">
        <span>{day.conceptCount}개 개념</span>
        <span>{day.questionCount}개 문제</span>
      </div>
      <div className="week-card-actions">
        <a className="action-button" href={day.summaryDetailHref}>요약 상세 보기</a>
        <a className="secondary-link" href={day.classDetailHref}>수업 상세</a>
      </div>
    </article>
  );
}

// ─── leaf component ───────────────────────────────────────────────────────────

export function SubjectSummariesView(props: SubjectSummariesViewProps): React.ReactElement {
  const {
    subjectId,
    subjectTitle,
    examLabel,
    weekRange,
    classPath,
    memorizePath,
    coverageRate,
    covered,
    total,
    weekCount,
    examScope,
    examLabelShort,
    strategy,
    weakSpots,
    days,
  } = props;

  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{examLabel} · {weekRange}</p>
        <h1>{subjectTitle} 요약본</h1>
        <p className="lede">요약본은 수업일별로 들어가서 확인합니다. 시험 직전에는 필수 암기노트만 따로 봅니다.</p>
        <div className="hero-actions">
          <button
            className="action-button"
            type="button"
            data-action="generate-subject-note"
            data-subject-id={subjectId}
          >
            전체 정리노트 만들기
          </button>
          <a className="secondary-link" href={classPath}>수업 자료 보기</a>
          <a className="secondary-link" href={memorizePath}>필수 암기노트</a>
        </div>
      </section>

      <section className="metric-grid" aria-label={`${subjectTitle} 현황`}>
        <article className="metric-card">
          <p className="meta">키워드 반영률</p>
          <strong>{coverageRate}%</strong>
          <span>{covered}/{total}개 반영</span>
        </article>
        <article className="metric-card">
          <p className="meta">수업일</p>
          <strong>{weekCount}개 노트</strong>
          <span>날짜별 노트</span>
        </article>
        <article className="metric-card">
          <p className="meta">시험 범위</p>
          <strong>{weekRange}</strong>
          <span>{examLabelShort}</span>
        </article>
      </section>

      <section aria-labelledby="summary-list-title">
        <p className="meta">날짜별 요약</p>
        <h2 id="summary-list-title">수업일별 요약 목록</h2>
        <div className="class-day-grid">
          {days.map((day) => <SummaryDayCard key={day.id} day={day} />)}
        </div>
      </section>

      <section aria-labelledby="summary-course-title">
        <p className="meta">과목 단위 메모</p>
        <h2 id="summary-course-title">전체 요약 방향</h2>
        <div className="summary-grid">
          <article className="summary-block">
            <p className="meta">시험 범위</p>
            <p>{examScope}</p>
          </article>
          <article className="summary-block">
            <p className="meta">복습 전략</p>
            <p>{strategy}</p>
          </article>
          <article className="summary-block">
            <p className="meta">취약 포인트</p>
            <p>{weakSpots}</p>
          </article>
        </div>
      </section>
    </>
  );
}
