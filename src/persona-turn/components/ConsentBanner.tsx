// sprint-5 S5 — consent banner UI. plan AC8 + R7.
// CLI stderr 의 `[디공이] real-mode (provider=claude-cli) — ...` 메시지의 화면 등가물.
// real 모드 켠 직후 1초 delay (CLI 와 동일 invariant). a11y role="alert".

export interface ConsentBannerProps {
  visible: boolean;
  delayActive: boolean;
}

export function ConsentBanner({ visible, delayActive }: ConsentBannerProps) {
  if (!visible) return null;
  return (
    <section
      role="alert"
      aria-live="polite"
      style={{
        marginTop: 16,
        padding: "12px 16px",
        border: "1px solid #fde68a",
        borderRadius: 8,
        background: "#fffbeb",
        color: "#92400e",
        fontSize: 13,
        lineHeight: 1.5
      }}
    >
      <strong>[디공이] real-mode (provider=claude-cli)</strong> — 본 turn 의 system prompt + retrieved PDF chunks 가 Claude CLI 를 통해 Anthropic API 로 송신됩니다.
      송신 안 하실 거면 위 toggle 을 fixture 로 되돌리세요.
      {delayActive && <span style={{ fontWeight: 600, marginLeft: 4 }}>(1초 후 submit 활성)</span>}
    </section>
  );
}
