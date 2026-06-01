// Shared React leaf for S4b-2 subject-class and S4c pdf-workspaces islands.
// Props only, hook 0. data-action delegation and uncontrolled radio parity are preserved.

export interface PdfMaterialCardClassDateOption {
  value: string;
  label: string;
  checked: boolean;
  disabled: boolean;
}

export interface PdfMaterialCardMaterial {
  materialKey: string;
  fileName: string;
  fileSize: string;
  pageCount: number;
  statusLabel: string;
  ownerLabel: string;
  classDateLabel: string;
  classDateIsUnconfirmed: boolean;
}

export interface PdfMaterialCardMaterialWithClassDateControl extends PdfMaterialCardMaterial {
  classDateSelectedLabel: string;
  classDateCanEdit: boolean;
  classDateRadioName: string;
  classDateOptions: PdfMaterialCardClassDateOption[];
}

type PdfMaterialCardProps =
  | {
    material: PdfMaterialCardMaterialWithClassDateControl;
    subjectId: string;
    subjectTitle: string;
    showClassDateControl: true;
  }
  | {
    material: PdfMaterialCardMaterial;
    subjectId: string;
    subjectTitle: string;
    showClassDateControl?: false;
  };

function PdfClassDateOption({ opt, radioName }: {
  opt: PdfMaterialCardClassDateOption;
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
  material: PdfMaterialCardMaterialWithClassDateControl;
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
                // key 에 checked 포함: 적용 후 같은 카드(materialKey) 재렌더 시 selectedValue
                // 변경되면 영향받은 option 의 key 변경 -> remount -> defaultChecked 재적용.
                // uncontrolled radio 의 defaultChecked 는 update 시 무시되는 React 동작 보정.
                <PdfClassDateOption key={`${opt.value}:${opt.checked}`} opt={opt} radioName={classDateRadioName} />
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

export function PdfMaterialCard(props: PdfMaterialCardProps): React.ReactElement {
  const { material, subjectId, subjectTitle } = props;
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
        {props.showClassDateControl && (
          <PdfMaterialClassDateControl material={props.material} subjectId={subjectId} />
        )}
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
