export * from "./lecture-note";
export * from "./lecture-note-import";
export * from "./pdf-workspace";
export * from "./user";

// sprint-13 slice-1 expands the source PdfWorkspaceTool with "table" | "chart".
// The package-level alias stays legacy until apps/web slice-2 updates its local
// tool formatter/guard; direct source imports can use the expanded union now.
export type PdfWorkspaceTool =
  | "read"
  | "sticky"
  | "pen"
  | "eraser"
  | "text"
  | "checklist";
