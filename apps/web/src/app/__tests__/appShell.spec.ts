/**
 * appShell.spec.ts — sprint-2026-W21-sprint-2 / layer A AC9.
 *
 * XSS escape invariant + TrustedHtml 이중 escape 회귀 가드 (DOMParser
 * 기반 assertion, substring grep 회피 — Gate 3 self round-4 P1 반영).
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/app/__tests__/appShell.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-ignore — linkedom 가 dev dep 인 경우 type 누락 가능. runtime import.
import { parseHTML } from "linkedom";
import {
  renderShell,
  type AppShellContext
} from "../appShell.ts";

const baseCtx: AppShellContext = {
  displayName: "Tester",
  notebookUpdatedAt: "2026-05-25",
  notebookStorageError: null,
  syncBackendError: null,
  hotkeyHelpModalOpen: false,
  activePdfWorkspaceSubjectId: null
};

const TRUSTED_SIDEBAR = `<aside class="sidebar"><div data-test="trusted-sidebar">SB</div></aside>`;
const TRUSTED_MAIN = `<section><div data-test="trusted-main">MC</div></section>`;

function parseShell(html: string): Document {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  return document;
}

describe("renderShell — AC9 XSS escape invariant (DOM-parsed)", () => {
  // Payload A — script element injection.
  it("payload A: <script>alert(1)</script> in displayName produces no executable <script>", () => {
    const ctx: AppShellContext = { ...baseCtx, displayName: "<script>alert(1)</script>" };
    const out = renderShell(TRUSTED_SIDEBAR, TRUSTED_MAIN, "home", ctx);
    const doc = parseShell(out);
    const scripts = Array.from(doc.querySelectorAll("script"));
    // injected payload 의 script element 가 DOM tree 에 등장하지 않아야 한다.
    assert.equal(scripts.length, 0, "no <script> in parsed shell DOM");
  });

  it("payload A in notebookStorageError produces no executable <script>", () => {
    const ctx: AppShellContext = {
      ...baseCtx,
      notebookStorageError: "<script>alert(1)</script>"
    };
    const out = renderShell(TRUSTED_SIDEBAR, TRUSTED_MAIN, "home", ctx);
    const doc = parseShell(out);
    assert.equal(doc.querySelectorAll("script").length, 0);
  });

  it("payload A in crumb produces no executable <script>", () => {
    const out = renderShell(
      TRUSTED_SIDEBAR,
      TRUSTED_MAIN,
      "<script>alert(1)</script>",
      baseCtx
    );
    const doc = parseShell(out);
    assert.equal(doc.querySelectorAll("script").length, 0);
  });

  // Payload B — img onerror attribute injection.
  it("payload B: <img src=x onerror=...> in displayName produces no executable image attribute", () => {
    const ctx: AppShellContext = {
      ...baseCtx,
      displayName: '<img src=x onerror=alert(1)>'
    };
    const out = renderShell(TRUSTED_SIDEBAR, TRUSTED_MAIN, "home", ctx);
    const doc = parseShell(out);
    assert.equal(doc.querySelectorAll('img[onerror], img[src="x"]').length, 0);
    assert.equal(doc.querySelectorAll('*[onerror]').length, 0);
  });

  it("payload B in notebookStorageError produces no executable image", () => {
    const ctx: AppShellContext = {
      ...baseCtx,
      notebookStorageError: '<img src=x onerror=alert(1)>'
    };
    const out = renderShell(TRUSTED_SIDEBAR, TRUSTED_MAIN, "home", ctx);
    const doc = parseShell(out);
    assert.equal(doc.querySelectorAll('img[onerror], *[onerror]').length, 0);
  });

  it("payload B in crumb produces no executable image", () => {
    const out = renderShell(
      TRUSTED_SIDEBAR,
      TRUSTED_MAIN,
      '<img src=x onerror=alert(1)>',
      baseCtx
    );
    const doc = parseShell(out);
    assert.equal(doc.querySelectorAll('img[onerror], *[onerror]').length, 0);
  });

  // Payload C — javascript: URL attribute (executable URL context).
  it("payload C: javascript:alert(1) in displayName produces no executable href/src", () => {
    const ctx: AppShellContext = {
      ...baseCtx,
      displayName: 'javascript:alert(1)'
    };
    const out = renderShell(TRUSTED_SIDEBAR, TRUSTED_MAIN, "home", ctx);
    const doc = parseShell(out);
    const dangerous = doc.querySelectorAll(
      'a[href^="javascript:"], img[src^="javascript:"], *[src^="javascript:"], *[href^="javascript:"]'
    );
    assert.equal(dangerous.length, 0);
    // 평문 text context 의 `javascript:` literal 자체는 escapeHtml 책임
    // 밖이라 허용 — text 으로 출력될 뿐 실행되지 않음.
  });
});

describe("renderShell — TrustedHtml 이중 escape 회귀 가드", () => {
  it("sidebar = trusted HTML 그대로 element 로 mount", () => {
    const out = renderShell(TRUSTED_SIDEBAR, TRUSTED_MAIN, "home", baseCtx);
    const doc = parseShell(out);
    const sidebarEl = doc.querySelector('[data-test="trusted-sidebar"]');
    assert.ok(sidebarEl, "sidebar trusted HTML element must exist in DOM");
    assert.equal(sidebarEl?.textContent, "SB");
  });

  it("mainContent = trusted HTML 그대로 element 로 mount", () => {
    const out = renderShell(TRUSTED_SIDEBAR, TRUSTED_MAIN, "home", baseCtx);
    const doc = parseShell(out);
    const mainEl = doc.querySelector('[data-test="trusted-main"]');
    assert.ok(mainEl, "mainContent trusted HTML element must exist in DOM");
    assert.equal(mainEl?.textContent, "MC");
  });
});
