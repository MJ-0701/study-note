// MaterialPublicResponse DTO(F-10) 회귀 테스트 — 명시 allow-list 변환(boundary contract).
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { PdfMaterialRecord } from "@study-note/domain";
import { toMaterialPublic } from "../material-public.dto";

function record(overrides: Partial<PdfMaterialRecord> = {}): PdfMaterialRecord {
  return {
    id: "mat-1",
    ownerId: "admin-1",
    uploaderId: "admin-1",
    subjectId: "digital-engineering",
    classDate: "2026-05-07",
    fileName: "lecture.pdf",
    fileSize: 1024,
    pageCount: 5,
    contentType: "application/pdf",
    storageKey: "users/admin-1/materials/mat-1/lecture.pdf",
    uploadStatus: "uploaded",
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

describe("toMaterialPublic (F-10 DTO)", () => {
  it("maps the full public material shape (FE 호환)", () => {
    assert.deepEqual(toMaterialPublic(record()), {
      id: "mat-1",
      ownerId: "admin-1",
      uploaderId: "admin-1",
      subjectId: "digital-engineering",
      classDate: "2026-05-07",
      fileName: "lecture.pdf",
      fileSize: 1024,
      pageCount: 5,
      contentType: "application/pdf",
      storageKey: "users/admin-1/materials/mat-1/lecture.pdf",
      uploadStatus: "uploaded",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z"
    });
  });

  it("is an explicit allow-list — an unknown internal field on the entity does not leak", () => {
    const withInternal = { ...record(), __internalSecret: "leak-me" } as PdfMaterialRecord;
    const dto = toMaterialPublic(withInternal);
    assert.equal("__internalSecret" in dto, false, "unlisted field must not pass through");
  });

  it("returns a fresh object decoupled from the persistence record", () => {
    const src = record();
    const dto = toMaterialPublic(src);
    assert.notEqual(dto, src as unknown, "must not return the same reference");
  });

  it("covers every field the FE adapter (BackendPdfMaterialInput) reads", () => {
    const dto = toMaterialPublic(record());
    for (const key of [
      "id",
      "uploaderId",
      "subjectId",
      "classDate",
      "fileName",
      "fileSize",
      "pageCount",
      "contentType",
      "uploadStatus",
      "createdAt",
      "updatedAt"
    ]) {
      assert.ok(key in dto, `FE adapter expects "${key}"`);
    }
  });
});
