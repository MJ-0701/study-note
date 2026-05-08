import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { cosineRank } from "../retrieval.service";

function unit(values: number[]): Float32Array {
  const v = new Float32Array(values);
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  for (let i = 0; i < v.length; i++) v[i] = v[i] / norm;
  return v;
}

describe("cosineRank", () => {
  it("returns top-k by descending cosine over L2-normalized vectors", () => {
    const query = unit([1, 0, 0]);
    const candidates = [
      { ord: 0, corpusId: "c0", sourcePdfPath: "/p0", text: "near", vector: unit([0.9, 0.1, 0]) },
      { ord: 1, corpusId: "c1", sourcePdfPath: "/p1", text: "mid", vector: unit([0.5, 0.5, 0]) },
      { ord: 2, corpusId: "c2", sourcePdfPath: "/p2", text: "far", vector: unit([0, 1, 0]) }
    ];
    const ranked = cosineRank(query, candidates, 2);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].ord, 0);
    assert.equal(ranked[1].ord, 1);
    assert.ok(ranked[0].score > ranked[1].score, "rank 0 must outscore rank 1");
  });

  it("returns min(k, candidates.length) when k exceeds available candidates", () => {
    const query = unit([1, 0]);
    const candidates = [
      { ord: 0, corpusId: "c0", sourcePdfPath: "/p", text: "a", vector: unit([1, 0]) },
      { ord: 1, corpusId: "c1", sourcePdfPath: "/p", text: "b", vector: unit([0, 1]) }
    ];
    const ranked = cosineRank(query, candidates, 5);
    assert.equal(ranked.length, 2);
  });

  it("returns empty when k = 0", () => {
    const query = unit([1, 0]);
    const candidates = [
      { ord: 0, corpusId: "c0", sourcePdfPath: "/p", text: "a", vector: unit([1, 0]) }
    ];
    assert.deepEqual(cosineRank(query, candidates, 0), []);
  });

  it("dot product equals explicit cosine on L2-normalized vectors (1e-6 tolerance)", () => {
    const a = unit([3, 4, 0]); // -> [0.6, 0.8, 0]
    const b = unit([1, 2, 2]);
    const candidates = [
      { ord: 7, corpusId: "c", sourcePdfPath: "/p", text: "x", vector: b }
    ];
    const ranked = cosineRank(a, candidates, 1);
    let dotSum = 0;
    for (let i = 0; i < a.length; i++) dotSum += a[i] * b[i];
    let aNorm = 0;
    let bNorm = 0;
    for (let i = 0; i < a.length; i++) {
      aNorm += a[i] * a[i];
      bNorm += b[i] * b[i];
    }
    const explicitCosine = dotSum / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
    assert.ok(
      Math.abs(ranked[0].score - explicitCosine) < 1e-6,
      `dot product ${ranked[0].score} must equal explicit cosine ${explicitCosine}`
    );
  });
});
