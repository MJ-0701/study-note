// S4b-2 React island leaf — subject-class 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, effect-setState 0. data-action 위임 보존. JSX 자동 escape.
// 전 form control uncontrolled(defaultValue/defaultChecked). controlled value/checked 금지.
// 수업일 추가 FOCUS-PRES 대상 = add-class-date form의 title text input.

// ─── public types ────────────────────────────────────────────────────────────

export interface SubjectClassViewIntakeFeedback {
  // parity: 원본 renderIntakeFeedback / IntakeView 와 동일하게 raw kind passthrough.
  // CSS = .import-feedback.is-success / .is-error (styles.css). is-info 스타일 없음.
  kind: "success" | "error";
  title: string;
  detail: string;
  href: string | null;
  retrySubjectId: string | null;
  hasPendingRetry: boolean;
}

export interface SubjectClassViewPdfClassDateOption {
  value: string;
  label: string;
  checked: boolean;
  disabled: boolean;
}

export interface SubjectClassViewPdfMaterial {
  materialKey: string;
  fileName: string;
  fileSize: string;
  pageCount: number;
  statusLabel: string;
  ownerLabel: string;
  classDateLabel: string;
  classDateIsUnconfirmed: boolean;
  // class-date control props (showClassDateControl=true 경로)
  classDateSelectedValue: string;
  classDateSelectedLabel: string;
  classDateCanEdit: boolean;
  classDateRadioName: string;
  classDateOptions: SubjectClassViewPdfClassDateOption[];
}

export interface SubjectClassViewPdfMaterialButton {
  materialKey: string;
  fileName: string;
}

export interface SubjectClassViewClassDayCard {
  weekId: string;
  weekLabel: string;
  weekLabelFormatted: string;
  reviewStatusLabel: string;
  weekTitle: string;
  weekFocus: string;
  linkedMaterialCount: number;
  keywordCount: number;
  linkedPdfButtons: SubjectClassViewPdfMaterialButton[]; // slice(0,2)
  extraPdfCount: number; // >2 시 "외 N개"
  weekPath: string;
  weekSummaryPath: string;
  // attach control
  canManage: boolean;
  unassignedOptions: Array<{ materialKey: string; fileName: string }>;
}

export interface SubjectClassViewUploadCard {
  isReadonly: boolean;
  subjectTitle: string;
  subjectId: string;
  materialCount: number;
  readonlyHref: string;
  inputId: string;
}

export interface SubjectClassViewProps {
  // hero
  subjectId: string;
  subjectTitle: string;
  examLabel: string;
  weekRange: string;
  // 4 unit card hrefs
  classPath: string;
  summaryPath: string;
  memorizePath: string;
  pdfWorkspacePath: string;
  weekCount: number;
  materialCount: number;
  // intake feedback (null = empty/placeholder)
  intakeFeedback: SubjectClassViewIntakeFeedback | null;
  intakeFeedbackEmptyText: string;
  // sorted week cards
  classDayCards: SubjectClassViewClassDayCard[];
  // assignment section
  uploadCard: SubjectClassViewUploadCard;
  materials: SubjectClassViewPdfMaterial[];
}

// ─── sub-components ──────────────────────────────────────────────────────────

