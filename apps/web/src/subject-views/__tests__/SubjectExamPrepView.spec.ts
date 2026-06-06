// SubjectExamPrepView 정적 소스 검증 spec.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../SubjectExamPrepView.tsx", import.meta.url), "utf8");

describe("SubjectExamPrepView 정적 소스 검증", () => {
  it("pure-props: no hooks or store subscriptions", () => {
    assert.doesNotMatch(src, /\buseState\b/);
    assert.doesNotMatch(src, /\buseEffect\b/);
    assert.doesNotMatch(src, /\buseStore\b/);
    assert.doesNotMatch(src, /from ["']zustand/);
  });

  it("no dangerouslySetInnerHTML", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
  });

  it("exports props, lookup helper, and leaf component", () => {
    assert.match(src, /export interface SubjectExamPrepViewProps/);
    assert.match(src, /export function getSubjectExamPrepArtifact/);
    assert.match(src, /export function SubjectExamPrepView/);
  });

  it("renders embedded workbook iframe and static artifact links", () => {
    assert.match(src, /exam-prep-frame/);
    assert.match(src, /\/exam-prep\/information-communication\/workbook\.html/);
    assert.match(src, /\/exam-prep\/digital-engineering\/workbook\.html/);
    assert.match(src, /\/exam-prep\/c-language\/workbook\.html/);
  });

  it("sandboxes embedded workbook scripts away from the app origin", () => {
    assert.match(src, /sandbox=""/);
  });
});
