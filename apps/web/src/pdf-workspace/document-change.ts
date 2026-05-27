// sprint-2026-W22-sprint-2 / layer B/slice-2b — document change event dispatcher.
// main.ts 의 handleDocumentChange (`change` event 7 분기 dispatcher) 격리.
// slice-2a 패턴 (named export + Context + Callbacks 주입) 일치. dispatcher
// 자체는 stateless — 분기 판단 후 callbacks 로 위임.
//
// invariant:
//   - target 가 HTMLInputElement / HTMLSelectElement 가 아니면 noop.
//   - chart branch: `<select data-action="update-chart-type">` 만. point
//     editor 존재 시 current DOM 값 우선, 없으면 stored points 보존.
//     chartPointDebounceMap 의 in-flight handle 은 clear (callback 위임).
//   - classDate legacy branch: `<select data-action="assign-pdf-class-date">` →
//     assignPdfMaterialClassDate.
//   - classDate preview branch: custom radio option updates the visible summary.
//   - 이후 HTMLInputElement 한정 branch 5종:
//     · import-pdf-material → importPdfMaterialFile (+ target.value = "").
//     · select-pdf-page → requestPdfPage + renderApp (Number.isInteger guard).
//     · set-eraser-size → applySetEraserSize + renderApp.
//     · toggle-checklist-item → applyToggleChecklistItem + renderApp.
//     · import-week-note → importWeekNoteFile (+ target.value = "").
//   - 7 분기 모두 self-contained early return — 다음 branch 진입 X.

import type { PdfChart, SubjectPdfWorkspace } from "@study-note/domain";

/**
 * dispatcher 는 point 데이터를 transparent 하게 통과시키며 shape 을 읽지
 * 않는다. main.ts 의 CsvSeriesPoint 와 domain ChartPoint 가 분기되어 있어
 * unknown 으로 추상화. encode/decode 가 main.ts side 에서 일관된 shape 을
 * 보장한다.
 */
export type DocumentChangeChartPoint = unknown;

// ─── Public types ────────────────────────────────────────────────────────

/**
 * 본 module 의 chart 분기에서만 의미. point editor 가 노출하는 chart 유형.
 */
export type DocumentChangeChartType = "xy" | "bar" | "trig";

/**
 * dispatcher 가 read-only 로 받는 main.ts state. broad `pdfWorkspaceStore`
 * 노출 X — chart branch 가 필요한 subject workspace getter 만.
 */
export interface DocumentChangeContext {
  getSubjectWorkspace: (subjectId: string) => SubjectPdfWorkspace;
}

/**
 * chart 분기 helper 묶음. encode/decode/update + point editor DOM read +
 * debounce clear. point editor 가 없을 때 storedPoints 를 보존하는 기존
 * 동작 유지 (sprint-13/slice-5).
 */
export interface DocumentChangeChartCallbacks {
  readChartDataFromDom: (chartId: string) => { points: DocumentChangeChartPoint[] } | undefined;
  decodeChartContent: (content: string) => { points: DocumentChangeChartPoint[] };
  encodeChartContent: (type: DocumentChangeChartType, points: DocumentChangeChartPoint[]) => string;
  updateChartContent: (chart: PdfChart, content: string) => PdfChart;
  /** chartPointDebounceMap 의 chartId in-flight handle 을 clear + delete. */
  clearChartPointDebounce: (chartId: string) => void;
}

/**
 * dispatcher 의 7 분기 callback. main.ts 가 wire 한다.
 *
 * - `chart`: chart 전용 helper 묶음.
 * - `updatePdfWorkspace`: chart branch 의 commit.
 * - `renderApp`: chart / pdfPage / eraser / checklist branch 의 trigger.
 * - `assignPdfMaterialClassDate`: classDate branch.
 * - `importPdfMaterialFile`: PDF 자료 import.
 * - `requestPdfPage`: page select.
 * - `applySetEraserSize`: eraser size 변경.
 * - `applyToggleChecklistItem`: checklist 항목 toggle.
 * - `importWeekNoteFile`: week note import.
 */
