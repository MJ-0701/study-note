// sprint-7 slice-2 spec — secret-handling 카피 (plan §3 AC2-amend2).
//
// 본 spec 는 S1/S2/S3 const 의 substring presence 와 onboarding-mcp.tsx 가 그것을
// 실제로 렌더하는지 확인한다. React 렌더 검증은 source string match 로 대체 —
// onboarding-mcp.tsx 가 SECRET_HANDLING_COPY 를 import 후 JSX 안에 그대로 노출.
//
// 실행: `pnpm test:web-onboarding-copy`
//
// 본 spec 의 의미: 카피 변경 시 자동 alert. plan §4.1 의 보안 가정 (S1/S2/S3) 이
// onboarding 페이지에서 사라지지 않도록 회귀 가드.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  S1_LOCAL_ONLY,
  S2_DO_NOT_COMMIT,
  S3_LEAST_PRIVILEGE,
  SECRET_HANDLING_COPY
} from "./secret-handling-copy.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ONBOARDING_TSX = resolve(HERE, "onboarding-mcp.tsx");

describe("secret-handling-copy (plan §3 AC2-amend2 / §4.1 S1/S2/S3)", () => {
  describe("const presence + substring lock", () => {
    it("S1 = local-only 카피 (Claude Desktop / Cursor stdio 명시)", () => {
      assert.ok(S1_LOCAL_ONLY.includes("로컬 머신"));
      assert.ok(S1_LOCAL_ONLY.includes("원격 호스팅"));
    });

    it("S2 = do-not-commit 카피 (DATABASE_URL 명시 + commit/push/공유 금지)", () => {
      assert.ok(S2_DO_NOT_COMMIT.includes("DATABASE_URL"));
      assert.ok(S2_DO_NOT_COMMIT.includes("commit"));
      assert.ok(S2_DO_NOT_COMMIT.includes("push"));
      assert.ok(S2_DO_NOT_COMMIT.includes("공유하지"));
    });

    it("S3 = least-privilege 카피 (dev 전용 role + master/superuser 회피)", () => {
      assert.ok(S3_LEAST_PRIVILEGE.includes("dev 전용 role"));
      assert.ok(S3_LEAST_PRIVILEGE.includes("최소 권한"));
      assert.ok(S3_LEAST_PRIVILEGE.includes("master"));
      assert.ok(S3_LEAST_PRIVILEGE.includes("superuser"));
    });

    it("SECRET_HANDLING_COPY 묶음 = S1/S2/S3 3-key map", () => {
      assert.equal(SECRET_HANDLING_COPY.S1, S1_LOCAL_ONLY);
      assert.equal(SECRET_HANDLING_COPY.S2, S2_DO_NOT_COMMIT);
      assert.equal(SECRET_HANDLING_COPY.S3, S3_LEAST_PRIVILEGE);
    });
  });

  describe("onboarding-mcp.tsx renders S1/S2/S3", () => {
    it("source 파일이 SECRET_HANDLING_COPY import + 3 substring 모두 노출", async () => {
      const src = await readFile(ONBOARDING_TSX, "utf8");
      assert.ok(
        /from\s+["']\.\/secret-handling-copy/.test(src),
        "onboarding-mcp.tsx 가 secret-handling-copy 모듈을 import 해야 한다"
      );
      assert.ok(
        src.includes("S1_LOCAL_ONLY") || src.includes("SECRET_HANDLING_COPY"),
        "onboarding-mcp.tsx 가 S1/SECRET_HANDLING_COPY 식별자를 사용해야 한다"
      );
    });
  });

  describe("trouble anchor (plan implement.md §5 후속)", () => {
    it("onboarding-mcp.tsx 의 트러블슈팅 섹션이 id=\"trouble\" 또는 동등 anchor 노출", async () => {
      const src = await readFile(ONBOARDING_TSX, "utf8");
      assert.ok(
        /id="trouble"|id={"trouble"}/.test(src) ||
          /id="section-trouble"[\s\S]{0,500}id="trouble"/.test(src),
        "/onboarding-mcp.html#trouble deep-link 의 anchor 가 필요하다"
      );
    });
  });
});
