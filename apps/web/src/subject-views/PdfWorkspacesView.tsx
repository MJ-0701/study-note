// S4c React island leaf — pdf-workspaces 자료실 목록 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, effect-setState 0. data-action 위임 보존. JSX 자동 escape.
// parity oracle: renderPdfWorkspaceIndex / renderPdfSubjectLibrarySection /
//   renderPdfLibraryUploadCard / renderPdfMaterialCard(isCurrent=false, compact=false,
//   showClassDateControl=undefined) 의 1:1 미러.

// ─── public types ────────────────────────────────────────────────────────────

export interface PdfWorkspacesViewMaterial {
  materialKey: string;
  fileName: string;
  fileSize: string; // 이미 formatPdfFileSize 적용됨
  pageCount: number;
  statusLabel: string;
  ownerLabel: string;
  classDateLabel: string;
  classDateIsUnconfirmed: boolean;
}

export interface PdfWorkspacesViewUploadCard {
  isReadonly: boolean;
  subjectTitle: string;
  subjectId: string;
  materialCount: number;
  readonlyHref: string;
  inputId: string;
}

export interface PdfWorkspacesViewSubject {
  subjectId: string;
  title: string;
  examLabel: string;
  weekRange: string;
  materialCount: number;
  uploadCard: PdfWorkspacesViewUploadCard;
  materials: PdfWorkspacesViewMaterial[];
}

export interface PdfWorkspacesViewProps {
  summary: {
    totalMaterials: number;
    activeSubjects: number;
    totalSubjects: number;
  };
  subjects: PdfWorkspacesViewSubject[];
}

// ─── sub-components ──────────────────────────────────────────────────────────

/** renderMetric(label, value, description) 의 JSX 미러. */
function MetricCard({ label, value, description }: {
  label: string;
  value: string;
  description: string;
}): React.ReactElement {
  return (
    <article className="metric-card">
      <p className="meta">{label}</p>
      <strong>{value}</strong>
      <span>{description}</span>
    </article>
  );
}

/**
 * renderPdfMaterialCard(ctx, subject, material, { isCurrent: false, compact: false })
 * 의 JSX 미러.
 * ⚠️ isCurrent=false 고정 → is-current span 렌더 없음, 버튼 레이블 "열기" 고정.
 * ⚠️ showClassDateControl=undefined(falsy) → class-date picker 없음.
 */
function PdfMaterialCard({ material, subjectId, subjectTitle }: {
  material: PdfWorkspacesViewMaterial;
  subjectId: string;
  subjectTitle: string;
}): React.ReactElement {
  return (
    <article className="pdf-material-card">
      <div className="pdf-material-card__body">
        <p className="meta">{subjectTitle} · {material.classDateLabel}</p>
        <h4>{material.fileName}</h4>
        <p>{material.fileSize} · {material.pageCount}페이지 · {material.statusLabel}</p>
        <div className="pdf-material-card__badges">
          <span>{material.ownerLabel}</span>
          {material.classDateIsUnconfirmed && <span>나중에 수정</span>}
          {/* isCurrent=false 고정 → is-current span 없음 (parity: oracle line 300) */}
        </div>
        {/* showClassDateControl=undefined → class-date picker 없음 (parity: oracle line 302) */}
      </div>
      <div className="pdf-material-card__actions">
        <button
          className="action-button"
          type="button"
          data-action="open-pdf-material"
          data-subject-id={subjectId}
          data-material-id={material.materialKey}
        >열기</button>
      </div>
    </article>
  );
}

/** renderPdfLibraryUploadCard 의 JSX 미러 — readonly/editable 2 분기. */
function UploadCard({ card }: { card: PdfWorkspacesViewUploadCard }): React.ReactElement {
  if (card.isReadonly) {
    return (
      <article className="pdf-upload-card is-readonly">
        <p className="meta">{card.subjectTitle}</p>
        <h4>새 자료 요청</h4>
        <p>PDF 업로드는 관리자만 가능합니다. 필요한 강의자료가 없으면 관리자에게 요청하세요.</p>
        <a className="secondary-link" href={card.readonlyHref}>
          {card.materialCount > 0 ? "공유 자료 보기" : "작업공간 열기"}
        </a>
      </article>
    );
  }

  return (
    <article className="pdf-upload-card">
      <input
        id={card.inputId}
        className="file-input"
        type="file"
        accept="application/pdf,.pdf"
        data-action="import-pdf-material"
        data-subject-id={card.subjectId}
      />
      <label className="pdf-upload-card__label" htmlFor={card.inputId}>
        <span>새 PDF 업로드</span>
        <strong>{card.subjectTitle} 수업 자료 추가</strong>
        <small>
          {card.materialCount > 0
            ? `${card.materialCount}개 자료에 이어 추가합니다.`
            : "첫 강의 PDF를 바로 올립니다."}
        </small>
      </label>
    </article>
  );
}

/** renderPdfSubjectLibrarySection 의 JSX 미러. */
function SubjectLibrarySection({ subject }: {
  subject: PdfWorkspacesViewSubject;
}): React.ReactElement {
  return (
    <section className="pdf-subject-section" aria-labelledby={`pdf-subject-${subject.subjectId}`}>
      <div className="pdf-subject-section__header">
        <div>
          <p className="meta">{subject.examLabel} · {subject.weekRange}</p>
          <h3 id={`pdf-subject-${subject.subjectId}`}>{subject.title}</h3>
        </div>
        <span className="pdf-count-pill">{subject.materialCount}개 자료</span>
      </div>
      <div className="pdf-material-slider" aria-label={`${subject.title} PDF 자료 슬라이더`}>
        <UploadCard card={subject.uploadCard} />
        {subject.materials.map((material) => (
          <PdfMaterialCard
            key={material.materialKey}
            material={material}
            subjectId={subject.subjectId}
            subjectTitle={subject.title}
          />
        ))}
      </div>
    </section>
  );
}

// ─── leaf ────────────────────────────────────────────────────────────────────

/** renderPdfWorkspaceIndex 의 JSX 미러 — pure-props, hook 0. */
export function PdfWorkspacesView({ summary, subjects }: PdfWorkspacesViewProps): React.ReactElement {
  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">PDF 자료실</p>
        <h1>수업자료 찾기</h1>
        <p className="lede">관리자가 올린 PDF를 과목별로 골라 열고, 같은 원문 위에 내 필기만 따로 저장합니다.</p>
        <div className="pdf-library-summary" aria-label="PDF 자료 현황">
          <MetricCard label="등록 자료" value={`${summary.totalMaterials}개`} description="업로드된 PDF" />
          <MetricCard label="과목" value={`${summary.activeSubjects}/${summary.totalSubjects}`} description="자료가 있는 과목" />
          <MetricCard label="필기" value="개인별" description="PDF 원문과 분리 저장" />
        </div>
      </section>
      <section aria-labelledby="pdf-workspaces-title">
        <p className="meta">자료 목록</p>
        <h2 id="pdf-workspaces-title">과목별 PDF</h2>
        <div className="pdf-library">
          {subjects.map((subject) => (
            <SubjectLibrarySection key={subject.subjectId} subject={subject} />
          ))}
        </div>
      </section>
    </>
  );
}
