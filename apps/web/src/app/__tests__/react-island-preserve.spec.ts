/**
 * react-island-preserve.spec.ts — S1a/WU2a React island 생존 검증.
 *
 * shouldPreserveReactIsland 순수 함수 + renderInto morphdom round-trip 에서
 * data-react-island subtree 가 살아남는지 characterization. linkedom + globalThis
 * 주입으로 morphdom 이 Node 런타임에서 동작하도록 설정.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/app/__tests__/react-island-preserve.spec.ts
 *
 * 주의: tsconfig 가 spec 파일을 exclude 하므로 `pnpm exec tsc --noEmit` 은
 * 본 파일을 검사하지 않는다. 타입 정확성은 spec 내 캐스팅으로 직접 표현.
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
// @ts-ignore — linkedom 타입 선언이 없는 경우 ignore
import { parseHTML, HTMLElement, Element, Node, Comment, Text } from "linkedom";

// ─── linkedom 전역 설정 (morphdom 이 HTMLElement 등을 전역에서 참조) ──────────
//
// morphdom 은 `instanceof HTMLElement` 체크를 전역 `HTMLElement` 로 수행.
// DOM lib 타입 충돌 방지를 위해 Record<string, unknown> 캐스팅 사용
// (pdf-library.spec.ts 패턴 동일).
const g = globalThis as Record<string, unknown>;
g["HTMLElement"] = HTMLElement;
g["Element"] = Element;
g["Node"] = Node;
g["Comment"] = Comment;
g["Text"] = Text;

// ─── linkedom document 설정 ───────────────────────────────────────────────
const { document: linkedomDoc } = parseHTML(
  "<!doctype html><html><body><div id=\"app-root\"></div></body></html>"
);
g["document"] = linkedomDoc;

// ─── appShell 동적 import (globalThis 설정 완료 후) ──────────────────────
//
// appShell 이 import 되는 시점에 morphdom 도 함께 로드되므로
// 전역 설정 이후에 import 해야 한다.
const { renderInto, shouldPreserveReactIsland } = await import("../appShell.ts");

// ─── 헬퍼 ────────────────────────────────────────────────────────────────

function makeIslandEl(key: string): HTMLElement {
  const el = linkedomDoc.createElement("div") as HTMLElement;
  el.setAttribute("data-react-island", key);
  return el;
}

function makeAppRoot(): HTMLElement {
  const root = linkedomDoc.createElement("div") as HTMLElement;
  root.id = `app-root-${Math.random().toString(36).slice(2)}`;
  return root;
}

// ─── shouldPreserveReactIsland 순수 함수 ─────────────────────────────────

describe("shouldPreserveReactIsland — 순수 함수 단위", () => {
  it("둘 다 동일한 data-react-island 값('pdf-toolbar') → true", () => {
    const from = makeIslandEl("pdf-toolbar");
    const to = makeIslandEl("pdf-toolbar");
    assert.equal(shouldPreserveReactIsland(from, to), true);
  });

  // S3: home/intake island 키 보존 케이스
  it("S3: 'home' island — from/to 동일 key → true", () => {
    const from = makeIslandEl("home");
    const to = makeIslandEl("home");
    assert.equal(shouldPreserveReactIsland(from, to), true);
  });

  it("S3: 'intake' island — from/to 동일 key → true", () => {
    const from = makeIslandEl("intake");
    const to = makeIslandEl("intake");
    assert.equal(shouldPreserveReactIsland(from, to), true);
  });

  it("S3: 'home' vs 'intake' — 다른 key → false", () => {
    const from = makeIslandEl("home");
    const to = makeIslandEl("intake");
    assert.equal(shouldPreserveReactIsland(from, to), false);
  });

  it("값이 다름('pdf-toolbar' vs 'other') → false", () => {
    const from = makeIslandEl("pdf-toolbar");
    const to = makeIslandEl("other");
    assert.equal(shouldPreserveReactIsland(from, to), false);
  });

  it("fromEl 에 data-react-island 없음 → false", () => {
    const from = linkedomDoc.createElement("div") as HTMLElement;
    const to = makeIslandEl("pdf-toolbar");
    assert.equal(shouldPreserveReactIsland(from, to), false);
  });

  it("toEl 에 data-react-island 없음 → false", () => {
    const from = makeIslandEl("pdf-toolbar");
    const to = linkedomDoc.createElement("div") as HTMLElement;
    assert.equal(shouldPreserveReactIsland(from, to), false);
  });

  it("fromEl 이 Text 노드 — non-HTMLElement 캐스팅 가드 → false", () => {
    const textNode = linkedomDoc.createTextNode("x");
    const to = makeIslandEl("pdf-toolbar");
    // Element 타입으로 캐스팅해 전달 (캐스팅 가드 코드패스 검증)
    assert.equal(
      shouldPreserveReactIsland(textNode as unknown as Element, to),
      false
    );
  });

  it("toEl 이 Comment 노드 — non-HTMLElement 캐스팅 가드 → false", () => {
    const from = makeIslandEl("pdf-toolbar");
    const commentNode = linkedomDoc.createComment("c");
    assert.equal(
      shouldPreserveReactIsland(from, commentNode as unknown as Element),
      false
    );
  });
});

// ─── morphdom round-trip island 생존 ─────────────────────────────────────

describe("renderInto morphdom round-trip — React island 자식 생존", () => {
  it("island 자식이 2차 renderInto 후에도 살아있다 (WU2a 핵심 acceptance)", () => {
    const appRoot = makeAppRoot();
    const sink = { appRoot, postMountEffects: [] };

    // 1차 렌더: island div 포함
    renderInto(
      '<div id="pdf-toolbar-island" data-react-island="pdf-toolbar"></div>',
      sink
    );

    const island = appRoot.querySelector("#pdf-toolbar-island") as HTMLElement | null;
    assert.ok(island !== null, "1차 렌더 후 island 가 존재해야 한다");

    // React portal 이 children 을 채웠다고 가정 — 수동으로 자식 삽입
    const marker = linkedomDoc.createElement("span");
    marker.setAttribute("data-marker", "react-owned");
    island!.appendChild(marker);
    assert.equal(island!.childNodes.length, 1, "자식 삽입 전제 확인");

    // 2차 렌더: children 비어있는 island (React 는 hydrate 후 children 직접 관리)
    renderInto(
      '<div id="pdf-toolbar-island" data-react-island="pdf-toolbar"></div>',
      sink
    );

    const islandAfter = appRoot.querySelector("#pdf-toolbar-island") as HTMLElement | null;
    assert.ok(islandAfter !== null, "2차 렌더 후 island 가 존재해야 한다");

    // 핵심 단언: morphdom 이 island subtree 를 skip 했으므로 자식이 살아있어야 한다
    assert.equal(
      islandAfter!.childNodes.length,
      1,
      "morphdom 이 island subtree 를 skip 해 React 자식이 살아있어야 한다"
    );
    const survivedMarker = islandAfter!.querySelector("[data-marker='react-owned']");
    assert.ok(survivedMarker !== null, "삽입한 marker span 이 보존되어야 한다");
  });

  it("대조군: data-react-island 없는 일반 div 는 morphdom 이 children 동기화(자식 wipe)", () => {
    const appRoot = makeAppRoot();
    const sink = { appRoot, postMountEffects: [] };

    // 1차 렌더: 일반 div (island 아님)
    renderInto('<div id="plain-div"></div>', sink);

    const plain = appRoot.querySelector("#plain-div") as HTMLElement | null;
    assert.ok(plain !== null, "1차 렌더 후 plain div 가 존재해야 한다");

    // 자식 삽입
    const child = linkedomDoc.createElement("span");
    plain!.appendChild(child);
    assert.equal(plain!.childNodes.length, 1, "자식 삽입 전제 확인");

    // 2차 렌더: 동일 id, children 없음
    renderInto('<div id="plain-div"></div>', sink);

    const plainAfter = appRoot.querySelector("#plain-div") as HTMLElement | null;
    assert.ok(plainAfter !== null, "2차 렌더 후 plain div 가 존재해야 한다");

    // 핵심 단언: island 규칙이 적용되지 않아 morphdom 이 children 을 동기화(wipe)
    assert.equal(
      plainAfter!.childNodes.length,
      0,
      "island 규칙 없이는 morphdom 이 children 을 wipe 해야 한다 (preserve 규칙의 island 한정 증명)"
    );
  });

  // S3: home/intake island morphdom round-trip 생존
  it("S3: home island(id=home-island) — 2차 renderInto 후 React 자식 생존", () => {
    const appRoot = makeAppRoot();
    const sink = { appRoot, postMountEffects: [] };

    renderInto(
      '<div id="home-island" data-react-island="home" style="display:contents"></div>',
      sink
    );

    const island = appRoot.querySelector("#home-island") as HTMLElement | null;
    assert.ok(island !== null, "1차 렌더 후 home island 존재");

    const marker = linkedomDoc.createElement("span");
    marker.setAttribute("data-marker", "home-react-owned");
    island!.appendChild(marker);

    renderInto(
      '<div id="home-island" data-react-island="home" style="display:contents"></div>',
      sink
    );

    const islandAfter = appRoot.querySelector("#home-island") as HTMLElement | null;
    assert.ok(islandAfter !== null, "2차 렌더 후 home island 존재");
    assert.equal(islandAfter!.childNodes.length, 1, "React 자식 생존");
    assert.ok(
      islandAfter!.querySelector("[data-marker='home-react-owned']") !== null,
      "marker span 보존"
    );
  });

  it("S3: intake island(id=intake-island) — 2차 renderInto 후 React 자식 생존", () => {
    const appRoot = makeAppRoot();
    const sink = { appRoot, postMountEffects: [] };

    renderInto(
      '<div id="intake-island" data-react-island="intake" style="display:contents"></div>',
      sink
    );

    const island = appRoot.querySelector("#intake-island") as HTMLElement | null;
    assert.ok(island !== null, "1차 렌더 후 intake island 존재");

    const marker = linkedomDoc.createElement("span");
    marker.setAttribute("data-marker", "intake-react-owned");
    island!.appendChild(marker);

    renderInto(
      '<div id="intake-island" data-react-island="intake" style="display:contents"></div>',
      sink
    );

    const islandAfter = appRoot.querySelector("#intake-island") as HTMLElement | null;
    assert.ok(islandAfter !== null, "2차 렌더 후 intake island 존재");
    assert.equal(islandAfter!.childNodes.length, 1, "React 자식 생존");
    assert.ok(
      islandAfter!.querySelector("[data-marker='intake-react-owned']") !== null,
      "marker span 보존"
    );
  });

  it("S3: LegacyView children 불변 — home/intake island 이외 자식은 영향 없음", () => {
    const appRoot = makeAppRoot();
    const sink = { appRoot, postMountEffects: [] };

    // LegacyView 영역에 일반 content div + home island 공존
    renderInto(
      '<div id="sidebar-content">사이드바</div>' +
      '<div id="home-island" data-react-island="home" style="display:contents"></div>',
      sink
    );

    const sidebar = appRoot.querySelector("#sidebar-content") as HTMLElement | null;
    assert.ok(sidebar !== null, "사이드바 존재");
    // island 에 React children 삽입
    const homeIsland = appRoot.querySelector("#home-island") as HTMLElement | null;
    const marker = linkedomDoc.createElement("span");
    marker.setAttribute("data-marker", "react-child");
    homeIsland!.appendChild(marker);

    // 재렌더: 사이드바 내용 변경, island placeholder 동일
    renderInto(
      '<div id="sidebar-content">사이드바 업데이트</div>' +
      '<div id="home-island" data-react-island="home" style="display:contents"></div>',
      sink
    );

    // 사이드바는 morphdom 이 업데이트
    const sidebarAfter = appRoot.querySelector("#sidebar-content");
    assert.ok(sidebarAfter?.textContent?.includes("업데이트"), "사이드바 morphdom 업데이트");
    // island React children 은 보존
    const islandAfter = appRoot.querySelector("#home-island");
    assert.ok(
      islandAfter?.querySelector("[data-marker='react-child']") !== null,
      "island React children 보존"
    );
  });
});