function UnitGrid({ props }: { props: SubjectClassViewProps }): React.ReactElement {
  const { subjectTitle, examLabel, weekRange, classPath, summaryPath, memorizePath, pdfWorkspacePath, weekCount, materialCount } = props;
  return (
    <>
      <section className="subject-page-hero">
        <p className="meta">{examLabel} · {weekRange}</p>
        <h1>{subjectTitle}</h1>
        <p className="lede">이 진입 화면에서 유닛 카드를 골라 상세로 진입합니다. 카드 click 또는 사이드바의 명시적 메뉴 click 만 상세 라우트를 엽니다.</p>
      </section>

      <section className="subject-unit-grid" aria-label={`${subjectTitle} 유닛`}>
        <a className="subject-unit-card" href={classPath}>
          <span className="subject-unit-card__meta">수업</span>
          <strong>수업일 카드</strong>
          <span className="subject-unit-card__hint">날짜별 자료 + 메모. {weekCount}회.</span>
        </a>
        <a className="subject-unit-card" href={summaryPath}>
          <span className="subject-unit-card__meta">요약</span>
          <strong>요약본</strong>
          <span className="subject-unit-card__hint">수업일별 요약 + 키워드 정리.</span>
        </a>
        <a className="subject-unit-card" href={memorizePath}>
          <span className="subject-unit-card__meta">암기</span>
          <strong>필수 암기노트</strong>
          <span className="subject-unit-card__hint">중간/기말 구간별 + 필수 개념.</span>
        </a>
        <a className="subject-unit-card" href={pdfWorkspacePath}>
          <span className="subject-unit-card__meta">PDF</span>
          <strong>PDF 작업공간</strong>
          <span className="subject-unit-card__hint">필기 + 단축키. {materialCount}개 자료.</span>
        </a>
      </section>
    </>
  );
}

function IntakeFeedbackSection({ feedback, emptyText }: {
  feedback: SubjectClassViewIntakeFeedback | null;
  emptyText: string;
}): React.ReactElement {
  if (!feedback) {
    return <div className="import-feedback">{emptyText}</div>;
  }
  return (
    <div className={`import-feedback is-${feedback.kind}`}>
      <strong>{feedback.title}</strong>
      <p>{feedback.detail}</p>
      {feedback.href && <a href={feedback.href}>반영된 수업일 노트 보기</a>}
      {feedback.kind === "error" && feedback.retrySubjectId && feedback.hasPendingRetry && (
        <button
          className="secondary-action"
          type="button"
          data-action="retry-pdf-upload"
          // parity: 원본 renderIntakeFeedback(main.ts) 과 동일하게 retrySubjectId 사용.
          // 업로드 실패 대상 subject 가 SSoT — 현재 route subjectId 와 다를 수 있음.
          data-subject-id={feedback.retrySubjectId}
        >재시도</button>
      )}
    </div>
  );
}

function ClassDateAddForm({ subjectId, feedback, emptyText }: {
  subjectId: string;
  feedback: SubjectClassViewIntakeFeedback | null;
  emptyText: string;
}): React.ReactElement {
  return (
    <section className="class-date-add-section" aria-labelledby="class-date-add-title">
      <div>
        <p className="meta">수업일 추가</p>
        <h2 id="class-date-add-title">새 수업일 만들기</h2>
        <p className="lede">선업로드한 PDF를 나중에 정확한 날짜와 연결할 수 있도록 수업일 카드를 먼저 추가합니다.</p>
      </div>
      <form className="class-date-form" data-action="add-class-date">
        <input type="hidden" name="subjectId" defaultValue={subjectId} />
        <label>
          <span>수업일</span>
          <input name="classDate" type="date" required autoComplete="off" />
        </label>
        <label>
          <span>수업 제목</span>
          <input name="title" type="text" placeholder="예: 메모리 구조" autoComplete="off" />
        </label>
        <button className="action-button" type="submit">수업일 추가</button>
      </form>
      <IntakeFeedbackSection feedback={feedback} emptyText={emptyText} />
    </section>
  );
}

function ClassDayPdfLinks({ subjectId, card }: {
  subjectId: string;
  card: SubjectClassViewClassDayCard;
}): React.ReactElement {
  if (card.linkedPdfButtons.length === 0 && card.extraPdfCount === 0 && card.linkedMaterialCount === 0) {
    return <p className="class-day-card__empty">아직 연결된 PDF가 없습니다.</p>;
  }
  return (
    <div className="class-day-card__pdfs" aria-label="연결된 PDF">
      <p className="meta">연결 PDF</p>
      {card.linkedPdfButtons.map((btn) => (
        <button
          key={btn.materialKey}
          className="class-day-card__pdf"
          type="button"
          data-action="open-pdf-material"
          data-subject-id={subjectId}
          data-material-id={btn.materialKey}
        >
          {btn.fileName}
        </button>
      ))}
      {card.extraPdfCount > 0 && (
        <span className="class-day-card__more">외 {card.extraPdfCount}개</span>
      )}
    </div>
  );
}

