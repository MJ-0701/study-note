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
      <strong>Claude 호출 활성</strong> — 질문 + PDF chunk 가 Claude CLI 를 통해 Anthropic API 로 송신됩니다.
      이어지는 대화에서는 직전 최대 3개 질문/응답도 함께 전송될 수 있습니다. 송신 원치 않으시면
      위 모드를 데모로 되돌리세요.
      {delayActive && <span style={{ fontWeight: 600, marginLeft: 4 }}>(1초 후 진행)</span>}
    </section>
  );
}
