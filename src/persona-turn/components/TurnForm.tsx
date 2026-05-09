import { type FormEvent, useState } from "react";

// sprint-5 S2 — turn form (AC6). subject select + query textarea + k input + submit
// button. submit disabled rule (plan AC6 lock):
//   (a) required (subject || query) 비어있으면 disabled
//   (b) submit in-flight 동안 disabled + label "전송 중..."
//   (c) real-mode consent delay 동안 disabled (S5 에서 mode toggle 결합)
//
// S2 단계의 submit 은 mock — 1초 fake delay 후 onSubmit({subject, query, k, mode:'fixture'})
// 호출. 실제 backend wire 는 S3 부터.

export interface TurnFormSubmitInput {
  subject: string;
  query: string;
  k: number;
  mode?: "fixture" | "real";
}

export interface TurnFormProps {
  /**
   * 부모가 결정. S2 = mock (1s delay), S3+ = HTTP fetch.
   */
  onSubmit: (input: TurnFormSubmitInput) => Promise<void>;
  /**
   * external disable 트리거 — 예: real consent delay 중 (S5).
   */
  externalDisabled?: boolean;
  externalDisabledLabel?: string;
}

const SUBJECTS = [
  { value: "digital-engineering", label: "디지털공학개론 (디공이)" }
];

export function TurnForm({ onSubmit, externalDisabled, externalDisabledLabel }: TurnFormProps) {
  const [subject, setSubject] = useState<string>("digital-engineering");
  const [query, setQuery] = useState<string>("");
  const [k, setK] = useState<number>(5);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const requiredEmpty = subject.trim().length === 0 || query.trim().length === 0;
  const disabled = requiredEmpty || submitting || Boolean(externalDisabled);

  let buttonLabel = "응답 받기";
  if (submitting) buttonLabel = "전송 중...";
  else if (externalDisabled && externalDisabledLabel) buttonLabel = externalDisabledLabel;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      await onSubmit({ subject, query: query.trim(), k });
    } finally {
      setSubmitting(false);
    }
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
          onChange={(e) => setSubject(e.target.value)}
          disabled={submitting}
          style={inputStyle}
        >
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <p style={hintStyle}>sprint-5 = 디지털공학개론 1과목. 4 페르소나 확장은 sprint-6+.</p>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="query" style={labelStyle}>
          질문
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 반가산기 진리표/식 핵심"
          rows={3}
          disabled={submitting}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="k" style={labelStyle}>
          retrieval k <span style={{ color: "#9ca3af", fontWeight: 400 }}>(default 5)</span>
        </label>
        <input
          id="k"
          type="number"
          min={1}
          max={20}
          value={k}
          onChange={(e) => setK(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
          disabled={submitting}
          style={{ ...inputStyle, width: 80 }}
        />
        <p style={hintStyle}>sources panel 카드 갯수 = 이 k 값과 동일.</p>
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
