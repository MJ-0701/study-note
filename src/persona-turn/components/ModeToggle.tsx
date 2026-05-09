// sprint-5 S5 — mode toggle (fixture/real). plan AC8 + R7.
// real 으로 토글 시 상위 컴포넌트 (App) 가 ConsentBanner 표출 + 1초 delay 후 submit 활성.

export type Mode = "fixture" | "real";

export interface ModeToggleProps {
  mode: Mode;
  onChange: (next: Mode) => void;
  disabled?: boolean;
}

export function ModeToggle({ mode, onChange, disabled }: ModeToggleProps) {
  return (
    <fieldset
      style={{
        margin: 0,
        padding: "12px 16px",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap"
      }}
    >
      <legend style={{ padding: "0 6px", fontSize: 13, fontWeight: 600, color: "#374151" }}>
        provider 모드
      </legend>

      <label style={radioLabelStyle(mode === "fixture", disabled)}>
        <input
          type="radio"
          name="mode"
          value="fixture"
          checked={mode === "fixture"}
          onChange={() => onChange("fixture")}
          disabled={disabled}
          style={{ marginRight: 6 }}
        />
        fixture <span style={{ color: "#9ca3af", fontSize: 12 }}>(default, Anthropic 송신 0)</span>
      </label>

      <label style={radioLabelStyle(mode === "real", disabled)}>
        <input
          type="radio"
          name="mode"
          value="real"
          checked={mode === "real"}
          onChange={() => onChange("real")}
          disabled={disabled}
          style={{ marginRight: 6 }}
        />
        real <span style={{ color: "#dc2626", fontSize: 12 }}>(Claude CLI subprocess, opt-in)</span>
      </label>
    </fieldset>
  );
}

function radioLabelStyle(active: boolean, disabled?: boolean) {
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 14,
    color: disabled ? "#9ca3af" : active ? "#1f2937" : "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: active ? 600 : 400
  } as const;
}