function ClassDayPdfAttachControl({ subjectId, card }: {
  subjectId: string;
  card: SubjectClassViewClassDayCard;
}): React.ReactElement {
  if (!card.canManage) {
    return (
      <form
        className="class-day-card__attach"
        data-action="attach-pdf-to-week"
        data-subject-id={subjectId}
        data-week-label={card.weekLabel}
      >
        <label>
          <span>PDF 연결</span>
          <select name="materialId" disabled>
            {card.unassignedOptions.length > 0
              ? card.unassignedOptions.map((opt) => (
                <option key={opt.materialKey} value={opt.materialKey}>{opt.fileName}</option>
              ))
              : <option value="">연결 가능한 PDF 없음</option>}
          </select>
        </label>
        <button className="secondary-action" type="submit" disabled>연결</button>
        <p className="class-day-card__empty">PDF 연결은 운영자 권한이 필요합니다.</p>
      </form>
    );
  }

  if (card.unassignedOptions.length === 0) {
    return (
      <p className="class-day-card__empty">연결 가능한 미지정 PDF가 없습니다. 먼저 PDF 작업공간에서 업로드하세요.</p>
    );
  }

  return (
    <form
      className="class-day-card__attach"
      data-action="attach-pdf-to-week"
      data-subject-id={subjectId}
      data-week-label={card.weekLabel}
    >
      <label>
        <span>PDF 연결</span>
        <select name="materialId">
          {card.unassignedOptions.map((opt) => (
            <option key={opt.materialKey} value={opt.materialKey}>{opt.fileName}</option>
          ))}
        </select>
      </label>
      <button className="secondary-action" type="submit">연결</button>
    </form>
  );
}

function ClassDayCard({ subjectId, card }: {
  subjectId: string;
  card: SubjectClassViewClassDayCard;
}): React.ReactElement {
  return (
    <article className="class-day-card">
      <div>
        <p className="meta">{card.weekLabelFormatted} · {card.reviewStatusLabel}</p>
        <h3>{card.weekTitle}</h3>
        <p>{card.weekFocus}</p>
      </div>
      <div className="class-day-card__stats">
        <span>{card.linkedMaterialCount}개 PDF</span>
        <span>{card.keywordCount}개 키워드</span>
      </div>
      <ClassDayPdfLinks subjectId={subjectId} card={card} />
      <ClassDayPdfAttachControl subjectId={subjectId} card={card} />
      <div className="week-card-actions">
        <a className="action-button" href={card.weekPath}>수업 상세</a>
        <a className="secondary-link" href={card.weekSummaryPath}>요약 상세</a>
      </div>
    </article>
  );
}

function PdfClassDateOption({ opt, radioName }: {
  opt: SubjectClassViewPdfClassDateOption;
  radioName: string;
}): React.ReactElement {
  return (
    <label className={`pdf-material-card__class-date-option${opt.disabled ? " is-disabled" : ""}`}>
      <input
        className="pdf-material-card__class-date-radio"
        type="radio"
        name={radioName}
        value={opt.value}
        data-action="preview-pdf-class-date"
        data-role="pdf-class-date-option"
        data-label={opt.label}
        defaultChecked={opt.checked}
        disabled={opt.disabled}
      />
      <span className="pdf-material-card__class-date-option-label">{opt.label}</span>
    </label>
  );
}

