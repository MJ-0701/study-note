// S3 React island leaf — home 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
import type { StudyNotebook, SubjectNote, WeekNote } from "@study-note/domain";
import { intakePath, subjectClassPath, weekPath } from "../app/routes.ts";
import { sanitizeExternalUrl } from "../app/safe-url.ts";
import { scheduleRangeLabel } from "../data/classSchedule.ts";

// ─── props ───────────────────────────────────────────────────────────────────

export interface HomeViewProps {
  notebook: StudyNotebook;
  coverageRate: number;
  covered: number;
  total: number;
  totalSessions: number;
  needsFillSessions: Array<{ subject: SubjectNote; week: WeekNote }>;
  warnings: string[];
  subjectCoverageRates: Record<string, number>;
}

// ─── sub-components (pure, no hooks) ─────────────────────────────────────────

function MetricCard({ label, value, description }: { label: string; value: string; description: string }): React.ReactElement {
  return (
    <article className="metric-card">
      <p className="meta">{label}</p>
      <strong>{value}</strong>
      <span>{description}</span>
    </article>
  );
}

function SubjectCard({ subject, coverageRate }: { subject: SubjectNote; coverageRate: number }): React.ReactElement {
  return (
    <article className="subject-card">
      <p className="meta">{subject.examLabel} · {subject.summary.weekRange}</p>
      <h3>{subject.title}</h3>
      <p>{subject.summary.goal}</p>
      <div className="subject-card-footer">
        <span>{coverageRate}% 키워드 반영</span>
        <a href={subjectClassPath(subject)}>과목 들어가기</a>
      </div>
    </article>
  );
}

// ─── leaf component ───────────────────────────────────────────────────────────

export function HomeView({
  notebook,
  coverageRate,
  covered,
  total,
  totalSessions,
  needsFillSessions,
  warnings,
  subjectCoverageRates,
}: HomeViewProps): React.ReactElement {
  const firstSubject = notebook.subjects[0];
  const safeWorkspaceUrl = sanitizeExternalUrl(notebook.sourceWorkspaceUrl);

  return (
    <>
      <section className="home-hero">
        <div>
          <p className="meta">{notebook.term} · 기말고사 홈</p>
          <h1>{notebook.title}</h1>
          <p className="lede">
            홈은 전체 현황을 보고 과목으로 들어가는 시작 화면입니다.
            과목별 총정리와 날짜별 노트는 각 과목 페이지 안에서 따로 봅니다.
          </p>
          <div className="hero-actions">
            {firstSubject && (
              <a className="action-link" href={subjectClassPath(firstSubject)}>
                첫 과목 공부하기
              </a>
            )}
            <a className="secondary-link" href={intakePath()}>자료 투입 가이드</a>
          </div>
        </div>
        <img src="/coverage-map.svg" alt="비공개 PDF, 필수 키워드, 핵심 개념, 예제문제 흐름" />
      </section>

      <section className="metric-grid" aria-label="학습 노트 현황">
        <MetricCard label="과목" value={`${notebook.subjects.length}과목`} description="과목별 독립 페이지" />
        <MetricCard label="수업일" value={`${totalSessions}개 노트`} description="날짜별 노트" />
        <MetricCard label="키워드 반영률" value={`${coverageRate}%`} description={`${covered}/${total} 필수 키워드 반영`} />
        <MetricCard label="일정" value={scheduleRangeLabel} description="목요일/토요일 수업" />
      </section>

      <section aria-labelledby="home-subjects-title">
        <p className="meta">§1 — 과목 선택</p>
        <h2 id="home-subjects-title">과목을 선택하세요.</h2>
        <div className="subject-grid">
          {notebook.subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} coverageRate={subjectCoverageRates[subject.id] ?? 0} />
          ))}
        </div>
      </section>

      <section className="home-split" aria-labelledby="home-review-title">
        <div>
          <p className="meta">§2 — 보강 필요</p>
          <h2 id="home-review-title">보강이 필요한 수업일</h2>
          {needsFillSessions.length === 0 ? (
            <p className="status-good">현재 보강 표시된 수업일이 없습니다.</p>
          ) : (
            <div className="compact-list">
              {needsFillSessions.map(({ subject, week }) => (
                <a key={`${subject.id}-${week.id}`} href={weekPath(subject, week)}>
                  <span>{subject.title}</span>
                  <strong>{week.label} · {week.title}</strong>
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="meta">§3 — 공유 원칙</p>
          <h2>공유 원칙</h2>
          <div className="policy-block is-standalone">
            <strong>원문 PDF는 홈이나 과목 페이지에서 공개하지 않습니다.</strong>
            <p>{notebook.sharePolicy.rawSourceRule}</p>
            <p>{notebook.sharePolicy.noteRule}</p>
            <p>{notebook.sharePolicy.disclaimer}</p>
            {safeWorkspaceUrl && (
              <p>
                <a href={safeWorkspaceUrl} target="_blank" rel="noreferrer">
                  기존 Notion 원본 보기
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="integrity-section" aria-labelledby="integrity-title">
        <p className="meta">§4 — 데이터 연결 확인</p>
        <h2 id="integrity-title">샘플 데이터 연결 상태</h2>
        {warnings.length === 0 ? (
          <p className="status-good">샘플 과목, 수업일, 키워드, 개념, 문제, 자료가 모두 연결되어 있습니다.</p>
        ) : (
          <ul>
            {warnings.map((warning, i) => <li key={i}>{warning}</li>)}
          </ul>
        )}
      </section>
    </>
  );
}
