// sprint-2026-W22-sprint-2 / layer B/slice-2b — pdf-workspace 공유 상수.
// main.ts 의 5 상수 (sentinel + swipe threshold + root DOM id) 추출. ctx
// 주입 대신 직접 import 하는 module-local invariant 다. main.ts 는 본
// module 에서 import 하거나 동일 식별자로 re-export 한다.
//
// invariant:
//   - PDF_MATERIAL_UNASSIGNED_WIRE_DATE = BE wire sentinel, Zod ISO date
//     통과 보장.
//   - PDF_MATERIAL_UNASSIGNED_CLASS_DATE = FE-local legacy marker,
//     "수업일 미지정" UI 옵션 보존.
//   - SWIPE_THRESHOLD = max(surface width × RATIO, MIN_PX). 좌→우 dx>0
//     = 이전 page.
//   - PDF_WORKSPACE_ROOT_ID = fullscreen API target + isPdfWorkspaceFullscreen
//     판정.

// S3 codex R4 P1: BE 가 ISO date 강제 + UI "수업일 미지정" 옵션 보존 위해
// '1970-01-01' (Unix epoch start) 을 sentinel DATE 로 통일. valid ISO 라 BE
// Zod 통과 + FE 가 sentinel 로 인식 (실 수업일과 충돌 없음).
export const PDF_MATERIAL_UNASSIGNED_CLASS_DATE = "metadata-pending"; // FE-local legacy marker
export const PDF_MATERIAL_UNASSIGNED_WIRE_DATE = "1970-01-01"; // BE wire sentinel

// sprint-W21-sprint-4/S4: PDF 영역 horizontal swipe gesture threshold.
// single-touch only. multi-touch (pinch zoom 후보) 시 무시.
// 좌→우 dx>0 = 이전 page, 우→좌 dx<0 = 다음 page.
export const SWIPE_THRESHOLD_RATIO = 0.2;
export const SWIPE_THRESHOLD_MIN_PX = 60;

// sprint-W21-sprint-1: PDF workspace fullscreen API target DOM id.
export const PDF_WORKSPACE_ROOT_ID = "pdf-workspace-root";
