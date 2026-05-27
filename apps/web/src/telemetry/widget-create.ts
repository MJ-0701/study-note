// 운영지표 v2 / S5 / AC4 — widget create FE telemetry beacon.
// fire-and-forget POST. 실패 시 console.warn 만, UX 영향 0. session cookie 가
// 빠져 있으면 BE 가 401 — 그대로 swallow (anonymous user 의 widget 은 metric 외).

export type WidgetKind = "chart" | "table" | "star" | "drill" | "eraser";

const ENDPOINT = "/v1/telemetry/widget-create";

/** Fire-and-forget telemetry beacon. Never throws, never blocks render. */
export function emitWidgetCreate(apiBaseUrl: string, kind: WidgetKind): void {
  try {
    const url = `${apiBaseUrl}${ENDPOINT}`;
    void fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
      keepalive: true
    }).catch((err: unknown) => {
      console.warn(
        `[telemetry] widget-create beacon failed kind=${kind} err=${(err as Error).message}`
      );
    });
  } catch (err) {
    console.warn(
      `[telemetry] widget-create beacon throw kind=${kind} err=${(err as Error).message}`
    );
  }
}