export interface DocumentChangeCallbacks {
  chart: DocumentChangeChartCallbacks;
  updatePdfWorkspace: (
    subjectId: string,
    updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
  ) => void;
  renderApp: () => void;
  assignPdfMaterialClassDate: (
    subjectId: string,
    materialId: string,
    value: string
  ) => Promise<void> | void;
  importPdfMaterialFile: (file: File, subjectId: string) => Promise<void> | void;
  requestPdfPage: (subjectId: string, pageNumber: number) => void;
  applySetEraserSize: (subjectId: string, size: number) => void;
  applyToggleChecklistItem: (
    subjectId: string,
    checklistId: string,
    itemId: string
  ) => void;
  importWeekNoteFile: (
    file: File,
    expectedSubjectId: string
  ) => Promise<void> | void;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────

/**
 * document 의 `change` event 7 분기 dispatcher. early return 으로 branch
 * isolation 보존 — 같은 element 가 두 dataset action 을 동시에 갖는 경우
 * 는 invariant 위반이라 정의되지 않음.
 */
export function handleDocumentChange(
  event: Event,
  context: DocumentChangeContext,
  callbacks: DocumentChangeCallbacks
): void {
  const target = event.target;

  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement)
  ) {
    return;
  }

  // sprint-13/slice-5/6: chart input mode select — re-encode content with new type + current points.
  if (target instanceof HTMLSelectElement && target.dataset.action === "update-chart-type") {
    const subjectId = target.dataset.subjectId;
    const chartId = target.dataset.chartId;

    if (subjectId && chartId) {
      const rawType = target.value;
      const chartType: DocumentChangeChartType =
        rawType === "bar" || rawType === "trig" ? rawType : "xy";
      const article = target.closest<HTMLElement>("[data-chart-id]");
      const hasPointEditor = Boolean(article?.querySelector("[data-chart-point-count]"));
      const current = callbacks.chart.readChartDataFromDom(chartId);
      const storedChart = context.getSubjectWorkspace(subjectId).charts.find(
        (chart) => chart.id === chartId
      );
      const storedPoints = storedChart
        ? callbacks.chart.decodeChartContent(storedChart.content).points
        : [];
      const points = hasPointEditor ? (current?.points ?? storedPoints) : storedPoints;
      const content = callbacks.chart.encodeChartContent(chartType, points);
      callbacks.chart.clearChartPointDebounce(chartId);
      callbacks.updatePdfWorkspace(subjectId, (workspace) => ({
        ...workspace,
        charts: workspace.charts.map((chart) =>
          chart.id === chartId ? callbacks.chart.updateChartContent(chart, content) : chart
        )
      }));
      callbacks.renderApp();
    }

    return;
  }

  if (
    target instanceof HTMLSelectElement &&
    target.dataset.action === "assign-pdf-class-date"
  ) {
    const subjectId = target.dataset.subjectId;
    const materialId = target.dataset.materialId;

    if (subjectId && materialId) {
      void callbacks.assignPdfMaterialClassDate(subjectId, materialId, target.value);
    }

    return;
  }

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.action === "preview-pdf-class-date") {
    const label = target.dataset.label;
    const field = target.closest<HTMLElement>(".pdf-material-card__field");
    const current = field?.querySelector<HTMLElement>('[data-role="pdf-class-date-current"]');
    const picker = field?.querySelector<HTMLDetailsElement>('[data-role="pdf-class-date-picker"]');

    if (label && current) {
      current.textContent = label;
    }
    picker?.removeAttribute("open");
    return;
  }

  if (target.dataset.action === "import-pdf-material") {
    const file = target.files?.[0];
    const subjectId = target.dataset.subjectId;

    if (file && subjectId) {
      void callbacks.importPdfMaterialFile(file, subjectId);
    }

    target.value = "";
    return;
  }

  if (target.dataset.action === "select-pdf-page") {
    const subjectId = target.dataset.subjectId;
    const pageNumber = Number(target.value);

    if (subjectId && Number.isInteger(pageNumber)) {
      callbacks.requestPdfPage(subjectId, pageNumber);
      callbacks.renderApp();
    }

    return;
  }

  if (target.dataset.action === "set-eraser-size") {
    const subjectId = target.dataset.subjectId;

    if (subjectId) {
      callbacks.applySetEraserSize(subjectId, Number(target.value));
      callbacks.renderApp();
    }

    return;
  }

  // sprint-12/slice-3: checklist item checkbox toggle
  if (target.dataset.action === "toggle-checklist-item") {
    const subjectId = target.dataset.subjectId;
    const checklistId = target.dataset.checklistId;
    const itemId = target.dataset.itemId;

    if (subjectId && checklistId && itemId) {
      callbacks.applyToggleChecklistItem(subjectId, checklistId, itemId);
      // renderApp safe here: discrete toggle, no in-flight input focus to lose.
      callbacks.renderApp();
    }

    return;
  }

  if (target.dataset.action !== "import-week-note") {
    return;
  }

  const file = target.files?.[0];
  const expectedSubjectId = target.dataset.subjectId;

  if (!file || !expectedSubjectId) {
    return;
  }

  void callbacks.importWeekNoteFile(file, expectedSubjectId);
  target.value = "";
}
