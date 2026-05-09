import { type FormEvent, useState } from "react";

// sprint-5 — turn form (Gate 6 round 2 polish: submitting state lifted to App,
// onFormChange callback for stale-clear). plan AC6 disabled rule:
//   (a) required (subject || query) 비어있으면 disabled
//   (b) submit in-flight (App 의 isSubmitting → externalDisabled) 동안 disabled
//   (c) real consent delay (App 의 consentDelayActive → externalDisabled) 동안 disabled

export interface TurnFormSubmitInput {
  subject: string;
  query: string;
  k: number;
  mode?: "fixture" | "real";
}

export interface TurnFormProps {
  onSubmit: (input: TurnFormSubmitInput) => Promise<void>;
  /**
   * any input change → 부모가 stale result/error clear (Gate 6 round 1 finding 1).
   */
  onFormChange?: () => void;
  /**
   * 부모가 lift 한 submit in-flight state. true 면 모든 input + button disabled.
   */
  submitting?: boolean;
  /**
   * 외부 disable trigger — consent delay / 부모 결정.
   */
  externalDisabled?: boolean;
  externalDisabledLabel?: string;
}

const SUBJECTS = [{ value: "digital-engineering", label: "디지털공학개론 (디공이)" }];

export function TurnForm({
  onSubmit,
  onFormChange,
  submitting,
  externalDisabled,
  externalDisabledLabel
}: TurnFormProps) {
  const [subject, setSubject] = useState<string>("digital-engineering");
  const [query, setQuery] = useState<string>("");
  const [k, setK] = useState<number>(5);

  const requiredEmpty = subject.trim().length === 0 || query.trim().length === 0;
  const inputsDisabled = Boolean(submitting);
  const disabled = requiredEmpty || inputsDisabled || Boolean(externalDisabled);

  let buttonLabel = "응답 받기";
  if (submitting) {
    buttonLabel = externalDisabledLabel ?? "전송 중...";
  } else if (externalDisabled && externalDisabledLabel) {
    buttonLabel = externalDisabledLabel;
  }

  function notifyChange() {
    onFormChange?.();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    await onSubmit({ subject, query: query.trim(), k });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#ffffff"
      }}
    >
      <div style={fieldStyle}>
        <label htmlFor="subject" style={labelStyle}>
          과목
        </label>
        <select
          id="subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            notifyChange();
          }}
          disabled={inputsDisabled}
          style={inputStyle}
        >
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="query" style={labelStyle}>
          질문
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            notifyChange();
          }}
          placeholder="예: 반가산기 진리표/식 핵심"
          rows={3}
          disabled={inputsDisabled}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="k" style={labelStyle}>
          출처 chunk 갯수 <span style={{ color: "#9ca3af", fontWeight: 400 }}>(default 5)</span>
        </label>
        <input
          id="k"
          type="number"
          min={1}
          max={20}
          value={k}
          onChange={(e) => {
            setK(Math.max(1, Number.parseInt(e.target.value, 10) || 1));
            notifyChange();
          }}
          disabled={inputsDisabled}
          style={{ ...inputStyle, width: 80 }}
        />
      </div>

      <button
        type="submit"
        disabled={disabled}
        aria-disabled={disabled}
        style={{
          padding: "10px 20px",
          fontSize: 15,
          fontWeight: 600,
          color: disabled ? "#9ca3af" : "#ffffff",
          background: disabled ? "#e5e7eb" : "#3b82f6",
          border: "none",
          borderRadius: 6,
          cursor: disabled ? "not-allowed" : "pointer",
          alignSelf: "flex-start",
          transition: "background 0.15s ease"
        }}
      >
        {buttonLabel}
      </button>

      {requiredEmpty && (
        <p style={{ ...hintStyle, color: "#dc2626", margin: 0 }}>
          과목 + 질문은 필수입니다.
        </p>
      )}
    </form>
  );
}

const fieldStyle = { display: "flex", flexDirection: "column" as const, gap: 6 };
const labelStyle = { fontSize: 14, fontWeight: 600, color: "#374151" };
const inputStyle = {
  padding: "8px 12px",
  fontSize: 14,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#ffffff",
  color: "#1f2937"
};
const hintStyle = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "#6b7280"
};
