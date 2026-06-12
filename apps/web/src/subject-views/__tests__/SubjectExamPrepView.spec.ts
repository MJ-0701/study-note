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
    assert.match(src, /MPEG/);
    assert.match(src, /recursive DNS/);
    assert.match(src, /authoritative DNS/);
    assert.match(src, /DES/);
    assert.match(src, /run length coding/);
    assert.match(src, /디코더\/인코더\/MUX\/DEMUX/);
    assert.match(src, /부울대수 기본 공식/);
    assert.match(src, /문제 풀기 전 사전지식/);
    assert.match(src, /A \+ AB = A/);
    assert.match(src, /Cout = AB \+ ACin \+ BCin/);
    assert.match(src, /Toggle/);
    assert.match(src, /de-q-flipflop-types/);
    assert.match(src, /minterm/);
  });

  it("connects digital engineering to the full worked-answer workbook", () => {
    assert.match(src, /presentation:\s*"worked"/);
    assert.match(src, /htmlHref:/);
    assert.match(src, /workbook\.html/);
    assert.match(viewSrc, /전체 풀이 답안집 열기/);
    assert.match(viewSrc, /인쇄용 PDF 다운로드/);
    assert.match(viewSrc, /href=\{pdfHref\}/);
    assert.match(src, /pdfHref:/);
    assert.match(src, /information-communication\/workbook\.pdf/);
    assert.match(src, /digital-engineering\/workbook\.pdf/);
    assert.match(src, /c-language\/workbook\.pdf/);
    assert.match(src, /computer-introduction\/workbook\.pdf/);
    assert.match(viewSrc, /exam-prep-template--worked/);
    assert.match(viewSrc, /exam-prep-question-list--worked/);
    assert.match(viewSrc, /exam-prep-question--expanded/);
    assert.match(viewSrc, /ProblemBlock/);
    assert.match(viewSrc, /문제 원문/);
    assert.match(viewSrc, /<img src=\{problemSrc\}/);
    assert.match(src, /problem-images\/hint-page-2\.png/);
    assert.match(src, /problem-images\/quiz-page-5\.png/);
    assert.match(viewSrc, /href=\{markdownHref\}/);
  });
});
