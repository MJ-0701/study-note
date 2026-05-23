// backfill-annotation-snapshots.mjs
//
// sprint-W21-sprint-2 (Hybrid CAS) 도입 전 prod 는 R2-only annotation 저장이었음.
// PR #35 머지 + 배포 후 신규 PUT 만 AnnotationSnapshot row 생성 → 기존 R2 object
// 들의 metadata row 누락. batch/single GET 가 row 기준이라 응답에서 빠지고
// FE 가 빈 화면 표시 → user 가 덮어쓸 위험.
//
// 본 script:
//  - R2 prefix `annotations/` 전수 scan (ListObjectsV2 paginated).
//  - key 파싱 `annotations/{userIdEncoded}/material-{materialIdEncoded}.json`.
//  - PdfMaterial 존재 + ownerId == userId 검증 (mismatch skip + log).
//  - R2 body 의 `updatedAt` (없으면 LastModified, 없으면 now) 를 savedAt 으로
//    사용해서 `prisma.annotationSnapshot.upsert` (composite key materialId_ownerId).
//    payload 는 Prisma.JsonNull — Hybrid 의 invariant 와 일치 (truth = R2).
//  - dry-run default. `--apply` flag 있어야 실제 upsert.
//
// 실행 예시:
//   # dry-run (count 만)
//   node scripts/backfill-annotation-snapshots.mjs
//   # apply
//   node scripts/backfill-annotation-snapshots.mjs --apply
//
// 필요 env:
//   DATABASE_URL
//   S3_ENDPOINT          (R2 endpoint, e.g. https://<account>.r2.cloudflarestorage.com)
//   S3_REGION=auto
//   S3_BUCKET            (study-note-prod)
//   S3_ACCESS_KEY_ID
//   S3_SECRET_ACCESS_KEY

import { Prisma, PrismaClient } from "@prisma/client";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client
} from "@aws-sdk/client-s3";

const APPLY = process.argv.includes("--apply");
const PREFIX = "annotations/";
const KEY_REGEX = /^annotations\/([^/]+)\/material-([^/]+)\.json$/;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`missing required env ${name}`);
  }
  return v;
}

function makeS3() {
  const endpoint = requireEnv("S3_ENDPOINT");
  const region = process.env.S3_REGION ?? "auto";
  const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
  return new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }
  });
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function* listAllKeys(s3, bucket) {
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PREFIX,
        ContinuationToken: token
      })
    );
    for (const obj of res.Contents ?? []) {
      yield { key: obj.Key, lastModified: obj.LastModified };
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}

function parseKey(key) {
  const m = KEY_REGEX.exec(key);
  if (!m) {
    return null;
  }
  try {
    return {
      userId: decodeURIComponent(m[1]),
      materialId: decodeURIComponent(m[2])
    };
  } catch {
    return null;
  }
}

function pickSavedAt(bodyJson, lastModified) {
  if (
    bodyJson &&
    typeof bodyJson === "object" &&
    typeof bodyJson.updatedAt === "string"
  ) {
    const parsed = new Date(bodyJson.updatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (lastModified instanceof Date && !Number.isNaN(lastModified.getTime())) {
    return lastModified;
  }
  return new Date();
}

async function main() {
  const bucket = requireEnv("S3_BUCKET");
  const s3 = makeS3();
  const prisma = new PrismaClient();

  const stats = {
    scanned: 0,
    unmatchedKey: 0,
    materialMissing: 0,
    ownerMismatch: 0,
    alreadyExists: 0,
    upserted: 0,
    bodyReadFailed: 0,
    perOwner: new Map()
  };

  console.log(`[backfill] mode = ${APPLY ? "APPLY" : "DRY-RUN"} bucket = ${bucket}`);

  try {
    for await (const { key, lastModified } of listAllKeys(s3, bucket)) {
      stats.scanned += 1;

      const parsed = parseKey(key);
      if (!parsed) {
        stats.unmatchedKey += 1;
        console.warn(`[backfill] unmatched key shape: ${key}`);
        continue;
      }
      const { userId, materialId } = parsed;

      const material = await prisma.pdfMaterial.findUnique({
        where: { id: materialId },
        select: { id: true, ownerId: true, deletedAt: true }
      });
      if (!material) {
        stats.materialMissing += 1;
        console.warn(
          `[backfill] material missing: materialId=${materialId} userId=${userId} key=${key}`
        );
        continue;
      }
      if (material.ownerId !== userId) {
        stats.ownerMismatch += 1;
        console.warn(
          `[backfill] owner mismatch: materialId=${materialId} keyUser=${userId} materialOwner=${material.ownerId}`
        );
        continue;
      }

      const existing = await prisma.annotationSnapshot.findUnique({
        where: { materialId_ownerId: { materialId, ownerId: userId } },
        select: { id: true }
      });
      if (existing) {
        stats.alreadyExists += 1;
        continue;
      }

      let bodyJson = null;
      try {
        const getRes = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: key })
        );
        const bodyText = await streamToString(getRes.Body);
        bodyJson = JSON.parse(bodyText);
      } catch (err) {
        stats.bodyReadFailed += 1;
        console.warn(
          `[backfill] body read/parse failed for ${key}: ${err?.message ?? err}`
        );
      }
      const savedAt = pickSavedAt(bodyJson, lastModified);

      if (APPLY) {
        await prisma.annotationSnapshot.create({
          data: {
            materialId,
            ownerId: userId,
            schemaVersion: 1,
            payload: Prisma.JsonNull,
            savedAt
          }
        });
      }

      stats.upserted += 1;
      stats.perOwner.set(userId, (stats.perOwner.get(userId) ?? 0) + 1);

      if (stats.scanned % 50 === 0) {
        console.log(
          `[backfill] progress: scanned=${stats.scanned} upserted=${stats.upserted}`
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[backfill] done");
  console.log(`  scanned          : ${stats.scanned}`);
  console.log(`  unmatchedKey     : ${stats.unmatchedKey}`);
  console.log(`  materialMissing  : ${stats.materialMissing}`);
  console.log(`  ownerMismatch    : ${stats.ownerMismatch}`);
  console.log(`  alreadyExists    : ${stats.alreadyExists}`);
  console.log(`  bodyReadFailed   : ${stats.bodyReadFailed}`);
  console.log(`  ${APPLY ? "upserted" : "candidates"}: ${stats.upserted}`);
  console.log("  per-owner:");
  for (const [owner, count] of stats.perOwner) {
    console.log(`    ${owner}: ${count}`);
  }
  if (!APPLY) {
    console.log("\n[backfill] dry-run — re-run with --apply to write.");
  }
}

main().catch((err) => {
  console.error("[backfill] FAILED:", err);
  process.exit(1);
});
