---
phase: report
sprint_id: 2026-W18-sprint-5
goal: "PDF 뷰어와 필기형 학습 워크스페이스 기획"
created_at: "2026-05-02T14:49:56+09:00"
last_touched_at: 2026-05-02T05:51:06+00:00
gate_status: "G4 pass"
status: final
closed_at: 2026-05-02T05:51:06+00:00
---

# Report — PDF Viewer Local Annotation Prototype

## §1. Outcome

This sprint delivered a local Vite prototype for a subject-scoped PDF workspace.
The prototype lets a student open a local lecture PDF, view it in the browser,
attach sticky notes, draw pen strokes, persist annotations in `localStorage`,
and use a responsive toolbar for tablet/mobile-oriented study.

G4 passed after a targeted read-mode rework:

- read mode passes pointer interaction through to the PDF iframe.
- sticky and pen modes explicitly capture annotation input.
- no auth, S3, backend, MySQL, credential, or PDF export scope was added.

## §2. Product Implementation Artifacts

- `src/domain/pdfWorkspace.ts`
  - typed PDF workspace schema, material draft, sticky note, ink stroke, normalized point helpers, storage key, and page-count estimate.
- `src/main.ts`
  - `#/subjects/<subject-id>/pdf-workspace` route, PDF import, page controls, tool switching, sticky note edit/delete, pen stroke pointer lifecycle, and localStorage load/save.
- `src/styles.css`
  - responsive PDF workspace, toolbar, PDF stage, annotation surface, sticky note, ink stroke, and mobile/tablet media rules.
  - read mode uses `pointer-events: none`; sticky/pen modes use `pointer-events: auto`.
- `scripts/smoke-pdf-workspace.mjs`
  - headless Chrome/CDP smoke for route render, local PDF iframe preview, sticky reload persistence, pen reload persistence, read-mode pointer pass-through, and mobile toolbar non-overlap.
- `package.json`
  - Vite app scripts: `dev`, `build`, `smoke:pdf-workspace`, `preview`.
- `package-lock.json`
  - npm dependency lockfile for the Vite/TypeScript prototype.
- `vite.config.ts`, `tsconfig.json`, `index.html`, `public/`
  - local app runtime/config shell.

SFS/runtime upgrade files are system state, not product implementation scope.

## §3. Verification Evidence

Build:

```text
> study-note@0.1.0 build
> tsc --noEmit && vite build

vite v7.3.2 building client environment for production...
✓ 10 modules transformed.
dist/index.html                  0.55 kB │ gzip:  0.36 kB
dist/assets/index-B9-hjca3.css  22.15 kB │ gzip:  4.32 kB
dist/assets/index-Bq0Ya_-6.js   76.48 kB │ gzip: 20.60 kB
✓ built in 88ms
```

Smoke:

```text
PDF workspace smoke passed
- route renders
- local PDF iframe preview renders
- sticky note persists after reload
- pen stroke persists after reload
- read mode passes pointer interaction through to PDF iframe
- mobile toolbar does not overlap PDF stage
```

Review:

```text
sfs review --gate G4 --executor codex
verdict: pass
output: .sfs-local/tmp/review-runs/2026-W18-sprint-5-G4-20260502T054452Z.result.md
```

## §4. Accepted Residual Risks

- Generator and evaluator were both Codex in the same `study-note` session. This is accepted only for this local prototype slice.
- No real iPad/Apple Pencil hardware validation was performed.
- Browser-native PDF iframe rendering and overlay coordinate fidelity are not production-grade.
- Page-count estimation is heuristic and should be replaced when adopting pdf.js or a backend PDF processor.
- Source PDF object URLs are intentionally session-local; after reload, the PDF source must be reselected while annotations remain persisted.

## §5. Next Sprint Candidates

- Backend/auth/S3 slice:
  - login/session model, user-scoped upload, presigned S3 flow, and permission boundary.
- PDF export/download slice:
  - generate a downloadable annotated PDF or local export bundle.
- PDF fidelity slice:
  - pdf.js rendering, exact page coordinate mapping, page thumbnails, and robust page count.
- Tablet hardware validation:
  - iPad Safari and Apple Pencil smoke for pointer pressure, scroll, zoom, and note editing.

## §6. Close Recommendation

Proceed to G5 retro/close for this prototype sprint. Do not treat the result as
production-ready PDF annotation UX until independent review and real tablet/Pencil
validation are complete.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T05:51:06+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
