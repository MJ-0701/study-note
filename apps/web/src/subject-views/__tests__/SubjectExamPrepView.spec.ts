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

  it("renders native exam-prep template sections instead of an iframe", () => {
    assert.doesNotMatch(viewSrc, /<iframe/);
    assert.doesNotMatch(viewSrc, /exam-prep-frame/);
    assert.match(viewSrc, /exam-prep-template/);
    assert.match(viewSrc, /exam-prep-question-list/);
    assert.match(viewSrc, /QuestionCard/);
  });

  it("registry carries structured workbook content for artifact subjects", () => {
    assert.match(src, /studyOrder:/);
    assert.match(src, /chapters:/);
    assert.match(src, /questions:/);
    assert.match(src, /6, 7, 8장/);
    assert.match(src, /6, 7, 8, 9장/);
    assert.match(src, /별도 PDF/);
    assert.match(src, /computer-introduction/);
    assert.match(src, /2024년도 시험문제/);
    assert.match(src, /프로그래밍언어/);
    assert.match(src, /컴파일러/);
    assert.match(src, /인터프리터/);
    assert.match(src, /회선교환/);
    assert.doesNotMatch(src, /ci-multimedia-compression/);
    assert.match(src, /디코더\/인코더\/MUX\/DEMUX/);
    assert.match(src, /de-q-flipflop-types/);
    assert.match(src, /minterm/);
  });

  it("keeps Markdown as a secondary source link only", () => {
    assert.doesNotMatch(src, /workbookHref/);
    assert.doesNotMatch(src, /workbook\.html/);
    assert.match(viewSrc, /href=\{markdownHref\}/);
  });
});
