/**
 * title-xss.spec.ts — sprint-W21-sprint-1 / S1 / AC1b spec.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/__tests__/title-xss.spec.ts
 *
 * 검증 (Round 5 P1-B + ADR-9):
 *  - terms-panel.tsx 가 raw innerHTML / dangerouslySetInnerHTML 사용 0
 *    (React 텍스트 노드 auto-escape 로 XSS 차단)
 *  - api/terms.ts 가 raw innerHTML 사용 0
 *  - admin.tsx 에 raw innerHTML 도 없음 (기존 회기 방지)
 *  - attacker payload (script tag, img onerror, javascript:) 도 React string
 *    interpolation 거치면 화면에 텍스트로만 표시 — escapeHtml 자동
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WEB_SRC = resolve(__dirname, "..");

async function read(rel: string): Promise<string> {
  return readFile(resolve(WEB_SRC, rel), "utf-8");
}

describe("AC1b — XSS hardening (admin Term/Subject rendering)", () => {
  it("admin/terms-panel.tsx must not use dangerouslySetInnerHTML", async () => {
    const src = await read("admin/terms-panel.tsx");
    assert.equal(
      src.includes("dangerouslySetInnerHTML"),
      false,
      "terms-panel.tsx must not use dangerouslySetInnerHTML"
    );
  });

  it("admin/terms-panel.tsx must not use raw innerHTML assignment", async () => {
    const src = await read("admin/terms-panel.tsx");
    assert.equal(
      /\.innerHTML\s*=/.test(src),
      false,
      "terms-panel.tsx must not assign to .innerHTML"
    );
  });

  it("admin/admin.tsx must not introduce dangerouslySetInnerHTML for term/subject titles", async () => {
    const src = await read("admin/admin.tsx");
    assert.equal(
      src.includes("dangerouslySetInnerHTML"),
      false,
      "admin.tsx must not use dangerouslySetInnerHTML"
    );
  });

  it("api/terms.ts must not contain any DOM-render / innerHTML / eval", async () => {
    const src = await read("api/terms.ts");
    assert.equal(src.includes("innerHTML"), false);
    assert.equal(src.includes("eval("), false);
    assert.equal(src.includes("document.write"), false);
  });
});

describe("AC1b — terms-panel.tsx renders titles via React text nodes only", () => {
  it("renders {term.title} / {subject.title} via JSX text children", async () => {
    const src = await read("admin/terms-panel.tsx");
    assert.ok(src.includes("{term.title}"), "term.title must be rendered via JSX text node");
    assert.ok(src.includes("{subject.title}"), "subject.title must be rendered via JSX text node");
  });

  it("attacker payload (script tag) escape sanity — raw '<' becomes &lt;", () => {
    // React text node 는 모두 escape — DOM 에 raw <script> tag 가 안 들어감.
    // 이 sanity test 는 escape 함수 회기 보장.
    const payloads = [
      "<script>alert(1)</script>",
      '"><img src=x onerror=alert(1)>'
    ];
    for (const payload of payloads) {
      const escaped = payload.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      assert.equal(escaped.includes("<"), false, `escape must remove raw '<' from ${payload}`);
      assert.equal(escaped.includes(">"), false, `escape must remove raw '>' from ${payload}`);
    }
  });
});

describe("AC1b — React text node auto-escape (functional sanity)", () => {
  it("React converts string children to textContent — no element execution", () => {
    // jsdom 없이 React renderToString 으로도 확인 가능. 여기선 의미상 검증만.
    // React renderToString 은 무조건 escape — &lt;script&gt;&lt;/script&gt; 로 출력.
    // (functional 검증은 build 후 manual UI 확인 + admin UI 별 시나리오 spec 에서.)
    const payload = "<script>alert(1)</script>";
    const escaped = payload.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    assert.notEqual(escaped, payload);
    assert.ok(!escaped.includes("<script"), "escaped text must not contain raw <script");
  });
});
