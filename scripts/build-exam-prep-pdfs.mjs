import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { marked } from "marked";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = path.join(repoRoot, "apps/web/public/exam-prep");
const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const subjectPrintJobs = [
  { id: "information-communication", label: "정보통신개론" },
  { id: "digital-engineering", label: "디지털공학개론", generateStaticWorkbook: true, useMarkdownWorkbook: true },
  { id: "c-language", label: "C언어" },
  { id: "computer-introduction", label: "컴퓨터개론", generateStaticWorkbook: true },
];

const sharedCss = `
  :root {
    color-scheme: light;
    --ink: #171717;
    --muted: #60646c;
    --line: #d6d9de;
    --paper: #fff;
    --accent: #0f766e;
    --soft: #eef7f5;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 16px/1.62 -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif;
    color: var(--ink);
    background: #f7f7f4;
  }
  main {
    max-width: 920px;
    margin: 0 auto;
    padding: 32px 20px 72px;
    background: var(--paper);
    min-height: 100vh;
  }
  h1 { font-size: 30px; margin: 0 0 18px; }
  h2 { font-size: 22px; margin: 36px 0 12px; padding-top: 20px; border-top: 1px solid var(--line); }
  h3 { font-size: 18px; margin: 22px 0 8px; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0 16px; font-size: 15px; }
  th, td { border: 1px solid var(--line); padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: #f3f4f1; }
  code, pre { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
  pre { background: #f8faf9; border: 1px solid var(--line); border-radius: 8px; overflow: auto; padding: 10px 12px; }
  main img { display: block; width: 100%; height: auto; border: 1px solid var(--line); border-radius: 8px; background: #fff; margin: 10px 0 18px; }
  .meta { color: var(--muted); }
`;

const printCss = `
  @page { size: A4; margin: 12mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff !important; }
  body { font-size: 12px !important; line-height: 1.48 !important; }
  main {
    background: #fff !important;
    box-shadow: none !important;
    margin: 0 !important;
    max-width: none !important;
    min-height: auto !important;
    padding: 0 !important;
    width: 100% !important;
  }
  h1 { font-size: 22px !important; break-after: avoid; }
  h2 { font-size: 17px !important; margin-top: 20px !important; padding-top: 14px !important; break-after: avoid; }
  h3 { font-size: 14px !important; margin-top: 14px !important; break-after: avoid; }
  table, pre, blockquote, .concept-card, .explanation, .exam-prep-problem, figure { break-inside: avoid; }
  pre { white-space: pre-wrap !important; word-break: break-word !important; }
  a { color: inherit !important; text-decoration: none !important; }
  button, form, .concept-actions, .question-actions { display: none !important; }
  img {
    break-inside: avoid;
    max-height: 165mm;
    object-fit: contain;
  }
`;

const artifacts = await import("../apps/web/src/subject-views/subject-exam-prep-artifacts.ts");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function artifactToMarkdown(artifact, subjectLabel) {
  const lines = [
    `# ${artifact.title}`,
    "",
    `기준 자료: ${artifact.sourceLabel}`,
    "",
    artifact.note,
    "",
    "## 시험 전 반복 루틴",
    "",
    ...artifact.studyOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## 시험 기준 챕터",
    "",
  ];

  for (const chapter of artifact.chapters) {
    lines.push(`### ${chapter.label} ${chapter.title}`);
    lines.push("");
    lines.push(`- 집중: ${chapter.focus}`);
    lines.push(`- 단서: ${chapter.sourceHint}`);
    lines.push("");
  }

  lines.push("## 선행개념");
  lines.push("");

  for (const concept of artifact.concepts) {
    lines.push(`### ${concept.title}`);
    lines.push("");
    lines.push(...concept.points.map((point) => `- ${point}`));
    lines.push("");
  }

  lines.push("## 문항별 풀이 확인");
  lines.push("");

  artifact.questions.forEach((question, index) => {
    lines.push(`### ${index + 1}. ${question.title}`);
    lines.push("");
    lines.push(`우선도: ${question.priority} / 태그: ${question.tags.join(", ")}`);
    lines.push("");
    lines.push("**시험 답안**");
    lines.push("");
    lines.push(...question.answer.map((line) => `- ${line}`));
    if (question.code) {
      lines.push("");
      lines.push("```text");
      lines.push(question.code);
      lines.push("```");
    }
    lines.push("");
    lines.push("**해설**");
    lines.push("");
    lines.push(...question.explanation.map((line) => `- ${line}`));
    lines.push("");
  });

  if (artifact.terms.length > 0) {
    lines.push("## 용어 정의");
    lines.push("");
    lines.push("| 용어 | 정의 | 메모 |");
    lines.push("|---|---|---|");
    for (const term of artifact.terms) {
      lines.push(`| ${term.term} | ${term.definition} | ${term.note} |`);
    }
    lines.push("");
  }

  lines.push("## 마지막 체크리스트");
  lines.push("");
  lines.push(...artifact.checklist.map((item) => `- ${item}`));
  lines.push("");
  lines.push(`인쇄용 산출물: ${subjectLabel} 시험 대비`);
  lines.push("");

  return lines.join("\n");
}

async function ensureGeneratedWorkbook(job) {
  const artifact = artifacts.getSubjectExamPrepArtifact(job.id);
  if (!artifact) {
    throw new Error(`Missing exam prep artifact for ${job.id}`);
  }

  const dir = path.join(publicRoot, job.id);
  await mkdir(dir, { recursive: true });

  const markdownPath = path.join(dir, "workbook.md");
  const htmlPath = path.join(dir, "workbook.html");

  if (job.generateStaticWorkbook || !(await pathExists(htmlPath))) {
    const markdown = job.useMarkdownWorkbook && (await pathExists(markdownPath))
      ? await readFile(markdownPath, "utf8")
      : artifactToMarkdown(artifact, job.label);
    const htmlBody = marked.parse(markdown);
    const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(artifact.title)}</title>
  <style>${sharedCss}</style>
</head>
<body>
<main>
${htmlBody}
</main>
</body>
</html>
`;

    await writeFile(markdownPath, markdown, "utf8");
    await writeFile(htmlPath, html, "utf8");
  }

  return {
    htmlPath,
    pdfPath: path.join(dir, "workbook.pdf"),
  };
}

async function loadPrintablePage(browser, htmlPath) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: printCss });
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
  return page;
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  const launchOptions = (await pathExists(chromeExecutable))
    ? { executablePath: chromeExecutable }
    : {};

  const browser = await chromium.launch({
    ...launchOptions,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    for (const job of subjectPrintJobs) {
      const { htmlPath, pdfPath } = await ensureGeneratedWorkbook(job);
      const page = await loadPrintablePage(browser, htmlPath);
      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
      });
      await page.close();

      const { size } = await stat(pdfPath);
      const relativePdfPath = path.relative(repoRoot, pdfPath);
      console.log(`${job.label}: ${relativePdfPath} (${formatBytes(size)})`);
    }
  } finally {
    await browser.close();
  }
}

await main();