function PdfMaterialClassDateControl({ material, subjectId }: {
  material: SubjectClassViewPdfMaterial;
  subjectId: string;
}): React.ReactElement {
  const { classDateSelectedLabel, classDateCanEdit, classDateRadioName, classDateOptions } = material;
  return (
    <div className="pdf-material-card__field">
      <span>수업일</span>
      <div className="pdf-material-card__class-date-row">
        {classDateCanEdit ? (
          <details className="pdf-material-card__class-date-picker" data-role="pdf-class-date-picker">
            <summary className="pdf-material-card__class-date-summary">
              <span data-role="pdf-class-date-current">{classDateSelectedLabel}</span>
            </summary>
            <div className="pdf-material-card__class-date-options" role="radiogroup" aria-label="수업일 선택">
              {classDateOptions.map((opt) => (
                <PdfClassDateOption key={opt.value} opt={opt} radioName={classDateRadioName} />
              ))}
            </div>
          </details>
        ) : (
          <button
            className="pdf-material-card__class-date-summary is-disabled"
            type="button"
            data-role="pdf-class-date-current"
            disabled
          >{classDateSelectedLabel}</button>
        )}
        <button
          className="secondary-action pdf-material-card__class-date-apply"
          type="button"
          data-action="assign-pdf-class-date"
          data-subject-id={subjectId}
          data-material-id={material.materialKey}
          disabled={!classDateCanEdit}
        >적용</button>
      </div>
      <small className="pdf-material-card__field-hint">
        {classDateCanEdit
          ? "날짜를 고른 뒤 적용을 눌러 저장합니다."
          : "수업일 수정은 관리자만 가능합니다."}
      </small>
    </div>
  );
}

function PdfMaterialCard({ material, subjectId, subjectTitle }: {
  material: SubjectClassViewPdfMaterial;
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
        </div>
        <PdfMaterialClassDateControl material={material} subjectId={subjectId} />
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

function UploadCard({ card, subjectId }: {
  card: SubjectClassViewUploadCard;
  subjectId: string;
}): React.ReactElement {
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
        data-subject-id={subjectId}
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

function AssignmentSection({ subjectId, subjectTitle, uploadCard, materials }: {
  subjectId: string;
  subjectTitle: string;
  uploadCard: SubjectClassViewUploadCard;
  materials: SubjectClassViewPdfMaterial[];
}): React.ReactElement {
  return (
    <section className="pdf-material-browser" aria-labelledby="pdf-assignment-title">
      <div className="pdf-material-browser__header">
        <div>
          <p className="meta">PDF 수업일 매핑</p>
          <h2 id="pdf-assignment-title">업로드한 PDF 연결</h2>
          <p className="lede">PDF는 먼저 올리고, 수업일이 확정되면 여기서 날짜를 지정합니다.</p>
        </div>
        <span className="pdf-count-pill">{materials.length}개 자료</span>
      </div>
      <div className="pdf-material-slider" aria-label={`${subjectTitle} PDF 수업일 매핑`}>
        <UploadCard card={uploadCard} subjectId={subjectId} />
        {materials.map((material) => (
          <PdfMaterialCard key={material.materialKey} material={material} subjectId={subjectId} subjectTitle={subjectTitle} />
        ))}
      </div>
    </section>
  );
}

// ─── leaf component ───────────────────────────────────────────────────────────

export function SubjectClassView(props: SubjectClassViewProps): React.ReactElement {
  const {
    subjectId,
    subjectTitle,
    intakeFeedback,
    intakeFeedbackEmptyText,
    classDayCards,
    uploadCard,
    materials,
  } = props;

  return (
    <>
      <UnitGrid props={props} />

      <ClassDateAddForm
        subjectId={subjectId}
        feedback={intakeFeedback}
        emptyText={intakeFeedbackEmptyText}
      />

      <section aria-labelledby="weekly-title">
        <p className="meta">수업일 overview</p>
        <h2 id="weekly-title">수업일별 자료</h2>
        <p className="lede">날짜별 카드에서 수업 상세, 요약 상세, 연결된 PDF 수를 확인합니다.</p>
        <div className="class-day-grid">
          {classDayCards.map((card) => (
            <ClassDayCard key={card.weekId} subjectId={subjectId} card={card} />
          ))}
        </div>
      </section>

      <AssignmentSection
        subjectId={subjectId}
        subjectTitle={subjectTitle}
        uploadCard={uploadCard}
        materials={materials}
      />
    </>
  );
}
