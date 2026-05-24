// sprint-2026-W21-sprint-2 / layer A — pure HTML escape helper.
// main.ts 의 escapeHtml 정의 그대로 이동. 향후 layer B/C 의 다른 view
// 모듈도 같은 helper 사용.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
