/**
 * smoke-cookie-jar.mjs — slice-4 helper.
 *
 * Node `fetch` 는 cookie jar 가 없으므로 Set-Cookie 응답 헤더를 수동 파싱하고
 * 다음 request 에 `Cookie:` 헤더를 자동 첨부하는 최소 jar 를 제공한다.
 *
 * 지원:
 *   - `captureFrom(response)`  Set-Cookie 헤더 (Node 19.7+ getSetCookie) 파싱 + 저장
 *   - `header()`               다음 fetch 의 `Cookie:` 헤더 값 (jar 비어있으면 undefined)
 *   - `getValue(name)`         URL-decoded cookie 값 (또는 undefined)
 *   - `setValue(name, value)`  expired/revoked session 시뮬레이션용 raw 값 inject (encode 자동)
 *   - `clear()`                jar 비움
 *
 * Max-Age=0 또는 Expires 가 과거인 Set-Cookie 는 해당 cookie 를 jar 에서 삭제한다.
 */

export function createCookieJar() {
  const store = new Map(); // name → encoded value

  function parseAttributes(raw) {
    const parts = raw.split(";").map((p) => p.trim());
    const attrs = {};
    for (let i = 1; i < parts.length; i += 1) {
      const part = parts[i];
      const eq = part.indexOf("=");
      const key = (eq === -1 ? part : part.slice(0, eq)).toLowerCase();
      const value = eq === -1 ? "" : part.slice(eq + 1).trim();
      attrs[key] = value;
    }
    return attrs;
  }

  function isExpired(attrs) {
    if (attrs["max-age"] !== undefined) {
      const n = Number(attrs["max-age"]);
      if (Number.isFinite(n) && n <= 0) return true;
    }
    if (attrs["expires"]) {
      const t = Date.parse(attrs["expires"]);
      if (Number.isFinite(t) && t <= Date.now()) return true;
    }
    return false;
  }

  return {
    captureFrom(response) {
      const setCookies =
        typeof response.headers?.getSetCookie === "function"
          ? response.headers.getSetCookie()
          : [];
      for (const raw of setCookies) {
        const firstPair = raw.split(";")[0];
        const eq = firstPair.indexOf("=");
        if (eq === -1) continue;
        const name = firstPair.slice(0, eq).trim();
        const encoded = firstPair.slice(eq + 1).trim();
        const attrs = parseAttributes(raw);
        if (isExpired(attrs)) {
          store.delete(name);
        } else {
          store.set(name, encoded);
        }
      }
    },

    header() {
      if (store.size === 0) return undefined;
      const parts = [];
      for (const [name, encoded] of store.entries()) {
        parts.push(`${name}=${encoded}`);
      }
      return parts.join("; ");
    },

    getValue(name) {
      const encoded = store.get(name);
      if (encoded === undefined) return undefined;
      try {
        return decodeURIComponent(encoded);
      } catch {
        return undefined;
      }
    },

    setValue(name, value) {
      store.set(name, encodeURIComponent(value));
    },

    clear() {
      store.clear();
    }
  };
}
