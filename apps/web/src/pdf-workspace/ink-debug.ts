// iPad 펜 "두 번째 획 누락" 진단용 임시 화면 오버레이 — URL 에 ?inkdebug=1 일 때만 활성.
// prod 배포해도 query param 없으면 완전 no-op (일반 사용자 영향 0). 진단 종료 후 제거 예정.

let enabledCache: boolean | undefined;
let overlayEl: HTMLPreElement | undefined;
const lines: string[] = [];
const MAX_LINES = 24;

/** ?inkdebug 또는 #inkdebug 가 있으면 활성. 콘솔 접근 없이 iPad 주소창으로 토글. */
export function inkDebugEnabled(): boolean {
  if (enabledCache !== undefined) {
    return enabledCache;
  }
  try {
    if (typeof location === "undefined") {
      enabledCache = false;
    } else {
      enabledCache =
        new URLSearchParams(location.search).has("inkdebug") ||
        location.hash.includes("inkdebug");
    }
  } catch {
    enabledCache = false;
  }
  return enabledCache;
}

function ensureOverlay(): void {
  if (overlayEl || typeof document === "undefined" || !document.body) {
    return;
  }
  const el = document.createElement("pre");
  el.setAttribute("data-ink-debug-overlay", "true");
  el.style.cssText = [
    "position:fixed",
    "top:4px",
    "right:4px",
    "z-index:2147483647",
    "max-width:52vw",
    "max-height:64vh",
    "overflow:auto",
    "margin:0",
    "padding:6px 8px",
    "font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace",
    "background:rgba(0,0,0,0.84)",
    "color:#3cff7a",
    "white-space:pre-wrap",
    "word-break:break-all",
    "pointer-events:none",
    "border-radius:6px",
    "box-shadow:0 1px 6px rgba(0,0,0,0.4)"
  ].join(";");
  document.body.appendChild(el);
  overlayEl = el;
}

/** 진단 1줄 기록 (최신이 맨 위). 미활성이면 즉시 반환. */
export function inkDebug(line: string): void {
  if (!inkDebugEnabled()) {
    return;
  }
  const now = new Date();
  const ts = `${String(now.getSeconds()).padStart(2, "0")}.${String(
    now.getMilliseconds()
  ).padStart(3, "0")}`;
  lines.unshift(`${ts} ${line}`);
  if (lines.length > MAX_LINES) {
    lines.length = MAX_LINES;
  }
  ensureOverlay();
  if (overlayEl) {
    overlayEl.textContent = lines.join("\n");
  }
}
