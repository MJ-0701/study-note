// Subject 삭제 도메인 불변식 (DDD F-11) — 자식 PdfMaterial(soft-deleted 포함)이 하나라도 있으면 삭제 불가.
// FK RESTRICT(PdfMaterial.subjectId)와 정합: 살아있는/soft-deleted row 모두 차단 (Codex PR R4 P1).
// 순수 함수 — I/O / HTTP 매핑은 caller(service) 책임. ensureTermHierarchyAllowed 와 동일한 co-located policy 패턴.

export function canDeleteSubject(childMaterialCount: number): boolean {
  return childMaterialCount === 0;
}
