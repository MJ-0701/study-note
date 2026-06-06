// SubjectExamPrepView 정적 소스 검증 spec.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const viewSrc = readFileSync(new URL("../SubjectExamPrepView.tsx", import.meta.url), "utf8");
const artifactSrc = readFileSync(new URL("../subject-exam-prep-artifacts.ts", import.meta.url), "utf8");
const src = `${viewSrc}\n${artifactSrc}`;

describe("SubjectExamPrepView / artifact registry 정적 소스 검증", () => {
  it("pure-props: no hooks or store subscriptions", () => {
    assert.doesNotMatch(viewSrc, /\buseState\b/);
    assert.doesNotMatch(viewSrc, /\buseEffect\b/);
    assert.doesNotMatch(viewSrc, /\buseStore\b/);
    assert.doesNotMatch(viewSrc, /from ["']zustand/);
  });

  it("no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(viewSrc, /dangerouslySetInnerHTML/);
  });

  it("exports props, lookup helper, and leaf component", () => {
    assert.match(viewSrc, /export interface SubjectExamPrepViewProps/);
    assert.match(src, /export function getSubjectExamPrepArtifact/);
    assert.match(src, /export function hasSubjectExamPrepArtifact/);
    assert.match(viewSrc, /export function SubjectExamPrepView/);
  });

  it("renders embedded workbook iframe and static artifact links", () => {
    assert.match(viewSrc, /exam-prep-frame/);
    assert.match(src, /\/exam-prep\/information-communication\/workbook\.html/);
    assert.match(src, /\/exam-prep\/digital-engineering\/workbook\.html/);
    assert.match(src, /\/exam-prep\/c-language\/workbook\.html/);
  });

  it("sandboxes embedded workbook scripts away from the app origin", () => {
    assert.match(src, /sandbox=""/);
  });

  it("does not expose same-origin workbook HTML through a new-tab link", () => {
    assert.doesNotMatch(viewSrc, /href=\{workbookHref\}[^>]*target="_blank"/s);
    assert.match(viewSrc, /href=\{markdownHref\}/);
  });
});
